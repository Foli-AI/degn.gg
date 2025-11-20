# 🐦 BirdMMO → SolBird Battle Royale Migration Guide

## 📋 Executive Summary

This guide will transform **BirdMMO** (React Three Fiber + Three.js + Socket.IO) into **SolBird Battle Royale** for DEGN.gg, implementing a "last person alive" wagering game.

**Timeline:** 2-3 days  
**Complexity:** Medium-High  
**Approach:** Manual step-by-step edits (no automation)

---

## 🎯 Game Rules (Final)

- **Players:** 2-8 per lobby
- **Bots:** Auto-fill if lobby not full (using existing DEGN.gg bot system)
- **Start:** All players start simultaneously
- **Death:** Hit obstacle → eliminated
- **Winner:** Last player alive wins 90% of pot
- **House:** DEGN.gg takes 10% rake
- **No finish line, no distance tracking - pure survival**

---

## 📁 Phase 0: Setup & Analysis

### Step 0.1: Clone BirdMMO

```bash
cd degn-arcade/public/games
git clone https://github.com/Sean-Bradley/BirdMMO.git sol-bird-birdmmo
cd sol-bird-birdmmo
npm install
```

### Step 0.2: Analyze Current Structure

**Key Files to Understand:**

```
sol-bird-birdmmo/
├── src/
│   └── client/
│       ├── App.jsx              # Main entry point
│       ├── Game.jsx             # Game scene/state
│       ├── Bird.jsx             # Bird component (player)
│       ├── Player.jsx           # Multiplayer player representation
│       ├── Pipe.jsx             # Obstacle pipes
│       ├── Pipes.jsx            # Pipe manager
│       ├── useSocketIO.jsx       # Socket.IO hook (TO REPLACE)
│       ├── useKeyboard.jsx      # Input handling
│       ├── Overlay.jsx          # UI overlay
│       └── styles.css           # Styling
├── package.json
└── webpack.*.js                 # Build config
```

**Current Architecture:**
- React Three Fiber (3D rendering)
- Socket.IO for multiplayer
- Custom server expected
- Username prompt on start
- Main menu system

**What We Need:**
- WebSocket (replace Socket.IO)
- DEGN.gg backend integration
- No menus, auto-start
- Battle royale death tracking
- Bot integration

---

## 🟪 PHASE 1: Replace Multiplayer System

### Step 1.1: Create Network Abstraction Layer

**Create:** `src/client/Network.ts`

```typescript
// src/client/Network.ts

interface NetworkEvent {
  type: string;
  payload: any;
}

class DEGNNetwork {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Array<(data: any) => void>> = new Map();
  private matchKey: string = '';
  private playerId: string = '';
  private username: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;

  connect(matchKey: string, playerId: string, username: string, wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.matchKey = matchKey;
      this.playerId = playerId;
      this.username = username;

      try {
        // Normalize WebSocket URL
        const normalizedUrl = wsUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
        
        this.ws = new WebSocket(normalizedUrl);

        this.ws.onopen = () => {
          console.log('[DEGN Network] Connected to backend');
          this.reconnectAttempts = 0;
          
          // Send init message
          this.send('init', {
            matchKey,
            playerId,
            username
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: NetworkEvent = JSON.parse(event.data);
            this.handleEvent(data.type, data.payload || data);
          } catch (error) {
            console.error('[DEGN Network] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[DEGN Network] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[DEGN Network] WebSocket closed:', event.code, event.reason);
          
          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[DEGN Network] Reconnecting (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => {
              this.connect(matchKey, playerId, username, wsUrl);
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(type: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[DEGN Network] Cannot send - WebSocket not open');
      return;
    }

    const message = {
      type,
      matchKey: this.matchKey,
      playerId: this.playerId,
      ...data
    };

    this.ws.send(JSON.stringify(message));
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleEvent(type: string, payload: any): void {
    // Normalize event type
    const normalizedType = type.toLowerCase().replace(/[_-]/g, '');
    
    // Handle specific events
    switch (normalizedType) {
      case 'gamestart':
      case 'game_start':
        this.emit('game:start', payload);
        break;
      case 'playerupdate':
      case 'player_update':
        this.emit('player:update', payload);
        break;
      case 'playerdeath':
      case 'player_death':
        this.emit('player:death', payload);
        break;
      case 'gameend':
      case 'game_end':
        this.emit('game:end', payload);
        break;
      default:
        this.emit(type, payload);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[DEGN Network] Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  // Battle Royale specific methods
  sendPlayerDeath(deathReason: string): void {
    this.send('PLAYER_DEATH', {
      deathReason,
      timestamp: Date.now()
    });
  }

  sendPlayerState(position: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }): void {
    this.send('PLAYER_STATE', {
      position,
      velocity,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const network = new DEGNNetwork();
export default network;
```

