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

// Lobby structure:
// {
//   players: Map(socketId -> { userId, socketId, alive, username }),
//   bots: Map(botId -> { id, alive, deathTimer }),
//   maxPlayers: 8,
//   started: boolean,
//   matchStartTime: number | null,
//   countdownTimer: NodeJS.Timeout | null
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

  console.log(`[SERVER] 🚀 Match started in lobby ${lobbyId}`);

  // Emit match_start to all clients
  io.to(`lobby:${lobbyId}`).emit('match_start', {
    lobbyId,
    timestamp: lobby.matchStartTime,
    players: Array.from(lobby.players.values()).map(p => ({
      userId: p.userId,
      socketId: p.socketId,
      username: p.username,
      alive: p.alive
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
  if (!lobby) return;

  console.log(`[SERVER] 🏆 Match ended in lobby ${lobbyId}, winner: ${winnerUserId}`);

  // Build result payload
  const result = {
    lobbyId,
    winner: winnerUserId,
    timestamp: Date.now()
  };

  // Call Next.js API to complete match and process payout
  try {
    console.log(`[SERVER] 📡 Calling ${NEXT_PUBLIC_URL}/api/match/complete with payload:`, result);
    const response = await axios.post(
      `${NEXT_PUBLIC_URL}/api/match/complete`,
      result,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVER_SECRET}`
        },
        timeout: 10000
      }
    );

    const payoutData = response.data || {};

    // Emit match_end and winner_payout to clients
    io.to(`lobby:${lobbyId}`).emit('match_end', {
      lobbyId,
      winner: winnerUserId,
      timestamp: Date.now()
    });

    io.to(`lobby:${lobbyId}`).emit('winner_payout', {
      lobbyId,
      winner: winnerUserId,
      payout: payoutData.payout || 0,
      tx: payoutData.tx || null,
      timestamp: Date.now()
    });

    console.log(`[SERVER] ✅ Payout processed for lobby ${lobbyId}:`, payoutData);
  } catch (error) {
    console.error(`[SERVER] ❌ Payout error for lobby ${lobbyId}:`, error.message);
    if (error.response) {
      console.error(`[SERVER] Response status: ${error.response.status}, data:`, error.response.data);
    }
    
    // Still emit match_end even if payout fails
    io.to(`lobby:${lobbyId}`).emit('match_end', {
      lobbyId,
      winner: winnerUserId,
      timestamp: Date.now(),
      error: 'Payout processing failed'
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
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  const validation = await validateAuthToken(token);
  
  if (!validation.valid) {
    return next(new Error(validation.error || 'Invalid token'));
  }

  // Attach user info to socket
  socket.userId = validation.userId;
  socket.lobbyId = validation.lobbyId;
  
  next();
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  const lobbyId = socket.lobbyId;

  console.log(`[SERVER] ✅ Client connected: ${socket.id} (userId: ${userId}, lobbyId: ${lobbyId})`);

  // Get or create lobby
  if (!lobbies.has(lobbyId)) {
    lobbies.set(lobbyId, {
      players: new Map(),
      bots: new Map(),
      maxPlayers: 8,
      started: false,
      matchStartTime: null,
      countdownTimer: null
    });
  }

  const lobby = lobbies.get(lobbyId);

  // Add player to lobby
  lobby.players.set(socket.id, {
    userId,
    socketId: socket.id,
    alive: true,
    username: socket.handshake.auth?.username || `Player_${userId.substr(-4)}`
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

