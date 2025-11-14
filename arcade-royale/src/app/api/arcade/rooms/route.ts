import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getAvailableRooms } from '@/lib/arcadeEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || undefined;

    const result = await getAvailableRooms(game);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      rooms: result.rooms
    });

  } catch (error) {
    console.error('Get rooms API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostId, game, name, minEntry, maxEntry, maxPlayers } = body;

    // Validate input
    if (!hostId || !game || !name || !minEntry || !maxEntry) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (minEntry <= 0 || maxEntry <= 0 || minEntry > maxEntry) {
      return NextResponse.json(
        { success: false, error: 'Invalid entry amounts' },
        { status: 400 }
      );
    }

    const result = await createRoom(
      hostId,
      game,
      name,
      minEntry,
      maxEntry,
      maxPlayers || 4
    );

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      room: result.room
    });

  } catch (error) {
    console.error('Create room API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


