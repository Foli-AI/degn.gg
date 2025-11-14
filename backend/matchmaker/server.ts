import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);

// Solana configuration
const connection = new Connection(
  process.env.SOLANA_RPC || 'https://api.devnet.solana.com',
  'confirmed'
);

// Supabase configuration
let supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[MATCHMAKER] ⚠️ Supabase credentials not configured. Some features will be disabled.');
    return null;
  }
  
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[MATCHMAKER] ✅ Supabase client initialized');
    return supabase;
  } catch (error) {
    console.error('[MATCHMAKER] ❌ Failed to initialize Supabase:', error);
    return null;
  }
}

// Load escrow wallet from environment
let escrowKeypair: Keypair | null = null;

async function initializeEscrowWallet() {
  try {
    if (process.env.ESCROW_PRIVATE_KEY) {
      const secretKey = JSON.parse(process.env.ESCROW_PRIVATE_KEY);
      escrowKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      console.log('🔑 Escrow wallet loaded:', escrowKeypair.publicKey.toBase58());
    } else {
      console.warn('⚠️ ESCROW_PRIVATE_KEY not set - generating temporary keypair for development');
      escrowKeypair = Keypair.generate();
      console.log('🔑 Temporary escrow wallet:', escrowKeypair.publicKey.toBase58());
      
      // Request airdrop for development (non-blocking with timeout)
      Promise.race([
        connection.requestAirdrop(escrowKeypair.publicKey, 2 * LAMPORTS_PER_SOL),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Airdrop timeout')), 5000))
      ]).then(() => {
        console.log('💰 Airdrop requested for escrow wallet');
      }).catch((e: any) => {
        // Check for rate limit error (429)
        if (e?.code === 429 || e?.message?.includes('429') || e?.message?.includes('Too Many Requests') || e?.message?.includes('timeout')) {
          console.warn('⚠️ Devnet airdrop rate-limited or timed out. Continuing without SOL.');
        } else {
          console.warn('⚠️ Airdrop failed, continuing in devnet without balance. Error:', e?.message || e);
        }
      });
    }
  } catch (error: any) {
    console.warn('⚠️ Failed to load escrow wallet, continuing without escrow:', error?.message || error);
    // Don't exit - server should still start
  }
}

// ✅ Define allowed games for DEGN.gg
const VALID_GAMES = ["sol-bird", "connect4", "slither", "agar"];

// Configure CORS for Socket.IO
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://degn-gg.vercel.app",
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_FRONTEND_URL
].filter(Boolean) as string[];

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : ["http://localhost:3000", "https://degn-gg.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  transports: ["websocket", "polling"]
});

// Middleware - CORS for HTTP requests
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : ["http://localhost:3000", "https://degn-gg.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["*"]
}));
app.use(express.json());

// Types
interface Player {
  id: string;
  username: string;
  socketId: string;
  walletAddress?: string;
  joinedAt: Date;
}

interface Lobby {
  id: string;
  gameType: 'sol-bird' | 'connect4' | 'slither' | 'agar' | 'coinflip';
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'ready' | 'in-progress';
  createdAt: Date;
  createdBy: string;
  entryAmount?: number; // SOL amount for entry
}

// In-memory storage (replace with Redis/Database in production)
const connectedPlayers = new Map<string, Player>(); // socketId -> Player
const lobbies = new Map<string, Lobby>(); // lobbyId -> Lobby
const playerLobbies = new Map<string, string>(); // socketId -> lobbyId

// Game state tracking for multiplayer sync
const playerGameStates = new Map<string, {
  playerId: string;
  lobbyId: string;
  isAlive: boolean;
  score: number;
  ready: boolean;
  lastUpdate: number;
}>(); // playerId -> game state
const lobbyReadyPlayers = new Map<string, Set<string>>(); // lobbyId -> Set of ready playerIds

// Real-time position tracking for Sol-Bird
const lobbyPlayerPositions = new Map<string, Map<string, {
  y: number;
  rotation: number;
  velocity: number;
  alive: boolean;
  lastUpdate: number;
}>>(); // lobbyId -> Map<playerId -> position>

// Match tracking for game sync
interface Match {
  matchKey: string;
  lobbyId: string;
  players: Array<{ playerId: string; socketId: string; wallet?: string; username: string }>;
  createdAt: number;
  state: 'in-progress' | 'ended';
  lastState: any;
  sockets: Map<string, WebSocket>; // playerId -> WebSocket
  playerAlive: Map<string, boolean>; // playerId -> alive status
}

const matches = new Map<string, Match>(); // matchKey -> Match

// Utility functions
function generateLobbyId(): string {
  return `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Solana utility functions
function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

async function verifyTransaction(signature: string): Promise<{
  confirmed: boolean;
  amount?: number;
  from?: string;
  to?: string;
}> {
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!transaction) {
      return { confirmed: false };
    }

    // Extract transfer details
    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const amount = lamportsToSol(
        transaction.meta.preBalances[0] - transaction.meta.postBalances[0]
      );
      
      return {
        confirmed: true,
        amount,
        from: transaction.transaction.message.accountKeys[0].toBase58(),
        to: transaction.transaction.message.accountKeys[1].toBase58()
      };
    }

    return { confirmed: true };
  } catch (error) {
    console.error('Failed to verify transaction:', error);
    return { confirmed: false };
  }
}

async function sendPayout(winnerAddress: string, amountSOL: number): Promise<string | null> {
  if (!escrowKeypair) {
    console.error('Escrow keypair not available');
    return null;
  }

  try {
    const winnerPubkey = new PublicKey(winnerAddress);
    const lamports = solToLamports(amountSOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: winnerPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [escrowKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`💰 Payout sent: ${amountSOL} SOL to ${winnerAddress}, signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Failed to send payout:', error);
    return null;
  }
}

