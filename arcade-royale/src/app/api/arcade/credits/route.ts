import { NextRequest, NextResponse } from 'next/server';
import { getUserCredits } from '@/lib/arcadeEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const credits = await getUserCredits(userId);

    return NextResponse.json({
      success: true,
      credits
    });

  } catch (error) {
    console.error('Get credits API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


