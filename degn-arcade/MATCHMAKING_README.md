# DEGN.gg Phase 3: Matchmaking & Frontend Integration

## 🎯 Overview

This phase implements a complete multiplayer matchmaking system with Socket.IO integration, supporting both 1v1 matches (Coinflip, Connect4) and battle royale games (Sol Bird, Slither, Agar).

## 🏗️ Architecture

### Frontend Components
- **Socket Client** (`/src/lib/socket.ts`) - Shared Socket.IO client with event handling
- **Matchmaker Hook** (`/src/hooks/useMatchmaker.ts`) - React hook for lobby management
- **Find Game Page** (`/src/app/find-game/page.tsx`) - Main matchmaking interface
- **Game Lobby Page** (`/src/app/game/[lobbyId]/page.tsx`) - Lobby waiting room and game container
- **Lobby Card** (`/src/components/LobbyCard.tsx`) - Individual lobby display component

### Backend Server
- **Matchmaker Server** (`/backend/matchmaker/server.ts`) - Express + Socket.IO server
- **REST API** - Lobby creation, listing, and management
- **Real-time Events** - Player join/leave, lobby updates, game start

## 🎮 Game Types & Rules

### 1v1 Games (Custom Wagers)
- **Coinflip**: Simple 50/50 chance game
- **Connect4**: Classic Connect Four strategy game
- Entry: 0.01 - 10 SOL (player choice)
- Winner takes all (minus platform fee)

### Battle Royale Games (Fixed Entry)
- **Sol Bird (Flappy)**: 2-4 players, 0.01 SOL entry, last alive wins
- **Slither**: 4-10 players, 0.02 SOL entry, elimination-based
- **Agar**: 4-10 players, 0.02 SOL entry, mass-based with respawning

## 🚀 Setup & Installation

### 1. Install Dependencies

```bash
# Frontend dependencies (if not already installed)
cd degn-arcade
npm install socket.io-client

# Backend dependencies
cd ../backend/matchmaker
npm install
```

### 2. Start Backend Server

```bash
cd backend/matchmaker
npm run dev
```

Server will start on `http://localhost:3001`

### 3. Start Frontend

```bash
cd degn-arcade
npm run dev
```

Frontend will start on `http://localhost:3000`

## 🧪 Testing Instructions

### Basic Connection Test

1. Open browser to `http://localhost:3000`
2. Open browser console (F12)
3. You should see mock wallet auto-connected and socket connection logs
4. Navigate to `/find-game` to see the matchmaking interface

### Mock Wallet System

The system includes a mock wallet for testing without real Phantom integration:

```javascript
// Browser console commands:
mockWallet.connect('YourName')        // Connect with custom name
mockWallet.connectAs('alice')         // Connect as test user
mockWallet.disconnect()               // Disconnect
mockWallet.getStatus()                // Check status
mockWallet.updateBalance(5.0)         // Update balance
```

### Test Scenarios

#### 1. 1v1 Match Flow (Connect4/Coinflip)

**Single Browser Test:**
1. Go to `/find-game`
2. Select "Connect4" 
3. Click "Create Match"
4. Set wager amount (e.g., 0.1 SOL)
5. Click "Create Match"
6. You'll be redirected to the lobby page

**Two Browser Test:**
1. **Browser 1**: Create a Connect4 match with 0.1 SOL wager
2. **Browser 2**: 
   - Open new incognito window to `http://localhost:3000/find-game`
   - Connect different mock wallet: `mockWallet.connectAs('bob')`
   - Select "Connect4"
   - You should see the created match in the list
   - Click "Join Game" and confirm
3. **Result**: Both browsers should redirect to `/game/[lobbyId]` and show countdown

#### 2. Battle Royale Quick Play (Sol Bird)

**Two Browser Test:**
1. **Browser 1**: 
   - Go to `/find-game`
   - Select "Sol Bird (Flappy)"
   - Click "Quick Play (0.01 SOL)"
2. **Browser 2**:
   - Open incognito window
   - Connect as different user: `mockWallet.connectAs('charlie')`
   - Go to `/find-game`, select "Sol Bird"
   - Click "Quick Play"
3. **Result**: When 2 players join, lobby becomes ready and both redirect to game

#### 3. Lobby Management Test

**Multi-tab Test:**
1. Create multiple lobbies with different games and wagers
2. Test joining/leaving lobbies
3. Test lobby auto-cleanup when empty
4. Test real-time updates when players join/leave

### Console Log Examples

**Successful Lobby Creation:**
```
[2025-11-13T16:15:30.123Z] 🎮 🏠 Lobby created via API {
  "lobbyId": "lobby_1731511530123_abc456",
  "gameType": "connect4",
  "maxPlayers": 2,
  "entryAmount": 0.1,
  "createdBy": "API"
}
```

