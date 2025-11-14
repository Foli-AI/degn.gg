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

// Verify admin access
function verifyAdminAccess(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.ADMIN_KEY;
  
  return adminKey === expectedKey && expectedKey !== undefined;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'overview':
        return await getOverview(supabase);
      case 'rake':
        return await getRakeData(supabase);
      case 'treasury':
        return await getTreasuryData();
      case 'transactions':
        return await getTransactionData(supabase, searchParams);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin Solana API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getOverview(supabase: any) {
  // Get total rake collected
  const { data: rakeData, error: rakeError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'rake');

  if (rakeError) {
    console.error('Failed to fetch rake data:', rakeError);
    return NextResponse.json({ error: 'Failed to fetch rake data' }, { status: 500 });
  }

  const totalRake = rakeData.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);

  // Get total deposits
  const { data: depositData, error: depositError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'deposit');

  if (depositError) {
    console.error('Failed to fetch deposit data:', depositError);
    return NextResponse.json({ error: 'Failed to fetch deposit data' }, { status: 500 });
  }

  const totalDeposits = depositData.reduce((sum: number, tx: any) => sum + tx.amount, 0);

  // Get total withdrawals
  const { data: withdrawData, error: withdrawError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'withdrawal');

  if (withdrawError) {
    console.error('Failed to fetch withdrawal data:', withdrawError);
    return NextResponse.json({ error: 'Failed to fetch withdrawal data' }, { status: 500 });
  }

  const totalWithdrawals = Math.abs(withdrawData.reduce((sum: number, tx: any) => sum + tx.amount, 0));

  // Get total bets
  const { data: betData, error: betError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'bet');

  if (betError) {
    console.error('Failed to fetch bet data:', betError);
    return NextResponse.json({ error: 'Failed to fetch bet data' }, { status: 500 });
  }

  const totalBets = Math.abs(betData.reduce((sum: number, tx: any) => sum + tx.amount, 0));

  // Get total payouts
  const { data: payoutData, error: payoutError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'payout');

  if (payoutError) {
    console.error('Failed to fetch payout data:', payoutError);
    return NextResponse.json({ error: 'Failed to fetch payout data' }, { status: 500 });
  }

  const totalPayouts = payoutData.reduce((sum: number, tx: any) => sum + tx.amount, 0);

  // Calculate net treasury balance
  const netBalance = totalDeposits - totalWithdrawals - totalPayouts + totalRake;

  return NextResponse.json({
    success: true,
    overview: {
      totalRake,
      totalDeposits,
      totalWithdrawals,
      totalBets,
      totalPayouts,
      netBalance,
      rakePercentage: totalBets > 0 ? (totalRake / totalBets) * 100 : 0
    }
  });
}

async function getRakeData(supabase: any) {
  // Get rake transactions with details
  const { data: rakeTransactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'rake')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch rake transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch rake data' }, { status: 500 });
  }

  // Calculate daily rake for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: dailyRake, error: dailyError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('type', 'rake')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (dailyError) {
    console.error('Failed to fetch daily rake:', dailyError);
    return NextResponse.json({ error: 'Failed to fetch daily rake' }, { status: 500 });
  }

  // Group by day
  const dailyRakeMap = new Map<string, number>();
  dailyRake.forEach((tx: any) => {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    const current = dailyRakeMap.get(date) || 0;
    dailyRakeMap.set(date, current + Math.abs(tx.amount));
  });

  const dailyRakeArray = Array.from(dailyRakeMap.entries()).map(([date, amount]) => ({
    date,
    amount
  }));

  return NextResponse.json({
    success: true,
    rake: {
      transactions: rakeTransactions,
      dailyRake: dailyRakeArray,
      totalRake: rakeTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0)
    }
  });
}

async function getTreasuryData() {
  try {
    const connection = getConnection();
    const treasuryWallet = process.env.NEXT_PUBLIC_TREASURY_WALLET;
    
    if (!treasuryWallet) {
      return NextResponse.json({ error: 'Treasury wallet not configured' }, { status: 500 });
    }

    const treasuryPubkey = new PublicKey(treasuryWallet);
    const balance = await connection.getBalance(treasuryPubkey);
    
    // Get recent transactions for the treasury wallet
    const signatures = await connection.getSignaturesForAddress(treasuryPubkey, { limit: 20 });
    
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            commitment: 'confirmed'
          });
          
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            slot: sig.slot,
            err: sig.err,
            memo: sig.memo,
            confirmationStatus: sig.confirmationStatus,
            transaction: tx ? {
              fee: tx.meta?.fee,
              preBalances: tx.meta?.preBalances,
              postBalances: tx.meta?.postBalances
            } : null
          };
        } catch (error) {
          console.error('Failed to fetch transaction details:', error);
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            slot: sig.slot,
            err: sig.err,
            memo: sig.memo,
            confirmationStatus: sig.confirmationStatus,
            transaction: null
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      treasury: {
        address: treasuryWallet,
        balance: balance / 1e9, // Convert lamports to SOL
        transactions
      }
    });
  } catch (error) {
    console.error('Failed to fetch treasury data:', error);
    return NextResponse.json({ error: 'Failed to fetch treasury data' }, { status: 500 });
  }
}

async function getTransactionData(supabase: any, searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 500));

  if (type) {
    query = query.eq('type', type);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }

  // Calculate summary statistics
  const summary = {
    totalTransactions: transactions.length,
    totalVolume: transactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0),
    byType: {} as Record<string, { count: number; volume: number }>
  };

  transactions.forEach((tx: any) => {
    if (!summary.byType[tx.type]) {
      summary.byType[tx.type] = { count: 0, volume: 0 };
    }
    summary.byType[tx.type].count++;
    summary.byType[tx.type].volume += Math.abs(tx.amount);
  });

  return NextResponse.json({
    success: true,
    transactions: {
      data: transactions,
      summary,
      pagination: {
        limit,
        count: transactions.length,
        hasMore: transactions.length === limit
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'withdraw_rake':
        return await withdrawRake(body);
      case 'emergency_stop':
        return await emergencyStop(body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin Solana POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function withdrawRake(body: any) {
  // This would implement rake withdrawal to admin wallet
  // For security, this should require multi-sig or additional verification
  
  return NextResponse.json({
    success: false,
    error: 'Rake withdrawal requires multi-sig approval (not implemented in demo)'
  });
}

async function emergencyStop(body: any) {
  // This would implement emergency stop functionality
  // Disable new bets, process pending withdrawals, etc.
  
  return NextResponse.json({
    success: false,
    error: 'Emergency stop requires additional security measures (not implemented in demo)'
  });
}

