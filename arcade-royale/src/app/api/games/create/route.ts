import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, game, minEntry, maxEntry, maxPlayers, hostId, hostUsername } = body;

    // Validate required fields
    if (!name || !game || !minEntry || !maxEntry || !maxPlayers || !hostId || !hostUsername) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate game type
    const validGames = ['CoinRaid', 'SolSerpentRoyale', 'QuickDrawArena', 'MoonBlaster'];
    if (!validGames.includes(game)) {
      return NextResponse.json(
        { success: false, error: 'Invalid game type' },
        { status: 400 }
      );
    }

    // Validate entry limits
    if (minEntry <= 0 || maxEntry <= 0 || minEntry > maxEntry) {
      return NextResponse.json(
        { success: false, error: 'Invalid entry limits' },
        { status: 400 }
      );
    }

    // Validate max players
    if (maxPlayers < 2 || maxPlayers > 8) {
      return NextResponse.json(
        { success: false, error: 'Max players must be between 2 and 8' },
        { status: 400 }
      );
    }

    // Create new room (in real app, this would save to database)
    const newRoom = {
      id: `room_${game.toLowerCase()}_${Date.now()}`,
      game,
      name: name.trim(),
      host: {
        id: hostId,
        username: hostUsername
      },
      players: [],
      status: 'waiting' as const,
      minEntry: Number(minEntry),
      maxEntry: Number(maxEntry),
      maxPlayers: Number(maxPlayers),
      totalPot: 0,
      createdAt: new Date().toISOString(),
      startsAt: null,
      completedAt: null
    };

    // In a real application, you would:
    // 1. Save the room to the database
    // 2. Broadcast the new room to all connected clients via Socket.io
    // 3. Return the created room data

    return NextResponse.json({
      success: true,
      room: newRoom,
      message: 'Room created successfully'
    });

  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

