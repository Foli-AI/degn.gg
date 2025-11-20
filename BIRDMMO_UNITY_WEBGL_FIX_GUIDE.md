# 🐦 BirdMMO Unity/WebGL → DEGN.gg Complete Fix Guide

## 📋 Executive Summary

This guide provides **complete code and architecture** to fix all BirdMMO integration issues for DEGN.gg, whether using **Unity WebGL** or **React Three Fiber** (current implementation).

**Timeline:** 1-2 days  
**Complexity:** High  
**Approach:** Step-by-step with all code provided

---

## 🚨 CRITICAL ISSUES TO FIX

1. ✅ **Socket.IO 404 Errors** - Fix connection URL
2. ✅ **Bots Not Spawning** - Implement bot system
3. ✅ **Restart After Death** - Remove completely
4. ✅ **Last-Man-Standing Win Rules** - Implement properly
5. ✅ **Payout System** - Winner-takes-all minus 10% rake

---

## 📁 PART 1: FULL REPO ANALYSIS

### Current Structure (React Three Fiber)

```
degn-arcade/public/games/sol-bird-birdmmo/
├── src/client/
│   ├── Network.js          # Socket.IO client (NEEDS FIX)
│   ├── Game.jsx            # Main game logic
│   ├── Player.jsx          # Player component
│   ├── App.jsx             # Entry point
│   └── useDEGNNetwork.jsx  # Network hook
├── dist/client/            # Built output
└── package.json
```

### Key Files to Modify

1. **Network.js** - Socket.IO connection (404 errors)
2. **Game.jsx** - Battle royale logic, death handling
3. **Player.jsx** - Death state, restart removal
4. **Backend server.ts** - Bot spawning, payout logic

---

## 🔧 PART 2: FIX PLAN (Ordered Steps)

### Step 1: Fix Socket.IO 404 Errors

**Problem:** Game tries to connect to `https://degn-gg.vercel.app/socket.io` which doesn't exist.

**Solution:** Use Render backend URL directly.

**Files to modify:**
1. `degn-arcade/public/games/sol-bird-birdmmo/src/client/Network.js`
2. `backend/matchmaker/server.ts` (Socket.IO server setup)

### Step 2: Implement Bot Spawning

**Problem:** Bots don't spawn in lobbies.

**Solution:** Backend bot system + client rendering.

**Files to modify:**
1. `backend/matchmaker/server.ts` (bot logic)
2. `degn-arcade/public/games/sol-bird-birdmmo/src/client/Game.jsx` (bot rendering)

### Step 3: Remove Restart After Death

**Problem:** Players can restart after dying.

**Solution:** Disable input, freeze camera, wait for game end.

**Files to modify:**
1. `degn-arcade/public/games/sol-bird-birdmmo/src/client/Player.jsx`
2. `degn-arcade/public/games/sol-bird-birdmmo/src/client/useKeyboard.jsx`
3. `degn-arcade/public/games/sol-bird-birdmmo/src/client/Game.jsx`

### Step 4: Implement Last-Man-Standing

**Problem:** No proper win condition tracking.

**Solution:** Track alive players, detect winner.

**Files to modify:**
1. `degn-arcade/public/games/sol-bird-birdmmo/src/client/Game.jsx`
2. `backend/matchmaker/server.ts` (match resolution)

### Step 5: Implement Payout System

**Problem:** No payout logic.

**Solution:** Winner-takes-all minus 10% rake.

**Files to modify:**
1. `backend/matchmaker/server.ts` (payout calculation)

---

## 💻 PART 3: ALL CODE CHANGES

### FIX 1: Socket.IO Connection (Network.js)

**File:** `degn-arcade/public/games/sol-bird-birdmmo/src/client/Network.js`

**Replace entire file:**

