# DEGN.gg Phase 3: Frontend Matchmaking + Sol-Bird Integration

## Overview

Phase 3 implements a complete multiplayer matchmaking system with real-time lobby management and integrates the first playable game: **Sol-Bird** (multiplayer Flappy Bird).

### Key Features

- **Real-time Matchmaking**: Socket.IO-powered lobby system with live updates
- **Find Game Flow**: Comprehensive UI for discovering and joining matches
- **Sol-Bird Integration**: Fully playable multiplayer Flappy Bird using open-source CrappyBird
- **Mock Wallet System**: Development-ready wallet simulation for testing
- **Authoritative Game Server**: Server-side game logic for fair multiplayer gameplay

## Architecture

```
degn-arcade/
├── src/
│   ├── app/
│   │   ├── find-game/page.tsx          # Main matchmaking interface
│   │   └── game/[lobbyId]/page.tsx     # Game lobby & client container
│   ├── components/
│   │   └── LobbyCard.tsx               # Reusable lobby display component
│   ├── hooks/
│   │   └── useMatchmaker.ts            # React hook for matchmaker integration
│   └── lib/
│       └── socket.ts                   # Socket.IO client configuration
├── public/
│   └── mock-wallet.js                  # Development wallet simulator
backend/matchmaker/
├── server.ts                           # Express + Socket.IO matchmaker server
├── package.json
└── tsconfig.json
games/sol-bird/
├── core/                               # Cloned CrappyBird repository
├── client/
│   ├── index.html                      # Game client wrapper
│   └── multiplayerWrapper.js           # Multiplayer integration layer
└── server/
    ├── gameServer.ts                   # Authoritative game server
    ├── package.json
    └── tsconfig.json
```

## Game Types & Configuration

### 1v1 Games (Coinflip, Connect4)
- **Entry Method**: Browse existing matches by wager amount or create custom match
- **Wager Range**: 0.01 - 10 SOL (configurable)
- **Flow**: Create match → Wait for opponent → Game starts automatically

### Battle Royale Games (Sol-Bird, Slither, Agar)
- **Entry Method**: Quick Play with fixed entry amounts
- **Player Range**: 2-10 players (game-specific)
- **Flow**: Quick Play → Auto-join best lobby → Game starts when full

## Installation & Setup

### Prerequisites

1. **Clone CrappyBird** (if not already done):
   ```bash
   cd games/sol-bird
   git clone https://github.com/varunpant/CrappyBird.git core
   ```

2. **Install Dependencies**:
   ```bash
   # Frontend dependencies (if not installed)
   cd degn-arcade
   npm install socket.io-client

   # Matchmaker server
   cd backend/matchmaker
   npm install

   # Sol-Bird game server
   cd games/sol-bird/server
   npm install
   ```

### Development Servers

You need to run **3 servers** simultaneously:

#### 1. Matchmaker Server (Port 3001)
```bash
cd backend/matchmaker
npm run dev
```

#### 2. Frontend Server (Port 3000)
```bash
cd degn-arcade
npm run dev
```

#### 3. Sol-Bird Game Server (Optional - for authoritative gameplay)
```bash
cd games/sol-bird/server
npm run dev
```

## Testing Flows

### Mock Wallet Setup

1. **Open Browser**: Navigate to `http://localhost:3000`
2. **Connect Mock Wallet**: Click the purple "Mock Wallet" overlay in top-right
3. **Auto-Generated**: Wallet address and username are created automatically
4. **Persistent**: Wallet info is saved in localStorage across sessions

### 1v1 Match Testing (Coinflip/Connect4)

1. **Tab A**: 
   - Go to `/find-game`
   - Select "Coinflip" or "Connect4"
   - Click "Create Match"
   - Set wager amount (e.g., 0.1 SOL)
   - Confirm creation

2. **Tab B**:
   - Go to `/find-game` 
   - Select same game type
   - See the match in the lobby list
   - Click "Join Game"
   - Confirm entry

3. **Expected Result**:
   - Both tabs redirect to `/game/{lobbyId}`
   - Lobby shows 2/2 players
   - 5-second countdown starts
   - Game client loads (placeholder for non-Sol-Bird games)

### Battle Royale Testing (Sol-Bird)

1. **Multiple Tabs** (2-4 recommended):
   - Go to `/find-game`
   - Select "Sol Bird"
   - Click "Quick Play"

2. **Expected Result**:
   - All tabs join the same lobby automatically
   - When lobby reaches max players (or 2+ for testing):
     - Status changes to "Ready"
     - 5-second countdown
     - Redirect to Sol-Bird game client

3. **Sol-Bird Gameplay**:
   - Press SPACE or click to flap
   - Survive as long as possible
   - Real-time multiplayer status updates
   - Game ends when only 1 player remains

## API Endpoints

### Matchmaker Server (localhost:3001)

#### REST API
```bash
# Health check
GET /health

# List all lobbies
GET /lobbies

# Create new lobby
POST /create-lobby
Content-Type: application/json
{
  "gameType": "sol-bird",
  "maxPlayers": 4,
  "entryAmount": 0.01
}

# Get server stats
GET /stats
```

