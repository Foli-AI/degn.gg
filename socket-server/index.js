/**
 * Socket.IO Server for BirdMMO / DEGN.gg Multiplayer
 * 
 * Features:
 * - Token-based authentication via Next.js API
 * - Lobby management with bot spawning
 * - Last-man-standing game logic
 * - Server-authoritative bot simulation
 * - Match completion with payout integration
 * - Redis adapter support for horizontal scaling
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const axios = require('axios');

// Use native fetch if available (Node 18+), otherwise use node-fetch
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch;
} else {
  // Fallback for Node < 18
  try {
    fetch = require('node-fetch');
  } catch (e) {
    console.warn('[SERVER] ⚠️ fetch() not available. Please use Node 18+ or install node-fetch');
    fetch = null;
  }
}

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 3000;
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || 'https://degn-gg.vercel.app';
const SERVER_SECRET = process.env.SERVER_SECRET || 'dev-secret-change-in-production';
const REDIS_URL = process.env.REDIS_URL; // Optional - enables Redis adapter

// CORS configuration
const allowedOrigins = [
  'https://degn-gg.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io'
});

// Redis adapter setup (optional - for horizontal scaling)
let redisAdapter = null;
if (REDIS_URL) {
  try {
    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();
    
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        redisAdapter = { pubClient, subClient };
        console.log('[SERVER] ✅ Redis adapter enabled');
      })
      .catch((err) => {
        console.warn('[SERVER] ⚠️ Redis adapter failed, running single-instance:', err.message);
      });
  } catch (err) {
    console.warn('[SERVER] ⚠️ Redis not available, running single-instance');
  }
}

// In-memory lobby state
const lobbies = new Map(); // lobbyId -> Lobby

// Memory cache to prevent duplicate payouts
const matchAlreadyPaid = new Set(); // Set of matchId/lobbyId strings

// Lobby structure:
// {
//   players: Map(socketId -> { userId, socketId, alive, username, walletAddress, entryFee }),
//   bots: Map(botId -> { id, alive, deathTimer }),
//   maxPlayers: 8,
//   started: boolean,
//   matchStartTime: number | null,
//   countdownTimer: NodeJS.Timeout | null,
//   matchId: string (generated on match start)
// }

/**
 * Validate auth token by calling Next.js API
 */
async function validateAuthToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    const response = await axios.post(
      `${NEXT_PUBLIC_URL}/api/socket/validate`,
      { token },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );

    if (response.data && response.data.valid) {
      return {
        valid: true,
        userId: response.data.userId,
        lobbyId: response.data.lobbyId
      };
    }

    return { valid: false, error: 'Token validation failed' };
  } catch (error) {
    console.error('[SERVER] Token validation error:', error.message);
    // In development, allow token to pass if Next.js API is unavailable
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SERVER] ⚠️ Development mode: allowing token without validation');
      // Try to parse token as JSON for dev
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString());
        return {
          valid: true,
          userId: decoded.userId || 'dev-user',
          lobbyId: decoded.lobbyId || 'dev-lobby'
        };
      } catch {
        return { valid: false, error: 'Invalid token format' };
      }
    }
    return { valid: false, error: 'Token validation service unavailable' };
  }
}

/**
 * Spawn a bot in a lobby
 */
function spawnBot(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  const totalPlayers = lobby.players.size + lobby.bots.size;
  if (totalPlayers >= lobby.maxPlayers) return;

  const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create bot object
  const bot = {
    id: botId,
    userId: botId, // Bots use their botId as userId
    alive: true,
    username: `Bot_${botId.substr(-4)}`,
    deathTimer: null
  };

  lobby.bots.set(botId, bot);

  // Simulate bot death after random time (30-120 seconds)
  // In production, this would be physics-driven server-authoritative simulation
  const deathTime = 30000 + Math.random() * 90000; // 30-120 seconds
  bot.deathTimer = setTimeout(() => {
    if (lobby.bots.has(botId) && lobby.bots.get(botId).alive) {
      handleBotDeath(lobbyId, botId);
    }
  }, deathTime);

  console.log(`[SERVER] 🤖 Spawned bot ${botId} in lobby ${lobbyId}`);

  // Broadcast lobby update
  broadcastLobbyUpdate(lobbyId);
}

/**
 * Handle bot death
 */