### Step 1.2: Replace useSocketIO.jsx

**File:** `src/client/useSocketIO.jsx` → **RENAME TO:** `src/client/useDEGNNetwork.tsx`

**Replace entire file with:**

```typescript
// src/client/useDEGNNetwork.tsx

import { useEffect, useState, useCallback } from 'react';
import network from './Network';

interface Player {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  alive: boolean;
  isBot?: boolean;
}

interface UseDEGNNetworkReturn {
  connected: boolean;
  players: Player[];
  gameStarted: boolean;
  gameEnded: boolean;
  winner: string | null;
  sendPlayerState: (position: any, velocity: any) => void;
  sendPlayerDeath: (reason: string) => void;
}

export function useDEGNNetwork(
  matchKey: string | null,
  playerId: string | null,
  username: string | null,
  wsUrl: string | null
): UseDEGNNetworkReturn {
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Connect on mount
  useEffect(() => {
    if (!matchKey || !playerId || !username || !wsUrl) {
      console.warn('[useDEGNNetwork] Missing required parameters');
      return;
    }

    console.log('[useDEGNNetwork] Connecting to DEGN.gg backend...', { matchKey, playerId, username });

    network
      .connect(matchKey, playerId, username, wsUrl)
      .then(() => {
        setConnected(true);
        console.log('[useDEGNNetwork] Connected successfully');
      })
      .catch((error) => {
        console.error('[useDEGNNetwork] Connection failed:', error);
      });

    return () => {
      network.disconnect();
      setConnected(false);
    };
  }, [matchKey, playerId, username, wsUrl]);

  // Listen for game start
  useEffect(() => {
    const handleGameStart = (data: any) => {
      console.log('[useDEGNNetwork] Game started!', data);
      setGameStarted(true);
      
      // Initialize players from backend
      if (data.players && Array.isArray(data.players)) {
        setPlayers(
          data.players.map((p: any) => ({
            id: p.id || p.playerId,
            username: p.username || p.name || 'Player',
            position: p.position || { x: 0, y: 0, z: 0 },
            velocity: p.velocity || { x: 0, y: 0, z: 0 },
            alive: true,
            isBot: p.isBot || false
          }))
        );
      }
    };

    network.on('game:start', handleGameStart);

    return () => {
      network.off('game:start', handleGameStart);
    };
  }, []);

  // Listen for player updates
  useEffect(() => {
    const handlePlayerUpdate = (data: any) => {
      setPlayers((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((p) => p.id === data.playerId);
        
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            position: data.position || updated[index].position,
            velocity: data.velocity || updated[index].velocity
          };
        }
        
        return updated;
      });
    };

    network.on('player:update', handlePlayerUpdate);

    return () => {
      network.off('player:update', handlePlayerUpdate);
    };
  }, []);

  // Listen for player deaths
  useEffect(() => {
    const handlePlayerDeath = (data: any) => {
      console.log('[useDEGNNetwork] Player died:', data);
      
      setPlayers((prev) => {
        const updated = prev.map((p) => {
          if (p.id === data.playerId) {
            return { ...p, alive: false };
          }
          return p;
        });
        
        // Check if only one player alive = winner!
        const alivePlayers = updated.filter((p) => p.alive);
        if (alivePlayers.length === 1) {
          const winnerId = alivePlayers[0].id;
          setWinner(winnerId);
          setGameEnded(true);
          
          // Notify backend
          network.send('MATCH_RESULT', {
            winner: winnerId,
            rankings: updated
              .filter((p) => !p.alive)
              .map((p, index) => ({
                playerId: p.id,
                position: index + 2 // 2nd, 3rd, etc.
              }))
              .concat([{ playerId: winnerId, position: 1 }])
          });
        }
        
        return updated;
      });
    };

    network.on('player:death', handlePlayerDeath);

    return () => {
      network.off('player:death', handlePlayerDeath);
    };
  }, []);

  // Listen for game end
  useEffect(() => {
    const handleGameEnd = (data: any) => {
      console.log('[useDEGNNetwork] Game ended!', data);
      setGameEnded(true);
      if (data.winner) {
        setWinner(data.winner);
      }
    };

    network.on('game:end', handleGameEnd);

    return () => {
      network.off('game:end', handleGameEnd);
    };
  }, []);

  // Send player state
  const sendPlayerState = useCallback((position: any, velocity: any) => {
    if (connected) {
      network.sendPlayerState(position, velocity);
    }
  }, [connected]);

  // Send player death
  const sendPlayerDeath = useCallback((reason: string) => {
    if (connected) {
      network.sendPlayerDeath(reason);
    }
  }, [connected]);

  return {
    connected,
    players,
    gameStarted,
    gameEnded,
    winner,
    sendPlayerState,
    sendPlayerDeath
  };
}
```

