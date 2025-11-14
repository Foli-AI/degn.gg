import { createClient } from '@supabase/supabase-js';
import { generateSeed, DEFAULT_SERVER_SECRET } from './fairness';
import { simulateMatch, generateTickLog, type Player, type MatchResult } from './coinraidEngine';

/**
 * Arcade Engine - Core wagering and match orchestration system
 * Handles atomic transactions, match simulation, and payouts
 */

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase configuration - using mock data');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface Room {
  id: string;
  game: string;
  host_id: string;
  name: string;
  min_entry: number;
  max_entry: number;
  max_players: number;
  status: 'waiting' | 'running' | 'completed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  bet_amount: number;
  position?: number;
  payout: number;
  status: 'active' | 'eliminated' | 'winner';
  joined_at: string;
  user?: {
    username: string;
  };
}

export interface Match {
  id: string;
  room_id: string;
  game: string;
  seed: string;
  result: MatchResult;
  total_pot: number;
  rake_collected: number;
  completed_at: string;
}

export interface BetResult {
  success: boolean;
  error?: string;
  userCredits?: number;
  playersInRoom?: number;
}

export interface MatchCompleteResult {
  success: boolean;
  error?: string;
  matchId?: string;
  totalPot?: number;
  rakeCollected?: number;
  payoutAmount?: number;
  winnerId?: string;
}

/**
 * Place a bet in a room (atomic operation)
 */
export async function placeBet(
  userId: string,
  roomId: string,
  amount: number
): Promise<BetResult> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }
    
    const { data, error } = await supabase.rpc('place_bet', {
      p_user_id: userId,
      p_room_id: roomId,
      p_amount: amount
    });

    if (error) {
      console.error('Place bet error:', error);
      return { success: false, error: error.message };
    }

    return data as BetResult;
  } catch (error) {
    console.error('Place bet exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Start and complete a match (full orchestration)
 */
export async function startMatch(roomId: string): Promise<MatchCompleteResult> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not available' };
    }
    
    // Get room and players
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Room is not in waiting state' };
    }

    const { data: roomPlayers, error: playersError } = await supabase
      .from('room_players')
      .select(`
        *,
        user:users(username)
      `)
      .eq('room_id', roomId);

    if (playersError || !roomPlayers || roomPlayers.length === 0) {
      return { success: false, error: 'No players found in room' };
    }

    // Update room status to running
    const { error: updateError } = await supabase
      .from('rooms')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString() 
      })
      .eq('id', roomId);

    if (updateError) {
      return { success: false, error: 'Failed to start match' };
    }

    // Generate provably fair seed
    const timestamp = Date.now();
    const seed = generateSeed({
      serverSecret: DEFAULT_SERVER_SECRET,
      roomId,
      timestamp
    });

    // Prepare players for simulation
    const players: Player[] = roomPlayers.map(rp => ({
      id: rp.user_id,
      username: rp.user?.username || `Player${rp.user_id.slice(0, 8)}`,
      betAmount: rp.bet_amount
    }));

    // Simulate match
    const matchResult = simulateMatch(players, seed);

    // Complete match with atomic payout
    const rakePercent = parseFloat(process.env.RAKE_PERCENT || '0.08');
    const { data: completeData, error: completeError } = await supabase.rpc('complete_match', {
      p_room_id: roomId,
      p_seed: seed,
      p_result: {
        ...matchResult,
        timestamp,
        serverSecretHash: require('crypto')
          .createHash('sha256')
          .update(DEFAULT_SERVER_SECRET)
          .digest('hex')
      },
      p_rake_percent: rakePercent
    });

    if (completeError) {
      console.error('Complete match error:', completeError);
      return { success: false, error: completeError.message };
    }

    // Broadcast match result via Realtime
    await broadcastMatchResult(roomId, {
      ...completeData,
      matchResult,
      tickLog: generateTickLog(matchResult)
    });

    return completeData as MatchCompleteResult;

  } catch (error) {
    console.error('Start match exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get room details with players
 */
export async function getRoomDetails(roomId: string): Promise<{
  room: Room | null;
  players: RoomPlayer[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { room: null, players: [], error: 'Database not available' };
    }
    
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      return { room: null, players: [], error: roomError.message };
    }

    const { data: players, error: playersError } = await supabase
      .from('room_players')
      .select(`
        *,
        user:users(username)
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (playersError) {
      return { room, players: [], error: playersError.message };
    }

    return { room, players: players || [] };
  } catch (error) {
    return { 
      room: null, 
      players: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a new room
 */
export async function createRoom(
  hostId: string,
  game: string,
  name: string,
  minEntry: number,
  maxEntry: number,
  maxPlayers: number = 4
): Promise<{ room: Room | null; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { room: null, error: 'Database not available' };
    }
    
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        host_id: hostId,
        game,
        name,
        min_entry: minEntry,
        max_entry: maxEntry,
        max_players: maxPlayers,
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      return { room: null, error: error.message };
    }

    return { room };
  } catch (error) {
    return { 
      room: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get user's current credits
 */
export async function getUserCredits(userId: string): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return 0;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return 0;
    }

    return parseFloat(data.credits) || 0;
  } catch (error) {
    console.error('Get user credits error:', error);
    return 0;
  }
}

/**
 * Get available rooms
 */
export async function getAvailableRooms(game?: string): Promise<{
  rooms: (Room & { player_count: number })[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { rooms: [], error: 'Database not available' };
    }
    
    let query = supabase
      .from('rooms')
      .select(`
        *,
        room_players(count)
      `)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (game) {
      query = query.eq('game', game);
    }

    const { data, error } = await query;

    if (error) {
      return { rooms: [], error: error.message };
    }

    const rooms = (data || []).map(room => ({
      ...room,
      player_count: room.room_players?.[0]?.count || 0
    }));

    return { rooms };
  } catch (error) {
    return { 
      rooms: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Broadcast match result via Supabase Realtime
 */
async function broadcastMatchResult(roomId: string, data: any): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Cannot broadcast - database not available');
      return;
    }
    
    const channel = supabase.channel(`room:${roomId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'match_complete',
      payload: data
    });

    // Also broadcast to general rooms channel
    const roomsChannel = supabase.channel('public:rooms');
    await roomsChannel.send({
      type: 'broadcast',
      event: 'room_completed',
      payload: { roomId, ...data }
    });

  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

/**
 * Simulate a match for testing (without database operations)
 */
export function simulateMatchTest(
  players: Player[],
  seed: string
): MatchResult {
  return simulateMatch(players, seed);
}

/**
 * Get match history for a user
 */
export async function getUserMatchHistory(
  userId: string,
  limit: number = 20
): Promise<{
  matches: any[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { matches: [], error: 'Database not available' };
    }
    
    const { data, error } = await supabase
      .from('room_players')
      .select(`
        *,
        room:rooms(*),
        match:matches(*)
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { matches: [], error: error.message };
    }

    return { matches: data || [] };
  } catch (error) {
    return { 
      matches: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(limit: number = 50): Promise<{
  leaderboard: any[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { leaderboard: [], error: 'Database not available' };
    }
    
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_won', { ascending: false })
      .limit(limit);

    if (error) {
      return { leaderboard: [], error: error.message };
    }

    return { leaderboard: data || [] };
  } catch (error) {
    return { 
      leaderboard: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

