# 🎮 Godot Integration Plan - Step by Step

**Current Status:** Backend ready | Frontend ready | Godot integration pending

---

## 📋 **PHASE 1: Godot Game Integration**

### **Step 1: Send Me Godot Project Files (You Do This FIRST)**

**Send me these files from your Godot project:**

1. **Key Scripts:**
   - `world.gd` (or main scene script)
   - `player.gd` (player controller)
   - `pipe_spawner.gd` (pipe generation)
   - `network.gd` (if you have networking)
   - `match_bridge.gd` (if you have one)
   - Any autoload scripts

2. **Project Structure:**
   - Tell me your scene structure (what scenes you have)
   - Any global scripts or singletons

3. **Current Features:**
   - How does the game currently work?
   - Is it single-player or multiplayer?
   - How do players move/control?
   - How are pipes spawned?
   - How does the game end?

**OR** if easier, just send me the entire Godot project folder (I can review all scripts).

---

### **Step 3: I Review & Provide Updated Scripts (I Do This)**

I'll review your files and identify what needs to be changed:

**What I'll Check:**
1. ✅ **WebSocket Connection** - Does it use `ws-glue.js`?
2. ✅ **Match Events** - Does it poll `window.latestMatchEvent`?
3. ✅ **Coin Updates** - Does it call `window.sendCoinUpdate(coins)`?
4. ✅ **Finish Order** - Does it track who reaches end first?
5. ✅ **Match Results** - Does it send rankings to backend?
6. ✅ **Pipe Syncing** - Are pipes deterministic across players?
7. ✅ **Player Spawning** - Does it spawn all players from match data?
8. ✅ **Game Start** - Does it wait for `GAME_START` event?
9. ✅ **Game End** - Does it handle `GAME_END` event?

**What I'll Provide:**
- Updated scripts with all necessary changes
- Clear instructions on what to change
- New scripts if needed (e.g., `match_bridge.gd`)

---

### **Step 4: You Implement Changes in Godot (You Do This)**

1. **Copy my updated scripts** into your Godot project
2. **Open Godot** and verify scripts load correctly
3. **Test in Godot editor** (if possible) - check for syntax errors
4. **Make sure all changes are saved**

---

### **Step 5: Export Game as HTML5 (You Do This AFTER Changes)**

1. **Open your Godot project** (with all my changes implemented)
2. **Go to Project → Export**
3. **Add HTML5 export preset** (if not already added)
4. **Configure export settings:**
   - **Export Path:** `public/games/sol-bird/client/index.html` (full path in degn-arcade folder)
   - **Export Mode:** Export project
   - **Custom HTML:** Leave default (we'll inject ws-glue.js automatically)
   - **Threads:** Enabled (if available)
   - **Audio Worklet:** Enabled (if available)
   - **GZip:** Disabled (for easier debugging)
   - **FileSystem:** Virtualized

5. **Export the game**
   - This creates `index.html` and game files in `public/games/sol-bird/client/`

6. **Verify export:**
   - Check that `public/games/sol-bird/client/index.html` exists
   - The `postbuild` script will auto-inject `ws-glue.js` (already set up)

---

### **Step 6: Test Integration (We Do This Together)**

1. **Start backend:** `cd backend/matchmaker && npm run dev`
2. **Start frontend:** `cd degn-arcade && npm run dev`
3. **Create test lobby** via `/find-game`
4. **Join game** and verify:
   - Game loads in iframe
   - WebSocket connects
   - Players spawn
   - Coins sync
   - Finish order tracked
   - Rankings sent
   - Payouts work

---

## 📋 **PHASE 2: Frontend Tier Selection UI**

### **Step 7: Update Find Game Page (I Do This)**

Replace custom lobby creation with tier selection:

1. **Update `/find-game` page:**
   - Remove "Create Lobby" modal
   - Add tier buttons: "0.1 SOL", "0.5 SOL", "1.0 SOL", etc.
   - Show current lobbies at each tier
   - Auto-join after payment confirmation

2. **Update `useMatchmaker` hook:**
   - Add `findOrJoinLobby(gameType, entryTier)` function
   - Call `/find-or-join-lobby` endpoint
   - Handle auto-matchmaking

---

## 📋 **PHASE 3: Testing & Deployment**

### **Step 8: End-to-End Testing (We Do This)**

1. **Test full flow:**
   - Create lobby → Join → Pay → Play → Finish → Payout
   - Verify all payouts (Top 3 + house rake)
   - Verify refunds (timeout scenario)

2. **Test edge cases:**
   - Not enough players (timeout + refund)
   - Multiple lobbies at same tier
   - Network disconnects
   - Game crashes

---

### **Step 9: Environment Setup (You Do This)**

**Backend (Render.com):**
- Set `HOUSE_WALLET_ADDRESS=35PgFHXEgryH9MD3PMotVYYjayCGbSywKBN1Pmyq8GWY`
- Set `ESCROW_PRIVATE_KEY` (your escrow wallet)
- Set `SOLANA_RPC` (mainnet or devnet)
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Frontend (Vercel):**
- Set `NEXT_PUBLIC_MATCHMAKER_URL` (your Render backend URL)
- Set `NEXT_PUBLIC_SOLANA_RPC`
- Set Supabase keys

---

### **Step 10: Deploy to Production (You Do This)**

1. **Deploy Backend:**
   - Push to GitHub
   - Render auto-deploys (if configured)
   - Verify backend is running

2. **Deploy Frontend:**
   - Push to GitHub
   - Vercel auto-deploys
   - Verify frontend loads

3. **Test Production:**
   - Create real lobby
   - Join with real wallet
   - Play game
   - Verify payouts work

---

## 🎯 **IMMEDIATE NEXT STEPS**

### **Right Now:**

1. **You:** Send me your Godot project files (scripts + project structure) ← **DO THIS FIRST**
2. **Me:** Review files and provide updated scripts
3. **You:** Implement my changes in Godot project
4. **You:** Export game as HTML5 to `public/games/sol-bird/client/` ← **AFTER CHANGES**
5. **Me:** Update frontend tier selection UI
6. **We:** Test end-to-end
7. **You:** Deploy to production

---

## 📁 **What to Send Me**

**Option 1: Just Scripts (Easier)**
- All `.gd` files from your project
- Project structure description

**Option 2: Full Project (Better)**
- Entire Godot project folder
- I can review everything

**Either way works!** Just send me what you have.

---

## ✅ **What's Already Done**

- ✅ Backend: Tier-based matchmaking
- ✅ Backend: Top 3 payouts (75/10/5)
- ✅ Backend: 10% house rake (immediate payouts)
- ✅ Backend: Minimum players (4 for Sol Bird)
- ✅ Backend: 2-minute timeout with refunds
- ✅ Frontend: Game loader page (`/play/sol-bird`)
- ✅ Frontend: WebSocket glue layer (`ws-glue.js`)
- ✅ Frontend: Auto-injection script

---

## 🚀 **After Godot Integration**

Once Godot is integrated and tested:

1. **Frontend:** Tier selection UI (I'll do this)
2. **Testing:** Full end-to-end test
3. **Deployment:** Production setup
4. **Launch:** 🎉

**Let's get started! Send me your Godot files FIRST, then we'll edit, then export! 🚀**