### Step 1.3: Update All Socket.IO References

**Search and replace in all files:**

1. **Find:** `import io from 'socket.io-client'`
   **Replace:** `import network from './Network'`

2. **Find:** `socket.emit(...)`
   **Replace:** `network.send(...)`

3. **Find:** `socket.on(...)`
   **Replace:** `network.on(...)`

4. **Find:** `socket.off(...)`
   **Replace:** `network.off(...)`

**Files to update:**
- `src/client/App.jsx`
- `src/client/Game.jsx`
- `src/client/Bird.jsx`
- `src/client/Player.jsx`
- Any other files importing `useSocketIO`

---

## 🟧 PHASE 2: Implement Battle Royale Logic

### Step 2.1: Update Game.jsx - Add Death Tracking

**File:** `src/client/Game.jsx`

**Find the game loop/update function and add:**

```javascript
// Add at top of component
const [alivePlayers, setAlivePlayers] = useState(new Set());
const [deathOrder, setDeathOrder] = useState([]);
const [gameState, setGameState] = useState('waiting'); // 'waiting' | 'playing' | 'ended'

// In useEffect for game start
useEffect(() => {
  if (gameStarted && players.length > 0) {
    setGameState('playing');
    setAlivePlayers(new Set(players.map(p => p.id)));
    setDeathOrder([]);
  }
}, [gameStarted, players]);

// Death handler
const handlePlayerDeath = useCallback((playerId, deathReason) => {
  setAlivePlayers(prev => {
    const updated = new Set(prev);
    updated.delete(playerId);
    
    // Track death order
    setDeathOrder(prev => [...prev, { playerId, deathReason, timestamp: Date.now() }]);
    
    // Check if only one player alive = winner!
    if (updated.size === 1) {
      const winnerId = Array.from(updated)[0];
      setGameState('ended');
      
      // Send winner to backend
      network.send('MATCH_RESULT', {
        winner: winnerId,
        rankings: buildRankings(winnerId, deathOrder)
      });
    } else if (updated.size === 0) {
      // Edge case: all dead (shouldn't happen, but handle it)
      setGameState('ended');
      console.warn('[Game] All players dead - no winner');
    }
    
    return updated;
  });
}, []);

// Build rankings (last alive = winner, others by death order)
const buildRankings = (winnerId, deaths) => {
  const rankings = [
    { playerId: winnerId, position: 1 } // Winner
  ];
  
  // Add others in reverse death order (last to die = 2nd place)
  for (let i = deaths.length - 1; i >= 0; i--) {
    if (deaths[i].playerId !== winnerId) {
      rankings.push({
        playerId: deaths[i].playerId,
        position: rankings.length + 1
      });
    }
  }
  
  return rankings;
};
```