function logActivity(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎮 ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function broadcastLobbyUpdate(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  const lobbyData = {
    id: lobby.id,
    gameType: lobby.gameType,
    players: lobby.players,
    maxPlayers: lobby.maxPlayers,
    status: lobby.status,
    createdAt: lobby.createdAt
  };

  // Broadcast to all players in the lobby
  lobby.players.forEach(player => {
    io.to(player.socketId).emit('lobby-update', lobbyData);
  });

  logActivity(`Lobby update broadcasted`, { lobbyId, playerCount: lobby.players.length, status: lobby.status });
}

function checkLobbyReady(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  // Determine required players based on game type
  let requiredPlayers = lobby.maxPlayers;
  if (lobby.gameType === 'sol-bird') {
    requiredPlayers = 2; // Enforce exactly 2 players for sol-bird
  }

  if (lobby.players.length >= requiredPlayers && lobby.status === 'waiting') {
    lobby.status = 'ready';
    
    logActivity(`🚀 Lobby is ready to start!`, {
      lobbyId,
      gameType: lobby.gameType,
      playerCount: lobby.players.length,
      maxPlayers: lobby.maxPlayers,
      requiredPlayers,
      is1v1: lobby.gameType === 'sol-bird'
    });

    // Emit lobby-ready to all players in the lobby
    lobby.players.forEach(player => {
      io.to(player.socketId).emit('lobby-ready', {
        lobbyId,
        gameType: lobby.gameType,
        players: lobby.players,
        is1v1: lobby.gameType === 'sol-bird'
      });
    });

    // Emit lobby info for SolBird
    if (lobby.gameType === 'sol-bird') {
      io.to(lobbyId).emit('lobby-info', {
        message: 'SolBird 1v1 match ready!',
        maxPlayers: 2,
        gameType: 'sol-bird',
        requiredPlayers: 2
      });
    }

    broadcastLobbyUpdate(lobbyId);
    
    // For Sol-Bird, only emit startGame when ALL players have joined
    if (lobby.gameType === 'sol-bird') {
      const requiredPlayers = lobby.maxPlayers || 2;
      if (lobby.players.length >= requiredPlayers) {
        logActivity(`🎮 All players joined, starting Sol-Bird game`, { 
          lobbyId, 
          playerCount: lobby.players.length,
          requiredPlayers 
        });
        
        // Mark lobby as ready
        lobby.status = 'ready';
        
        // Emit startGame to all players
        lobby.players.forEach(p => {
          io.to(p.socketId).emit('startGame', {
            lobbyId,
            gameType: 'sol-bird',
            players: lobby.players
          });
        });
      } else {
        logActivity(`🎮 Waiting for more players`, { 
          lobbyId, 
          current: lobby.players.length,
          required: requiredPlayers 
        });
      }
    }
    
    // Auto-start game after 3 seconds (for non-Sol-Bird games)
    if (lobby.gameType !== 'sol-bird') {
      setTimeout(() => {
        startGame(lobbyId);
      }, 3000);
    }
  }
}

function startGame(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'ready') return;

  lobby.status = 'in-progress';
  
  logActivity(`🎮 Game started`, {
    lobbyId,
    gameType: lobby.gameType,
    playerCount: lobby.players.length,
    entryAmount: lobby.entryAmount
  });

  // Broadcast game start to all players
  lobby.players.forEach(player => {
    io.to(player.socketId).emit('game:start', {
      lobbyId,
      gameType: lobby.gameType,
      players: lobby.players,
      entryAmount: lobby.entryAmount,
      maxPlayers: lobby.maxPlayers,
      startTime: Date.now()
    });
  });

  // Also broadcast to the lobby room
  io.to(lobbyId).emit('game:start', {
    lobbyId,
    gameType: lobby.gameType,
    players: lobby.players,
    entryAmount: lobby.entryAmount,
    maxPlayers: lobby.maxPlayers,
    startTime: Date.now()
  });

  broadcastLobbyUpdate(lobbyId);
  broadcastLobbyListUpdate();
}

function removeLobbyIfEmpty(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  if (lobby.players.length === 0) {
    lobbies.delete(lobbyId);
    logActivity(`🗑️ Empty lobby deleted`, { lobbyId, gameType: lobby.gameType });
    broadcastLobbyListUpdate();
  }
}

