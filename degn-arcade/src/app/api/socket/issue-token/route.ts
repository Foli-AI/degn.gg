/**
 * POST /api/socket/issue-token
 * 
 * Issues a signed ephemeral token for Socket.IO authentication.
 * Token contains userId, lobbyId, and expiration (2 minute TTL).
 * 
 * Expected Input:
 * {
 *   userId: string,
 *   lobbyId: string,
 *   username?: string
 * }
 * 
 * Expected Output:
 * {
 *   token: string,
 *   expiresIn: number (seconds)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SERVER_SECRET || 'dev-secret-change-in-production';
const TOKEN_TTL = 120; // 2 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, lobbyId, username } = body;

    // Validate input
    if (!userId || !lobbyId) {
      return NextResponse.json(
        { error: 'userId and lobbyId are required' },
        { status: 400 }
      );
    }

    // Create JWT token
    const payload = {
      userId,
      lobbyId,
      username: username || `Player_${userId.substr(-4)}`,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256'
    });

    return NextResponse.json({
      token,
      expiresIn: TOKEN_TTL
    });
  } catch (error: any) {
    console.error('[API] Token issue error:', error);
    return NextResponse.json(
      { error: 'Failed to issue token', message: error.message },
      { status: 500 }
    );
  }
}

