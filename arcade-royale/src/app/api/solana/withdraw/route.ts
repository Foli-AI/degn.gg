import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

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

function getTreasuryKeypair() {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Treasury private key not configured');
  }
  
  // In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
  const secretKey = Uint8Array.from(JSON.parse(privateKey));
  return Keypair.fromSecretKey(secretKey);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json();
    const { walletAddress, amount } = body;

    if (!walletAddress || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal request' }, { status: 400 });
    }

    // Get user and verify balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.credits < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Minimum withdrawal check
    const minWithdrawal = 0.01; // 0.01 SOL minimum
    if (amount < minWithdrawal) {
      return NextResponse.json({ 
        error: `Minimum withdrawal is ${minWithdrawal} SOL` 
      }, { status: 400 });
    }

    try {
      // Create withdrawal transaction
      const connection = getConnection();
      const treasuryKeypair = getTreasuryKeypair();
      const recipientPubkey = new PublicKey(walletAddress);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: treasuryKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = treasuryKeypair.publicKey;

      // Sign and send transaction
      transaction.sign(treasuryKeypair);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      // Update user balance
      const newBalance = user.credits - amount;
      
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
          user_id: walletAddress,
          amount: -amount, // Negative for withdrawal
          type: 'withdrawal',
          signature: signature,
          status: 'confirmed',
          meta: {
            walletAddress,
            recipientAddress: walletAddress
          }
        });

      if (txError) {
        console.error('Failed to record transaction:', txError);
      }

      return NextResponse.json({
        success: true,
        signature,
        newBalance,
        amount,
        message: 'Withdrawal processed successfully'
      });

    } catch (error) {
      console.error('Withdrawal transaction failed:', error);
      return NextResponse.json({ 
        error: 'Withdrawal transaction failed. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Withdrawal API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

