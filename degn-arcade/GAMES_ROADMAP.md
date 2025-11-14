# DEGN.GG Games Roadmap

## 🎰 Casino Games (5 Games) - EASIEST TO BUILD

### Build Difficulty Ranking (Easiest → Hardest):

1. **Dice** ⭐⭐⭐⭐⭐ (EASIEST - 1-2 days)
   - **Why:** Just RNG + bet selection (high/low/number/range)
   - **Build:** React state + Canvas/SVG for dice animation
   - **Fairness:** Simple SHA-256 commit-reveal
   - **Features:** Bet on number (1-6), range (1-3, 4-6), or exact match
   - **Streamer Appeal:** Fast rounds, clear outcomes, easy to understand

2. **Wheel of Sol** ⭐⭐⭐⭐ (EASY - 2 days)
   - **Why:** Spinning animation + tiered multipliers
   - **Build:** CSS/Canvas rotation animation, weighted segments
   - **Fairness:** Pre-determined result, revealed after spin animation
   - **Features:** Multiple tiers (1x, 2x, 5x, 10x, 50x, JACKPOT)
   - **Streamer Appeal:** Visual suspense, big win potential, quick rounds

3. **Crash** ⭐⭐⭐ (MEDIUM - 2-3 days)
   - **Why:** Multiplier curve + timing mechanics
   - **Build:** Animated line graph, auto-cashout logic
   - **Fairness:** Server-seeded RNG, client displays multiplier
   - **Features:** Bet → watch multiplier climb → cash out before crash
   - **Streamer Appeal:** HIGH - tension builds, chat goes wild on big multipliers

4. **Plinko** ⭐⭐⭐ (MEDIUM - 2-3 days)
   - **Why:** Physics simulation + drop mechanics
   - **Build:** Matter.js or custom physics, peg collision detection
   - **Fairness:** Ball path determined by server seed
   - **Features:** Choose risk level (rows), drop ball, watch it bounce
   - **Streamer Appeal:** Visual satisfaction, unpredictable paths, big multipliers

5. **Roulette** ⭐⭐⭐ (MEDIUM - 3 days)
   - **Why:** Spinning wheel + betting zones
   - **Build:** Canvas wheel animation, betting grid UI
   - **Fairness:** Server determines winning number before spin
   - **Features:** European roulette (0-36), multiple bet types (straight, split, color, etc.)
   - **Streamer Appeal:** Classic casino feel, multiple betting strategies

**SKIPPED:** Blackjack (too complex - card logic, AI dealer, splitting, doubling, insurance)

---

## 🕹️ Arcade Games (5 Games) - STREAMER FAVORITES

### 1. **CoinRaid** 🪙 (Heist arena)
- **Build Time:** 4-5 days
- **Players:** 6-10 per arena
- **Mechanics:** Dash through traps, steal vaults, tackle opponents, bank coins before timer ends.
- **Why Streamers Love It:** Loot steals, clutch escapes, squad betrayals.
- **Tech:** Phaser 3 + Supabase Realtime
- **Rewards:** End-of-round pot split by coin count (1st 55%, 2nd 25%, 3rd 20%)

### 2. **SOL Serpent Royale** 🐍 (Slither.io style)
- **Build Time:** 3-4 days
- **Players:** 6-12 per match
- **Mechanics:** Consume "crypto orbs", grow longer, trap opponents; last serpent or highest score wins.
- **Why Streamers Love It:** Easy to spectate, chaotic eliminations, comeback potential.
- **Tech:** Phaser 3 + Supabase Realtime
- **Rewards:** Winner takes 60% of pot, 2nd 25%, 3rd 15%

### 3. **Quick Draw Arena** ⚡ (Reaction duel)
- **Build Time:** 1-2 days
- **Players:** 4-8 per bracket
- **Mechanics:** Wait for signal → tap fastest → slowest eliminated each round until one champion remains.
- **Why Streamers Love It:** Split-second tension, reaction flexing, salty rematches.
- **Tech:** React + WebSocket/PartyKit for millisecond sync
- **Rewards:** Winner takes full pot (optional 70/30 split for top 2)

### 4. **Moon Blaster** 🚀 (Vertical jetpack shooter)
- **Build Time:** 3-4 days
- **Players:** 4-6 simultaneous
- **Mechanics:** Jetpack upward, dodge asteroids, blast sentries, grab crypto shards; last pilot alive or highest altitude wins.
- **Why Streamers Love It:** Flawless dodges, snipe knockouts, escalating chaos.
- **Tech:** Phaser 3 + Arcade physics + Supabase Realtime
- **Rewards:** Winner takes 60%, remaining 40% split by damage dealt & collected shards.

