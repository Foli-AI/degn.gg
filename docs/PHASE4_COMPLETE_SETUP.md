# DEGN.gg Phase 4: Complete Setup & Testing Guide

## 🎯 Overview

Phase 4 is now complete with full Phantom wallet integration, automatic game launching, and Solana transaction handling. This guide covers setup, testing, and troubleshooting.

## 🛠️ Environment Setup

### 1. Frontend Environment (.env.local)
Create `degn-arcade/.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_ESCROW_PUBLIC_KEY=your_escrow_wallet_public_key
```

### 2. Backend Environment (.env)
Create `backend/matchmaker/.env`:
```bash
# Solana Configuration
SOLANA_RPC=https://api.devnet.solana.com
ESCROW_PRIVATE_KEY=[1,2,3,4,5,...] # JSON array of private key bytes
ESCROW_PUBLIC_KEY=your_escrow_wallet_public_key

# Server Configuration
PORT=3001
```

### 3. Supabase Database Setup
Run the migration files in order:
1. `degn-arcade/supabase/migrations/001_phase2_schema.sql`
2. `degn-arcade/supabase/migrations/002_profiles_table.sql`

Or use Supabase CLI:
```bash
npx supabase db reset
```

## 🚀 Installation & Startup

### 1. Install Dependencies
```bash
# Frontend
cd degn-arcade
npm install

# Backend
cd ../backend/matchmaker
npm install
```

### 2. Start Servers
```bash
# Terminal 1: Backend Matchmaker
cd backend/matchmaker
npm run dev

# Terminal 2: Frontend
cd degn-arcade
npm run dev
```

### 3. Verify Setup
- Backend: http://localhost:3001/health
- Frontend: http://localhost:3000
- Check console logs for "🔑 Escrow wallet loaded" message

## 🎮 Complete Game Flow

### Step 1: Wallet Setup
1. **Install Phantom Wallet** browser extension
2. **Switch to Devnet**: Settings → Developer Settings → Change Network → Devnet
3. **Get Test SOL**: Visit https://faucet.solana.com/ and request 1-2 SOL

### Step 2: Connect & Play
1. **Open Find Game**: http://localhost:3000/find-game
2. **Connect Phantom**: Click "Connect Wallet" button
3. **Select Game**: Choose Coinflip (1v1) or Sol-Bird (Battle Royale)
4. **Create/Join Match**: Set entry amount and create or join existing lobby
5. **Pay Entry Fee**: Sign transaction in Phantom wallet
6. **Wait for Players**: Lobby fills automatically
7. **Game Launches**: Auto-redirect to game page after 3-second countdown

### Step 3: Game Experience
- **Sol-Bird**: Multiplayer Flappy Bird with real-time competition
- **Coinflip**: Simple 1v1 heads/tails betting game
- **Automatic Payouts**: Winners receive SOL automatically after game ends

## 🔧 Key Features Implemented

### ✅ Wallet Integration
- Real Phantom wallet connection
- Balance verification before joining
- Transaction signing and confirmation
- Automatic payout distribution

### ✅ Game Launch System
- Auto-start when lobby reaches max players
- 3-second countdown before game launch
- Automatic redirect to game pages
- Support for multiple game types

### ✅ Transaction Handling
- `/api/pay-entry` endpoint for escrow payments
- On-chain transaction verification
- Supabase payment logging
- Secure escrow wallet management

### ✅ Real-time Features
- Socket.IO lobby updates
- Live player status
- Instant game notifications
- Cross-tab synchronization

## 🧪 Testing Scenarios

### Scenario 1: Single Player (Mock Wallet)
```bash
# Test without Phantom wallet
1. Open /find-game
2. Don't connect Phantom
3. Create/join lobby (uses mock wallet)
4. Game should launch normally
```

### Scenario 2: Real Phantom Wallet
```bash
# Test with real Solana transactions
1. Connect Phantom wallet
2. Create Coinflip match (0.1 SOL)
3. Sign transaction in Phantom
4. Wait for second player or open second browser
5. Game launches automatically
6. Winner receives payout
```

### Scenario 3: Multi-Player Battle Royale
```bash
# Test Sol-Bird with multiple players
1. Open 3-4 browser tabs/profiles
2. All connect to same Sol-Bird lobby
3. Each pays entry fee
4. Game launches when lobby full
5. Last player alive wins pot
```

