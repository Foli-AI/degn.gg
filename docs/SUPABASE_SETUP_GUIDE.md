# DEGN.gg Supabase Setup & Configuration Guide

## 🎯 Overview

This guide ensures proper Supabase integration for the complete payment → game start pipeline in DEGN.gg.

## 🛠️ Environment Setup

### 1. Create .env.local file
Create `degn-arcade/.env.local` with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_ESCROW_PUBLIC_KEY=your_escrow_wallet_public_key
```

### 2. Get Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Database Schema
Execute the SQL in `backend/schema.sql` in your Supabase SQL editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `backend/schema.sql`
3. Paste and run the SQL
4. Verify tables are created: `lobbies`, `entries`, `matches`, `payments`, `profiles`

## 🔧 Architecture Overview

### Payment → Game Start Flow

1. **Player joins lobby** → Phantom wallet prompts for entry fee
2. **Transaction signed** → Payment recorded in Supabase `entries` table
3. **Payment verified** → Check if all required players have paid
4. **Trigger match start** → API call to matchmaker `/start-match`
5. **Game launches** → Socket.IO event redirects players to game

### Database Tables

- **`lobbies`** - Game lobby metadata (id, game_type, max_players, status)
- **`entries`** - Player entries and payment status (lobby_id, wallet, paid)
- **`matches`** - Completed game results (lobby_id, winner_wallet, pot_amount)
- **`payments`** - Transaction records (legacy compatibility)
- **`profiles`** - User profiles (wallet_address, username)

## 🚀 Testing the Complete Flow

### 1. Start Servers
```bash
# Terminal 1: Backend Matchmaker
cd backend/matchmaker
npm run dev

# Terminal 2: Frontend
cd degn-arcade
npm run dev
```

### 2. Expected Startup Logs

**Frontend logs should show:**
```
✅ Supabase loaded successfully
✅ Supabase Admin client initialized
🔍 Validating Supabase schema...
✅ Table 'lobbies' exists
✅ Table 'entries' exists
✅ Table 'matches' exists
✅ Table 'payments' exists
✅ Table 'profiles' exists
✅ All required tables found
```

**Backend logs should show:**
```
🔑 Temporary escrow wallet: [address]
💰 Airdrop requested for escrow wallet
🚀 DEGN.gg Matchmaker Server started
```

### 3. Test Payment Flow

1. **Connect Phantom Wallet**
   - Open http://localhost:3000/find-game
   - Connect Phantom wallet (on Devnet)
   - Ensure you have test SOL

2. **Create/Join Match**
   - Create Coinflip match with 0.1 SOL entry
   - Sign transaction in Phantom
   - Watch console logs

3. **Expected Payment Logs**
```
💳 Entry transaction created for lobby [lobbyId]
✅ Entry payment verified for lobby [lobbyId]
[Supabase] ✅ Payment recorded for wallet: [address]
[Supabase] ✅ All players ready. Triggering match start for lobby [lobbyId]
🎮 Game launching...
```

4. **Game Launch**
   - Second player joins and pays
   - Game should auto-launch after both payments
   - Redirect to `/play/coinflip?lobbyId=...`

## 🔍 Troubleshooting

### Issue: "Supabase server environment variables are not set"

**Check:**
1. `.env.local` file exists in `degn-arcade/` directory
2. All three environment variables are set correctly
3. No extra spaces or quotes in the values
4. Restart the dev server after adding env vars

**Fix:**
```bash
# Verify environment variables are loaded
cd degn-arcade
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Issue: "Supabase table 'entries' not found"

**Fix:**
1. Run the complete `backend/schema.sql` in Supabase SQL Editor
2. Check that all tables were created successfully
3. Verify RLS policies are enabled

### Issue: Payment confirmed but game doesn't start

**Check:**
1. Backend matchmaker is running on port 3001
2. Frontend can reach `http://localhost:3001/start-match`
3. Lobby exists in both matchmaker memory and Supabase
4. All required players have `paid: true` in entries table

**Debug:**
```sql
-- Check entries for a lobby
SELECT * FROM entries WHERE lobby_id = 'your_lobby_id';

-- Check lobby status
SELECT * FROM lobbies WHERE id = 'your_lobby_id';
```

### Issue: "Failed to trigger match start"

**Check:**
1. Matchmaker server is running and accessible
2. CORS is configured properly in matchmaker
3. Network connectivity between frontend and backend

**Fix:**
```bash
# Test matchmaker endpoint directly
curl -X POST http://localhost:3001/start-match \
  -H "Content-Type: application/json" \
  -d '{"lobbyId":"test_lobby"}'
```

## 📊 Database Queries for Debugging

### Check Payment Status
```sql
SELECT 
  e.lobby_id,
  e.wallet,
  e.paid,
  e.amount_sol,
  e.created_at
FROM entries e
WHERE e.lobby_id = 'your_lobby_id'
ORDER BY e.created_at;
```

### Check Lobby Readiness
```sql
SELECT 
  l.id,
  l.game_type,
  l.max_players,
  l.status,
  COUNT(e.wallet) as paid_players
FROM lobbies l
LEFT JOIN entries e ON l.id = e.lobby_id AND e.paid = true
WHERE l.id = 'your_lobby_id'
GROUP BY l.id, l.game_type, l.max_players, l.status;
```

### View Recent Matches
```sql
SELECT 
  m.*,
  l.game_type
FROM matches m
JOIN lobbies l ON m.lobby_id = l.id
ORDER BY m.created_at DESC
LIMIT 10;
```

## 🔒 Security Notes

- **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose client-side
- **RLS Policies**: Current policies allow all operations - adjust for production
- **Environment Variables**: Add `.env.local` to `.gitignore`
- **API Validation**: All API routes validate Supabase admin client availability

## 🎯 Success Criteria

- ✅ No "Supabase server environment variables are not set" errors
- ✅ All required tables exist and are accessible
- ✅ Payment verification stores records in Supabase
- ✅ Match start triggers when all players have paid
- ✅ Games launch automatically after payment confirmation
- ✅ Complete payment → game start pipeline works end-to-end

The Supabase integration is now properly configured for the complete DEGN.gg crypto arcade experience! 🎮💰