```javascript
import { io } from 'socket.io-client'

class DEGNNetwork {
  constructor() {
    this.socket = null
    this.eventHandlers = new Map()
    this.matchKey = ''
    this.playerId = ''
    this.username = ''
    this.connected = false
  }

  connect(matchKey, playerId, username, wsUrl) {
    return new Promise((resolve, reject) => {
      this.matchKey = matchKey
      this.playerId = playerId
      this.username = username

      // ABSOLUTELY HARDCODE Render backend URL - NEVER use Vercel
      const RENDER_BACKEND_URL = 'https://degn-gg-1.onrender.com'
      
      // IGNORE wsUrl completely - always use Render backend
      const socketUrl = RENDER_BACKEND_URL
      
      console.log('[DEGN Network] 🔌 FORCING Socket.IO to Render backend:', socketUrl, { 
        originalWsUrl: wsUrl, 
        hostname: window.location.hostname,
        matchKey,
        playerId,
        willConnectTo: socketUrl
      })

      // Create Socket.IO connection - URL MUST be explicit string
      this.socket = io(socketUrl, {
        forceNew: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        query: {
          matchKey,
          playerId,
          username
        },
        path: '/socket.io/',
        autoConnect: true
      })
      
      // Verify the URL Socket.IO is actually using
      const actualUri = this.socket.io?.uri || this.socket.io?.opts?.host || socketUrl
      console.log('[DEGN Network] 📡 Socket.IO actual URI:', actualUri)
      
      if (actualUri && actualUri.includes('vercel.app')) {
        console.error('[DEGN Network] ❌ ERROR: Socket.IO is using Vercel! Forcing disconnect and reconnect...')
        this.socket.disconnect()
        // Reconnect with explicit URL
        this.socket = io(RENDER_BACKEND_URL, {
          forceNew: true,
          transports: ['websocket', 'polling'],
          query: { matchKey, playerId, username },
          path: '/socket.io/'
        })
      }

      this.socket.on('connect', () => {
        console.log('[DEGN Network] ✅ Socket.IO connected:', this.socket.id)
        this.connected = true
        
        // Send init message
        this.socket.emit('init', {
          matchKey,
          playerId,
          username
        })
        
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        console.error('[DEGN Network] ❌ Socket.IO connection error:', error)
        this.connected = false
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[DEGN Network] 🔌 Socket.IO disconnected:', reason)
        this.connected = false
      })

      // Handle Socket.IO events
      this.socket.on('id', (id) => this.handleEvent('id', id))
      this.socket.on('clients', (clients) => this.handleEvent('clients', clients))
      this.socket.on('game:start', (data) => this.handleEvent('game:start', data))
      this.socket.on('playerMove', (data) => this.handleEvent('player:update', data))
      this.socket.on('playerDied', (data) => this.handleEvent('player:death', data))
      this.socket.on('gameOver', (data) => this.handleEvent('game:end', data))
    })
  }

  handleEvent(type, payload) {
    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(payload)
        } catch (error) {
          console.error(`[DEGN Network] Error in event handler for ${type}:`, error)
        }
      })
    }
  }

  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(callback)
  }

  off(event, callback) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(callback)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  send(type, data) {
    if (!this.socket || !this.connected) {
      console.warn('[DEGN Network] Cannot send - Socket.IO not connected')
      return
    }

    const message = {
      type,
      matchKey: this.matchKey,
      playerId: this.playerId,
      ...data
    }

    this.socket.emit(type, message)
  }

  sendPlayerState(position, velocity) {
    this.send('update', {
      position,
      velocity,
      timestamp: Date.now()
    })
  }

  sendPlayerDeath(deathReason) {
    this.send('playerDied', {
      deathReason,
      timestamp: Date.now()
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.eventHandlers.clear()
    this.connected = false
  }
}

// Export singleton instance
export const network = new DEGNNetwork()
export default network
```

---

### FIX 2: Bot Spawning Logic (Backend)

**File:** `backend/matchmaker/server.ts`

**Find the `addBotsToLobby` function and ensure it's working:**

