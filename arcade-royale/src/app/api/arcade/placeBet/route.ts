import { NextRequest, NextResponse } from 'next/server';
import { placeBet } from '@/lib/arcadeEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, roomId, amount } = body;

    // Validate input
    if (!userId || !roomId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, roomId, amount' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Place bet using arcade engine
    const result = await placeBet(userId, roomId, amount);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Place bet API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


