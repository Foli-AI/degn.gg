# 🎮 DEGN.gg Arcade - Phase 2 Complete

**Token Wagering, Match Outcomes, Payouts, Rake & Leaderboards**

A complete crypto arcade casino platform with full wagering system, atomic transactions, provably fair match outcomes, and real-time multiplayer gameplay.

## 🚀 Phase 2 Features

### ✅ **Token Wagering System**
- **Off-chain credits** with atomic transactions
- **Bet placement** with balance validation
- **Room-based wagering** with entry limits
- **Real-time balance updates**

### ✅ **Match Orchestration**
- **Deterministic game simulation** using provably fair seeds
- **Server-side match engine** for CoinRaid battles
- **Automatic payout distribution** to winners
- **8% house rake collection** (configurable)

### ✅ **Provably Fair System**
- **HMAC-SHA256 seed generation** for match outcomes
- **Client-side verification** tools
- **Deterministic PRNG** for consistent results
- **Audit trail** for all matches

### ✅ **Real-time Multiplayer**
- **Supabase Realtime** integration
- **Live match updates** and player feeds
- **Room subscriptions** with reconnection logic
- **Match tick streaming** for animations

### ✅ **Database & Transactions**
- **Atomic PostgreSQL transactions** via Supabase RPC
- **Complete audit trail** of all credit movements
- **Leaderboard materialized views**
- **Rake account management**

### ✅ **Admin Dashboard**
- **Rake monitoring** and transaction history
- **Match refund system** for disputes
- **System status monitoring**
- **Admin-only endpoints** with key authentication

### ✅ **Comprehensive Testing**
- **Jest test suite** for game engine
- **Deterministic simulation tests**
- **Fairness validation tests**
- **Performance benchmarks**

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: TailwindCSS + Custom CSS
- **Game Engine**: Custom deterministic simulation
- **Blockchain**: Solana Web3.js (Phase 1 integration)
- **State**: Zustand
- **Testing**: Jest + Testing Library
- **Animations**: Framer Motion

## 📁 Project Structure

```
arcade-royale/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/arcade/         # Wagering API routes
│   │   ├── api/admin/          # Admin endpoints
│   │   └── admin/arcade/       # Admin dashboard
│   ├── components/arcade/      # Wagering UI components
│   │   ├── Lobby.tsx          # Room lobby with live updates
│   │   ├── RoomView.tsx       # Room management & betting
│   │   └── CoinRaidGame.tsx   # Live match visualization
│   ├── hooks/
│   │   └── useRoomRealtime.ts # Real-time subscriptions
│   ├── lib/
│   │   ├── arcadeEngine.ts    # Core wagering engine
│   │   ├── coinraidEngine.ts  # CoinRaid game simulation
│   │   └── fairness.ts        # Provably fair system
│   └── store/
│       └── arcadeStore.ts     # Global state management
├── supabase/migrations/       # Database schema
├── tests/                     # Test suite
├── scripts/                   # Demo and utilities
└── package.json
```

## 🗄️ Database Schema

### Core Tables
- **`users`** - Player accounts with credit balances
- **`rooms`** - Game lobbies with entry requirements
- **`room_players`** - Player participation and bets
- **`matches`** - Completed games with results and seeds
- **`transactions`** - All credit movements (bets, payouts, rake)
- **`rake_account`** - House rake accumulation
- **`leaderboard`** - Materialized view of player stats

### Key Features
- **Atomic transactions** via PostgreSQL RPC functions
- **Real-time subscriptions** for live updates
- **Provably fair seeds** stored with each match
- **Complete audit trail** for all operations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and project
- Environment variables configured

### Installation

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd arcade-royale
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Run database migrations**:
   ```sql
   -- Execute supabase/migrations/001_phase2_schema.sql in Supabase SQL Editor
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SERVER_SECRET=your-server-secret-for-seeds
RAKE_PERCENT=0.08
ADMIN_KEY=your-admin-key

# Optional
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_DEFAULT_CREDITS=1000
```

## 🎮 How to Play

### 1. **Join a Room**
- Browse available CoinRaid rooms in the lobby
- Check entry requirements and current players
- Place your bet to join (credits deducted immediately)

