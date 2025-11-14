#!/usr/bin/env ts-node

/**
 * Demo Script for DEGN.gg Arcade Phase 2
 * Creates mock users, rooms, and runs a complete match simulation
 */

import { createClient } from '@supabase/supabase-js';
import { simulateMatch } from '../src/lib/coinraidEngine';
import { generateSeed } from '../src/lib/fairness';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MockUser {
  id: string;
  username: string;
  credits: number;
}

async function createMockUsers(): Promise<MockUser[]> {
  console.log('🎮 Creating mock users...');
  
  const users = [
    { username: 'Alice_Crypto', credits: 1000 },
    { username: 'Bob_Blockchain', credits: 1500 },
    { username: 'Charlie_Coins', credits: 800 },
    { username: 'Diana_DeFi', credits: 1200 }
  ];

  const createdUsers: MockUser[] = [];

  for (const userData of users) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        credits: userData.credits
      })
      .select('id, username, credits')
      .single();

    if (error) {
      console.error(`Failed to create user ${userData.username}:`, error);
      continue;
    }

    createdUsers.push({
      id: data.id,
      username: data.username,
      credits: data.credits
    });

    console.log(`✅ Created user: ${data.username} (${data.credits} credits)`);
  }

  return createdUsers;
}

async function createRoom(hostId: string): Promise<string> {
  console.log('🏠 Creating game room...');
  
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      host_id: hostId,
      game: 'coinraid',
      name: 'Demo CoinRaid Battle',
      min_entry: 100,
      max_entry: 500,
      max_players: 4,
      status: 'waiting'
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create room: ${error.message}`);
  }

  console.log(`✅ Created room: ${data.id}`);
  return data.id;
}

async function placeBets(users: MockUser[], roomId: string): Promise<void> {
  console.log('💰 Placing bets...');
  
  const betAmounts = [150, 200, 100, 250]; // Different bet amounts for variety

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const betAmount = betAmounts[i];

    // Place bet using RPC function
    const { data, error } = await supabase.rpc('place_bet', {
      p_user_id: user.id,
      p_room_id: roomId,
      p_amount: betAmount
    });

    if (error || !data.success) {
      console.error(`Failed to place bet for ${user.username}:`, error || data.error);
      continue;
    }

    console.log(`✅ ${user.username} bet ${betAmount} credits (${data.userCredits} remaining)`);
  }
}

async function runMatch(roomId: string): Promise<void> {
  console.log('🚀 Starting match...');
  
  // Get room players
  const { data: roomPlayers, error: playersError } = await supabase
    .from('room_players')
    .select(`
      user_id,
      bet_amount,
      user:users(username)
    `)
    .eq('room_id', roomId);

  if (playersError || !roomPlayers) {
    throw new Error(`Failed to get room players: ${playersError?.message}`);
  }

  // Generate seed and simulate match
  const timestamp = Date.now();
  const seed = generateSeed({
    serverSecret: process.env.SERVER_SECRET || 'demo-secret',
    roomId,
    timestamp
  });

  console.log(`🎲 Generated seed: ${seed.substring(0, 16)}...`);

  const players = roomPlayers.map(rp => ({
    id: rp.user_id,
    username: (rp.user as any)?.username || 'Unknown',
    betAmount: rp.bet_amount
  }));

  console.log('👥 Players in match:');
  players.forEach(p => {
    console.log(`   - ${p.username}: ${p.betAmount} credits`);
  });

  // Simulate the match
  const matchResult = simulateMatch(players, seed);
  
  console.log('\n🎯 Match Results:');
  console.log(`   Winner: ${players.find(p => p.id === matchResult.winner)?.username}`);
  console.log(`   Duration: ${matchResult.duration} ticks`);
  console.log(`   Total Events: ${matchResult.events.length}`);
  
  console.log('\n🏆 Final Positions:');
  Object.entries(matchResult.positions)
    .sort(([,a], [,b]) => a - b)
    .forEach(([playerId, position]) => {
      const player = players.find(p => p.id === playerId);
      const score = matchResult.finalScores[playerId];
      console.log(`   ${position}. ${player?.username}: ${score} points`);
    });

  // Complete match using RPC function
  const rakePercent = parseFloat(process.env.RAKE_PERCENT || '0.08');
  const { data: completeData, error: completeError } = await supabase.rpc('complete_match', {
    p_room_id: roomId,
    p_seed: seed,
    p_result: {
      ...matchResult,
      timestamp
    },
    p_rake_percent: rakePercent
  });

  if (completeError || !completeData.success) {
    throw new Error(`Failed to complete match: ${completeError?.message || completeData.error}`);
  }

  console.log('\n💸 Payouts:');
  console.log(`   Total Pot: ${completeData.totalPot} credits`);
  console.log(`   Rake Collected: ${completeData.rakeCollected} credits`);
  console.log(`   Winner Payout: ${completeData.payoutAmount} credits`);
}

async function showFinalBalances(users: MockUser[]): Promise<void> {
  console.log('\n💳 Final Balances:');
  
  for (const user of users) {
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error(`Failed to get balance for ${user.username}:`, error);
      continue;
    }

    const change = data.credits - user.credits;
    const changeStr = change >= 0 ? `+${change}` : `${change}`;
    console.log(`   ${user.username}: ${data.credits} credits (${changeStr})`);
  }
}

async function showRakeInfo(): Promise<void> {
  console.log('\n🏦 Rake Account:');
  
  const { data, error } = await supabase
    .from('rake_account')
    .select('balance, last_updated')
    .single();

  if (error) {
    console.error('Failed to get rake info:', error);
    return;
  }

  console.log(`   Current Balance: ${data.balance} credits`);
  console.log(`   Last Updated: ${new Date(data.last_updated).toLocaleString()}`);
}

async function cleanup(users: MockUser[], roomId: string): Promise<void> {
  console.log('\n🧹 Cleaning up demo data...');
  
  // Delete room (cascades to room_players and matches)
  await supabase.from('rooms').delete().eq('id', roomId);
  
  // Delete users (cascades to transactions)
  for (const user of users) {
    await supabase.from('users').delete().eq('id', user.id);
  }
  
  console.log('✅ Cleanup complete');
}

async function runDemo(): Promise<void> {
  console.log('🎮 DEGN.gg Arcade Demo - Phase 2');
  console.log('=====================================\n');

  try {
    // Step 1: Create mock users
    const users = await createMockUsers();
    if (users.length === 0) {
      throw new Error('No users created');
    }

    // Step 2: Create room
    const roomId = await createRoom(users[0].id);

    // Step 3: Place bets
    await placeBets(users, roomId);

    // Step 4: Run match
    await runMatch(roomId);

    // Step 5: Show results
    await showFinalBalances(users);
    await showRakeInfo();

    // Step 6: Cleanup
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      await cleanup(users, roomId);
    } else {
      console.log('\n💡 Run with --cleanup flag to remove demo data');
      console.log(`   Room ID: ${roomId}`);
    }

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  runDemo();
}

export { runDemo };