### 5. **Pixel Brawl Royale** ⚔️ (2D physics brawler)
- **Build Time:** 4-5 days
- **Players:** 4-6 fighters per arena
- **Mechanics:** Pixel characters with dash, smash, throw; map hazards rotate every round.
- **Why Streamers Love It:** Highlight reels, trash talk, skill ceiling but approachable.
- **Tech:** Phaser 3 + Matter.js + Supabase Realtime
- **Rewards:** Winner takes 70% of buy-in pot, runner-up 30%

> **Stretch Goal:** **Hacker Run** 💻 — cyberpunk endless runner with seasonal leaderboard pools. Excellent for events once core five are live.

---

## 📊 Build Priority & Timeline

### Phase 1: Casino Games (Week 1-2)
1. **Dice** (Day 1-2) - Fastest win, test wallet integration
2. **Wheel of Sol** (Day 3-4) - Visual appeal, test fairness system
3. **Crash** (Day 5-7) - High engagement, test multiplier logic
4. **Plinko** (Day 8-10) - Physics test, visual satisfaction
5. **Roulette** (Day 11-14) - Complete casino suite (Mines queued as bonus if time permits)

### Phase 2: Arcade Games (Week 3-5)
1. **Quick Draw Arena** (Day 15-16) - Fastest build, validates realtime infra
2. **CoinRaid** (Day 17-21) - Establishes shared multiplayer foundation
3. **SOL Serpent Royale** (Day 22-25) - Reuses movement systems, adds elimination loop
4. **Moon Blaster** (Day 26-29) - Vertical scroller variant using shared physics kit
5. **Pixel Brawl Royale** (Day 30-34) - Adds combat + hazard kits
6. **Hacker Run** (Day 35-38, stretch) - Seasonal single/multiplayer endless runner

---

## 🎯 Why These Games Work for Streamers

### Casino Games:
- **Fast Rounds:** 30 seconds - 2 minutes per game
- **Clear Outcomes:** Win/loss is immediate and visual
- **Chat Interaction:** Viewers can suggest bets, react to crashes
- **Big Win Potential:** Multipliers create "hype moments"

### Arcade Games:
- **Visual Chaos:** Easy to watch, understand, and commentate
- **Comeback Potential:** Underdog wins create viral moments
- **Skill + Luck:** Streamers can show off, but RNG keeps it fair
- **Quick Matches:** 2-5 minutes per match, keeps viewers engaged
- **Multiplayer Drama:** Rivalries, eliminations, final moments

---

## 🛠️ Tech Stack for Games

### Casino Games:
- **Frontend:** React + Canvas/SVG
- **Physics:** Matter.js (for Plinko)
- **Fairness:** SHA-256 commit-reveal + Supabase logging
- **State:** React Context + Zustand (for game state)

### Arcade Games:
- **Engine:** Phaser 3 (official Next.js template)
- **Multiplayer:** Supabase Realtime or PartyKit
- **Physics:** Matter.js (for collision detection)
- **State:** Phaser Scenes + Supabase for match state

---

## 🎮 Game Features (All Games)

### Universal Features:
- ✅ Wallet integration (Phantom, Solflare)
- ✅ Real-time balance updates
- ✅ Provably fair (SHA-256 hashing)
- ✅ Match history (Supabase)
- ✅ Leaderboards (daily/weekly)
- ✅ XP rewards (for playing)
- ✅ Achievement system
- ✅ Chat integration (optional)

### Arcade-Specific:
- ✅ Matchmaking (4-8 players)
- ✅ Lobby system (wait for players)
- ✅ Spectator mode (for streamers)
- ✅ Replay system (save last 10 matches)
- ✅ Power-ups (random spawns)
- ✅ Seasonal tournaments

---

## 🚀 Next Steps

1. **Set up Phaser 3 + Next.js template**
2. **Build Dice game first** (test wallet + fairness)
3. **Build Quick Draw** (test multiplayer sync)
4. **Iterate based on feedback**
5. **Add remaining games in priority order**

---

## 📝 Notes

- All games use **Solana Pay** for instant deposits/withdrawals
- **House edge:** 2% (automatically routed to DEGN treasury)
- **RTP:** 98% across all casino games
- **Arcade games:** Winner-takes-most pot distribution
- **Fairness:** Every game round is hashed and logged on-chain
- **Streamer mode:** Optional overlay for OBS (shows balance, win streak, etc.)

