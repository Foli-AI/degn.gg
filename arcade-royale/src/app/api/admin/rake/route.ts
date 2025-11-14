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
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }
    
    // TODO: Add admin authentication check
    const adminKey = request.headers.get('x-admin-key');
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current rake balance
    const { data: rakeAccount, error: rakeError } = await supabase
      .from('rake_account')
      .select('*')
      .single();

    if (rakeError) {
      return NextResponse.json(
        { success: false, error: rakeError.message },
        { status: 400 }
      );
    }

    // Get rake history (recent transactions)
    const { data: rakeHistory, error: historyError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'rake')
      .order('created_at', { ascending: false })
      .limit(50);

    if (historyError) {
      return NextResponse.json(
        { success: false, error: historyError.message },
        { status: 400 }
      );
    }

    // Get rake statistics
    const { data: rakeStats, error: statsError } = await supabase
      .from('transactions')
      .select('amount, created_at')
      .eq('type', 'rake');

    if (statsError) {
      return NextResponse.json(
        { success: false, error: statsError.message },
        { status: 400 }
      );
    }

    const totalRakeCollected = rakeStats?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayRake = rakeStats?.filter(t => new Date(t.created_at) >= todayStart)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    return NextResponse.json({
      success: true,
      currentBalance: parseFloat(rakeAccount.balance),
      totalCollected: totalRakeCollected,
      todayCollected: todayRake,
      lastUpdated: rakeAccount.last_updated,
      recentTransactions: rakeHistory
    });

  } catch (error) {
    console.error('Rake history API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