### Step 2.2: Update Bird.jsx - Add Death Detection

**File:** `src/client/Bird.jsx`

**Find collision detection and add:**

```javascript
// Add state
const [isAlive, setIsAlive] = useState(true);
const [deathReason, setDeathReason] = useState<string | null>(null);

// In collision detection (where bird hits pipe/ground)
useEffect(() => {
  // Check for collisions
  // This depends on BirdMMO's collision system
  // Look for collision detection code in Bird.jsx
  
  const checkCollisions = () => {
    if (!isAlive) return;
    
    // Check ground collision
    if (birdPosition.y <= groundLevel) {
      setIsAlive(false);
      setDeathReason('ground');
      onDeath('ground');
      return;
    }
    
    // Check pipe collision
    // This depends on how BirdMMO detects pipe collisions
    // Look for pipe collision detection in the original code
    pipes.forEach(pipe => {
      if (checkPipeCollision(birdPosition, pipe)) {
        setIsAlive(false);
        setDeathReason('pipe');
        onDeath('pipe');
        return;
      }
    });
  };
  
  // Run collision check every frame
  const interval = setInterval(checkCollisions, 16); // ~60fps
  
  return () => clearInterval(interval);
}, [birdPosition, pipes, isAlive]);

// Death callback
const onDeath = (reason: string) => {
  if (sendPlayerDeath) {
    sendPlayerDeath(reason);
  }
  
  // Stop bird movement
  // Disable controls
  // Show death animation (optional)
};
```

### Step 2.3: Update Player.jsx - Show Alive/Dead State

**File:** `src/client/Player.jsx`

**Add visual indicator for alive/dead:**

```javascript
// In render/return
{!player.alive && (
  <mesh position={[player.position.x, player.position.y, player.position.z]}>
    {/* Death indicator - red X or skull */}
    <boxGeometry args={[0.5, 0.5, 0.1]} />
    <meshStandardMaterial color="red" opacity={0.7} transparent />
  </mesh>
)}

{player.alive && (
  <mesh position={[player.position.x, player.position.y, player.position.z]}>
    {/* Normal bird mesh */}
    {/* ... existing bird rendering code ... */}
  </mesh>
)}
```

---

## 🟩 PHASE 3: Bot Integration

### Step 3.1: Use Existing DEGN.gg Bot System

**The backend already handles bots!** You don't need to add bot logic in BirdMMO.

**Backend will:**
- Auto-fill lobbies with bots if needed
- Bots have `isBot: true` flag
- Bots are included in `game:start` event

**In Game.jsx, just handle bots like regular players:**

```javascript
// Bots are already in the players array from backend
// They have isBot: true flag
// Treat them the same as real players for rendering

players.forEach(player => {
  if (player.isBot) {
    // Render bot player (maybe with different color/indicator)
    // Bots are controlled by backend, not client
  } else {
    // Render real player
  }
});
```

**No additional bot code needed in BirdMMO!**

---

## 🟫 PHASE 4: Integrate With DEGN.gg Lobby System

### Step 4.1: Update App.jsx - Remove Menus, Auto-Start

**File:** `src/client/App.jsx`

**Replace entire file with:**

