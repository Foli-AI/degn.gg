/**
 * POST /api/match/complete
 * 
 * Called by Socket.IO server when a match ends.
 * Processes winner payout and returns transaction ID.
 * 
 * Expected Input (from Socket.IO server):
 * {
 *   matchId: string,
 *   lobbyId: string,
 *   winnerWallet: string,
 *   potSize: number,
 *   houseRake: number,
 *   players: Array<{ wallet: string, entryFee: number }>
 * }
 * 
 * Headers:
 * - Authorization: Bearer <SERVER_SECRET>
 * 
 * Expected Output:
 * {
 *   success: boolean,
 *   tx?: string (transaction ID),
 *   payout?: number,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SERVER_SECRET = process.env.SERVER_SECRET || 'dev-secret-change-in-production';
const SOLANA_RPC = process.env.SOLANA_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
const ESCROW_PRIVATE_KEY = process.env.ESCROW_PRIVATE_KEY; // JSON array

// Initialize Solana connection
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Load escrow wallet
let escrowKeypair: Keypair | null = null;
if (ESCROW_PRIVATE_KEY) {
  try {
    const secretKey = JSON.parse(ESCROW_PRIVATE_KEY);
    escrowKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    console.log('[API] ✅ Escrow wallet loaded');
  } catch (error) {
    console.error('[API] ❌ Failed to load escrow wallet:', error);
  }
}

/**
 * Send SOL payout to winner
 */
async function sendPayout(winnerWalletAddress: string, amountSOL: number): Promise<string | null> {
  if (!escrowKeypair) {
    console.warn('[API] ⚠️ Escrow wallet not configured, skipping payout');
    return null;
  }

  try {
    const recipientPubkey = new PublicKey(winnerWalletAddress);
    const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: amountLamports
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [escrowKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`[API] ✅ Payout sent: ${amountSOL} SOL to ${winnerWalletAddress}, tx: ${signature}`);
    return signature;
  } catch (error: any) {
    console.error('[API] ❌ Payout error:', error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== SERVER_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Invalid server secret' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { matchId, lobbyId, winnerWallet, potSize, houseRake, players } = body;

    if (!matchId || !lobbyId || !winnerWallet) {
      return NextResponse.json(
        { success: false, error: 'matchId, lobbyId, and winnerWallet are required' },
        { status: 400 }
      );
    }

    // Calculate winner payout (potSize - houseRake)
    const winnerPayout = potSize - (houseRake || potSize * 0.10);

    console.log(`[API] 🏆 Match complete: matchId=${matchId}, lobby=${lobbyId}, winner=${winnerWallet}, payout=${winnerPayout} SOL`);

    // Use winnerWallet from payload
    const winnerWalletAddress = winnerWallet;

    // Send payout (if escrow wallet is configured)
    let txId: string | null = null;
    if (escrowKeypair && winnerWalletAddress && winnerWalletAddress !== 'WinnerWalletAddress123...') {
      txId = await sendPayout(winnerWalletAddress, winnerPayout);
    } else {
      // Mock transaction for development
      txId = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[API] ⚠️ Using mock transaction (escrow not configured or wallet not found)');
    }

    // TODO: Record match result in database (Supabase)
    // await supabase.from('matches').insert({ lobbyId, winner, payout, txId, ... });

    return NextResponse.json({
      success: true,
      tx: txId,
      payout: winnerPayout
    });
  } catch (error: any) {
    console.error('[API] Match complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete match', message: error.message },
      { status: 500 }
    );
  }
}

