# 🚀 DEGN.gg — Updated Architecture (PvP Tier-Based Model)

**Last Updated:** Now  
**Model:** Player vs Player (PvP) — No House Rake, Continuous Lobbies

---

## 🎯 **CORE BUSINESS MODEL**

### **Key Changes from V1:**
- ❌ **REMOVED:** Custom lobby creation with custom entry fees
- ❌ **REMOVED:** House rake (10%) — no house wallet payouts
- ✅ **NEW:** Fixed entry fee tiers (0.1, 0.5, 1.0, 1.5, 2.0, 2.5, up to 5.0 SOL)
- ✅ **NEW:** Auto-matchmaking to existing lobbies at selected tier
- ✅ **NEW:** Continuous lobbies (24/7, always filling)
- ✅ **NEW:** Top 3 payouts (75% / 10% / 5%) instead of single winner
- ✅ **NEW:** Pure PvP — players pay each other, no house liability

---

## 💰 **ENTRY FEE TIERS (All Games)**

**Standard Tiers:**
- 0.1 SOL
- 0.5 SOL
- 1.0 SOL
- 1.5 SOL
- 2.0 SOL
- 2.5 SOL
- 3.0 SOL
- 3.5 SOL
- 4.0 SOL
- 4.5 SOL
- 5.0 SOL

**How It Works:**
1. Player connects wallet
2. Player clicks "Find Game" → selects game (Sol Bird, Suroi, etc.)
3. Player selects entry fee tier (e.g., "0.5 SOL")
4. Player confirms payment via Phantom/Solflare
5. **Auto-matchmaking:** System finds existing lobby at that tier OR creates new one
6. Player joins lobby → waits for other players at same tier
7. When lobby fills → game starts
8. After match → Top 3 get paid (75% / 10% / 5%)

---

## 🎮 **GAME CONFIGURATIONS**

### **1. Sol Bird: Race Royale**
- **Players:** 4-8 per lobby
- **Entry Tiers:** 0.1 to 5.0 SOL
- **Win Condition:** First player to reach end point wins
- **Game End:** When all players finish (or timer expires)
- **Payout:** Top 3 (75% / 10% / 5%)

### **2. Suroi Clone (Top-Down Shooter)**
- **Players:** 8-16 per lobby
- **Entry Tiers:** 0.1 to 5.0 SOL
- **Win Condition:** Last player alive
- **Payout:** Top 3 (75% / 10% / 5%)

### **3. Slither.io Clone**
- **Players:** 4-10 per lobby
- **Entry Tiers:** 0.1 to 5.0 SOL
- **Win Condition:** Last player alive
- **Payout:** Top 3 (75% / 10% / 5%)

### **4. Agar.io Clone**
- **Players:** 4-10 per lobby
- **Entry Tiers:** 0.1 to 5.0 SOL
- **Win Condition:** Highest mass at end
- **Payout:** Top 3 (75% / 10% / 5%)

### **5. Coinflip**
- **Players:** 2 per lobby (1v1)
- **Entry Tiers:** 0.1 to 5.0 SOL
- **Win Condition:** Winner takes all (100% of pot)
- **Payout:** Winner only (100%)

---

## 💸 **PAYOUT STRUCTURE**

### **Battle Royale Games (Sol Bird, Suroi, Slither, Agar):**
- **1st Place:** 75% of pot
- **2nd Place:** 10% of pot
- **3rd Place:** 5% of pot
- **4th+ Place:** 0% (nothing)

**Example:**
- 8 players × 0.5 SOL = 4.0 SOL pot
- 1st: 3.0 SOL (75%)
- 2nd: 0.4 SOL (10%)
- 3rd: 0.2 SOL (5%)
- 4th-8th: 0 SOL

### **1v1 Games (Coinflip):**
- **Winner:** 100% of pot
- **Loser:** 0%

**Example:**
- 2 players × 1.0 SOL = 2.0 SOL pot
- Winner: 2.0 SOL (100%)

---

## 🔄 **LOBBY FLOW (Continuous System)**

### **Step-by-Step:**

1. **Player Selects Game & Tier**
   - Frontend: `/find-game` → Select game → Select tier (0.1, 0.5, 1.0, etc.)
   - Shows: "0.5 SOL Lobbies" with current players waiting

2. **Player Clicks "Enter Game"**
   - Wallet prompt appears (Phantom/Solflare)
   - Player confirms payment of selected tier amount

3. **Auto-Matchmaking**
   - Backend finds existing lobby at that tier with available slots
   - If no lobby exists → creates new lobby at that tier
   - Player is added to lobby

4. **Lobby Fills**
   - When lobby reaches `maxPlayers` → game starts automatically
   - All players receive `GAME_START` event
   - Frontend redirects to `/play/[game]`

5. **Game Plays**
   - Godot game runs
   - Players compete
   - Game tracks positions/scores

6. **Game Ends**
   - Sol Bird: All players finish (or timer expires)
   - Other games: Last alive / highest score
   - Backend determines Top 3 winners

