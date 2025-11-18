# 🎮 SOL BIRD: RACE ROYALE — Integration Status

**Last Updated:** Now  
**Status:** ✅ Backend & Frontend Ready | ⏳ Awaiting Godot Files Review

---

## ✅ **COMPLETED — Backend & Frontend Ready**

### **1. WebSocket Glue Layer** (`public/games/sol-bird/client/ws-glue.js`)
- ✅ Connects to matchmaker WebSocket (`/ws`)
- ✅ Reads `matchKey`, `playerId`, `username`, `wsUrl` from query params
- ✅ Sends `init` message on connect
- ✅ Exposes `window.sendCoinUpdate(coins)` for Godot to call
- ✅ Stores `window.latestMatchEvent` for Godot to poll
- ✅ Auto-reconnects on disconnect
- ✅ Dispatches DOM events (`match:game_start`, `match:player_update`, `match:game_end`)

### **2. Frontend Loader** (`src/app/play/sol-bird/page.tsx`)
- ✅ Loads Godot game in iframe
- ✅ Passes all required query params: `lobbyId`, `playerId`, `username`, `wsUrl`, `entry`, `players`, `matchKey`
- ✅ Shows loading state
- ✅ Responsive layout

### **3. Backend Matchmaker** (`backend/matchmaker/server.ts`)
- ✅ Handles `sol-bird-race` game type
- ✅ Lobby creation with `maxPlayers` (2-8) and `entryFee`
- ✅ WebSocket `/ws` endpoint for game clients
- ✅ `GAME_START` event sent on match start with:
  - `lobbyId`, `playerId`, `maxPlayers`, `entryFee`, `pot`, `roundTimer: 180000` (3 minutes)
- ✅ `COIN_UPDATE` handling: tracks player coins, broadcasts `PLAYER_UPDATE`
- ✅ `finalizeRaceMatch()`: determines winner by highest coins after 3 minutes
- ✅ `GAME_END` event broadcast with winner info
- ✅ Calls Supabase RPC `payout_winner` with **90/10 split**:
  - `winner_amount`: 90% of pot
  - `house_rake`: 10% of pot
- ✅ Death = respawn (no elimination for `sol-bird-race`)

### **4. Lobby System** (`src/app/find-game/page.tsx`)
- ✅ "Sol Bird: Race Royale" in game list
- ✅ Custom settings modal: Max Players (2-8), Entry Fee (SOL)
- ✅ Creates lobby with `maxPlayers` and `entryAmount`
- ✅ Shows pot calculation (`entryFee × maxPlayers`)

### **5. Build Automation**
- ✅ `scripts/patch-sol-bird-index.cjs` auto-injects `ws-glue.js` into `index.html`
- ✅ `package.json` has `postbuild` hook
- ✅ No duplicate script injection

---

## ⏳ **PENDING — Needs Godot Files Review**

### **What I Need to Check in Your Godot Files:**

1. **Networking Script** (`network.gd` or similar)
   - Does it poll `window.latestMatchEvent`?
   - Does it call `window.sendCoinUpdate(coins)` when coins change?
   - Does it handle `GAME_START`, `PLAYER_UPDATE`, `GAME_END` events?

2. **Player Script** (`player.gd`)
   - Does it track coins?
   - Does it call `window.sendCoinUpdate(coins)` on coin pickup?
   - Does it handle respawn on death (not elimination)?

3. **World Script** (`world.gd`)
   - Does it load match payload from query params or `GAME_START` event?
   - Does it start the 3-minute timer?
   - Does it detect winner (highest coins) after timer?
   - Does it send match result to backend? (via WebSocket or API)

4. **Match Bridge** (`match_bridge.gd` or autoload)
   - Does it poll `window.latestMatchEvent` in `_process()`?
   - Does it emit Godot signals for `game_start`, `player_update`, `game_end`?

5. **Pipe Spawner** (`pipe_spawner.gd`)
   - Are pipes synced across all players?
   - Is spawning deterministic?

6. **Camera Logic**
   - Does it track each player separately?
   - Does it handle multiple players in view?

---

## 🔧 **What Needs to Be Fixed/Added (After Review)**

Based on your requirements, I'll need to:

1. ✅ **Fix networking** — Ensure Godot connects to WebSocket via `ws-glue.js`
2. ✅ **Fix race logic** — Ensure all players start at same position, pipes synced
3. ✅ **Add winner detection** — After 3 minutes, determine highest coins
4. ✅ **Clean world.gd** — Remove old code, add match payload loading
5. ✅ **Clean player.gd** — Add coin tracking, `sendCoinUpdate()` calls
6. ✅ **Add pipe syncing** — Ensure deterministic pipe spawns
7. ✅ **Add camera logic** — Track each player separately
8. ✅ **Add start countdown** — 3-2-1-GO before race starts
9. ✅ **Connect to lobby payload** — Load `maxPlayers`, `entryFee`, `pot` from `GAME_START`
10. ✅ **Return match result** — Send `{ matchId, winnerId, coins, timestamp }` to backend

---

## 📋 **Supabase Requirements**

Your `payout_winner` RPC function should:

```sql
CREATE OR REPLACE FUNCTION payout_winner(
  lobby_id UUID,
  winner_wallet TEXT,
  pot_amount NUMERIC,
  winner_amount NUMERIC,  -- 90% of pot
  house_rake NUMERIC      -- 10% of pot
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  house_wallet TEXT := 'YOUR_SOL_WALLET_ADDRESS'; -- Your personal wallet for rake
BEGIN
  -- 1. Send 90% to winner
  -- 2. Send 10% to house_wallet
  -- 3. Log transaction
  -- 4. Return success
END;
$$;
```

**OR** use a payment service (like other casinos) that handles the split automatically.

---

## 🚀 **Next Steps**

1. **You send me Godot files** → I review and identify what needs changes
2. **I fix/update scripts** → Networking, winner detection, coin syncing, etc.
3. **We test end-to-end** → Create lobby → Join → Play → Winner → Payout
4. **Deploy to production** → Vercel (frontend) + Render (backend)

---

## 💰 **Monetization Flow (90/10 Split)**

1. Player creates lobby: `entryFee = 0.1 SOL`, `maxPlayers = 8`
2. Pot = `0.1 × 8 = 0.8 SOL`
3. All 8 players join and pay entry fee
4. Game starts → 3-minute race
5. Winner determined (highest coins)
6. **Payout:**
   - Winner receives: `0.8 × 0.9 = 0.72 SOL` (90%)
   - House receives: `0.8 × 0.1 = 0.08 SOL` (10%) → Your wallet

---

## 🔒 **Remembered Requirements**

- ✅ 90% winner / 10% house rake
- ✅ Up to 8 players per lobby
- ✅ Entry fees in SOL/USDC
- ✅ Winner = highest coins after 3 minutes
- ✅ Death = respawn (not elimination)
- ✅ All code ready on my end
- ✅ Waiting for Godot files to review

**LOCKED IN. READY TO MOVE FAST. 🚀**