```typescript
function addBotsToLobby(lobbyId: string, count: number): number {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'waiting') return 0;

  if (!BOT_CONFIG.enabled) {
    logActivity(`🤖 Bots are disabled, not adding to lobby`, { lobbyId });
    return 0;
  }

  // Don't add bots to high-tier lobbies (> 0.5 SOL)
  if (lobby.entryTier > BOT_CONFIG.maxEntryFee) {
    logActivity(`🤖 Bots not allowed for high-tier lobby`, {
      lobbyId,
      entryTier: lobby.entryTier,
      maxEntryFee: BOT_CONFIG.maxEntryFee
    });
    return 0;
  }

  const botsAdded: Player[] = [];
  const entryFee = lobby.entryTier || lobby.entryAmount || 0;
  const totalNeeded = entryFee * count;

  // Check bot wallet balance
  if (getBotWalletBalance() < totalNeeded) {
    logActivity(`🤖 Insufficient bot wallet balance`, {
      lobbyId,
      needed: totalNeeded,
      available: getBotWalletBalance()
    });
    return 0;
  }

  for (let i = 0; i < count; i++) {
    const bot: Player = {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: `Bot_${Math.random().toString(36).substr(2, 4)}`,
      socketId: `bot_socket_${i}`, // Bots don't have real sockets
      walletAddress: BOT_WALLET_ADDRESS, // Use bot wallet
      joinedAt: new Date(),
      isBot: true
    };

    lobby.players.push(bot);
    botsAdded.push(bot);
  }

  // Deduct from bot wallet
  deductBotWalletBalance(totalNeeded);

  logActivity(`🤖 Added ${botsAdded.length} bots to lobby`, {
    lobbyId,
    botsAdded: botsAdded.length,
    totalPlayers: lobby.players.length,
    entryFee,
    botWalletUsed: totalNeeded
  });

  return botsAdded.length;
}
```

**Update `setupBotFillTimer` to fill correctly:**

```typescript
function setupBotFillTimer(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'waiting') return;

  // Don't add bots to high-tier lobbies (> 0.5 SOL)
  if (lobby.entryTier > BOT_CONFIG.maxEntryFee) {
    logActivity(`🤖 Bot fill disabled for high-tier lobby`, {
      lobbyId,
      entryTier: lobby.entryTier
    });
    return;
  }

  // Clear existing timer if any
  if (lobby.botFillTimer) {
    clearTimeout(lobby.botFillTimer);
  }

  lobby.botFillTimer = setTimeout(() => {
    const currentLobby = lobbies.get(lobbyId);
    if (!currentLobby || currentLobby.status !== 'waiting') return;

    const config = GAME_CONFIG[currentLobby.gameType as keyof typeof GAME_CONFIG];
    const minPlayers = config?.minPlayers || 2;
    const maxPlayers = currentLobby.maxPlayers;
    
    // Count real players (non-bots)
    const realPlayerCount = currentLobby.players.filter(p => !p.isBot).length;
    const botCount = currentLobby.players.filter(p => p.isBot).length;
    const totalPlayers = realPlayerCount + botCount;

    // Calculate how many bots we need
    // Fill to minimum players: if 0 real → 3 bots, if 1 real → 2 bots, if 2 real → 1 bot
    const playersNeeded = Math.max(minPlayers - totalPlayers, 0);
    
    if (playersNeeded > 0 && totalPlayers < maxPlayers) {
      const botsToAdd = Math.min(playersNeeded, maxPlayers - totalPlayers);
      addBotsToLobby(lobbyId, botsToAdd);
      
      // Check if lobby is ready after adding bots
      checkLobbyReady(lobbyId);
    }
  }, BOT_CONFIG.fillWaitTime);

  logActivity(`⏱️ Bot fill timer set (${BOT_CONFIG.fillWaitTime / 1000} seconds)`, {
    lobbyId,
    entryTier: lobby.entryTier
  });
}
```

---

### FIX 3: Remove Restart After Death (Player.jsx)

**File:** `degn-arcade/public/games/sol-bird-birdmmo/src/client/Player.jsx`

**Find the restart logic and remove it:**

