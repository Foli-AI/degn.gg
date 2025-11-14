import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, userId, username, betAmount } = body;

    // Validate required fields
    if (!roomId || !userId || !username || !betAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate bet amount
    if (betAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Bet amount must be positive' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Fetch the room from database
    // 2. Validate room exists and is accepting players
    // 3. Check user has sufficient balance
    // 4. Validate bet amount is within room limits
    // 5. Add player to room
    // 6. Deduct bet amount from user balance
    // 7. Update room total pot
    // 8. Broadcast room update via Socket.io

    // Mock room validation
    const mockRoom = {
      id: roomId,
      status: 'waiting',
      minEntry: 50,
      maxEntry: 500,
      maxPlayers: 4,
      players: [
        { id: 'existing_player', username: 'ExistingPlayer', betAmount: 100, status: 'active' }
      ]
    };

    // Validate room status
    if (mockRoom.status !== 'waiting') {
      return NextResponse.json(
        { success: false, error: 'Room is not accepting new players' },
        { status: 400 }
      );
    }

    // Validate room capacity
    if (mockRoom.players.length >= mockRoom.maxPlayers) {
      return NextResponse.json(
        { success: false, error: 'Room is full' },
        { status: 400 }
      );
    }

    // Validate bet amount limits
    if (betAmount < mockRoom.minEntry || betAmount > mockRoom.maxEntry) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Bet amount must be between ${mockRoom.minEntry} and ${mockRoom.maxEntry} SOL` 
        },
        { status: 400 }
      );
    }

    // Check if user already in room
    if (mockRoom.players.some(p => p.id === userId)) {
      return NextResponse.json(
        { success: false, error: 'You are already in this room' },
        { status: 400 }
      );
    }

    // Mock user balance check (in real app, fetch from database)
    const mockUserBalance = 1000;
    if (mockUserBalance < betAmount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Create player entry
    const newPlayer = {
      id: userId,
      username,
      betAmount: Number(betAmount),
      status: 'active' as const,
      joinedAt: new Date().toISOString()
    };

    // Mock successful join
    const updatedRoom = {
      ...mockRoom,
      players: [...mockRoom.players, newPlayer],
      totalPot: mockRoom.players.reduce((sum, p) => sum + p.betAmount, 0) + betAmount
    };

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      player: newPlayer,
      userBalance: mockUserBalance - betAmount,
      message: 'Successfully joined room'
    });

  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join room' },
      { status: 500 }
    );
  }
}