function broadcastLobbyListUpdate() {
  const lobbyList = Array.from(lobbies.values()).map(l => ({
    id: l.id,
    gameType: l.gameType,
    currentPlayers: l.players.length,
    maxPlayers: l.maxPlayers,
    entryAmount: l.entryAmount || 0
  }));
  
  io.emit("lobbyListUpdate", lobbyList);
  logActivity(`📡 Lobby list update broadcasted`, { totalLobbies: lobbyList.length });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  logActivity(`🔌 Player connected`, { socketId: socket.id });

  // Player joins the matchmaker
  socket.on('player:join', (data: { username: string; walletAddress?: string }) => {
    const player: Player = {
      id: generatePlayerId(),
      username: data.username || `Player_${socket.id.slice(-4)}`,
      socketId: socket.id,
      walletAddress: data.walletAddress,
      joinedAt: new Date()
    };

    connectedPlayers.set(socket.id, player);
    
    logActivity(`👤 Player joined matchmaker`, {
      playerId: player.id,
      username: player.username,
      socketId: socket.id,
      walletAddress: player.walletAddress
    });

    // Send welcome message
    socket.emit('matchmaker:welcome', {
      playerId: player.id,
      message: 'Welcome to DEGN.gg Matchmaker!',
      availableGames: ['sol-bird', 'connect4', 'slither', 'agar']
    });

    // Broadcast updated stats
    io.emit('matchmaker:stats', {
      totalPlayers: connectedPlayers.size,
      totalLobbies: lobbies.size
    });
  });

  // Join a lobby
  socket.on('join-lobby', (data: { lobbyId: string; walletAddress?: string }) => {
    const player = connectedPlayers.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found. Please join matchmaker first.' });
      return;
    }

    const lobby = lobbies.get(data.lobbyId);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found.' });
      return;
    }

    // Enforce SolBird 1v1 rules
    if (lobby.gameType === 'sol-bird') {
      if (lobby.players.length >= 2) {
        socket.emit('error', { message: 'Lobby full (sol-bird is 1v1)', code: 'LOBBY_FULL_1V1' });
        return;
      }
    } else {
      if (lobby.players.length >= lobby.maxPlayers) {
        socket.emit('error', { message: 'Lobby is full.' });
        return;
      }
    }

    if (lobby.status !== 'waiting') {
      socket.emit('error', { message: 'Lobby is not accepting new players.' });
      return;
    }

    // Prevent same wallet from joining twice
    if (data.walletAddress) {
      const existingWallet = lobby.players.find(p => p.walletAddress === data.walletAddress);
      if (existingWallet) {
        socket.emit('error', { message: 'Wallet already joined this lobby', code: 'WALLET_ALREADY_JOINED' });
        return;
      }
    }

    // Check if player is already in a lobby
    const currentLobbyId = playerLobbies.get(socket.id);
    if (currentLobbyId) {
      socket.emit('error', { message: 'You are already in a lobby. Leave first.' });
      return;
    }

    // Update player with wallet address if provided
    if (data.walletAddress) {
      player.walletAddress = data.walletAddress;
    }

    // Add player to lobby
    lobby.players.push(player);
    playerLobbies.set(socket.id, data.lobbyId);
    socket.join(data.lobbyId);

    logActivity(`🚪 Player joined lobby`, {
      playerId: player.id,
      username: player.username,
      lobbyId: data.lobbyId,
      gameType: lobby.gameType,
      playersInLobby: lobby.players.length,
      maxPlayers: lobby.maxPlayers
    });

    // Notify player they joined
    socket.emit('lobby-joined', {
      lobbyId: data.lobbyId,
      gameType: lobby.gameType,
      players: lobby.players,
      maxPlayers: lobby.maxPlayers,
      status: lobby.status
    });

    // Broadcast lobby update
    broadcastLobbyUpdate(data.lobbyId);
    broadcastLobbyListUpdate();

    // Check if lobby is ready to start
    checkLobbyReady(data.lobbyId);
  });

  // Leave current lobby
  socket.on('leave-lobby', () => {
    const player = connectedPlayers.get(socket.id);
    const lobbyId = playerLobbies.get(socket.id);

    if (!player || !lobbyId) {
      socket.emit('error', { message: 'You are not in a lobby.' });
      return;
    }

    const lobby = lobbies.get(lobbyId);
    if (lobby) {
      // Remove player from lobby
      lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
      socket.leave(lobbyId);
      
      logActivity(`🚪 Player left lobby`, {
        playerId: player.id,
        username: player.username,
        lobbyId,
        gameType: lobby.gameType,
        remainingPlayers: lobby.players.length
      });

      // Broadcast lobby update
      broadcastLobbyUpdate(lobbyId);
      broadcastLobbyListUpdate();

      // Clean up empty lobby
      removeLobbyIfEmpty(lobbyId);
    }

    playerLobbies.delete(socket.id);
    socket.emit('lobby-left', { lobbyId });
  });

  // Get lobby list
  socket.on('lobbies:list', () => {
    const availableLobbies = Array.from(lobbies.values())
      .filter(lobby => lobby.status === 'waiting')
      .map(lobby => ({
        id: lobby.id,
        gameType: lobby.gameType,
        currentPlayers: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        status: lobby.status,
        createdAt: lobby.createdAt
      }));

    socket.emit('lobbies:list', { lobbies: availableLobbies });
  });

  // Handle disconnection
  // Handle STATE_UPDATE from game clients
  socket.on('STATE_UPDATE', (data: {
    type: string;
    lobbyId: string;
    playerId: string;
    eventType: string;
    payload: any;
  }) => {
    const { lobbyId, playerId, eventType, payload } = data;
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      console.warn(`[STATE_UPDATE] Lobby not found: ${lobbyId}`);
      return;
    }

    // Find the actual player in the lobby by matching socketId or playerId
    const player = lobby.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player) {
      console.warn(`[STATE_UPDATE] Player not found in lobby: ${playerId}, socketId: ${socket.id}`);
      return;
    }

    // Use the lobby player's ID (not the client-provided playerId which might differ)
    const actualPlayerId = player.id;

    // Update player game state
    const currentState = playerGameStates.get(actualPlayerId) || {
      playerId: actualPlayerId,
      lobbyId,
      isAlive: true,
      score: 0,
      ready: false,
      lastUpdate: Date.now()
    };

    // Update based on event type
    switch (eventType) {
      case 'playerReady':
        currentState.ready = true;
        lobbyReadyPlayers.set(lobbyId, lobbyReadyPlayers.get(lobbyId) || new Set());
        lobbyReadyPlayers.get(lobbyId)!.add(actualPlayerId);
        
        // Check if all players are ready
        const readySet = lobbyReadyPlayers.get(lobbyId);
        if (readySet && readySet.size >= lobby.players.length && lobby.status === 'ready') {
          // Send GAME_START to all players
          logActivity(`🎮 All players ready, starting game`, { lobbyId, readyPlayers: Array.from(readySet) });
          lobby.players.forEach(p => {
            // Find socket by player's socketId
            const player = connectedPlayers.get(p.socketId);
            if (player) {
              io.to(p.socketId).emit('GAME_START', {
                lobbyId,
                gameType: lobby.gameType,
                players: lobby.players,
                startTime: Date.now()
              });
            }
          });
        }
        break;
        
      case 'playerAlive':
        currentState.isAlive = payload.alive !== false;
        currentState.score = payload.score || currentState.score;
        currentState.lastUpdate = Date.now();
        break;
        
      case 'playerDied':
        currentState.isAlive = false;
        currentState.score = payload.score || currentState.score;
        currentState.lastUpdate = Date.now();
        logActivity(`💀 Player died`, { lobbyId, playerId, score: currentState.score });
        break;
        
      case 'gameStart':
        currentState.isAlive = true;
        currentState.score = 0;
        currentState.lastUpdate = Date.now();
        break;
        
      case 'gameOver':
        logActivity(`🏁 Game over`, { lobbyId, winner: payload.winner, scores: payload.scores });
        break;
    }

    playerGameStates.set(actualPlayerId, currentState);

    // Build LOBBY_UPDATE with all player states
    const lobbyPlayers = lobby.players.map(p => {
      const gameState = playerGameStates.get(p.id);
      return {
        id: p.id,
        playerId: p.id,
        username: p.username,
        isAlive: gameState?.isAlive !== false,
        score: gameState?.score || 0
      };
    });

    const aliveCount = lobbyPlayers.filter(p => p.isAlive).length;

    // Broadcast LOBBY_UPDATE to all players in the lobby
    const lobbyUpdate = {
      type: 'LOBBY_UPDATE',
      lobbyId,
      players: lobbyPlayers,
      scores: lobbyPlayers.map(p => ({ playerId: p.id, score: p.score })),
      aliveCount,
      timestamp: Date.now()
    };

    lobby.players.forEach(p => {
      // Send to player's socket
      io.to(p.socketId).emit('LOBBY_UPDATE', lobbyUpdate);
    });

    // Check for game over (only 1 player alive)
    if (aliveCount === 1 && lobby.status === 'in-progress') {
      const winner = lobbyPlayers.find(p => p.isAlive);
      if (winner) {
        logActivity(`🏆 Game over - Winner: ${winner.username}`, { lobbyId, winnerId: winner.id });
        
        // Send game over to all players
        lobby.players.forEach(p => {
          io.to(p.socketId).emit('game:over', {
            lobbyId,
            winner: winner.id,
            winnerUsername: winner.username,
            scores: lobbyPlayers,
            aliveCount: 1
          });
        });
      }
    }
  });

  // Handle PING heartbeat
  socket.on('PING', () => {
    socket.emit('PONG');
  });

  // Handle playerMove (real-time position updates for Sol-Bird)
  socket.on('playerMove', (data: {
    lobbyId: string;
    playerId: string;
    y: number;
    rotation: number;
    velocity: number;
    alive: boolean;
  }) => {
    const { lobbyId, playerId, y, rotation, velocity, alive } = data;
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      console.warn(`[playerMove] Lobby not found: ${lobbyId}`);
      return;
    }

    // Find the actual player in the lobby
    const player = lobby.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player) {
      console.warn(`[playerMove] Player not found: ${playerId}`);
      return;
    }

    const actualPlayerId = player.id;

    // Initialize lobby positions map if needed
    if (!lobbyPlayerPositions.has(lobbyId)) {
      lobbyPlayerPositions.set(lobbyId, new Map());
    }

    const positions = lobbyPlayerPositions.get(lobbyId)!;

    // Update player position
    positions.set(actualPlayerId, {
      y,
      rotation,
      velocity,
      alive: alive !== false,
      lastUpdate: Date.now()
    });

    // Build positions object for broadcast
    const positionsObj: Record<string, any> = {};
    positions.forEach((pos, pid) => {
      positionsObj[pid] = {
        y: pos.y,
        rotation: pos.rotation,
        velocity: pos.velocity,
        alive: pos.alive
      };
    });

    // Broadcast to all players in the lobby
    lobby.players.forEach(p => {
      io.to(p.socketId).emit('playerPositions', positionsObj);
    });
  });

  // Handle playerDied (Sol-Bird death event)
  socket.on('playerDied', (data: {
    lobbyId: string;
    playerId: string;
    score: number;
  }) => {
    const { lobbyId, playerId, score } = data;
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      console.warn(`[playerDied] Lobby not found: ${lobbyId}`);
      return;
    }

    const player = lobby.players.find(p => p.id === playerId || p.socketId === socket.id);
    if (!player) {
      console.warn(`[playerDied] Player not found: ${playerId}`);
      return;
    }

    const actualPlayerId = player.id;

    // Update position to mark as dead
    if (lobbyPlayerPositions.has(lobbyId)) {
      const positions = lobbyPlayerPositions.get(lobbyId)!;
      const pos = positions.get(actualPlayerId);
      if (pos) {
        pos.alive = false;
        positions.set(actualPlayerId, pos);
      }
    }

    // Update game state
    const gameState = playerGameStates.get(actualPlayerId);
    if (gameState) {
      gameState.isAlive = false;
      gameState.score = score;
      playerGameStates.set(actualPlayerId, gameState);
    }

    logActivity(`💀 Player died in Sol-Bird`, { lobbyId, playerId: actualPlayerId, score });

    // Broadcast death to all players
    lobby.players.forEach(p => {
      io.to(p.socketId).emit('playerDied', {
        playerId: actualPlayerId,
        score,
        lobbyId
      });
    });

    // Check if game should end (only 1 player alive)
    const alivePlayers = lobby.players.filter(p => {
      if (lobbyPlayerPositions.has(lobbyId)) {
        const pos = lobbyPlayerPositions.get(lobbyId)!.get(p.id);
        return pos && pos.alive;
      }
      return true; // Assume alive if no position data
    });

    if (alivePlayers.length === 1 && lobby.status === 'in-progress') {
      const winner = alivePlayers[0];
      logActivity(`🏆 Sol-Bird game over - Winner: ${winner.username}`, { lobbyId, winnerId: winner.id });

      // Broadcast game over
      lobby.players.forEach(p => {
        io.to(p.socketId).emit('gameOver', {
          lobbyId,
          winnerId: winner.id,
          winnerUsername: winner.username,
          scores: lobby.players.map(pl => ({
            playerId: pl.id,
            username: pl.username,
            score: playerGameStates.get(pl.id)?.score || 0,
            isAlive: pl.id === winner.id
          }))
        });
      });
    }
  });

  // Handle match results and payouts
  socket.on('match:results', async (data: {
    lobbyId: string;
    results: Array<{
      rank: number;
      playerId: string;
      username: string;
      score: number;
      isAlive: boolean;
      prize: number;
    }>;
    gameType: string;
  }) => {
    const { lobbyId, results, gameType } = data;
    const lobby = lobbies.get(lobbyId);
    
    if (!lobby) {
      console.error('Lobby not found for match results:', lobbyId);
      return;
    }

    logActivity(`🏁 Match completed`, {
      lobbyId,
      gameType,
      playerCount: results.length,
      winner: results[0]?.username
    });

    // Process payouts for winners
    const entryAmount = lobby.entryAmount || 0;
    const totalPot = entryAmount * lobby.players.length;

    for (const result of results) {
      if (result.prize > 0) {
        const payoutAmount = totalPot * result.prize;
        const player = lobby.players.find(p => p.id === result.playerId);
        
        if (player && player.walletAddress && payoutAmount > 0) {
          try {
            const signature = await sendPayout(player.walletAddress, payoutAmount);
            
            if (signature) {
              logActivity(`💰 Payout successful`, {
                lobbyId,
                playerId: result.playerId,
                username: result.username,
                rank: result.rank,
                payoutSOL: payoutAmount,
                signature
              });

              // Notify player of payout
              io.to(player.socketId).emit('payout:received', {
                amount: payoutAmount,
                signature,
                rank: result.rank,
                gameType
              });
            } else {
              logActivity(`❌ Payout failed`, {
                lobbyId,
                playerId: result.playerId,
                username: result.username,
                payoutSOL: payoutAmount
              });
            }
          } catch (error) {
            console.error('Error processing payout:', error);
          }
        }
      }
    }

    // Mark lobby as completed
    lobby.status = 'completed' as any;
    
    // Broadcast final results
    io.to(lobbyId).emit('match:completed', {
      lobbyId,
      results,
      totalPot,
      gameType
    });

    // Clean up lobby after delay
    setTimeout(() => {
      lobbies.delete(lobbyId);
      broadcastLobbyListUpdate();
      logActivity(`🗑️ Completed lobby cleaned up`, { lobbyId });
    }, 30000); // 30 seconds
  });

  socket.on('disconnect', () => {
    const player = connectedPlayers.get(socket.id);
    const lobbyId = playerLobbies.get(socket.id);
    
    if (player) {
      logActivity(`🔌 Player disconnected`, {
        playerId: player.id,
        username: player.username,
        socketId: socket.id,
        wasInLobby: !!lobbyId
      });

      // Leave lobby if in one
      if (lobbyId) {
        const lobby = lobbies.get(lobbyId);
        if (lobby) {
          lobby.players = lobby.players.filter(p => p.socketId !== socket.id);
          
          // Clean up position tracking
          if (lobbyPlayerPositions.has(lobbyId)) {
            lobbyPlayerPositions.get(lobbyId)!.delete(player.id);
          }
          
          logActivity(`🚪 Player auto-left lobby on disconnect`, {
            playerId: player.id,
            username: player.username,
            lobbyId,
            remainingPlayers: lobby.players.length
          });

          // Broadcast lobby update
          broadcastLobbyUpdate(lobbyId);

          // Clean up empty lobby
          removeLobbyIfEmpty(lobbyId);
        }
      }

      connectedPlayers.delete(socket.id);
      playerLobbies.delete(socket.id);

      // Broadcast updated stats
      io.emit('matchmaker:stats', {
        totalPlayers: connectedPlayers.size,
        totalLobbies: lobbies.size
      });
    }
  });
});

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      totalPlayers: connectedPlayers.size,
      totalLobbies: lobbies.size,
      uptime: process.uptime()
    }
  });
});

