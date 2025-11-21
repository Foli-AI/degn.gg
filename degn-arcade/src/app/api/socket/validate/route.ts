/**
 * POST /api/socket/validate
 * 
 * Validates a Socket.IO authentication token.
 * Called by Socket.IO server to verify client tokens.
 * 
 * Expected Input:
 * {
 *   token: string
 * }
 * 
 * Expected Output:
 * {
 *   valid: boolean,
 *   userId?: string,
 *   lobbyId?: string,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SERVER_SECRET || 'dev-secret-change-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: 'Token is required'
      });
    }

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      }) as any;

      // Check expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({
          valid: false,
          error: 'Token expired'
        });
      }

      return NextResponse.json({
        valid: true,
        userId: decoded.userId,
        lobbyId: decoded.lobbyId,
        username: decoded.username
      });
    } catch (jwtError: any) {
      // JWT verification failed
      return NextResponse.json({
        valid: false,
        error: jwtError.message || 'Invalid token'
      });
    }
  } catch (error: any) {
    console.error('[API] Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed', message: error.message },
      { status: 500 }
    );
  }
}