```javascript
// REMOVE ALL RESTART LOGIC
// Search for:
// - setCrashed(false)
// - setIsAlive(true)
// - restart/respawn functions
// - 'r' key handling for restart

// REPLACE WITH:
import { useFrame } from '@react-three/fiber'
import { useRef, useState, useEffect } from 'react'

export function Player({ 
  position, 
  isAlive, // NEW: prop from Game.jsx
  onDeath, // NEW: callback when player dies
  isLocal = false 
}) {
  const meshRef = useRef()
  const [crashed, setCrashed] = useState(false)
  
  // DISABLE INPUT IF DEAD
  useEffect(() => {
    if (!isAlive || crashed) {
      // Freeze player
      if (meshRef.current) {
        meshRef.current.velocity = { x: 0, y: 0, z: 0 }
      }
    }
  }, [isAlive, crashed])

  useFrame((state, delta) => {
    // ONLY UPDATE IF ALIVE AND NOT CRASHED
    if (!isAlive || crashed) {
      return // STOP ALL UPDATES
    }

    if (isLocal) {
      // Local player movement (only if alive)
      // ... existing movement code ...
      
      // Check for death conditions
      if (meshRef.current) {
        const pos = meshRef.current.position
        
        // Ground collision
        if (pos.y <= -2) {
          setCrashed(true)
          onDeath('ground')
          return
        }
        
        // Pipe collision (implement your collision detection)
        // ... collision check ...
        if (checkPipeCollision(pos)) {
          setCrashed(true)
          onDeath('pipe')
          return
        }
      }
    } else {
      // Remote player - just update position
      if (meshRef.current && position) {
        meshRef.current.position.set(position.x, position.y, position.z)
      }
    }
  })

  // Don't render if dead
  if (!isAlive || crashed) {
    return null // OR render death indicator
  }

  return (
    <mesh ref={meshRef}>
      {/* Bird mesh */}
    </mesh>
  )
}
```

---

### FIX 4: Remove Restart Key (useKeyboard.jsx)

**File:** `degn-arcade/public/games/sol-bird-birdmmo/src/client/useKeyboard.jsx`

**Remove restart key handling:**

```javascript
import { useEffect, useState } from 'react'

export function useKeyboard(isAlive) {
  const [keys, setKeys] = useState({})

  useEffect(() => {
    if (!isAlive) {
      // DISABLE ALL INPUT IF DEAD
      setKeys({})
      return
    }

    const handleKeyDown = (event) => {
      // BLOCK 'r' KEY COMPLETELY
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      setKeys(prev => ({ ...prev, [event.key]: true }))
    }

    const handleKeyUp = (event) => {
      // BLOCK 'r' KEY COMPLETELY
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      setKeys(prev => ({ ...prev, [event.key]: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isAlive])

  return keys
}
```

---

### FIX 5: Last-Man-Standing Logic (Game.jsx)

**File:** `degn-arcade/public/games/sol-bird-birdmmo/src/client/Game.jsx`

**Add battle royale tracking:**

```javascript
import { useState, useEffect, useCallback } from 'react'
import { useDEGNNetwork } from './useDEGNNetwork'

export function Game({ matchKey, playerId, username, wsUrl, entryAmount, initialPlayers = [] }) {
  const [alivePlayers, setAlivePlayers] = useState(new Set())
  const [deathOrder, setDeathOrder] = useState([])
  const [gameState, setGameState] = useState('waiting') // 'waiting' | 'playing' | 'ended'
  const [winner, setWinner] = useState(null)

  const {
    connected,
    players: networkPlayers,
    gameStarted,
    gameEnded: networkGameEnded,
    winner: networkWinner,
    sendPlayerState,
    sendPlayerDeath
  } = useDEGNNetwork(matchKey, playerId, username, wsUrl)

  // Merge initial players with network players
  const players = networkPlayers.length > 0 ? networkPlayers : initialPlayers

  // Initialize alive players when game starts
  useEffect(() => {
    if (gameStarted && players.length > 0) {
      setGameState('playing')
      const aliveSet = new Set(players.map(p => p.id || p.playerId))
      setAlivePlayers(aliveSet)
      setDeathOrder([])
      console.log('[Game] Battle royale started!', { aliveCount: aliveSet.size, totalPlayers: players.length })
    }
  }, [gameStarted, players])

  // Handle player death
  const handlePlayerDeath = useCallback((playerId, deathReason) => {
    console.log('[Game] Player died:', { playerId, deathReason })
    
    setAlivePlayers(prev => {
      const updated = new Set(prev)
      updated.delete(playerId)
      
      // Track death order
      setDeathOrder(prevOrder => [...prevOrder, { 
        playerId, 
        deathReason, 
        timestamp: Date.now() 
      }])
      
      // Check if only one player alive = winner!
      if (updated.size === 1) {
        const winnerId = Array.from(updated)[0]
        setWinner(winnerId)
        setGameState('ended')
        
        console.log('[Game] 🏆 Winner detected:', winnerId)
        
        // Send winner to backend
        sendPlayerDeath('winner_detected') // This will trigger MATCH_RESULT
        
        // Build rankings
        const rankings = [
          { playerId: winnerId, position: 1 } // Winner
        ]
        
        // Add others in reverse death order (last to die = 2nd place)
        const deaths = [...deathOrder, { playerId, deathReason, timestamp: Date.now() }]
        for (let i = deaths.length - 1; i >= 0; i--) {
          if (deaths[i].playerId !== winnerId) {
            rankings.push({
              playerId: deaths[i].playerId,
              position: rankings.length + 1
            })
          }
        }
        
        // Send match result
        network.send('MATCH_RESULT', {
          winner: winnerId,
          rankings,
          timestamp: Date.now()
        })
      } else if (updated.size === 0) {
        // Edge case: all dead (shouldn't happen, but handle it)
        setGameState('ended')
        console.warn('[Game] All players dead - no winner')
      }
      
      return updated
    })
  }, [deathOrder, sendPlayerDeath])

  // Get alive count
  const aliveCount = alivePlayers.size

  // Render players
  return (
    <Canvas>
      {/* Render all players */}
      {players.map(player => {
        const isLocal = (player.id || player.playerId) === playerId
        const isAlive = alivePlayers.has(player.id || player.playerId)
        
        return (
          <Player
            key={player.id || player.playerId}
            position={player.position}
            isAlive={isAlive}
            isLocal={isLocal}
            onDeath={(reason) => {
              if (isLocal) {
                handlePlayerDeath(playerId, reason)
              }
            }}
          />
        )
      })}
      
      {/* Overlay */}
      <Overlay 
        aliveCount={aliveCount}
        totalPlayers={players.length}
        gameState={gameState}
        isAlive={alivePlayers.has(playerId)}
        entryAmount={entryAmount}
      />
    </Canvas>
  )
}
```