function handleBotDeath(lobbyId, botId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  const bot = lobby.bots.get(botId);
  if (!bot || !bot.alive) return;

  bot.alive = false;
  if (bot.deathTimer) {
    clearTimeout(bot.deathTimer);
    bot.deathTimer = null;
  }

  console.log(`[SERVER] 💀 Bot ${botId} died in lobby ${lobbyId}`);

  // Broadcast player update (bot death)
  io.to(`lobby:${lobbyId}`).emit('player_update', {
    socketId: botId,
    userId: botId,
    alive: false,
    isBot: true
  });

  // Check for last alive
  checkForLastAlive(lobbyId);
}

/**
 * Check if lobby should start
 */
function checkStartLobby(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.started) return;

  const totalPlayers = lobby.players.size + lobby.bots.size;

  // Need at least 2 players to start
  if (totalPlayers < 2) {
    // Spawn bots to fill to maxPlayers
    while (lobby.players.size + lobby.bots.size < lobby.maxPlayers) {
      spawnBot(lobbyId);
    }
    
    // If still not enough, wait
    if (lobby.players.size + lobby.bots.size < 2) {
      return;
    }
  }

  // Start countdown
  if (lobby.countdownTimer) {
    clearTimeout(lobby.countdownTimer);
  }

  console.log(`[SERVER] 🎮 Starting countdown for lobby ${lobbyId} (${totalPlayers} players)`);

  // Emit lobby_ready with 5-second countdown
  io.to(`lobby:${lobbyId}`).emit('lobby_ready', {
    lobbyId,
    playerCount: totalPlayers,
    countdown: 5
  });

  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      io.to(`lobby:${lobbyId}`).emit('lobby_ready', {
        lobbyId,
        playerCount: totalPlayers,
        countdown
      });
    } else {
      clearInterval(countdownInterval);
      startMatch(lobbyId);
    }
  }, 1000);
}

/**
 * Start the match
 */
function startMatch(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.started) return;

  lobby.started = true;
  lobby.matchStartTime = Date.now();
  lobby.matchId = `match_${lobbyId}_${Date.now()}`; // Generate unique match ID

  console.log(`[SERVER] 🚀 Match started in lobby ${lobbyId}, matchId: ${lobby.matchId}`);

  // Emit match_start to all clients
  io.to(`lobby:${lobbyId}`).emit('match_start', {
    lobbyId,
    matchId: lobby.matchId,
    timestamp: lobby.matchStartTime,
    players: Array.from(lobby.players.values()).map(p => ({
      userId: p.userId,
      socketId: p.socketId,
      username: p.username,
      alive: p.alive,
      walletAddress: p.walletAddress
    })),
    bots: Array.from(lobby.bots.values()).map(b => ({
      userId: b.id,
      username: b.username,
      alive: b.alive
    }))
  });
}

/**
 * Check for last alive player
 */
function checkForLastAlive(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || !lobby.started) return;

  const alivePlayers = Array.from(lobby.players.values()).filter(p => p.alive);
  const aliveBots = Array.from(lobby.bots.values()).filter(b => b.alive);
  const totalAlive = alivePlayers.length + aliveBots.length;

  if (totalAlive <= 1) {
    // Determine winner
    let winner = null;
    if (alivePlayers.length === 1) {
      winner = alivePlayers[0];
    } else if (aliveBots.length === 1) {
      winner = aliveBots[0];
    }

    if (winner) {
      endMatch(lobbyId, winner.userId || winner.id);
    } else {
      // Edge case: no one alive (shouldn't happen)
      console.warn(`[SERVER] ⚠️ No winner in lobby ${lobbyId} - all dead`);
      endMatch(lobbyId, null);
    }
  }
}

/**
 * End match and trigger payout
 */
