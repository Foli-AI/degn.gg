import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock active game rooms data
    const mockRooms = [
      {
        id: 'room_coinraid_1',
        game: 'CoinRaid',
        name: 'Beginner Coin Hunt',
        host: { id: 'host_1', username: 'GameMaster' },
        players: [
          { id: 'player_1', username: 'Alice', betAmount: 100, status: 'active' },
          { id: 'player_2', username: 'Bob', betAmount: 150, status: 'active' }
        ],
        status: 'waiting',
        minEntry: 50,
        maxEntry: 500,
        maxPlayers: 4,
        totalPot: 250,
        createdAt: new Date(Date.now() - 300000).toISOString(), // 5 min ago
        startsAt: null,
        completedAt: null
      },
      {
        id: 'room_serpent_1',
        game: 'SolSerpentRoyale',
        name: 'Snake Pit Arena',
        host: { id: 'host_2', username: 'SnakeCharmer' },
        players: [
          { id: 'player_3', username: 'Charlie', betAmount: 200, status: 'active' },
          { id: 'player_4', username: 'Diana', betAmount: 300, status: 'active' },
          { id: 'player_5', username: 'Eve', betAmount: 250, status: 'active' }
        ],
        status: 'running',
        minEntry: 100,
        maxEntry: 1000,
        maxPlayers: 6,
        totalPot: 750,
        createdAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
        startsAt: new Date(Date.now() - 60000).toISOString(), // Started 1 min ago
        completedAt: null
      },
      {
        id: 'room_quickdraw_1',
        name: 'Sharp Shooter Showdown',
        game: 'QuickDrawArena',
        host: { id: 'host_3', username: 'Gunslinger' },
        players: [
          { id: 'player_6', username: 'Frank', betAmount: 500, status: 'active' }
        ],
        status: 'waiting',
        minEntry: 200,
        maxEntry: 2000,
        maxPlayers: 4,
        totalPot: 500,
        createdAt: new Date(Date.now() - 120000).toISOString(), // 2 min ago
        startsAt: null,
        completedAt: null
      },
      {
        id: 'room_moonblaster_1',
        name: 'Asteroid Field Challenge',
        game: 'MoonBlaster',
        host: { id: 'host_4', username: 'SpaceAce' },
        players: [
          { id: 'player_7', username: 'Grace', betAmount: 150, status: 'winner' },
          { id: 'player_8', username: 'Henry', betAmount: 200, status: 'eliminated' },
          { id: 'player_9', username: 'Iris', betAmount: 175, status: 'eliminated' }
        ],
        status: 'completed',
        minEntry: 100,
        maxEntry: 800,
        maxPlayers: 6,
        totalPot: 525,
        createdAt: new Date(Date.now() - 900000).toISOString(), // 15 min ago
        startsAt: new Date(Date.now() - 600000).toISOString(), // Started 10 min ago
        completedAt: new Date(Date.now() - 300000).toISOString() // Completed 5 min ago
      }
    ];

    // Filter by status if provided
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const game = searchParams.get('game');
    
    let filteredRooms = mockRooms;
    
    if (status) {
      filteredRooms = filteredRooms.filter(room => room.status === status);
    }
    
    if (game) {
      filteredRooms = filteredRooms.filter(room => room.game === game);
    }

    return NextResponse.json({
      success: true,
      rooms: filteredRooms,
      total: filteredRooms.length
    });

  } catch (error) {
    console.error('Failed to fetch game rooms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch game rooms' },
      { status: 500 }
    );
  }
}