```javascript
// src/client/App.jsx

import React, { useEffect, useState } from 'react';
import { Game } from './Game';

function App() {
  const [matchKey, setMatchKey] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState<number>(0);
  const [players, setPlayers] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Get parameters from URL (passed from DEGN.gg)
    const urlParams = new URLSearchParams(window.location.search);
    
    const matchKeyParam = urlParams.get('matchKey');
    const playerIdParam = urlParams.get('playerId');
    const usernameParam = urlParams.get('username');
    const wsUrlParam = urlParams.get('wsUrl');
    const entryParam = urlParams.get('entry');
    const playersParam = urlParams.get('players');

    if (matchKeyParam && playerIdParam && usernameParam && wsUrlParam) {
      setMatchKey(matchKeyParam);
      setPlayerId(playerIdParam);
      setUsername(usernameParam);
      setWsUrl(wsUrlParam);
      setEntryAmount(parseFloat(entryParam || '0'));
      
      if (playersParam) {
        try {
          setPlayers(JSON.parse(decodeURIComponent(playersParam)));
        } catch (e) {
          console.error('Error parsing players:', e);
        }
      }
      
      setReady(true);
    } else {
      console.error('[App] Missing required URL parameters');
      // Show error or redirect
    }
  }, []);

  if (!ready || !matchKey || !playerId || !username || !wsUrl) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        background: '#0b0c10'
      }}>
        <div>
          <h2>Loading SolBird Battle Royale...</h2>
          <p>Connecting to DEGN.gg...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Game
        matchKey={matchKey}
        playerId={playerId}
        username={username}
        wsUrl={wsUrl}
        entryAmount={entryAmount}
        initialPlayers={players}
      />
    </div>
  );
}

export default App;
```

### Step 4.2: Update Game.jsx - Accept Props, Auto-Start

**File:** `src/client/Game.jsx`

**Update component signature:**

```javascript
// src/client/Game.jsx

interface GameProps {
  matchKey: string;
  playerId: string;
  username: string;
  wsUrl: string;
  entryAmount: number;
  initialPlayers?: any[];
}

export function Game({ 
  matchKey, 
  playerId, 
  username, 
  wsUrl, 
  entryAmount,
  initialPlayers = [] 
}: GameProps) {
  // Use useDEGNNetwork hook
  const {
    connected,
    players: networkPlayers,
    gameStarted,
    gameEnded,
    winner,
    sendPlayerState,
    sendPlayerDeath
  } = useDEGNNetwork(matchKey, playerId, username, wsUrl);

  // Merge initial players with network players
  const players = networkPlayers.length > 0 ? networkPlayers : initialPlayers;

  // Auto-start when connected and gameStarted
  useEffect(() => {
    if (connected && gameStarted) {
      // Game is ready to start
      // Initialize game scene, spawn players, etc.
      console.log('[Game] Starting battle royale!');
    }
  }, [connected, gameStarted]);

  // ... rest of game logic
}
```

### Step 4.3: Update index.jsx - Remove Username Prompt

**File:** `src/client/index.jsx`

**Check if it has username prompt - remove it:**

```javascript
// src/client/index.jsx

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles.css';

// NO username prompt - username comes from URL
ReactDOM.render(<App />, document.getElementById('root'));
```

---

## 🟥 PHASE 5: Remove Unused Features

### Step 5.1: Remove Main Menu

**Files to check:**
- `src/client/App.jsx` - Remove menu rendering
- `src/client/Overlay.jsx` - Remove menu UI

**In App.jsx:**
- Remove any menu state
- Remove menu rendering
- Go straight to Game component

**In Overlay.jsx:**
- Remove menu buttons
- Keep only game UI (score, alive count, etc.)

### Step 5.2: Remove Username Prompts

**Search for:**
- `prompt(` - Remove all
- `input` elements asking for username
- Any username input forms

**Files to check:**
- `src/client/App.jsx`
- `src/client/Game.jsx`
- `src/client/Overlay.jsx`

### Step 5.3: Remove Health/Damage Logic (If Any)

**Search for:**
- `health`
- `damage`
- `hp`

**Replace with simple alive/dead boolean:**
```javascript
// OLD: if (player.health <= 0)
// NEW: if (!player.alive)
```

### Step 5.4: Remove Power-ups, XP, Cosmetics

**Search and remove:**
- Power-up spawning
- XP tracking
- Cosmetic systems
- Any upgrade/progression logic