async function endMatch(lobbyId, winnerUserId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    console.warn(`[SERVER] ⚠️ Cannot end match - lobby ${lobbyId} not found`);
    return;
  }

  // Prevent duplicate payouts
  const matchId = lobby.matchId || lobbyId;
  if (matchAlreadyPaid.has(matchId)) {
    console.warn(`[SERVER] ⚠️ Match ${matchId} already paid, skipping duplicate payout`);
    return;
  }

  // Mark as paid immediately to prevent race conditions
  matchAlreadyPaid.add(matchId);

  console.log(`[SERVER] 🏆 Match ended in lobby ${lobbyId}, winner: ${winnerUserId}`);

  try {
    // Collect player data with wallet addresses and entry fees
    const players = Array.from(lobby.players.values()).map(p => ({
      wallet: p.walletAddress || p.userId, // Fallback to userId if no wallet
      entryFee: p.entryFee || 0
    }));

    // Calculate pot size and house rake
    const potSize = players.reduce((sum, p) => sum + (p.entryFee || 0), 0);
    const houseRake = potSize * 0.10; // 10% house rake
    const winnerPayout = potSize * 0.90; // 90% to winner

    // Find winner wallet address
    const winnerPlayer = Array.from(lobby.players.values()).find(p => 
      (p.userId === winnerUserId) || (p.walletAddress === winnerUserId)
    );
    const winnerWallet = winnerPlayer?.walletAddress || winnerPlayer?.userId || winnerUserId;

    // Build payout API payload
    const payoutPayload = {
      matchId,
      lobbyId,
      winnerWallet,
      potSize,
      houseRake,
      players
    };

    console.log(`[SERVER] 📡 Calling https://degn.gg/api/match/complete with payload:`, {
      ...payoutPayload,
      players: `${players.length} players`
    });

    // Call Next.js payout API using fetch()
    if (!fetch) {
      throw new Error('fetch() not available. Please use Node 18+ or install node-fetch');
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch('https://degn.gg/api/match/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVER_SECRET}`
        },
        body: JSON.stringify(payoutPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));

      if (result.success === true) {
        console.log(`[SERVER] ✅ Payout complete for match ${matchId}`);
      } else {
        console.warn(`[SERVER] ⚠️ Payout API returned success: false`, result);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Payout API request timeout (15s)');
      }
      throw fetchError;
    }

    // Emit match_end to all players
    io.to(`lobby:${lobbyId}`).emit('match_end', {
      lobbyId,
      matchId,
      winner: winnerUserId,
      winnerWallet,
      potSize,
      houseRake,
      timestamp: Date.now()
    });

    // Send payout events to winner and losers
    const allSockets = await io.in(`lobby:${lobbyId}`).fetchSockets();
    
    for (const socket of allSockets) {
      const player = lobby.players.get(socket.id);
      if (player) {
        const isWinner = (player.userId === winnerUserId) || 
                        (player.walletAddress && player.walletAddress === winnerWallet);
        
        if (isWinner) {
          socket.emit('payout_success', {
            type: 'payout_success',
            amount: winnerPayout
          });
          console.log(`[SERVER] 💰 Sent payout_success to winner ${player.userId}: ${winnerPayout} SOL`);
        } else {
          socket.emit('payout_loss', {
            type: 'payout_loss',
            amount: 0
          });
          console.log(`[SERVER] 💸 Sent payout_loss to player ${player.userId}`);
        }
      }
    }

  } catch (error) {
    // Production-safe error handling - log but don't crash
    console.error(`[SERVER] ❌ Payout error for match ${matchId}:`, {
      message: error.message,
      stack: error.stack,
      lobbyId
    });

    // Still emit match_end even if payout fails
    io.to(`lobby:${lobbyId}`).emit('match_end', {
      lobbyId,
      matchId,
      winner: winnerUserId,
      timestamp: Date.now(),
      error: 'Payout processing failed'
    });

    // Send error events to all players
    io.to(`lobby:${lobbyId}`).emit('payout_error', {
      type: 'payout_error',
      message: 'Payout processing failed, please contact support'
    });
  }

  // Cleanup lobby after delay
  setTimeout(() => {
    // Clear all timers
    if (lobby.countdownTimer) {
      clearTimeout(lobby.countdownTimer);
    }
    Array.from(lobby.bots.values()).forEach(bot => {
      if (bot.deathTimer) {
        clearTimeout(bot.deathTimer);
      }
    });
    
    // Remove from paid cache after 1 hour (prevent memory leak)
    setTimeout(() => {
      matchAlreadyPaid.delete(matchId);
    }, 3600000); // 1 hour
    
    lobbies.delete(lobbyId);
    console.log(`[SERVER] 🗑️ Cleaned up lobby ${lobbyId}`);
  }, 60000); // 1 minute cleanup delay
}

/**
 * Broadcast lobby update to all clients in lobby
 */
function broadcastLobbyUpdate(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  const players = Array.from(lobby.players.values()).map(p => ({
    userId: p.userId,
    socketId: p.socketId,
    username: p.username,
    alive: p.alive
  }));

  const bots = Array.from(lobby.bots.values()).map(b => ({
    userId: b.id,
    username: b.username,
    alive: b.alive
  }));

  io.to(`lobby:${lobbyId}`).emit('lobby_update', {
    lobbyId,
    players,
    bots,
    totalPlayers: players.length + bots.length,
    maxPlayers: lobby.maxPlayers,
    started: lobby.started
  });
}

