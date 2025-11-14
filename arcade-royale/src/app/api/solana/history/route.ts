import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type'); // Optional filter by transaction type

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', walletAddress)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)); // Cap at 100 transactions

    // Add type filter if specified
    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Failed to fetch transaction history:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Format transactions for frontend
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      signature: tx.signature,
      status: tx.status || 'confirmed',
      timestamp: tx.created_at,
      meta: tx.meta || {},
      // Add display-friendly fields
      displayAmount: Math.abs(tx.amount),
      isCredit: tx.amount > 0,
      typeLabel: getTypeLabel(tx.type),
      statusColor: getStatusColor(tx.status || 'confirmed')
    }));

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      totalDeposits: transactions
        .filter(tx => tx.type === 'deposit')
        .reduce((sum, tx) => sum + tx.amount, 0),
      totalWithdrawals: Math.abs(transactions
        .filter(tx => tx.type === 'withdrawal')
        .reduce((sum, tx) => sum + tx.amount, 0)),
      totalBets: Math.abs(transactions
        .filter(tx => tx.type === 'bet')
        .reduce((sum, tx) => sum + tx.amount, 0)),
      totalWinnings: transactions
        .filter(tx => tx.type === 'payout')
        .reduce((sum, tx) => sum + tx.amount, 0)
    };

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      summary,
      pagination: {
        limit,
        count: transactions.length,
        hasMore: transactions.length === limit
      }
    });
  } catch (error) {
    console.error('Transaction history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    bet: 'Bet Placed',
    payout: 'Winnings',
    rake: 'House Fee',
    refund: 'Refund'
  };
  return labels[type] || type;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmed: 'green',
    pending: 'yellow',
    failed: 'red',
    cancelled: 'gray'
  };
  return colors[status] || 'gray';
}

