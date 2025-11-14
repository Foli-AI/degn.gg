#!/usr/bin/env node

/**
 * Demo Script for DEGN.gg Phase 4 - Solana Integration
 * 
 * This script demonstrates the full workflow:
 * 1. Creates mock users with Solana wallets
 * 2. Creates a game room
 * 3. Joins 3 users to the room with SOL bets
 * 4. Starts and completes a match
 * 5. Shows rake collection and payouts
 */

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Demo configuration
const DEMO_CONFIG = {
  gameType: 'CoinRaid',
  roomName: 'Demo Match',
  minEntry: 0.1,
  maxEntry: 1.0,
  maxPlayers: 4,
  rakePercentage: 5, // 5% house rake
  betAmounts: [0.1, 0.25, 0.5] // SOL amounts for each player
};

async function main() {
  console.log('🎮 DEGN.gg Phase 4 Demo - Solana Integration\n');
  
  try {
    // Step 1: Create mock users
    console.log('👥 Creating mock users...');
    const users = await createMockUsers();
    console.log(`✅ Created ${users.length} users\n`);

    // Step 2: Create game room
    console.log('🏠 Creating game room...');
    const room = await createGameRoom(users[0]);
    console.log(`✅ Room created: ${room.id}\n`);

    // Step 3: Join users to room
    console.log('🎯 Joining users to room...');
    const bets = await joinUsersToRoom(room.id, users);
    console.log(`✅ ${bets.length} users joined with bets\n`);

    // Step 4: Start match
    console.log('🚀 Starting match...');
    const match = await startMatch(room.id, bets);
    console.log(`✅ Match started: ${match.id}\n`);

    // Step 5: Complete match (simulate game outcome)
    console.log('🏆 Completing match...');
    const result = await completeMatch(match.id, users[1].id); // User 2 wins
    console.log(`✅ Match completed! Winner: ${result.winner.username}\n`);

    // Step 6: Show results
    console.log('📊 Match Results:');
    console.log(`   Winner: ${result.winner.username}`);
    console.log(`   Payout: ${result.winner.payout} SOL`);
    console.log(`   Total Pot: ${result.totalPot} SOL`);
    console.log(`   Rake Collected: ${result.rakeCollected} SOL`);
    console.log(`   Transaction: ${result.signature}\n`);

    // Step 7: Show updated balances
    console.log('💰 Updated Balances:');
    for (const user of users) {
      const { data: updatedUser } = await supabase
        .from('users')
        .select('username, credits')
        .eq('id', user.id)
        .single();
      
      console.log(`   ${updatedUser.username}: ${updatedUser.credits} SOL`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   • ${users.length} players participated`);
    console.log(`   • Total bets: ${bets.reduce((sum, bet) => sum + bet.amount, 0)} SOL`);
    console.log(`   • Rake collected: ${result.rakeCollected} SOL`);
    console.log(`   • Winner payout: ${result.winner.payout} SOL`);

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

async function createMockUsers() {
  const users = [];
  
  for (let i = 1; i <= 3; i++) {
    // Generate a new Solana keypair for each user
    const keypair = Keypair.generate();
    const walletAddress = keypair.publicKey.toString();
    
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        username: `DemoPlayer${i}`,
        wallet_address: walletAddress,
        credits: 10.0, // Start with 10 SOL
        wallet_type: 'Demo'
      }, {
        onConflict: 'wallet_address'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user ${i}: ${error.message}`);
    }

    users.push(user);
    console.log(`   Created ${user.username} (${walletAddress.slice(0, 8)}...)`);
  }

  return users;
}

async function createGameRoom(host) {
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      game: DEMO_CONFIG.gameType,
      host_id: host.id,
      name: DEMO_CONFIG.roomName,
      min_entry: DEMO_CONFIG.minEntry,
      max_entry: DEMO_CONFIG.maxEntry,
      max_players: DEMO_CONFIG.maxPlayers,
      status: 'waiting'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create room: ${error.message}`);
  }

  console.log(`   Room: ${room.name} (${room.game})`);
  console.log(`   Entry: ${room.min_entry} - ${room.max_entry} SOL`);
  console.log(`   Max Players: ${room.max_players}`);

  return room;
}

async function joinUsersToRoom(roomId, users) {
  const bets = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const betAmount = DEMO_CONFIG.betAmounts[i];

    // Use the place_bet RPC function for atomic transaction
    const { data: result, error } = await supabase
      .rpc('place_bet', {
        p_user_id: user.id,
        p_room_id: roomId,
        p_amount: betAmount
      });

    if (error) {
      throw new Error(`Failed to place bet for ${user.username}: ${error.message}`);
    }

    bets.push({
      userId: user.id,
      username: user.username,
      amount: betAmount,
      signature: `demo_tx_${Date.now()}_${i}` // Mock transaction signature
    });

    console.log(`   ${user.username} bet ${betAmount} SOL`);
  }

  return bets;
}

async function startMatch(roomId, bets) {
  // Generate provably fair seed
  const seed = Math.random().toString(36).substring(2, 15);
  
  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      room_id: roomId,
      game: DEMO_CONFIG.gameType,
      seed: seed,
      status: 'active',
      total_pot: bets.reduce((sum, bet) => sum + bet.amount, 0)
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start match: ${error.message}`);
  }

  // Update room status
  await supabase
    .from('rooms')
    .update({ status: 'active' })
    .eq('id', roomId);

  console.log(`   Match ID: ${match.id}`);
  console.log(`   Seed: ${match.seed}`);
  console.log(`   Total Pot: ${match.total_pot} SOL`);

  return match;
}

async function completeMatch(matchId, winnerId) {
  // Use the complete_match RPC function for atomic payout
  const { data: result, error } = await supabase
    .rpc('complete_match', {
      p_match_id: matchId,
      p_winner_id: winnerId,
      p_rake_percentage: DEMO_CONFIG.rakePercentage
    });

  if (error) {
    throw new Error(`Failed to complete match: ${error.message}`);
  }

  // Get winner details
  const { data: winner } = await supabase
    .from('users')
    .select('username')
    .eq('id', winnerId)
    .single();

  return {
    matchId,
    winner: {
      id: winnerId,
      username: winner.username,
      payout: result.payout
    },
    totalPot: result.total_pot,
    rakeCollected: result.rake_collected,
    signature: `demo_payout_${Date.now()}` // Mock transaction signature
  };
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