app.get('/lobbies', (req, res) => {
  const lobbyList = Array.from(lobbies.values()).map(lobby => ({
    id: lobby.id,
    gameType: lobby.gameType,
    playerCount: lobby.players.length,
    maxPlayers: lobby.maxPlayers,
    status: lobby.status,
    createdAt: lobby.createdAt,
    createdBy: lobby.createdBy,
    entryAmount: lobby.entryAmount,
    players: lobby.players.map(p => ({
      id: p.id,
      username: p.username
    }))
  }));

  res.json({
    totalLobbies: lobbies.size,
    lobbies: lobbyList
  });
});

app.post('/create-lobby', (req, res) => {
    const { gameType, maxPlayers, entryAmount } = req.body;
  
    // ✅ Default allowed games (you can add more)
    const VALID_GAMES = ['sol-bird', 'connect4', 'slither', 'agar', 'coinflip', 'flappybird'];
  
    // ✅ If someone sends "flappybird", automatically map it to internal ID
    const normalizedGameType =
      gameType === 'flappybird' ? 'sol-bird' : gameType;
  
    // ✅ Validate input
    if (!normalizedGameType || !VALID_GAMES.includes(gameType)) {
      return res.status(400).json({
        error: `Invalid gameType. Must be one of: ${VALID_GAMES.join(', ')}`
      });
    }

    // ✅ Enforce SolBird 1v1 rules
    let finalMaxPlayers;
    if (normalizedGameType === 'sol-bird') {
      if (maxPlayers && maxPlayers > 2) {
        return res.status(400).json({
          error: 'SolBird is a 1v1 game. maxPlayers must be 2.',
          gameType: 'sol-bird',
          maxPlayersAllowed: 2
        });
      }
      finalMaxPlayers = 2; // Force 1v1 for sol-bird
    } else {
      finalMaxPlayers = maxPlayers && maxPlayers >= 2 && maxPlayers <= 50 ? maxPlayers : 2;
    }
  
    const finalEntryAmount = entryAmount && entryAmount >= 0 ? entryAmount : undefined;
  
    const lobbyId = generateLobbyId();
    const lobby: Lobby = {
      id: lobbyId,
      gameType: normalizedGameType as any,
      players: [],
      maxPlayers: finalMaxPlayers,
      status: 'waiting',
      createdAt: new Date(),
      createdBy: 'API',
      entryAmount: finalEntryAmount
    };
  
    lobbies.set(lobbyId, lobby);

    logActivity(`🏠 Lobby created via API`, {
      lobbyId,
      gameType: normalizedGameType,
      maxPlayers: finalMaxPlayers,
      entryAmount: finalEntryAmount,
      createdBy: 'API'
    });

    // Broadcast lobby list update
    broadcastLobbyListUpdate();
  
    res.status(201).json({
      success: true,
      lobby: {
        id: lobby.id,
        gameType: lobby.gameType,
        maxPlayers: lobby.maxPlayers,
        status: lobby.status,
        createdAt: lobby.createdAt,
        entryAmount: lobby.entryAmount
      }
    });
  });
  

