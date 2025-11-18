# ✅ Tier-Based PvP Model — Implementation Status

**Last Updated:** Now  
**Status:** Backend Ready | Frontend Pending

---

## ✅ **COMPLETED — Backend Changes**

### **1. Entry Fee Tiers**
- ✅ Added `ENTRY_FEE_TIERS = [0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]`
- ✅ All games use same tiers (0.1 to 5.0 SOL)

### **2. Game Configurations**
- ✅ `sol-bird-race`: 4-8 players
- ✅ `suroi`: 8-16 players
- ✅ `slither`: 4-10 players
- ✅ `agar`: 4-10 players
- ✅ `coinflip`: 2 players (1v1)

### **3. Auto-Matchmaking**
- ✅ `findOrCreateLobby(gameType, entryTier)` function
- ✅ Finds existing lobby at tier OR creates new one
- ✅ New endpoint: `POST /find-or-join-lobby`
  - Input: `{ gameType, entryTier }`
  - Output: `{ lobby: { id, entryTier, currentPlayers, maxPlayers, pot } }`

### **4. Top 3 Payouts (75% / 10% / 5%)**
- ✅ `calculateTop3Payouts(pot)` function
- ✅ Updated `finalizeRaceMatch()` to use Top 3
- ✅ Broadcasts `GAME_END` with rankings array:
  ```json
  {
    "type": "GAME_END",
    "rankings": [
      { "playerId": "...", "position": 1, "payout": 0.75 * pot },
      { "playerId": "...", "position": 2, "payout": 0.10 * pot },
      { "playerId": "...", "position": 3, "payout": 0.05 * pot }
    ],
    "pot": 4.0
  }
  ```
- ✅ Calls Supabase RPC: `payout_top3` (no house rake)

### **5. Sol Bird Win Condition**
- ✅ Updated to track finish order (who reaches end first)
- ✅ Currently uses coins as proxy (will be replaced with actual finish order from Godot)
- ✅ Game ends when all players finish OR timer expires

### **6. Lobby Interface Updated**
- ✅ Added `entryTier: number` field
- ✅ Kept `entryAmount` for backwards compatibility
- ✅ Lobbies keyed by `gameType + entryTier`

---

## ⏳ **PENDING — Frontend Changes**

### **1. Tier Selection UI**
- [ ] Replace "Create Lobby" modal with tier selection
- [ ] Show buttons: "0.1 SOL", "0.5 SOL", "1.0 SOL", etc.
- [ ] Show current lobbies at each tier (players waiting)

### **2. Auto-Join Flow**
- [ ] Player selects tier → confirms payment → calls `/find-or-join-lobby`
- [ ] Auto-joins returned lobby
- [ ] No manual lobby selection needed

### **3. Lobby Display**
- [ ] Show: "0.5 SOL Lobbies" with player count
- [ ] Show: "Waiting for players..." or "Starting soon..."
- [ ] Remove custom entry fee input

### **4. Update GAME_CONFIG**
- [ ] Update `useMatchmaker.ts` with entry tiers
- [ ] Update `find-game/page.tsx` to use tier selection

---

## 🎮 **GODOT CHANGES NEEDED (Sol Bird)**

### **1. Finish Order Tracking**
- [ ] Track when each player reaches end point
- [ ] Send `FINISH` event: `{ type: 'FINISH', playerId, finishTime }`
- [ ] Game ends when all players finish (not just timer)

### **2. Rankings**
- [ ] Send final rankings to backend:
  ```json
  {
    "type": "MATCH_RESULT",
    "rankings": [
      { "playerId": "...", "position": 1 },
      { "playerId": "...", "position": 2 },
      { "playerId": "...", "position": 3 }
    ]
  }
  ```

### **3. Remove Coin-Based Winner**
- [ ] Replace coin-based winner with finish order
- [ ] First to finish = 1st place
- [ ] Second to finish = 2nd place
- [ ] Third to finish = 3rd place

---

## 📊 **SUPABASE RPC NEEDED**

### **`payout_top3` Function:**
```sql
CREATE OR REPLACE FUNCTION payout_top3(
  lobby_id UUID,
  first_place_wallet TEXT,
  first_place_payout NUMERIC,
  second_place_wallet TEXT,
  second_place_payout NUMERIC,
  third_place_wallet TEXT,
  third_place_payout NUMERIC,
  pot_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Send 75% to 1st place
  -- 2. Send 10% to 2nd place (if exists)
  -- 3. Send 5% to 3rd place (if exists)
  -- 4. Log transactions
  -- 5. Return success
  -- NOTE: No house rake - pure PvP
END;
$$;
```

---

## 🚀 **NEXT STEPS**

1. **Update Frontend:** Tier selection UI + auto-join flow
2. **Update Godot:** Finish order tracking + rankings
3. **Create Supabase RPC:** `payout_top3` function
4. **Test End-to-End:** Select tier → Join → Play → Top 3 payout

---

## 💰 **EXAMPLE FLOW**

1. Player selects "Sol Bird: Race Royale" → "0.5 SOL"
2. Confirms payment → Backend calls `/find-or-join-lobby`
3. Backend finds/creates lobby at 0.5 SOL tier
4. Player joins → Lobby fills (4-8 players)
5. Game starts → Players race
6. Game ends → Top 3 determined (finish order)
7. Payout:
   - 1st: 75% of pot
   - 2nd: 10% of pot
   - 3rd: 5% of pot
   - Rest: 0%

**Example:**
- 8 players × 0.5 SOL = 4.0 SOL pot
- 1st: 3.0 SOL (75%)
- 2nd: 0.4 SOL (10%)
- 3rd: 0.2 SOL (5%)
- 4th-8th: 0 SOL

---

**BACKEND READY. FRONTEND + GODOT NEXT! 🚀**

