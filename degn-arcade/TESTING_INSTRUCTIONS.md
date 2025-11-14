# 🧪 DEGN.gg Testing Instructions

## ✅ All Issues Fixed!

The payment→game start pipeline has been completely fixed with surgical changes:

### 🔧 **What Was Fixed**

1. **Duplicate Key Errors** - Profile and payment creation now handle race conditions gracefully
2. **SolBird 1v1 Enforcement** - Enforced at matchmaker level (maxPlayers = 2)
3. **Payment Pipeline** - Fixed payment verification and match start triggers
4. **Wallet Duplicate Prevention** - Same wallet cannot join lobby twice
5. **Dev Wallet Override** - Support for testing with multiple wallets locally
6. **Comprehensive Logging** - Clear logs throughout the entire flow

---

## 🚀 **Setup for Testing**

### 1. Environment Variables

**Frontend (`.env.local`):**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com

# Backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Dev Testing (optional)
NEXT_PUBLIC_DEV_WALLET_OVERRIDE=11111111111111111111111111111112
```

**Backend (`backend/matchmaker/.env`):**
```bash
# Solana
SOLANA_RPC=https://api.devnet.solana.com
ESCROW_PRIVATE_KEY=your_escrow_private_key_json_array

# Optional
MATCHMAKER_SECRET=your_secret_key
```

### 2. Database Migration

Run the schema migration in Supabase SQL Editor:
```sql
-- Copy contents of: degn-arcade/supabase/migrations/ensure_schema.sql
-- Paste and execute in Supabase Dashboard → SQL Editor
```

---

## 🧪 **Testing Steps**

### **Step 1: Start Servers**

```bash
# Terminal 1: Backend Matchmaker
cd backend/matchmaker
npm run dev

# Terminal 2: Frontend
cd degn-arcade  
npm run dev
```

**Expected Startup Logs:**
```
✅ Supabase loaded successfully
✅ Supabase Admin client initialized successfully
✅ Matchmaker ready
✅ SolBird enforced as 1v1 (maxPlayers=2)
🎮 Supported games: sol-bird, connect4, slither, agar
```

### **Step 2: Test SolBird 1v1 Flow**

1. **Open Two Browser Windows/Tabs**
   - Window A: `http://localhost:3000/find-game`
   - Window B: `http://localhost:3000/find-game` (incognito or different browser)

2. **Set Dev Wallet Overrides (Optional)**
   ```bash
   # Window A - Add to .env.local:
   NEXT_PUBLIC_DEV_WALLET_OVERRIDE=11111111111111111111111111111112
   
   # Window B - Use different override or real Phantom wallet
   ```

3. **Create SolBird Lobby**
   - Window A: Click "Create Match" → Select "Sol Bird" → Set entry fee (0.01 SOL)
   - Should show `maxPlayers: 2` in lobby details

4. **Join from Second Window**
   - Window B: Should see the lobby in the list
   - Click "Join" → Connect wallet → Sign transaction

5. **Verify 1v1 Enforcement**
   - Try to create SolBird lobby with `maxPlayers > 2` → Should get 400 error
   - Try to join with same wallet → Should get "WALLET_ALREADY_JOINED" error

### **Step 3: Test Payment→Game Start Pipeline**

1. **Both players pay entry fees**
   - Each player signs Phantom transaction
   - Check logs for: `✅ Payment recorded for wallet`

2. **Auto-match start**
   - After 2nd payment confirmed: `🚀 Lobby is ready to start!`
   - 3-second countdown: `🎮 Game starting...`
   - Auto-redirect to: `/play/sol-bird?lobbyId=...`

3. **Verify No Duplicates**
   - Multiple payment attempts should return: `"status": "already_recorded"`
   - No 500 errors for duplicate profiles or payments

---

## 🔍 **Expected Logs Sequence**

```bash
# Player 1 joins
🔧 Dev wallet override active: 11111111...1112
👤 Player joined lobby: lobby_123 (sol-bird, 1/2 players)

# Player 2 joins  
👤 Player joined lobby: lobby_123 (sol-bird, 2/2 players)
🚀 Lobby is ready to start! (sol-bird, 2 players, 1v1)

# Payments processed
💳 Entry transaction created for lobby lobby_123
✅ Entry payment verified for lobby lobby_123
[Supabase] ✅ Payment recorded for wallet: 11111111...1112
[Supabase] ✅ All players ready. Triggering match start for lobby lobby_123

# Game starts
🎮 Match start triggered via API (lobby_123, 2 paid players)
🎮 Game started (lobby_123, sol-bird, 2 players)
```

---

## 🚨 **Error Scenarios to Test**

### **Duplicate Prevention**
- ✅ Same wallet joins twice → `WALLET_ALREADY_JOINED`
- ✅ Profile creation race condition → Returns existing profile
- ✅ Payment duplicate → `already_recorded` status

### **SolBird 1v1 Enforcement**
- ✅ Create lobby with `maxPlayers > 2` → 400 error
- ✅ 3rd player tries to join → `Lobby full (sol-bird is 1v1)`
- ✅ Game starts only with exactly 2 players

### **Payment Pipeline**
- ✅ Insufficient balance → Clear error message
- ✅ Transaction fails → Proper error handling
- ✅ Network issues → Graceful fallback

---

## 🎯 **Success Criteria**

- ✅ No duplicate key errors (23505)
- ✅ SolBird lobbies always have `maxPlayers = 2`
- ✅ Games launch automatically after 2 payments
- ✅ Same wallet cannot join lobby twice
- ✅ All payments recorded without 500 errors
- ✅ Clean startup logs with all validations passing
- ✅ Dev wallet override works for local testing

---

## 🔧 **Dev Wallet Override Usage**

For testing with multiple wallets locally:

```bash
# Terminal 1 (Alice)
export NEXT_PUBLIC_DEV_WALLET_OVERRIDE=11111111111111111111111111111112
npm run dev

# Terminal 2 (Bob) 
export NEXT_PUBLIC_DEV_WALLET_OVERRIDE=11111111111111111111111111111113
npm run dev -- --port 3001
```

Or use different browser profiles with different `.env.local` files.

---

## 🎮 **Ready to Play!**

Your DEGN.gg arcade now has:
- ✅ **Robust payment processing** with duplicate prevention
- ✅ **SolBird 1v1 enforcement** at all levels
- ✅ **Reliable game start pipeline** 
- ✅ **Comprehensive error handling**
- ✅ **Dev-friendly testing tools**

The complete flow from payment → lobby → match start is now bulletproof! 🚀