app.get('/stats', (req, res) => {
  const lobbyStats = Array.from(lobbies.values()).map(lobby => ({
    id: lobby.id,
    gameType: lobby.gameType,
    playerCount: lobby.players.length,
    maxPlayers: lobby.maxPlayers,
    status: lobby.status,
    createdAt: lobby.createdAt
  }));

  res.json({
    totalPlayers: connectedPlayers.size,
    totalLobbies: lobbies.size,
    lobbies: lobbyStats
  });
});

// Solana payment endpoints
app.post('/api/pay-entry', async (req, res) => {
  try {
    const { lobbyId, playerAddress } = req.body;

    if (!lobbyId || !playerAddress) {
      return res.status(400).json({ error: 'Missing lobbyId or playerAddress' });
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found' });
    }

    if (!escrowKeypair) {
      return res.status(500).json({ error: 'Escrow wallet not configured' });
    }

    // Create unsigned transaction
    const entryFeeLamports = solToLamports(lobby.entryAmount || 0);
    const fromPubkey = new PublicKey(playerAddress);
    const toPubkey = escrowKeypair.publicKey;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: entryFeeLamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // Serialize transaction for client to sign
    const serialized = transaction.serialize({
      requireAllSignatures: false,
    }).toString('base64');

    logActivity(`💳 Entry transaction created`, {
      lobbyId,
      playerAddress,
      entryAmount: lobby.entryAmount,
      escrowAddress: toPubkey.toBase58()
    });

    res.json({ 
      transaction: serialized,
      escrowAddress: toPubkey.toBase58()
    });

  } catch (error) {
    console.error('Error creating entry transaction:', error);
    res.status(500).json({ error: 'Failed to create entry transaction' });
  }
});

