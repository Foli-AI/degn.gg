import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, userId, amount } = body;

    // Validate required fields
    if (!roomId || !userId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate bet amount
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Bet amount must be positive' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Start database transaction
    // 2. Fetch and lock user record
    // 3. Fetch and lock room record
    // 4. Validate user has sufficient balance
    // 5. Validate room is accepting bets
    // 6. Validate bet amount is within limits
    // 7. Deduct amount from user balance
    // 8. Record transaction
    // 9. Update room pot
    // 10. Commit transaction
    // 11. Broadcast update via Socket.io

    // Mock validation
    const mockUser = {
      id: userId,
      balance: 1000,
      username: 'TestUser'
    };

    const mockRoom = {
      id: roomId,
      status: 'waiting',
      minEntry: 10,
      maxEntry: 1000,
      totalPot: 500
    };

    // Validate user balance
    if (mockUser.balance < amount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Validate room status
    if (mockRoom.status !== 'waiting') {
      return NextResponse.json(
        { success: false, error: 'Room is not accepting bets' },
        { status: 400 }
      );
    }

    // Validate bet limits
    if (amount < mockRoom.minEntry || amount > mockRoom.maxEntry) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Bet must be between ${mockRoom.minEntry} and ${mockRoom.maxEntry} SOL` 
        },
        { status: 400 }
      );
    }

    // Mock successful bet placement
    const newBalance = mockUser.balance - amount;
    const newPot = mockRoom.totalPot + amount;

    // Create transaction record
    const transaction = {
      id: `tx_${Date.now()}`,
      userId,
      roomId,
      amount: -amount, // Negative for debit
      type: 'bet',
      timestamp: new Date().toISOString(),
      meta: {
        roomId,
        betAmount: amount
      }
    };

    return NextResponse.json({
      success: true,
      transaction,
      userBalance: newBalance,
      roomPot: newPot,
      message: 'Bet placed successfully'
    });

  } catch (error) {
    console.error('Failed to place bet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to place bet' },
      { status: 500 }
    );
  }
}

