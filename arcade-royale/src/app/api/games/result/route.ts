import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const roomId = searchParams.get('roomId');

    if (!matchId && !roomId) {
      return NextResponse.json(
        { success: false, error: 'Either matchId or roomId is required' },
        { status: 400 }
      );
    }

    // In a real application, you would fetch match results from database
    // Mock match result data
    const mockMatchResult = {
      matchId: matchId || `match_${Date.now()}`,
      roomId: roomId || 'room_example',
      game: 'CoinRaid',
      status: 'completed',
      winner: {
        id: 'player_1',
        username: 'CryptoKing',
        payout: 920 // After 8% rake
      },
      positions: [
        {
          playerId: 'player_1',
          username: 'CryptoKing',
          position: 1,
          payout: 920,
          betAmount: 300,
          eliminated: false
        },
        {
          playerId: 'player_2',
          username: 'SolanaQueen',
          position: 2,
          payout: 0,
          betAmount: 250,
          eliminated: true
        },
        {
          playerId: 'player_3',
          username: 'ArcadeMaster',
          position: 3,
          payout: 0,
          betAmount: 200,
          eliminated: true
        },
        {
          playerId: 'player_4',
          username: 'GameChanger',
          position: 4,
          payout: 0,
          betAmount: 250,
          eliminated: true
        }
      ],
      totalPot: 1000,
      rakeCollected: 80, // 8% of total pot
      payoutAmount: 920,
      seed: 'provably_fair_seed_12345',
      clientSeed: 'client_seed_67890',
      nonce: 1,
      startedAt: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      completedAt: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      duration: 240000, // 4 minutes in milliseconds
      eliminations: [
        {
          playerId: 'player_4',
          username: 'GameChanger',
          eliminatedAt: new Date(Date.now() - 180000).toISOString(), // 3 min ago
          reason: 'Hit obstacle'
        },
        {
          playerId: 'player_3',
          username: 'ArcadeMaster',
          eliminatedAt: new Date(Date.now() - 120000).toISOString(), // 2 min ago
          reason: 'Collision'
        },
        {
          playerId: 'player_2',
          username: 'SolanaQueen',
          eliminatedAt: new Date(Date.now() - 90000).toISOString(), // 1.5 min ago
          reason: 'Time expired'
        }
      ],
      fairnessProof: {
        serverSeed: 'server_seed_hash_abc123',
        clientSeed: 'client_seed_67890',
        nonce: 1,
        result: 'provably_fair_seed_12345'
      }
    };

    return NextResponse.json({
      success: true,
      result: mockMatchResult
    });

  } catch (error) {
    console.error('Failed to fetch match result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch match result' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, winnerId, positions, seed, clientSeed, nonce } = body;

    // Validate required fields
    if (!roomId || !winnerId || !positions || !seed) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Start database transaction
    // 2. Fetch room and validate it's in 'running' state
    // 3. Calculate total pot and rake
    // 4. Verify winner is valid player in room
    // 5. Create match record
    // 6. Update room status to 'completed'
    // 7. Process payouts (credit winner, record transactions)
    // 8. Update rake account
    // 9. Refresh leaderboard
    // 10. Commit transaction
    // 11. Broadcast results via Socket.io

    // Mock room data
    const mockRoom = {
      id: roomId,
      players: [
        { id: 'player_1', betAmount: 300 },
        { id: 'player_2', betAmount: 250 },
        { id: 'player_3', betAmount: 200 },
        { id: 'player_4', betAmount: 250 }
      ]
    };

    const totalPot = mockRoom.players.reduce((sum, p) => sum + p.betAmount, 0);
    const rakePercent = 0.08; // 8%
    const rakeAmount = totalPot * rakePercent;
    const payoutAmount = totalPot - rakeAmount;

    // Create match result
    const matchResult = {
      matchId: `match_${Date.now()}`,
      roomId,
      winnerId,
      positions,
      totalPot,
      rakeCollected: rakeAmount,
      payoutAmount,
      seed,
      clientSeed: clientSeed || 'default_client_seed',
      nonce: nonce || 1,
      completedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      result: matchResult,
      message: 'Match result recorded successfully'
    });

  } catch (error) {
    console.error('Failed to record match result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record match result' },
      { status: 500 }
    );
  }
}