app.post('/api/verify-entry', async (req, res) => {
  try {
    const { lobbyId, signature, playerAddress } = req.body;

    if (!lobbyId || !signature || !playerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      return res.status(404).json({ error: 'Lobby not found' });
    }

    // Verify transaction on-chain
    const verification = await verifyTransaction(signature);
    
    if (!verification.confirmed) {
      return res.status(400).json({ error: 'Transaction not confirmed on-chain' });
    }

    // Verify transaction details
    if (verification.from !== playerAddress) {
      return res.status(400).json({ error: 'Transaction sender mismatch' });
    }

    if (escrowKeypair && verification.to !== escrowKeypair.publicKey.toBase58()) {
      return res.status(400).json({ error: 'Transaction recipient mismatch' });
    }

    const expectedAmount = lobby.entryAmount || 0;
    if (verification.amount && Math.abs(verification.amount - expectedAmount) > 0.001) {
      return res.status(400).json({ error: 'Transaction amount mismatch' });
    }

    logActivity(`✅ Entry payment verified`, {
      lobbyId,
      playerAddress,
      signature,
      amount: verification.amount
    });

    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      transactionDetails: verification
    });

  } catch (error) {
    console.error('Error verifying entry transaction:', error);
    res.status(500).json({ error: 'Failed to verify transaction' });
  }
});