**Player Joining Lobby:**
```
[2025-11-13T16:15:35.456Z] 🎮 🚪 Player joined lobby {
  "playerId": "player_1731511535456_def789",
  "username": "Alice",
  "lobbyId": "lobby_1731511530123_abc456",
  "gameType": "connect4",
  "playersInLobby": 1,
  "maxPlayers": 2
}
```

**Lobby Ready:**
```
[2025-11-13T16:15:40.789Z] 🎮 🚀 Lobby is ready to start! {
  "lobbyId": "lobby_1731511530123_abc456",
  "gameType": "connect4",
  "playerCount": 2,
  "maxPlayers": 2
}
```

## 🔧 API Endpoints

### REST API

```bash
# Health check
GET http://localhost:3001/health

# List all lobbies
GET http://localhost:3001/lobbies

# Create lobby
POST http://localhost:3001/create-lobby
Content-Type: application/json
{
  "gameType": "connect4",
  "maxPlayers": 2,
  "entryAmount": 0.1
}

# Server stats
GET http://localhost:3001/stats
```

### Socket.IO Events

**Client → Server:**
- `player:join` - Join matchmaker with username/wallet
- `join-lobby` - Join specific lobby by ID
- `leave-lobby` - Leave current lobby
- `lobbies:list` - Request lobby list

**Server → Client:**
- `matchmaker:welcome` - Welcome message with available games
- `lobby-joined` - Confirmation of joining lobby
- `lobby-update` - Real-time lobby state updates
- `lobby-ready` - Lobby is full and ready to start
- `lobbies:list` - List of available lobbies

## 🧩 Integration Points

### TODO: Real Wallet Integration

Replace mock wallet with Phantom integration:

1. **Socket Client** (`/src/lib/socket.ts`):
   ```typescript
   // TODO: Replace getMockWallet() with real Phantom wallet
   const { publicKey, connected } = useWallet();
   ```

2. **Matchmaker Hook** (`/src/hooks/useMatchmaker.ts`):
   ```typescript
   // TODO: Use real wallet address instead of localStorage
   const walletAddress = publicKey?.toString();
   ```

3. **Layout** (`/src/app/layout.tsx`):
   ```html
   <!-- TODO: Remove mock wallet script in production -->
   <script src="/mock-wallet.js" defer></script>
   ```

### TODO: Game Client Integration

Replace placeholder game clients with real implementations:

1. **Game URLs** (`/src/app/game/[lobbyId]/page.tsx`):
   ```typescript
   // TODO: Replace with actual game client URLs
   case 'sol-bird':
     return `/games/sol-bird/client?lobby=${lobbyId}`;
   ```

2. **Game Clients**: Implement actual game clients that:
   - Connect to matchmaker via Socket.IO
   - Handle real-time gameplay
   - Report scores and game results
   - Handle payouts through server

### TODO: Supabase Integration

Add persistent storage:

1. **Backend** (`/backend/matchmaker/server.ts`):
   ```typescript
   // TODO: Replace in-memory Maps with Supabase
   // - Store lobbies in database
   // - Store match results
   // - Handle user profiles and balances
   ```

## 🐛 Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Ensure backend server is running on port 3001
   - Check for port conflicts
   - Verify CORS settings

2. **Lobby Not Found**
   - Lobbies are stored in memory and reset on server restart
   - Check server logs for lobby creation/deletion

3. **Mock Wallet Not Working**
   - Ensure `/mock-wallet.js` is loaded in browser
   - Check browser console for wallet status
   - Clear localStorage if needed: `localStorage.clear()`

4. **Real-time Updates Not Working**
   - Check Socket.IO connection in browser dev tools
   - Verify event listeners are properly registered
   - Check server logs for event emissions

### Debug Commands

```javascript
// Browser console debugging:
mockWallet.getStatus()                    // Check wallet
window.matchmakerSocket?.getConnectionStatus()  // Check socket
localStorage.getItem('degn_wallet')       // Check stored wallet
```

## 🚀 Deployment Notes

### Environment Variables

```bash
# Backend (.env)
PORT=3001
NODE_ENV=production

# Frontend (.env.local)
NEXT_PUBLIC_MATCHMAKER_URL=https://your-matchmaker-server.com
```

### Production Checklist

- [ ] Remove mock wallet script from layout
- [ ] Implement real Phantom wallet integration
- [ ] Replace in-memory storage with database
- [ ] Add proper error handling and logging
- [ ] Implement rate limiting and security measures
- [ ] Add real game clients
- [ ] Set up proper CORS for production domains
- [ ] Add SSL/TLS for WebSocket connections

## 📊 Performance Considerations

- **Socket.IO Scaling**: Use Redis adapter for multiple server instances
- **Database**: Replace in-memory storage with PostgreSQL/Redis
- **Caching**: Cache lobby lists and player data
- **Rate Limiting**: Prevent spam lobby creation
- **Monitoring**: Add logging and metrics for lobby activity

This completes the Phase 3 implementation with a solid foundation for real-time multiplayer gaming on DEGN.gg!