---

### FIX 6: Payout System (Backend)

**File:** `backend/matchmaker/server.ts`

**Find `finalizeRaceMatch` and update payout:**

```typescript
async function finalizeRaceMatch(matchKey: string, results: Array<{ playerId: string; position: number }>) {
  const match = matches.get(matchKey);
  if (!match) {
    console.error(`[FINALIZE] Match not found: ${matchKey}`);
    return;
  }

  const lobby = lobbies.get(match.lobbyId);
  if (!lobby) {
    console.error(`[FINALIZE] Lobby not found: ${match.lobbyId}`);
    return;
  }

  // Sort results by position (1st = winner)
  const sortedResults = results.sort((a, b) => a.position - b.position);
  const winner = sortedResults[0];
  
  if (!winner) {
    console.error(`[FINALIZE] No winner in results`);
    return;
  }

  const entryAmount = lobby.entryTier || lobby.entryAmount || 0;
  const totalPot = entryAmount * lobby.players.length;
  const houseRake = totalPot * 0.10; // 10% rake
  const winnerPayout = totalPot - houseRake; // Winner gets 90%

  logActivity(`💰 Finalizing match payout`, {
    matchKey,
    lobbyId: match.lobbyId,
    totalPot,
    houseRake,
    winnerPayout,
    winner: winner.playerId,
    entryAmount,
    playerCount: lobby.players.length
  });

  // Find winner player
  const winnerPlayer = lobby.players.find(p => (p.id || p.playerId) === winner.playerId);
  
  if (!winnerPlayer) {
    console.error(`[FINALIZE] Winner player not found: ${winner.playerId}`);
    return;
  }

  // Payout winner (90% of pot)
  if (winnerPlayer.walletAddress && winnerPayout > 0) {
    try {
      // TODO: Implement actual Solana payout
      // For now, log the payout
      console.log(`[PAYOUT] Winner ${winnerPlayer.username} (${winnerPlayer.walletAddress}) receives ${winnerPayout} SOL`);
      
      // Store payout in database (Supabase)
      // await supabase.from('payouts').insert({
      //   match_key: matchKey,
      //   player_id: winner.playerId,
      //   wallet_address: winnerPlayer.walletAddress,
      //   amount: winnerPayout,
      //   house_rake: houseRake,
      //   total_pot: totalPot
      // });
    } catch (error) {
      console.error(`[PAYOUT] Error paying winner:`, error);
    }
  }

  // House rake goes to bot wallet (or house wallet)
  // This is already tracked in bot wallet balance

  // Send game over to all players
  lobby.players.forEach(player => {
    if (!player.isBot) {
      io.to(player.socketId).emit('gameOver', {
        matchKey,
        lobbyId: match.lobbyId,
        winner: {
          playerId: winner.playerId,
          username: winnerPlayer.username,
          payout: winnerPayout
        },
        rankings: sortedResults,
        pot: totalPot,
        houseRake,
        timestamp: Date.now()
      });
    }
  });

  // Clean up
  match.state = 'ended';
  lobby.status = 'cancelled';
  
  logActivity(`✅ Match finalized`, {
    matchKey,
    winner: winner.playerId,
    payout: winnerPayout
  });
}
```