#### Socket.IO Events

**Client → Server:**
- `player:join` - Register as player
- `join-lobby` - Join specific lobby
- `leave-lobby` - Leave current lobby
- `lobbies:list` - Request lobby list
- `player:flap` - Sol-Bird game input
- `player:died` - Report player death
- `game:over` - Report game completion

**Server → Client:**
- `matchmaker:welcome` - Connection confirmed
- `lobby-joined` - Successfully joined lobby
- `lobby-ready` - Lobby full, game starting
- `lobby-update` - Lobby state changed
- `lobbyListUpdate` - Global lobby list updated
- `match-start` - Game has begun
- `match-end` - Game completed

## Sample cURL Commands

### Create Coinflip Match
```bash
curl -X POST http://localhost:3001/create-lobby \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "coinflip",
    "maxPlayers": 2,
    "entryAmount": 0.1
  }'
```

### Create Sol-Bird Lobby
```bash
curl -X POST http://localhost:3001/create-lobby \
  -H "Content-Type: application/json" \
  -d '{
    "gameType": "sol-bird",
    "maxPlayers": 4,
    "entryAmount": 0.01
  }'
```

### List Active Lobbies
```bash
curl http://localhost:3001/lobbies
```

## Integration Points

### Wallet Integration (TODO)
Current mock wallet locations that need Phantom integration:

1. **`useMatchmaker.ts`** - Line 87: `getMockWallet()` function
2. **`multiplayerWrapper.js`** - Line 35: `getMockWallet()` function  
3. **`LobbyCard.tsx`** - Line 67: Transaction confirmation modal
4. **`find-game/page.tsx`** - Line 108: Wallet balance verification

### Solana Payout Integration (TODO)
Game completion handlers that need on-chain payout logic:

1. **`gameServer.ts`** - Line 200: `sendMatchResults()` function
2. **`multiplayerWrapper.js`** - Line 180: `showGameResults()` function

### Database Integration (TODO)
Match results that should be stored in Supabase:

1. **Match History**: Player performance, earnings, rankings
2. **Leaderboards**: Global and game-specific statistics  
3. **Rake Tracking**: Platform fee collection and distribution

## Troubleshooting

### Common Issues

1. **"Connecting to matchmaker..." stuck**:
   - Ensure matchmaker server is running on port 3001
   - Check browser console for connection errors
   - Verify no firewall blocking localhost:3001

2. **Lobbies not updating in real-time**:
   - Check Socket.IO connection status in browser dev tools
   - Restart matchmaker server
   - Clear browser cache/localStorage

3. **Sol-Bird game not loading**:
   - Verify CrappyBird repository was cloned to `games/sol-bird/core`
   - Check browser console for JavaScript errors
   - Ensure all game assets are accessible

4. **Mock wallet not persisting**:
   - Check localStorage in browser dev tools
   - Look for `degn_wallet` key
   - Clear and reconnect if corrupted

### Development Tips

1. **Multiple Browser Profiles**: Use different browser profiles or incognito windows for multi-player testing
2. **Network Tab**: Monitor WebSocket connections in browser dev tools
3. **Server Logs**: Watch matchmaker server console for real-time event logging
4. **localStorage**: Use browser dev tools to inspect/modify mock wallet data

## Next Steps (Phase 4)

1. **Replace Mock Wallet**: Integrate real Phantom wallet adapter
2. **On-Chain Payouts**: Implement Solana transaction handling
3. **Game Servers**: Deploy authoritative servers for all game types
4. **Database Integration**: Store match results and player statistics
5. **Production Deployment**: Configure for mainnet Solana network

## File Modifications Summary

### New Files Created
- `degn-arcade/src/lib/socket.ts` - Socket.IO client
- `degn-arcade/src/hooks/useMatchmaker.ts` - Matchmaker React hook
- `degn-arcade/src/components/LobbyCard.tsx` - Lobby display component
- `degn-arcade/src/app/find-game/page.tsx` - Main matchmaking page
- `degn-arcade/src/app/game/[lobbyId]/page.tsx` - Game lobby page
- `degn-arcade/public/mock-wallet.js` - Development wallet simulator
- `games/sol-bird/client/index.html` - Sol-Bird game client
- `games/sol-bird/client/multiplayerWrapper.js` - Multiplayer integration
- `games/sol-bird/server/gameServer.ts` - Authoritative game server
- `games/sol-bird/server/package.json` - Game server dependencies
- `games/sol-bird/server/tsconfig.json` - Game server TypeScript config

### Modified Files
- `backend/matchmaker/server.ts` - Added `broadcastLobbyListUpdate()` function
- `degn-arcade/src/app/page.tsx` - Updated "Enter Arcade" button to navigate to `/find-game`
- `degn-arcade/src/app/layout.tsx` - Already included mock-wallet.js script

### Cloned Repository
- `games/sol-bird/core/` - CrappyBird open-source Flappy Bird implementation
