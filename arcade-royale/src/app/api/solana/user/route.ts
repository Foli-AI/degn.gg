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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json();
    const { walletAddress, walletType } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Upsert user record
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        wallet_address: walletAddress,
        username: `Player_${walletAddress.slice(0, 8)}`,
        credits: 1000, // Default starting credits
        wallet_type: walletType || 'Unknown',
        last_active: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert user:', error);
      return NextResponse.json({ error: 'Failed to create/update user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

