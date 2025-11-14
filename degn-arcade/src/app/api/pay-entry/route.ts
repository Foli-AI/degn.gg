import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateServerEnv, SAFE_ENV } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Solana connection
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
  'confirmed'
);

// Escrow wallet public key (should match backend)
const ESCROW_PUBLIC_KEY = process.env.NEXT_PUBLIC_ESCROW_PUBLIC_KEY || 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // Default devnet address

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lobbyId, playerAddress, entryAmount } = body;

    if (!lobbyId || !playerAddress || typeof entryAmount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: lobbyId, playerAddress, entryAmount' },
        { status: 400 }
      );
    }

    // Validate Solana address
    let fromPubkey: PublicKey;
    let toPubkey: PublicKey;
    
    try {
      fromPubkey = new PublicKey(playerAddress);
      toPubkey = new PublicKey(ESCROW_PUBLIC_KEY);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      );
    }

    // Create unsigned transaction
    const entryFeeLamports = Math.floor(entryAmount * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: entryFeeLamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // Serialize transaction for client to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
    }).toString('base64');

    console.log(`💳 Entry transaction created for lobby ${lobbyId}:`, {
      playerAddress,
      entryAmount,
      escrowAddress: toPubkey.toBase58()
    });

    return NextResponse.json({
      transaction: serialized,
      escrowAddress: toPubkey.toBase58(),
      amount: entryAmount
    });

  } catch (error) {
    console.error('Error creating entry transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create entry transaction' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { lobbyId, signature, playerAddress, entryAmount } = body;

    if (!lobbyId || !signature || !playerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: lobbyId, signature, playerAddress' },
        { status: 400 }
      );
    }

    // Verify transaction on-chain
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found or not confirmed' },
        { status: 400 }
      );
    }

    // Extract transaction details
    let transactionAmount = 0;
    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      transactionAmount = (transaction.meta.preBalances[0] - transaction.meta.postBalances[0]) / LAMPORTS_PER_SOL;
    }

    // Validate server environment and get admin client
    const envValidation = validateServerEnv();
    if (!envValidation.valid) {
      console.error("❌ Server environment not properly configured:", envValidation.missing);
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let admin;
    try {
      admin = getAdminClient();
    } catch (error) {
      console.error("❌ Failed to get admin client:", error);
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    try {
      // First, ensure lobby exists in database
      const { data: lobby, error: lobbyError } = await admin
        .from('lobbies')
        .select('id, game_type, max_players, status')
        .eq('id', lobbyId)
        .single();

      if (lobbyError || !lobby) {
        // Create lobby if it doesn't exist
        const { error: createLobbyError } = await admin
          .from('lobbies')
          .insert({
            id: lobbyId,
            game_type: 'unknown', // Will be updated by matchmaker
            max_players: 2,
            status: 'waiting'
          });

        if (createLobbyError) {
          console.error('Failed to create lobby:', createLobbyError);
        }
      }

      // Check if payment already recorded
      const { data: existingEntry, error: checkError } = await admin
        .from('entries')
        .select('id, paid, transaction_signature')
        .eq('lobby_id', lobbyId)
        .eq('wallet', playerAddress)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Failed to check existing entry:', checkError);
        return NextResponse.json({ error: "Database query failed" }, { status: 500 });
      }

      if (existingEntry) {
        if (existingEntry.paid && existingEntry.transaction_signature) {
          console.log(`ℹ️ Payment already recorded for wallet: ${playerAddress} in lobby: ${lobbyId}`);
          return NextResponse.json({ 
            status: "already_recorded",
            message: "Payment already processed for this lobby",
            existingSignature: existingEntry.transaction_signature
          });
        }
        
        // Update existing entry
        const { error: updateError } = await admin
          .from('entries')
          .update({
            paid: true,
            transaction_signature: signature,
            amount_sol: transactionAmount,
            entry_amount: entryAmount
          })
          .eq('id', existingEntry.id);

        if (updateError) {
          console.error('Failed to update payment:', updateError);
          return NextResponse.json({ error: "Failed to update payment record" }, { status: 500 });
        }

        console.log(`[Supabase] ✅ Payment updated for wallet: ${playerAddress}`);
      } else {
        // Insert new payment record
        const { error: insertError } = await admin
          .from('entries')
          .insert({
            lobby_id: lobbyId,
            wallet: playerAddress,
            paid: true,
            transaction_signature: signature,
            amount_sol: transactionAmount,
            entry_amount: entryAmount,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          // Handle duplicate key error gracefully
          if (insertError.code === '23505') {
            console.log(`ℹ️ Payment record already exists (race condition) for wallet: ${playerAddress}`);
            return NextResponse.json({ 
              status: "already_recorded",
              message: "Payment already processed (concurrent request)"
            });
          }
          
          console.error('Failed to store payment:', insertError);
          return NextResponse.json({ error: "Failed to store payment record" }, { status: 500 });
        }

        console.log(`[Supabase] ✅ Payment recorded for wallet: ${playerAddress}`);
      }

      // Check if all required players are paid
      const { data: entries, error: entriesError } = await admin
        .from('entries')
        .select('wallet, paid, transaction_signature')
        .eq('lobby_id', lobbyId)
        .eq('paid', true);

      if (entriesError) {
        console.error('[PAY-ENTRY] ❌ Failed to check entries:', entriesError);
      } else {
        const requiredPlayers = lobby?.max_players || 2;
        const paidCount = entries?.length || 0;
        
        console.log(`[PAY-ENTRY] Payment status check:`, {
          lobbyId,
          paidCount,
          requiredPlayers,
          allPaid: paidCount >= requiredPlayers
        });

        if (entries && paidCount >= requiredPlayers) {
          console.log(`[PAY-ENTRY] ✅ All players ready. Triggering match start for lobby ${lobbyId}`);
          
          // Trigger match start via matchmaker
          try {
            const matchmakerUrl = `${SAFE_ENV.BACKEND_URL}/start-match`;
            console.log('[PAY-ENTRY] Calling matchmaker:', matchmakerUrl);
            
            const matchmakerResponse = await fetch(matchmakerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                lobbyId, 
                players: entries.map(e => ({ wallet: e.wallet, paid: e.paid }))
              })
            });

            if (!matchmakerResponse.ok) {
              const errorText = await matchmakerResponse.text();
              console.error('[PAY-ENTRY] ❌ Failed to trigger match start:', {
                status: matchmakerResponse.status,
                error: errorText
              });
            } else {
              const result = await matchmakerResponse.json();
              console.log('[PAY-ENTRY] ✅ Match start triggered:', result);
            }
          } catch (matchmakerError) {
            console.error('[PAY-ENTRY] ❌ Error contacting matchmaker:', matchmakerError);
          }
        } else {
          console.log(`[PAY-ENTRY] ⏳ Waiting for ${requiredPlayers - paidCount} more player(s) to pay`);
        }
      }

    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log(`✅ Entry payment verified for lobby ${lobbyId}:`, {
      playerAddress,
      signature,
      amount: transactionAmount
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      transactionDetails: {
        signature,
        amount: transactionAmount,
        confirmed: true
      }
    });

  } catch (error) {
    console.error('Error verifying entry transaction:', error);
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    );
  }
}