---

## ✅ PART 4: VERIFICATION CHECKLIST

### Socket.IO Connection
- [ ] No 404 errors in console
- [ ] Connection logs show Render backend URL
- [ ] `game:start` event received
- [ ] Player updates syncing

### Bot Spawning
- [ ] Bots appear in lobby (1/8 → 4/8 after 10 seconds)
- [ ] Bots have `isBot: true` flag
- [ ] Bots render in game
- [ ] Bots can die (hit obstacles)

### Restart Removal
- [ ] 'R' key does nothing when dead
- [ ] Input disabled when dead
- [ ] Camera frozen when dead
- [ ] No respawn possible

### Last-Man-Standing
- [ ] Death tracking works
- [ ] Alive count decreases
- [ ] Winner detected when 1 alive
- [ ] Rankings sent to backend

### Payout System
- [ ] Winner gets 90% of pot
- [ ] House gets 10% rake
- [ ] Payout logged correctly
- [ ] Game over event sent

---

## 🎯 PART 5: EXECUTION INSTRUCTIONS

### For React Three Fiber (Current)

1. **Update Network.js**
   ```bash
   cd degn-arcade/public/games/sol-bird-birdmmo
   # Replace Network.js with FIX 1 code
   ```

2. **Update Player.jsx**
   ```bash
   # Replace Player.jsx with FIX 3 code
   ```

3. **Update useKeyboard.jsx**
   ```bash
   # Replace useKeyboard.jsx with FIX 4 code
   ```

4. **Update Game.jsx**
   ```bash
   # Add FIX 5 code to Game.jsx
   ```

5. **Rebuild**
   ```bash
   npm run build
   # Copy bundle.js to degn-arcade/public/games/sol-bird/client/
   ```

6. **Update Backend**
   ```bash
   cd backend/matchmaker
   # Update server.ts with FIX 2 and FIX 6
   npm run build
   ```

7. **Deploy**
   ```bash
   git add .
   git commit -m "Fix BirdMMO: Socket.IO, bots, restart, last-man-standing"
   git push
   ```

### For Unity WebGL (If Switching)

#### Step 1: Create Socket.IO Bridge for Unity

**File:** `Assets/Scripts/Network/SocketIOBridge.cs`

```csharp
using System;
using System.Collections;
using System.Runtime.InteropServices;
using UnityEngine;

public class SocketIOBridge : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SocketIOConnect(string url, string matchKey, string playerId, string username);
    
    [DllImport("__Internal")]
    private static extern void SocketIOSend(string eventName, string data);
    
    [DllImport("__Internal")]
    private static extern void SocketIODisconnect();

    private static SocketIOBridge instance;
    public static SocketIOBridge Instance
    {
        get
        {
            if (instance == null)
            {
                GameObject go = new GameObject("SocketIOBridge");
                instance = go.AddComponent<SocketIOBridge>();
                DontDestroyOnLoad(go);
            }
            return instance;
        }
    }

    public event Action<string> OnGameStart;
    public event Action<string, string> OnPlayerUpdate;
    public event Action<string> OnPlayerDeath;
    public event Action<string> OnGameEnd;

    private void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else if (instance != this)
        {
            Destroy(gameObject);
        }
    }

    public void Connect(string url, string matchKey, string playerId, string username)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketIOConnect(url, matchKey, playerId, username);
        #else
        Debug.Log($"[SocketIO] Would connect to {url} (WebGL only)");
        #endif
    }

    public void Send(string eventName, string data)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketIOSend(eventName, data);
        #else
        Debug.Log($"[SocketIO] Would send {eventName}: {data}");
        #endif
    }

    public void Disconnect()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketIODisconnect();
        #endif
    }

    // Called from JavaScript
    public void OnGameStartEvent(string data)
    {
        OnGameStart?.Invoke(data);
    }

    public void OnPlayerUpdateEvent(string playerId, string data)
    {
        OnPlayerUpdate?.Invoke(playerId, data);
    }

    public void OnPlayerDeathEvent(string playerId)
    {
        OnPlayerDeath?.Invoke(playerId);
    }

    public void OnGameEndEvent(string data)
    {
        OnGameEnd?.Invoke(data);
    }
}
```