## 📊 API Endpoints

### Frontend APIs
- `POST /api/pay-entry` - Create unsigned transaction
- `PUT /api/pay-entry` - Verify signed transaction
- `POST /api/profile/ensure` - Create/get user profile

### Backend APIs
- `GET /health` - Server health check
- `GET /lobbies` - List active lobbies
- `POST /create-lobby` - Create new lobby
- `GET /stats` - Server statistics

### Socket.IO Events
- `player:join` - Register as player
- `join-lobby` - Join specific lobby
- `lobby-ready` - Lobby full, starting soon
- `game:start` - Game launched, redirect to play
- `match:results` - Game completed, process payouts

## 🚨 Troubleshooting

### Issue: "Supabase server environment variables are not set"
**Solution:**
1. Check `.env.local` file exists in `degn-arcade/`
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Restart frontend server after adding env vars

### Issue: "Failed to request airdrop"
**Solution:**
- This is expected on devnet (rate limited)
- Server continues without balance
- Manually fund escrow wallet if needed

### Issue: Game doesn't launch after lobby fills
**Solution:**
1. Check browser console for `game:start` event
2. Verify Socket.IO connection is active
3. Check backend logs for "🎮 Game started" message

### Issue: Transaction fails in Phantom
**Solution:**
1. Ensure sufficient SOL balance (entry + gas fees)
2. Check network is set to Devnet
3. Try refreshing and reconnecting wallet

### Issue: Players stuck in lobby
**Solution:**
1. Check if all players paid entry fees
2. Verify lobby reaches `maxPlayers` count
3. Look for `lobby-ready` and `game:start` events

## 📝 Console Logs to Monitor

### Backend Logs (Expected)
```
🔑 Escrow wallet loaded: [address]
🎮 DEGN.gg Matchmaker Server started on port 3001
👤 Player joined matchmaker
🚪 Player joined lobby
🚀 Lobby is ready to start!
🎮 Game started
💰 Payout sent: 0.18 SOL to [winner]
```

### Frontend Logs (Expected)
```
🔌 Connected to matchmaker
👋 Welcome to matchmaker
🚪 Joined lobby
🚀 Lobby ready, game starting soon...
🎮 Game starting! Redirecting to game...
```

### Phantom Wallet (Expected)
- Transaction approval prompts
- Confirmed transactions in activity
- Balance updates after games

## 🎯 Success Criteria

- [ ] Phantom wallet connects successfully
- [ ] Entry fee transactions sign and confirm
- [ ] Lobbies fill and games launch automatically
- [ ] Game pages load with correct lobby data
- [ ] Winners receive automatic SOL payouts
- [ ] All transactions visible in Phantom history
- [ ] No console errors or failed API calls

## 🔄 Development Workflow

### Adding New Games
1. Create game page in `/app/play/[game-name]/page.tsx`
2. Add route mapping in `useMatchmaker.ts` `handleGameStart`
3. Update `GAME_CONFIG` with game settings
4. Test lobby creation and game launch

### Modifying Transaction Flow
1. Update `/api/pay-entry/route.ts` for transaction logic
2. Modify `useMatchmaker.ts` for client-side handling
3. Test with small amounts on devnet first

### Database Changes
1. Create migration file in `supabase/migrations/`
2. Update API routes to match new schema
3. Test with Supabase local development

## 🚀 Production Deployment

### Before Going Live
1. **Switch to Mainnet**: Update RPC URLs to mainnet
2. **Security Audit**: Review escrow wallet security
3. **Load Testing**: Test with multiple concurrent users
4. **Monitoring**: Set up transaction failure alerts
5. **Backup**: Secure escrow wallet private keys

### Environment Variables (Production)
```bash
# Use mainnet RPC
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
SOLANA_RPC=https://api.mainnet-beta.solana.com

# Use production Supabase project
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Secure escrow wallet
ESCROW_PRIVATE_KEY=[production_private_key_array]
ESCROW_PUBLIC_KEY=production_escrow_public_key
```

The system is now fully functional for crypto arcade gameplay with real SOL transactions! 🎮💰
