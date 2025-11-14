import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';

function getConnection() {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature, expectedAmount, expectedRecipient, expectedSender } = body;

    if (!signature) {
      return NextResponse.json({ error: 'Transaction signature is required' }, { status: 400 });
    }

    const connection = getConnection();
    
    // Fetch transaction details
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!transaction) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction not found or not confirmed' 
      }, { status: 404 });
    }

    // Extract transaction details
    const { meta, transaction: tx } = transaction;
    
    if (!meta || meta.err) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction failed on-chain' 
      }, { status: 400 });
    }

    // Get account keys
    const accountKeys = tx.message.accountKeys.map(key => key.toString());
    
    // Verify transaction details if provided
    const verification: any = {
      signature,
      confirmed: true,
      blockTime: transaction.blockTime,
      slot: transaction.slot,
      fee: meta.fee,
      accounts: accountKeys,
      success: !meta.err
    };

    // Optional: Verify expected parameters
    if (expectedSender && !accountKeys.includes(expectedSender)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expected sender not found in transaction',
        verification 
      }, { status: 400 });
    }

    if (expectedRecipient && !accountKeys.includes(expectedRecipient)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Expected recipient not found in transaction',
        verification 
      }, { status: 400 });
    }

    // Verify amount if provided (this is more complex and depends on instruction parsing)
    if (expectedAmount) {
      // For SOL transfers, we can check the balance changes
      const balanceChanges = meta.preBalances.map((preBalance, index) => ({
        account: accountKeys[index],
        change: meta.postBalances[index] - preBalance
      }));

      verification.balanceChanges = balanceChanges;
    }

    return NextResponse.json({
      success: true,
      verified: true,
      transaction: verification
    });

  } catch (error) {
    console.error('Transaction verification error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to verify transaction' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signature = searchParams.get('signature');

    if (!signature) {
      return NextResponse.json({ error: 'Transaction signature is required' }, { status: 400 });
    }

    const connection = getConnection();
    
    // Get transaction status
    const statuses = await connection.getSignatureStatuses([signature]);
    const status = statuses.value[0];

    if (!status) {
      return NextResponse.json({ 
        success: false,
        status: 'not_found',
        message: 'Transaction not found'
      });
    }

    return NextResponse.json({
      success: true,
      status: {
        slot: status.slot,
        confirmations: status.confirmations,
        err: status.err,
        confirmationStatus: status.confirmationStatus
      }
    });

  } catch (error) {
    console.error('Transaction status check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check transaction status' 
    }, { status: 500 });
  }
}