// Socket.IO connection handling
// Support both token-based auth (legacy) and query-based auth (new)
io.use(async (socket, next) => {
  const query = socket.handshake.query || {};
  const token = socket.handshake.auth?.token;
  
  // New query-based auth (from client Network.js)
  if (query.matchKey && query.playerId) {
    socket.userId = query.playerId;
    socket.lobbyId = query.matchKey;
    socket.username = query.username || `Player_${query.playerId.substr(-4)}`;
    return next();
  }
  
  // Legacy token-based auth (fallback)
  if (token) {
    const validation = await validateAuthToken(token);
    
    if (!validation.valid) {
      return next(new Error(validation.error || 'Invalid token'));
    }

    // Attach user info to socket
    socket.userId = validation.userId;
    socket.lobbyId = validation.lobbyId;
    return next();
  }
  
  return next(new Error('Authentication required: provide matchKey and playerId in query, or token in auth'));
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  const lobbyId = socket.lobbyId;

  console.log(`[SERVER] ✅ Client connected: ${socket.id} (userId: ${userId}, lobbyId: ${lobbyId})`);

  // Get connection parameters from query string
  const query = socket.handshake.query || {};
  const walletAddress = query.walletAddress || null;
  const entryFee = parseFloat(query.entryFee || '0');

  // Get or create lobby
  if (!lobbies.has(lobbyId)) {
    lobbies.set(lobbyId, {
      players: new Map(),
      bots: new Map(),
      maxPlayers: 8,
      started: false,
      matchStartTime: null,
      matchId: null,
      countdownTimer: null
    });
  }

  const lobby = lobbies.get(lobbyId);

  // Add player to lobby with wallet and entry fee
  lobby.players.set(socket.id, {
    userId,
    socketId: socket.id,
    alive: true,
    username: socket.handshake.auth?.username || query.username || `Player_${userId.substr(-4)}`,
    walletAddress: walletAddress,
    entryFee: entryFee
  });

  // Join lobby room
  socket.join(`lobby:${lobbyId}`);

  // Send initial lobby update
  broadcastLobbyUpdate(lobbyId);

  // Check if lobby should start
  checkStartLobby(lobbyId);

  // Handle player_death event
  socket.on('player_death', (data) => {
    const player = lobby.players.get(socket.id);
    if (!player || !player.alive) return;

    // Validate: socket's userId must match
    if (data.userId && data.userId !== userId) {
      console.warn(`[SERVER] ⚠️ Player death userId mismatch: ${data.userId} vs ${userId}`);
      return;
    }

    player.alive = false;
    console.log(`[SERVER] 💀 Player ${userId} died in lobby ${lobbyId}`);

    // Broadcast player update
    io.to(`lobby:${lobbyId}`).emit('player_update', {
      socketId: socket.id,
      userId,
      alive: false,
      isBot: false
    });

    // Check for last alive
    checkForLastAlive(lobbyId);
  });

  // Handle player position updates (for rendering other players)
  socket.on('player_position', (data) => {
    // Broadcast to other players in lobby (excluding sender)
    socket.to(`lobby:${lobbyId}`).emit('player_position', {
      socketId: socket.id,
      userId,
      position: data.position,
      timestamp: Date.now()
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[SERVER] 🔌 Client disconnected: ${socket.id}`);

    const player = lobby.players.get(socket.id);
    if (player && player.alive && lobby.started) {
      // Treat disconnect as death during active match
      player.alive = false;
      io.to(`lobby:${lobbyId}`).emit('player_update', {
        socketId: socket.id,
        userId,
        alive: false,
        isBot: false
      });
      checkForLastAlive(lobbyId);
    }

    // Remove player from lobby
    lobby.players.delete(socket.id);

    // Broadcast update
    broadcastLobbyUpdate(lobbyId);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    lobbies: lobbies.size,
    redis: redisAdapter ? 'connected' : 'disabled'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[SERVER] 🚀 Socket.IO server running on port ${PORT}`);
  console.log(`[SERVER] 📡 Next.js API: ${NEXT_PUBLIC_URL}`);
  console.log(`[SERVER] 🔒 Server secret: ${SERVER_SECRET ? '***' : 'NOT SET'}`);
  console.log(`[SERVER] 🔴 Redis: ${redisAdapter ? 'enabled' : 'disabled'}`);
});