7. **Payout**
   - Backend calculates: 1st (75%), 2nd (10%), 3rd (5%)
   - **PvP Payout:** Winners receive SOL from pot (no house wallet involved)
   - Transaction: Pot → Winners (direct transfer)

8. **Lobby Resets**
   - Lobby status = "waiting"
   - New players can join at same tier
   - Continuous cycle

---

## 🏗️ **TECHNICAL ARCHITECTURE**

### **Backend Changes:**

1. **Lobby Management**
   - Lobbies keyed by: `gameType + entryTier` (e.g., `sol-bird-race_0.5`)
   - Multiple lobbies can exist at same tier (if one is full)
   - Auto-create lobby if none exists at tier

2. **Auto-Matchmaking Logic**
   ```typescript
   function findOrCreateLobby(gameType: string, entryTier: number) {
     // 1. Find existing lobby at tier with available slots
     const availableLobby = findAvailableLobby(gameType, entryTier);
     if (availableLobby) return availableLobby;
     
     // 2. Create new lobby at tier
     return createLobby(gameType, entryTier);
   }
   ```

3. **Payout Calculation**
   ```typescript
   function calculatePayouts(pot: number, rankings: Player[]) {
     return {
       first: pot * 0.75,   // 75%
       second: pot * 0.10,  // 10%
       third: pot * 0.05,   // 5%
       // Rest get 0
     };
   }
   ```

4. **Sol Bird Win Condition**
   - Track finish order (who reaches end first)
   - Game ends when all players finish OR timer expires
   - Winner = first to finish (or highest coins if timer expires)

### **Frontend Changes:**

1. **Tier Selection UI**
   - Replace "Create Lobby" modal with "Select Entry Tier"
   - Show: "0.1 SOL", "0.5 SOL", "1.0 SOL", etc. buttons
   - Show current lobbies at each tier (players waiting)

2. **Auto-Join Flow**
   - Player selects tier → confirms payment → auto-joins lobby
   - No manual lobby selection needed

3. **Lobby Display**
   - Show: "0.5 SOL Lobbies" with player count
   - Show: "Waiting for players..." or "Starting soon..."

---

## 📊 **DATABASE SCHEMA UPDATES**

### **Lobbies Table:**
```sql
CREATE TABLE lobbies (
  id UUID PRIMARY KEY,
  game_type TEXT NOT NULL,
  entry_tier NUMERIC NOT NULL,  -- 0.1, 0.5, 1.0, etc.
  max_players INTEGER NOT NULL,
  current_players INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting',  -- waiting, starting, in-progress, finished
  pot NUMERIC DEFAULT 0,  -- entry_tier * current_players
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_lobbies_tier ON lobbies(game_type, entry_tier, status);
```

### **Matches Table:**
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  lobby_id UUID REFERENCES lobbies(id),
  game_type TEXT NOT NULL,
  entry_tier NUMERIC NOT NULL,
  pot NUMERIC NOT NULL,
  first_place_wallet TEXT,
  first_place_payout NUMERIC,
  second_place_wallet TEXT,
  second_place_payout NUMERIC,
  third_place_wallet TEXT,
  third_place_payout NUMERIC,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Backend:**
- [ ] Update `GAME_CONFIG` with entry fee tiers
- [ ] Implement `findOrCreateLobby(gameType, entryTier)`
- [ ] Update lobby creation to use tiers instead of custom entry
- [ ] Update payout logic: Top 3 (75/10/5) instead of single winner
- [ ] Update Sol Bird: Track finish order, end when all finish
- [ ] Remove house rake logic (no house wallet payouts)
- [ ] Update WebSocket events for tier-based system

### **Frontend:**
- [ ] Replace "Create Lobby" with "Select Entry Tier" UI
- [ ] Show tier buttons (0.1, 0.5, 1.0, etc.)
- [ ] Show current lobbies at each tier
- [ ] Auto-join flow after payment confirmation
- [ ] Update lobby display to show tier instead of custom entry

### **Godot (Sol Bird):**
- [ ] Track finish order (who reaches end first)
- [ ] Send finish event when player reaches end
- [ ] Game ends when all players finish OR timer expires
- [ ] Send rankings to backend (1st, 2nd, 3rd, etc.)

---

## 🎯 **WHY THIS MODEL IS GENIUS**

1. **No House Liability:** Players pay each other → zero risk for you
2. **Better UX:** Auto-matchmaking → no waiting for custom lobbies
3. **Continuous Play:** Lobbies always filling → players always playing
4. **Top 3 Payouts:** More engagement → players fight for 2nd/3rd too
5. **Scalable:** Easy to add new tiers or games
6. **Clear Pricing:** Fixed tiers → players know exactly what they're betting

---

## 🚀 **NEXT STEPS**

1. **Update Backend:** Tier-based matchmaking + Top 3 payouts
2. **Update Frontend:** Tier selection UI
3. **Update Sol Bird:** Finish order tracking
4. **Test End-to-End:** Create lobby → Join → Play → Payout
5. **Deploy:** Vercel + Render

**LET'S GET THIS MONETIZING! 💰**