**Keep only:**
- Bird movement
- Pipe obstacles
- Death detection
- Camera follow

---

## 🟦 PHASE 6: Update Build Configuration

### Step 6.1: Update package.json

**File:** `package.json`

**Add/update scripts:**

```json
{
  "scripts": {
    "dev": "webpack serve --config webpack.dev.js",
    "build": "webpack --config webpack.prod.js",
    "build:degn": "webpack --config webpack.prod.js --mode production"
  }
}
```

### Step 6.2: Update webpack.prod.js

**Ensure output goes to DEGN.gg public folder:**

```javascript
// webpack.prod.js

const path = require('path');

module.exports = {
  // ... existing config
  output: {
    path: path.resolve(__dirname, '../../public/games/sol-bird/client'),
    filename: 'bundle.js',
    publicPath: '/games/sol-bird/client/'
  }
};
```

### Step 6.3: Build for Production

```bash
npm run build:degn
```

**Output should be in:** `degn-arcade/public/games/sol-bird/client/`

---

## 🟨 PHASE 7: Update DEGN.gg Frontend Integration

### Step 7.1: Update Game Loader Page

**File:** `degn-arcade/src/app/play/sol-bird/page.tsx`

**Update iframe src to point to BirdMMO:**

```typescript
// Update clientSrc to point to BirdMMO build
const clientSrc = useMemo(() => {
  const url = new URL('/games/sol-bird/client/index.html', location.origin);
  // ... existing query params
  return url.toString();
}, [/* ... */]);
```

### Step 7.2: Update ws-glue.js (If Needed)

**File:** `degn-arcade/public/games/sol-bird/client/ws-glue.js`

**Ensure it's compatible with BirdMMO's Network.ts:**

The ws-glue.js should work as-is, but verify it sends the right events.

---

## ✅ FINAL CHECKLIST

### Pre-Launch Checklist

- [ ] **Game boots immediately** - No menus, no prompts
- [ ] **Uses DEGN.gg username** - From URL parameter
- [ ] **No menus** - Direct to game
- [ ] **Connects to DEGN backend** - WebSocket connection works
- [ ] **Multiplayer stable** - Players sync correctly
- [ ] **Battle royale functional** - Death tracking works
- [ ] **Winner detection** - Last alive = winner
- [ ] **Payout event fires** - MATCH_RESULT sent to backend
- [ ] **Bots fill empty slots** - Backend handles this
- [ ] **Game loads in iframe** - Cleanly embedded
- [ ] **One compiled folder** - Ready for production

### Testing Checklist

- [ ] Test with 2 players
- [ ] Test with 8 players
- [ ] Test with bots (incomplete lobby)
- [ ] Test death detection (ground collision)
- [ ] Test death detection (pipe collision)
- [ ] Test winner detection (last alive)
- [ ] Test payout event (MATCH_RESULT)
- [ ] Test mobile performance
- [ ] Test reconnection (network drop)

---

## 🚨 TROUBLESHOOTING

### Issue: WebSocket not connecting

**Check:**
1. wsUrl parameter is correct
2. Backend WebSocket server is running
3. CORS is configured correctly
4. Network.ts connection logic is correct

### Issue: Players not syncing

**Check:**
1. Network.ts sendPlayerState is called
2. Backend broadcasts player updates
3. useDEGNNetwork handles player:update events

### Issue: Death not detected

**Check:**
1. Collision detection in Bird.jsx
2. sendPlayerDeath is called
3. Backend receives PLAYER_DEATH event

### Issue: Winner not detected

**Check:**
1. alivePlayers Set is updated correctly
2. Death order is tracked
3. MATCH_RESULT is sent when only 1 alive

---

## 📝 NEXT STEPS

1. **Follow each phase in order**
2. **Test after each phase**
3. **Commit changes frequently**
4. **Ask for help if stuck**

**Estimated Time:** 2-3 days  
**Complexity:** Medium-High  
**Success Rate:** High (with careful implementation)

Good luck! 🚀