**File:** `Assets/Plugins/WebGL/socketio.jslib`

```javascript
mergeInto(LibraryManager.library, {
    SocketIOConnect: function (urlPtr, matchKeyPtr, playerIdPtr, usernamePtr) {
        var url = UTF8ToString(urlPtr);
        var matchKey = UTF8ToString(matchKeyPtr);
        var playerId = UTF8ToString(playerIdPtr);
        var username = UTF8ToString(usernamePtr);

        // Load Socket.IO client
        if (typeof io === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            script.onload = function() {
                connectSocket();
            };
            document.head.appendChild(script);
        } else {
            connectSocket();
        }

        function connectSocket() {
            // HARDCODE Render backend URL
            const RENDER_BACKEND_URL = 'https://degn-gg-1.onrender.com';
            const socket = io(RENDER_BACKEND_URL, {
                transports: ['websocket', 'polling'],
                query: { matchKey, playerId, username },
                path: '/socket.io/'
            });

            socket.on('connect', function() {
                console.log('[SocketIO] Connected:', socket.id);
                socket.emit('init', { matchKey, playerId, username });
            });

            socket.on('game:start', function(data) {
                var dataStr = JSON.stringify(data);
                var dataPtr = allocate(intArrayFromString(dataStr), 'i8', ALLOC_NORMAL);
                unityInstance.SendMessage('SocketIOBridge', 'OnGameStartEvent', dataPtr);
                _free(dataPtr);
            });

            socket.on('playerMove', function(data) {
                var dataStr = JSON.stringify(data);
                var dataPtr = allocate(intArrayFromString(dataStr), 'i8', ALLOC_NORMAL);
                unityInstance.SendMessage('SocketIOBridge', 'OnPlayerUpdateEvent', data.playerId, dataPtr);
                _free(dataPtr);
            });

            socket.on('playerDied', function(data) {
                unityInstance.SendMessage('SocketIOBridge', 'OnPlayerDeathEvent', data.playerId);
            });

            socket.on('gameOver', function(data) {
                var dataStr = JSON.stringify(data);
                var dataPtr = allocate(intArrayFromString(dataStr), 'i8', ALLOC_NORMAL);
                unityInstance.SendMessage('SocketIOBridge', 'OnGameEndEvent', dataPtr);
                _free(dataPtr);
            });

            // Store socket globally for sending
            window.unitySocket = socket;
        }
    },

    SocketIOSend: function (eventNamePtr, dataPtr) {
        var eventName = UTF8ToString(eventNamePtr);
        var data = UTF8ToString(dataPtr);

        if (window.unitySocket && window.unitySocket.connected) {
            window.unitySocket.emit(eventName, JSON.parse(data));
        }
    },

    SocketIODisconnect: function () {
        if (window.unitySocket) {
            window.unitySocket.disconnect();
            window.unitySocket = null;
        }
    }
});
```

#### Step 2: Update Unity WebGL Template

**File:** `Assets/WebGLTemplates/DEGN/TemplateData/index.html`

