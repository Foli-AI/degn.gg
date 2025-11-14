import { NextRequest, NextResponse } from 'next/server';
import { startMatch } from '@/lib/arcadeEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId } = body;

    // Validate input
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: roomId' },
        { status: 400 }
      );
    }

    // Start match using arcade engine
    const result = await startMatch(roomId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Start match API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