### 2. **Wait for Match Start**
- Host can start when 2+ players joined
- Or auto-start when room reaches capacity
- Real-time updates show other players joining

### 3. **Watch the Battle**
- Server simulates deterministic CoinRaid match
- Live visualization shows player health and scores
- Elimination events stream in real-time

### 4. **Collect Winnings**
- Winner receives 92% of total pot (8% rake)
- Credits added to balance immediately
- Match results stored for audit

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Demo Script
```bash
# Run complete demo with mock users
npm run demo

# Run demo and cleanup afterward
npm run demo:cleanup
```

The demo script:
1. Creates 4 mock users with credits
2. Creates a CoinRaid room
3. Places bets for all users
4. Runs a complete match simulation
5. Shows final balances and rake collected

## 🔧 API Endpoints

### Wagering APIs
- `POST /api/arcade/placeBet` - Place bet in room
- `POST /api/arcade/startMatch` - Start match (host only)
- `GET /api/arcade/rooms` - List available rooms
- `POST /api/arcade/rooms` - Create new room
- `GET /api/arcade/rooms/[id]` - Get room details
- `GET /api/arcade/leaderboard` - Get leaderboard
- `GET /api/arcade/history` - Get match history
- `GET /api/arcade/credits` - Get user credits

### Admin APIs
- `POST /api/admin/refund` - Refund match (admin key required)
- `GET /api/admin/rake` - Get rake statistics (admin key required)

## 🏆 Leaderboard System

The leaderboard tracks:
- **Total Won** - Lifetime winnings from matches
- **Total Bet** - Lifetime betting volume
- **Wins** - Number of matches won
- **Last Active** - Most recent activity

Updated automatically via materialized view refresh after each match.

## 🔒 Security & Fairness

### Provably Fair
- **Server seeds** generated using HMAC-SHA256
- **Client verification** tools available
- **Deterministic outcomes** - same seed = same result
- **Audit trail** - all seeds stored with matches

### Transaction Safety
- **Atomic operations** - all-or-nothing credit updates
- **Race condition protection** via PostgreSQL locks
- **Idempotency** - duplicate requests handled safely
- **Balance validation** - insufficient funds rejected

### Admin Security
- **Admin key authentication** for sensitive endpoints
- **Refund audit trail** with reasons
- **Rate limiting** on critical operations
- **Environment variable secrets**

## 📊 Rake Configuration

Default rake: **8%** (configurable via `RAKE_PERCENT`)

Example with 4 players betting 100 credits each:
- Total pot: 400 credits
- Rake collected: 32 credits (8%)
- Winner payout: 368 credits

Rake is:
- Deducted automatically on match completion
- Stored in dedicated `rake_account` table
- Tracked with full transaction history
- Viewable in admin dashboard

## 🔄 Real-time Features

### Room Updates
- Player joins/leaves
- Bet placements
- Match start/end
- Status changes

### Match Events
- Elimination notifications
- Score updates
- Health changes
- Final results

### Reconnection
- Automatic reconnection on disconnect
- Exponential backoff retry logic
- State synchronization on reconnect
- Error handling and recovery

## 🚀 Production Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Supabase Setup
1. Create new Supabase project
2. Run migration SQL in SQL Editor
3. Enable Realtime for required tables
4. Configure RLS policies if needed

### Security Checklist
- [ ] Rotate `SERVER_SECRET` regularly
- [ ] Use strong `ADMIN_KEY`
- [ ] Enable Supabase RLS policies
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Enable HTTPS only

## 🔮 Phase 3 Roadmap

- **On-chain integration** - Solana deposits/withdrawals
- **Smart contract escrow** - Trustless large payouts
- **NFT rewards** - Achievement and trophy system
- **Tournament system** - Scheduled competitions
- **Referral program** - Player acquisition incentives
- **Advanced analytics** - Player behavior insights

## 📝 License

This project is licensed under the MIT License.

---

**Phase 2 Complete** ✅ - Full wagering system with atomic transactions, provably fair outcomes, and real-time multiplayer gameplay ready for production deployment.