// Start match endpoint (called by frontend after payments confirmed)
app.post('/start-match', async (req, res) => {
  try {
    const { lobbyId, players } = req.body;

    console.log('[MATCHMAKER] /start-match called', { lobbyId, playersCount: players?.length });

    if (!lobbyId) {
      console.error('[MATCHMAKER] ❌ Missing lobbyId in start-match request');
      return res.status(400).json({ error: 'Missing lobbyId' });
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      console.error('[MATCHMAKER] ❌ Lobby not found:', lobbyId);
      return res.status(404).json({ error: 'Lobby not found' });
    }

    console.log('[MATCHMAKER] Lobby found:', {
      lobbyId,
      gameType: lobby.gameType,
      currentPlayers: lobby.players.length,
      maxPlayers: lobby.maxPlayers,
      status: lobby.status
    });

    // Verify all players have paid via Supabase entries table
    const db = getSupabaseClient();
    if (db) {
      console.log('[MATCHMAKER] Checking entries table for verified payments...');
      
      const { data: entries, error: entriesError } = await db
        .from('entries')
        .select('wallet, paid, transaction_signature')
        .eq('lobby_id', lobbyId)
        .eq('paid', true);

      if (entriesError) {
        console.error('[MATCHMAKER] ❌ Failed to check entries:', entriesError);
      } else {
        console.log('[MATCHMAKER] Entries found:', {
          count: entries?.length || 0,
          required: lobby.maxPlayers,
          entries: entries?.map(e => ({ wallet: e.wallet?.slice(0, 8) + '...', paid: e.paid }))
        });

        // Check if all required players have paid
        const requiredPlayers = lobby.maxPlayers;
        if (!entries || entries.length < requiredPlayers) {
          console.log('[MATCHMAKER] ⏳ Not all players have paid yet', {
            paid: entries?.length || 0,
            required: requiredPlayers
          });
          return res.json({
            success: false,
            message: `Waiting for ${requiredPlayers - (entries?.length || 0)} more player(s) to pay`,
            paidCount: entries?.length || 0,
            requiredCount: requiredPlayers
          });
        }

        console.log('[MATCHMAKER] ✅ All players have paid!');
      }
    }

    // Check if lobby is full
    if (lobby.players.length < lobby.maxPlayers) {
      console.log('[MATCHMAKER] ⏳ Lobby not full yet', {
        current: lobby.players.length,
        required: lobby.maxPlayers
      });
      return res.json({
        success: false,
        message: `Waiting for ${lobby.maxPlayers - lobby.players.length} more player(s)`,
        currentPlayers: lobby.players.length,
        maxPlayers: lobby.maxPlayers
      });
    }

    console.log('[MATCHMAKER] 🎮 Lobby full, starting game!', {
      lobbyId,
      gameType: lobby.gameType,
      playerCount: lobby.players.length
    });

    // Generate match ID and matchKey
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const matchKey = `${lobbyId}_${Date.now()}`;
    console.log('[MATCHMAKER] Generated matchId:', matchId, 'matchKey:', matchKey);

    // Create match object in memory
    const match: Match = {
      matchKey,
      lobbyId,
      players: lobby.players.map(p => ({
        playerId: p.id,
        socketId: p.socketId,
        wallet: p.walletAddress,
        username: p.username
      })),
      createdAt: Date.now(),
      state: 'in-progress',
      lastState: null,
      sockets: new Map(),
      playerAlive: new Map(lobby.players.map(p => [p.id, true]))
    };
    matches.set(matchKey, match);
    console.log('[MATCHMAKER] matchStarted', matchKey, match.players.map(p => p.playerId));

    // Create game session in Supabase
    if (db) {
      try {
        // Calculate total pot
        const totalPot = (lobby.entryAmount || 0) * lobby.players.length;
        
        // Generate server seed for provably fair gameplay
        const serverSeed = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        const { data: gameSession, error: sessionError } = await db
          .from('game_sessions')
          .insert({
            id: matchId,
            lobby_id: lobbyId,
            game_type: lobby.gameType,
            status: 'in_progress',
            wager: totalPot,
            payout: 0, // Will be updated when game ends
            server_seed: serverSeed,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (sessionError) {
          console.error('[MATCHMAKER] ❌ Failed to create game session:', sessionError);
        } else {
          console.log('[MATCHMAKER] ✅ Created game session:', {
            matchId: gameSession.id,
            gameType: gameSession.game_type,
            totalPot
          });
        }

        // Update lobby status in Supabase
        const { error: lobbyUpdateError } = await db
          .from('lobbies')
          .update({
            status: 'in_progress',
            match_id: matchId,
            updated_at: new Date().toISOString()
          })
          .eq('id', lobbyId);

        if (lobbyUpdateError) {
          console.error('[MATCHMAKER] ❌ Failed to update lobby status:', lobbyUpdateError);
        } else {
          console.log('[MATCHMAKER] ✅ Updated lobby status to in_progress');
        }

        // Broadcast match_start via Supabase Realtime
        // Determine WebSocket URL based on environment
        let wsUrl = process.env.MATCHMAKER_WS_URL;
        if (!wsUrl) {
          const isProduction = process.env.NODE_ENV === 'production';
          const baseUrl = process.env.MATCHMAKER_URL || process.env.BACKEND_URL || 'http://localhost:3001';
          wsUrl = baseUrl.replace(/^http/, 'ws');
        }
        const broadcastPayload = {
          lobbyId,
          matchId,
          matchKey,
          gameType: lobby.gameType,
          players: lobby.players.map(p => ({
            id: p.id,
            playerId: p.id,
            username: p.username,
            walletAddress: p.walletAddress
          })),
          entryAmount: lobby.entryAmount,
          totalPot,
          serverSeed,
          wsUrl
        };

        console.log('[MATCHMAKER] 📡 Broadcasting match_start event via Supabase Realtime...');
        
        // Broadcast to lobby-specific channel
        const lobbyChannel = db.channel(`lobby_${lobbyId}`);
        await lobbyChannel.subscribe();
        const lobbyResult = await lobbyChannel.send({
          type: 'broadcast',
          event: 'match_start',
          payload: broadcastPayload
        });

        if (lobbyResult !== 'ok') {
          console.error('[MATCHMAKER] ❌ Failed to broadcast to lobby channel:', lobbyResult);
        } else {
          console.log('[MATCHMAKER] ✅ match_start broadcast sent to lobby channel');
        }

        // Also broadcast to global channel for find-game page listeners
        const globalChannel = db.channel('match_start_global');
        await globalChannel.subscribe();
        const globalResult = await globalChannel.send({
          type: 'broadcast',
          event: 'match_start',
          payload: broadcastPayload
        });

        if (globalResult !== 'ok') {
          console.error('[MATCHMAKER] ❌ Failed to broadcast to global channel:', globalResult);
        } else {
          console.log('[MATCHMAKER] ✅ match_start broadcast sent to global channel');
        }

        // Also broadcast via Socket.IO for compatibility
        lobby.players.forEach(p => {
          io.to(p.socketId).emit('match_start', broadcastPayload);
        });
        console.log('[MATCHMAKER] ✅ match_start also sent via Socket.IO');

      } catch (supabaseError) {
        console.error('[MATCHMAKER] ❌ Supabase error during match start:', supabaseError);
        // Continue anyway - don't block game start
      }
    }

    // Update in-memory lobby status
    lobby.status = 'in-progress';
    
    logActivity(`🎮 Match started successfully`, {
      lobbyId,
      matchId,
      gameType: lobby.gameType,
      playerCount: lobby.players.length
    });

    // Start the game via Socket.IO
    startGame(lobbyId);

    // Determine WebSocket URL based on environment
    let wsUrl = process.env.MATCHMAKER_WS_URL;
    if (!wsUrl) {
      const isProduction = process.env.NODE_ENV === 'production';
      const baseUrl = process.env.MATCHMAKER_URL || process.env.BACKEND_URL || 'http://localhost:3001';
      wsUrl = baseUrl.replace(/^http/, 'ws');
    }
    
    res.json({ 
      success: true, 
      message: 'Match started successfully',
      lobbyId,
      matchId,
      matchKey,
      wsUrl
    });

  } catch (error) {
    console.error('[MATCHMAKER] ❌ Error starting match:', error);
    res.status(500).json({ error: 'Failed to start match' });
  }
});

// WebSocket server for game sync
const wss = new WebSocketServer({ noServer: true });

// Handle HTTP upgrade to WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket connection handler
wss.on('connection', (ws: WebSocket & { matchKey?: string; playerId?: string }, req) => {
  console.log('[MATCHMAKER] WebSocket connection opened');

  ws.on('message', (msg: Buffer) => {
    try {
      const data = JSON.parse(msg.toString());
      
      if (data.type === 'init') {
        const { matchKey, playerId, username } = data;
        ws.matchKey = matchKey;
        ws.playerId = playerId;
        
        const match = matches.get(matchKey);
        if (!match) {
          console.error('[MATCHMAKER] ❌ Match not found:', matchKey);
          ws.close(1008, 'Match not found');
          return;
        }
        
        match.sockets.set(playerId, ws);
        console.log('[MATCHMAKER] ✅ Player connected to match:', { matchKey, playerId, username });
        
        // Send confirmation
        ws.send(JSON.stringify({ type: 'init_ack', matchKey, playerId }));
        
      } else if (data.type === 'input') {
        const { matchKey, playerId, action } = data;
        
        if (!matchKey || !playerId) {
          console.error('[MATCHMAKER] ❌ Missing matchKey or playerId in input');
          return;
        }
        
        // Broadcast input to all players in match
        broadcastToMatch(matchKey, {
          type: 'input',
          playerId,
          action,
          timestamp: Date.now()
        });
        
      } else if (data.type === 'dead') {
        const { matchKey, playerId } = data;
        
        const match = matches.get(matchKey);
        if (!match) return;
        
        match.playerAlive.set(playerId, false);
        console.log('[MATCHMAKER] 💀 Player died:', { matchKey, playerId });
        
        // Broadcast player_dead
        broadcastToMatch(matchKey, {
          type: 'player_dead',
          playerId
        });
        
        // Check if match should end
        const alivePlayers = Array.from(match.playerAlive.entries())
          .filter(([_, alive]) => alive)
          .map(([pid, _]) => pid);
        
        if (alivePlayers.length === 1) {
          const winnerId = alivePlayers[0];
          match.state = 'ended';
          
          broadcastToMatch(matchKey, {
            type: 'match_end',
            winnerId
          });
          
          console.log('[MATCHMAKER] 🏁 Match ended, winner:', winnerId);
          
          // Cleanup after delay
          setTimeout(() => {
            matches.delete(matchKey);
            console.log('[MATCHMAKER] 🗑️ Cleaned up match:', matchKey);
          }, 60000);
        }
      }
    } catch (error) {
      console.error('[MATCHMAKER] ❌ WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    if (ws.matchKey && ws.playerId) {
      const match = matches.get(ws.matchKey);
      if (match) {
        match.sockets.delete(ws.playerId);
        console.log('[MATCHMAKER] 🔌 Player disconnected from match:', { matchKey: ws.matchKey, playerId: ws.playerId });
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('[MATCHMAKER] ❌ WebSocket error:', error);
  });
});

// Broadcast message to all players in a match
function broadcastToMatch(matchKey: string, message: any) {
  const match = matches.get(matchKey);
  if (!match || !match.sockets) return;
  
  const messageStr = JSON.stringify(message);
  match.sockets.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('[MATCHMAKER] ❌ Failed to send to player:', playerId, error);
      }
    }
  });
}

// Bootstrap function to initialize server
async function bootstrap() {
  try {
    // Initialize escrow wallet first (non-blocking - server starts even if this fails)
    await initializeEscrowWallet().catch((error) => {
      console.warn('⚠️ Escrow wallet initialization failed, continuing:', error?.message || error);
    });

    // Auto-port fallback: try ports 3001-3011
    const basePort = parseInt(process.env.PORT || '3001', 10);
    const maxRetries = 10;
    let currentPort = basePort;
    let serverStarted = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const errorHandler = (error: any) => {
            if (error.code === 'EADDRINUSE') {
              server.removeListener('error', errorHandler);
              if (attempt < maxRetries - 1) {
                console.log(`Port ${currentPort} in use, retrying on ${currentPort + 1}…`);
                currentPort++;
                reject(error);
              } else {
                reject(new Error(`Failed to bind to any port after ${maxRetries} attempts`));
              }
            } else {
              server.removeListener('error', errorHandler);
              reject(error);
            }
          };

          server.once('error', errorHandler);
          
          server.listen(currentPort, () => {
            server.removeListener('error', errorHandler);
            logActivity(`🚀 DEGN.gg Matchmaker Server started`, {
              port: currentPort,
              environment: process.env.NODE_ENV || 'development'
            });
            
            console.log(`✅ Matchmaker running on http://localhost:${currentPort}`);
            console.log('✅ SolBird enforced as 1v1 (maxPlayers=2)');
            console.log(`🎮 Supported games: ${VALID_GAMES.join(', ')}`);
            
            serverStarted = true;
            resolve();
          });
        });

        // Successfully started
        break;
      } catch (error: any) {
        if (error.code === 'EADDRINUSE' && attempt < maxRetries - 1) {
          // Close server if it was partially opened, then continue to next port
          try {
            server.close();
          } catch (e) {
            // Ignore close errors
          }
          // Continue to next port
          continue;
        } else if (serverStarted) {
          // Server already started, break
          break;
        } else {
          // Fatal error
          console.error('❌ Error during server startup:', error?.message || error);
          process.exit(1);
        }
      }
    }

    if (!serverStarted) {
      console.error(`❌ Failed to start server after trying ports ${basePort}-${currentPort}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during server startup:', error);
    process.exit(1);
  }
}

// Start the server
bootstrap();

export { io, app, server };