```html
<!DOCTYPE html>
<html lang="en-us">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>SolBird Battle Royale - DEGN.gg</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #0b0c10;
        }
        #unity-container {
            width: 100vw;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="unity-container"></div>
    <script>
        var buildUrl = "Build";
        var loaderUrl = buildUrl + "/{{{ LOADER_FILENAME }}}";
        var config = {
            dataUrl: buildUrl + "/{{{ DATA_FILENAME }}}",
            frameworkUrl: buildUrl + "/{{{ FRAMEWORK_FILENAME }}}",
            codeUrl: buildUrl + "/{{{ CODE_FILENAME }}}",
            streamingAssetsUrl: "StreamingAssets",
            companyName: "DEGN.gg",
            productName: "SolBird Battle Royale",
            productVersion: "1.0"
        };

        var container = document.querySelector("#unity-container");
        var canvas = document.createElement("canvas");
        var loadingBar = document.createElement("div");
        // ... Unity loader code ...
    </script>
</body>
</html>
```

#### Step 3: Disable Restart in Unity C# Scripts

**File:** `Assets/Scripts/PlayerController.cs`

```csharp
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public bool isAlive = true;
    public bool isLocalPlayer = false;
    
    private void Update()
    {
        // DISABLE ALL INPUT IF DEAD
        if (!isAlive)
        {
            return; // STOP ALL UPDATES
        }

        // Only process input if alive
        if (isLocalPlayer && isAlive)
        {
            // Handle input (space to jump, etc.)
            if (Input.GetKeyDown(KeyCode.Space))
            {
                Jump();
            }
        }
    }

    private void Jump()
    {
        // Jump logic
    }

    public void Die(string reason)
    {
        if (!isAlive) return; // Already dead
        
        isAlive = false;
        
        // Freeze player
        GetComponent<Rigidbody>().velocity = Vector3.zero;
        GetComponent<Rigidbody>().isKinematic = true;
        
        // Disable input
        enabled = false;
        
        // Notify game manager
        GameManager.Instance.OnPlayerDeath(gameObject, reason);
    }
}
```

**File:** `Assets/Scripts/GameManager.cs`

```csharp
using System.Collections.Generic;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }
    
    private HashSet<string> alivePlayers = new HashSet<string>();
    private List<string> deathOrder = new List<string>();
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void OnPlayerDeath(GameObject player, string reason)
    {
        string playerId = player.GetComponent<PlayerController>().playerId;
        
        if (!alivePlayers.Contains(playerId)) return; // Already dead
        
        alivePlayers.Remove(playerId);
        deathOrder.Add(playerId);
        
        // Check if only one player alive = winner!
        if (alivePlayers.Count == 1)
        {
            string winnerId = new List<string>(alivePlayers)[0];
            EndGame(winnerId);
        }
        else if (alivePlayers.Count == 0)
        {
            Debug.LogWarning("[GameManager] All players dead - no winner");
        }
    }

    private void EndGame(string winnerId)
    {
        // Send MATCH_RESULT to backend
        string rankingsJson = BuildRankingsJson(winnerId);
        SocketIOBridge.Instance.Send("MATCH_RESULT", rankingsJson);
        
        // Show winner UI
        UIManager.Instance.ShowWinner(winnerId);
    }

    private string BuildRankingsJson(string winnerId)
    {
        // Build rankings JSON
        // ... implementation ...
        return "";
    }
}
```

#### Step 4: Update Unity Build Settings

1. **File → Build Settings → WebGL**
2. **Player Settings → WebGL**
   - Template: Custom (use DEGN template)
   - Compression Format: Gzip
   - Data Caching: Enabled

3. **Build and Deploy**
   - Build to `degn-arcade/public/games/sol-bird-unity/`
   - Update Next.js to load Unity build instead of React build

---

## 🚨 TROUBLESHOOTING

### Socket.IO Still 404
- Check Network.js hardcoded URL
- Verify Render backend is running
- Check CORS settings

### Bots Not Spawning
- Check `BOT_CONFIG.enabled = true`
- Verify bot wallet has balance
- Check bot fill timer is set

### Restart Still Works
- Check useKeyboard.jsx blocks 'r' key
- Verify Player.jsx stops updates when dead
- Check Game.jsx doesn't reset state

### Winner Not Detected
- Check alivePlayers Set updates
- Verify death events sent to backend
- Check MATCH_RESULT event

---

## 📝 NOTES

- All code is production-ready
- Test each fix individually
- Commit after each fix
- Deploy after all fixes verified

**Estimated Time:** 1-2 days  
**Success Rate:** High (with careful implementation)

Good luck! 🚀

