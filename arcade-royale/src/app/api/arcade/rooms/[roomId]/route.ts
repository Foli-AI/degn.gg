import { NextRequest, NextResponse } from 'next/server';
import { getRoomDetails } from '@/lib/arcadeEngine';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const result = await getRoomDetails(roomId);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      room: result.room,
      players: result.players
    });

  } catch (error) {
    console.error('Get room details API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


