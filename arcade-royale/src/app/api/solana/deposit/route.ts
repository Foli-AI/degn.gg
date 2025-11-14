import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey } from '@solana/web3.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function getConnection() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json();
    const { walletAddress, amount, signature, type } = body;

    if (!walletAddress || !amount || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify transaction on-chain
    const connection = getConnection();
    let transaction;
    
    try {
      transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed'
      });
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });
    }

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 });
    }

    // Verify transaction details
    const treasuryWallet = process.env.NEXT_PUBLIC_TREASURY_WALLET;
    if (!treasuryWallet) {
      return NextResponse.json({ error: 'Treasury wallet not configured' }, { status: 500 });
    }

    // Check if transaction involves the correct addresses
    const accountKeys = transaction.transaction.message.accountKeys.map(key => key.toString());
    if (!accountKeys.includes(walletAddress) || !accountKeys.includes(treasuryWallet)) {
      return NextResponse.json({ error: 'Invalid transaction addresses' }, { status: 400 });
    }

    // Start database transaction
    const { data: existingTx, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('signature', signature)
      .single();

    if (existingTx) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 });
    }

    // Update user balance and record transaction
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = (user.credits || 0) + amount;

    // Update user balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        credits: newBalance,
        last_active: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress);

    if (updateError) {
      console.error('Failed to update user balance:', updateError);
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: walletAddress, // Using wallet address as user_id for now
        amount: amount,
        type: type || 'deposit',
        signature: signature,
        status: 'confirmed',
        meta: {
          walletAddress,
          blockTime: transaction.blockTime,
          slot: transaction.slot
        }
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
      // Don't return error here as balance was already updated
    }

    return NextResponse.json({
      success: true,
      newBalance,
      signature,
      message: 'Deposit processed successfully'
    });
  } catch (error) {
    console.error('Deposit API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

