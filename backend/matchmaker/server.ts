import express, { Request, Response } from 'express';
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
// Note: "sol-bird-race" is the new Sol Bird: Race Royale game mode.
const VALID_GAMES = ["sol-bird", "sol-bird-race", "connect4", "slither", "agar", "coinflip"];

// ✅ Entry fee tiers (PvP model - players pay each other)
const ENTRY_FEE_TIERS = [0.05, 0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

// ✅ Game configurations
const GAME_CONFIG = {
  'sol-bird-race': { minPlayers: 4, maxPlayers: 8 },
  'suroi': { minPlayers: 8, maxPlayers: 16 },
  'slither': { minPlayers: 4, maxPlayers: 10 },
  'agar': { minPlayers: 4, maxPlayers: 10 },
  'coinflip': { minPlayers: 2, maxPlayers: 2 }
} as const;

// ✅ Bot system configuration
// Bot system configuration
const BOT_CONFIG = {
  enabled: true, // Master switch - set to false for real players only
  maxEntryFee: 0.5, // SOL - bots only join ≤ 0.5 SOL lobbies
  fillWaitTime: 10000, // 10 seconds - wait before adding bots (reduced for faster game starts)
  winRates: {
    small: 0.40, // 40% win rate for ≤ 8 players
    large: 0.55, // 55% win rate for > 8 players
  },
  smallLobbyThreshold: 8, // players
  replacement: true, // bots get replaced by real players
} as const;

// Bot wallet system (funded from house rake)
let botWalletBalance = 0; // Track bot wallet balance in SOL
const BOT_WALLET_MIN_BALANCE = 5; // Minimum balance to maintain (5 SOL)
const BOT_WALLET_INITIAL_FUND = 10; // Initial fund from house rake (10 SOL)

// Configure CORS for Socket.IO
// In production, allow all origins (Render/Vercel handles security)
// In development, use specific origins
const corsOrigin: string[] | boolean = process.env.NODE_ENV === 'production' 
  ? true // Allow all origins in production
  : [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://degn-gg.vercel.app",
      process.env.FRONTEND_URL,
      process.env.NEXT_PUBLIC_FRONTEND_URL
    ].filter((origin): origin is string => typeof origin === 'string');

const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: false, // Disable credentials for Render compatibility
    allowedHeaders: ["*"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true // Allow Engine.IO v3 clients
});

// Middleware - CORS for HTTP requests
app.use(cors({
  origin: corsOrigin,
  credentials: false, // Disable credentials for Render compatibility
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["*"]
}));
app.use(express.json());

// Bot names pool for random selection
const BOT_NAMES = [
  'CryptoBot', 'SolBot', 'AutoPlayer', 'BotMaster', 'AIPlayer', 'GhostPlayer',
  'BotRacer', 'AutoRacer', 'BotPro', 'AceBot', 'BotKing', 'BotChamp',
  'BotNinja', 'BotWarrior', 'BotElite', 'BotLegend', 'BotHero', 'BotStar'
];

// Generate random bot name
function generateBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + '_' + Math.random().toString(36).substr(2, 4);
}

// Bot wallet management
function fundBotWallet(amountSOL: number) {
  botWalletBalance += amountSOL;
  logActivity(`💰 Bot wallet funded`, { amount: amountSOL, newBalance: botWalletBalance });
}

function useBotWallet(amountSOL: number): boolean {
  if (botWalletBalance >= amountSOL) {
    botWalletBalance -= amountSOL;
    logActivity(`💰 Bot wallet used`, { amount: amountSOL, remainingBalance: botWalletBalance });
    return true;
  }
  logActivity(`⚠️ Bot wallet insufficient`, { required: amountSOL, current: botWalletBalance });
  return false;
}

function getBotWalletBalance(): number {
  return botWalletBalance;
}

// Initialize bot wallet from house rake (call after house rake is received)
function initializeBotWallet() {
  if (botWalletBalance < BOT_WALLET_MIN_BALANCE) {
    fundBotWallet(BOT_WALLET_INITIAL_FUND);
    logActivity(`🤖 Bot wallet initialized`, { balance: botWalletBalance });
  }
}

// Auto-replenish bot wallet from house rake (call after each match)
function replenishBotWalletIfNeeded() {
  if (botWalletBalance < BOT_WALLET_MIN_BALANCE) {
    const needed = BOT_WALLET_MIN_BALANCE - botWalletBalance;
    fundBotWallet(needed);
    logActivity(`💰 Bot wallet replenished`, { added: needed, newBalance: botWalletBalance });
  }
}

interface Player {
  id: string;
  username: string;
  socketId: string;
  walletAddress?: string;
  joinedAt: Date;
  isBot?: boolean; // Track if player is a bot
}

interface Lobby {
  id: string;
  gameType: 'sol-bird' | 'sol-bird-race' | 'connect4' | 'slither' | 'agar' | 'coinflip' | 'suroi';
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'ready' | 'in-progress' | 'cancelled';
  createdAt: Date;
  createdBy: string;
  entryTier: number; // Entry fee tier (0.1, 0.5, 1.0, etc.) - PvP model
  entryAmount?: number; // DEPRECATED: Use entryTier instead (kept for backwards compatibility)
  timeoutTimer?: NodeJS.Timeout; // Timer for 2-minute timeout check
  botFillTimer?: NodeJS.Timeout; // Timer for bot fill (30 seconds)
  // Optional game-specific settings
  settings?: {
    maxPlayers: number;
    entryFee: number;
    pot: number;
  };
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
  gameType: string;
  players: Array<{ playerId: string; socketId: string; wallet?: string; username: string; isBot?: boolean }>;
  createdAt: number;
  state: 'in-progress' | 'ended';
  lastState: any;
  sockets: Map<string, WebSocket | any>; // playerId -> WebSocket or Socket.IO socket
  playerAlive: Map<string, boolean>; // playerId -> alive status
  // Race Royale-specific state
  coins?: Map<string, number>; // playerId -> coin count
  roundEndsAt?: number; // timestamp when round should end
  // BirdMMO-specific state
  birdmmoClients?: Map<string, { playerId: string; position: { x: number; y: number; z: number }; timestamp: number }>; // socketId -> position data
  birdmmoBroadcastInterval?: NodeJS.Timeout | null; // Interval for broadcasting clients
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

// Get house wallet address from environment (defaults to your wallet)
function getHouseWalletAddress(): string {
  return process.env.HOUSE_WALLET_ADDRESS || '35PgFHXEgryH9MD3PMotVYYjayCGbSywKBN1Pmyq8GWY';
}

// Send house rake to your wallet
async function sendHouseRake(amountSOL: number): Promise<string | null> {
  if (!escrowKeypair) {
    console.error('Escrow keypair not available for house rake');
    return null;
  }

  if (amountSOL <= 0) {
    return null;
  }

  try {
    const houseWallet = getHouseWalletAddress();
    const housePubkey = new PublicKey(houseWallet);
    const lamports = solToLamports(amountSOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: escrowKeypair.publicKey,
        toPubkey: housePubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [escrowKeypair],
      { commitment: 'confirmed' }
    );

    console.log(`💰 House rake sent: ${amountSOL} SOL to ${houseWallet}, signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Failed to send house rake:', error);
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
    entryAmount: lobby.entryAmount,
    settings: lobby.settings,
    status: lobby.status,
    createdAt: lobby.createdAt
  };

  // Broadcast to all players in the lobby
  lobby.players.forEach(player => {
    io.to(player.socketId).emit('lobby-update', lobbyData);
  });

  logActivity(`Lobby update broadcasted`, { lobbyId, playerCount: lobby.players.length, status: lobby.status });
}

// Helper: Refund players and cancel lobby
async function refundAndCancelLobby(lobbyId: string, reason: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'waiting') return;

  logActivity(`💰 Refunding players and cancelling lobby`, {
    lobbyId,
    reason,
    playerCount: lobby.players.length,
    entryTier: lobby.entryTier
  });

  // Clear timeout timer if exists
  if (lobby.timeoutTimer) {
    clearTimeout(lobby.timeoutTimer);
    lobby.timeoutTimer = undefined;
  }

  // Notify all players
  lobby.players.forEach(player => {
    io.to(player.socketId).emit('lobby-cancelled', {
      lobbyId,
      reason,
      refundAmount: lobby.entryTier || lobby.entryAmount || 0
    });
  });

  // TODO: Implement actual SOL refund via Supabase RPC or direct transfer
  // For now, just log it
  console.log(`[REFUND] Would refund ${lobby.players.length} players ${lobby.entryTier || lobby.entryAmount || 0} SOL each`);

  // Remove lobby
  lobby.players.forEach(player => {
    playerLobbies.delete(player.socketId);
  });
  lobbies.delete(lobbyId);
  broadcastLobbyListUpdate();
}

// Helper: Add bots to lobby (fill exactly what's needed)
function addBotsToLobby(lobbyId: string, count: number): number {
  // Bots disabled - return 0
  if (!BOT_CONFIG.enabled) {
    return 0;
  }
  
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'waiting') return 0;

  // Check if bots are allowed for this lobby (entry fee ≤ 0.5 SOL)
  if (lobby.entryTier > BOT_CONFIG.maxEntryFee) {
    logActivity(`🤖 Bots not allowed for high-tier lobby`, {
      lobbyId,
      entryTier: lobby.entryTier,
      maxEntryFee: BOT_CONFIG.maxEntryFee
    });
    return 0;
  }

  // Check bot wallet balance
  const entryFee = lobby.entryTier || lobby.entryAmount || 0;
  const totalNeeded = entryFee * count;
  
  if (!useBotWallet(totalNeeded)) {
    logActivity(`⚠️ Cannot add bots - insufficient bot wallet balance`, {
      lobbyId,
      needed: totalNeeded,
      current: getBotWalletBalance()
    });
    return 0;
  }

  const botsAdded: Player[] = [];
  for (let i = 0; i < count; i++) {
    const bot: Player = {
      id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: generateBotName(),
      socketId: `bot_socket_${Date.now()}_${i}`,
      joinedAt: new Date(),
      isBot: true
    };
    
    lobby.players.push(bot);
    botsAdded.push(bot);
  }

  logActivity(`🤖 Added ${botsAdded.length} bots to lobby`, {
    lobbyId,
    botsAdded: botsAdded.length,
    totalPlayers: lobby.players.length,
    entryFee,
    botWalletUsed: totalNeeded
  });

  broadcastLobbyUpdate(lobbyId);
  return botsAdded.length;
}

// Helper: Replace bots with real players (when real player joins)
function replaceBotWithRealPlayer(lobbyId: string, realPlayer: Player): boolean {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'waiting') return false;

  // Find first bot in lobby
  const botIndex = lobby.players.findIndex(p => p.isBot === true);
  if (botIndex === -1) return false; // No bots to replace

  const bot = lobby.players[botIndex];
  
  // Refund bot entry fee to bot wallet
  const entryFee = lobby.entryTier || lobby.entryAmount || 0;
  fundBotWallet(entryFee);

  // Replace bot with real player
  lobby.players[botIndex] = realPlayer;
  
  logActivity(`🔄 Replaced bot with real player`, {
    lobbyId,
    botId: bot.id,
    botName: bot.username,
    realPlayerId: realPlayer.id,
    realPlayerName: realPlayer.username,
    refundedToBotWallet: entryFee
  });

  broadcastLobbyUpdate(lobbyId);
  return true;
}

// Helper: Setup bot fill timer (30 seconds wait, then fill with bots)
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
    const playersNeeded = Math.max(minPlayers - totalPlayers, 0);
    
    if (playersNeeded > 0 && totalPlayers < maxPlayers) {
      const botsToAdd = Math.min(playersNeeded, maxPlayers - totalPlayers);
      addBotsToLobby(lobbyId, botsToAdd);
      
      // Check if lobby is ready after adding bots
      checkLobbyReady(lobbyId);
    }
  }, BOT_CONFIG.fillWaitTime);

  logActivity(`⏱️ Bot fill timer set (30 seconds)`, {
    lobbyId,
    entryTier: lobby.entryTier
  });
}

// Helper: Check if lobby should timeout (2 minutes without minimum players)
function setupLobbyTimeout(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby || lobby.status !== 'waiting') return;

  const config = GAME_CONFIG[lobby.gameType as keyof typeof GAME_CONFIG];
  const minPlayers = config?.minPlayers || 2;
  const timeoutMs = 30 * 1000; // 30 seconds

  // Clear existing timer if any
  if (lobby.timeoutTimer) {
    clearTimeout(lobby.timeoutTimer);
  }

  lobby.timeoutTimer = setTimeout(() => {
    const currentLobby = lobbies.get(lobbyId);
    if (!currentLobby || currentLobby.status !== 'waiting') return;

    // Count real players (non-bots)
    const realPlayerCount = currentLobby.players.filter(p => !p.isBot).length;
    
    // Check if we have minimum real players
    if (realPlayerCount < minPlayers) {
      // For high-tier lobbies (> 0.5 SOL), refund and cancel (no bots)
      if (currentLobby.entryTier > BOT_CONFIG.maxEntryFee) {
        refundAndCancelLobby(
          lobbyId,
          `Not enough players (${realPlayerCount}/${minPlayers}). Try again later.`
        );
      } else {
        // For low-tier lobbies, bots should have filled by now
        // If still not enough, refund and cancel
        refundAndCancelLobby(
          lobbyId,
          `Not enough players (${realPlayerCount}/${minPlayers}). Try queueing up in a bit.`
        );
      }
    }
  }, timeoutMs);

  logActivity(`⏱️ Lobby timeout set (30 seconds)`, {
    lobbyId,
    minPlayers,
    currentPlayers: lobby.players.length,
    realPlayers: lobby.players.filter(p => !p.isBot).length,
    entryTier: lobby.entryTier
  });
}

function checkLobbyReady(lobbyId: string) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return;

  const config = GAME_CONFIG[lobby.gameType as keyof typeof GAME_CONFIG];
  const minPlayers = config?.minPlayers || 2;
  const maxPlayers = config?.maxPlayers || lobby.maxPlayers;

  // Count real players (non-bots)
  const realPlayerCount = lobby.players.filter(p => !p.isBot).length;
  const botCount = lobby.players.filter(p => p.isBot).length;
  const totalPlayers = lobby.players.length;

  // Check minimum players requirement (including bots)
  if (totalPlayers < minPlayers) {
    // Setup timeout if not already set
    if (!lobby.timeoutTimer) {
      setupLobbyTimeout(lobbyId);
    }
    
    // Setup bot fill timer for low-tier lobbies (≤ 0.5 SOL) - only if bots enabled
    if (BOT_CONFIG.enabled && lobby.entryTier <= BOT_CONFIG.maxEntryFee && !lobby.botFillTimer) {
      setupBotFillTimer(lobbyId);
    }
    
    return; // Not enough players yet
  }

  // Clear timeout if we have enough players
  if (lobby.timeoutTimer) {
    clearTimeout(lobby.timeoutTimer);
    lobby.timeoutTimer = undefined;
  }

  // Clear bot fill timer if we have enough players
  if (lobby.botFillTimer) {
    clearTimeout(lobby.botFillTimer);
    lobby.botFillTimer = undefined;
  }

  // Check if we have enough players to start
  if (totalPlayers >= minPlayers && lobby.status === 'waiting') {
    lobby.status = 'ready';
    
    logActivity(`🚀 Lobby is ready to start!`, {
      lobbyId,
      gameType: lobby.gameType,
      totalPlayers,
      realPlayers: realPlayerCount,
      bots: botCount,
      minPlayers,
      maxPlayers,
    });

    // Emit lobby-ready to all players in the lobby (real players only, bots don't have sockets)
    lobby.players.forEach(player => {
      if (!player.isBot) {
        io.to(player.socketId).emit('lobby-ready', {
          lobbyId,
          gameType: lobby.gameType,
          players: lobby.players,
          minPlayers,
          maxPlayers
        });
      }
    });

    broadcastLobbyUpdate(lobbyId);
    
    // Auto-start game after 30 seconds OR immediately if lobby is full
    if (totalPlayers >= maxPlayers) {
      // Lobby is full, start immediately
      setTimeout(() => {
        startGame(lobbyId);
      }, 2000); // 2 second delay for UI updates
    } else {
      // Not full yet, wait 30 seconds then start (bots will fill if needed)
      setTimeout(() => {
        startGame(lobbyId);
      }, 30000);
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
    entryAmount: lobby.entryAmount,
    settings: lobby.settings
  });

  // Generate match ID and matchKey BEFORE broadcasting
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const matchKey = `${lobbyId}_${Date.now()}`;
  console.log('[MATCHMAKER] Generated matchId:', matchId, 'matchKey:', matchKey);

  // Create match object in memory BEFORE sending game:start event
  // This ensures the match exists when ws-glue.js connects
  const match: Match = {
    matchKey,
    lobbyId,
    gameType: lobby.gameType,
    players: lobby.players.map(p => ({
      playerId: p.id,
      socketId: p.socketId,
      wallet: p.walletAddress,
      username: p.username,
      isBot: !!p.isBot
    })),
    createdAt: Date.now(),
    state: 'in-progress',
    lastState: null,
    sockets: new Map(),
    playerAlive: new Map(lobby.players.map(p => [p.id, true])),
    coins: lobby.gameType === 'sol-bird-race' ? new Map() : undefined,
    roundEndsAt: lobby.gameType === 'sol-bird-race'
      ? Date.now() + 180000 // 3 minutes
      : undefined
  };
  matches.set(matchKey, match);
  console.log('[MATCHMAKER] ✅ Match created:', matchKey, match.players.map(p => p.playerId));

  // Build players array with isBot flags
  const allPlayers = lobby.players.map(p => ({
    id: p.id,
    playerId: p.id,
    socketId: p.socketId,
    username: p.username || (p.isBot ? 'Bot' : 'Player'),
    wallet: p.walletAddress,
    isBot: !!p.isBot
  }));

  // Broadcast game start to all players via Socket.IO (include matchKey and players array!)
  lobby.players.forEach(player => {
    if (!player.isBot) {
      io.to(player.socketId).emit('game:start', {
        lobbyId,
        matchKey, // Include matchKey so frontend can use it
        gameType: lobby.gameType,
        players: allPlayers, // Include ALL players with isBot flags
        entryAmount: lobby.entryAmount,
        maxPlayers: lobby.maxPlayers,
        startTime: Date.now()
      });
      
      // Also send GAME_START (for BirdMMO clients)
      io.to(player.socketId).emit('GAME_START', {
        lobbyId,
        playerId: player.id,
        players: allPlayers, // Include ALL players with isBot flags
        maxPlayers: lobby.maxPlayers,
        entryFee: lobby.entryAmount || 0,
        pot: (lobby.entryAmount || 0) * lobby.players.length,
        roundTimer: 180000
      });
    }
  });

  // Also broadcast to the lobby room
  io.to(lobbyId).emit('game:start', {
    lobbyId,
    matchKey, // Include matchKey so frontend can use it
    gameType: lobby.gameType,
    players: allPlayers, // Include ALL players with isBot flags
    entryAmount: lobby.entryAmount,
    maxPlayers: lobby.maxPlayers,
    startTime: Date.now()
  });
  
  console.log('[MATCHMAKER] 📤 Broadcasted game:start via Socket.IO:', {
    lobbyId,
    matchKey,
    playersCount: allPlayers.length,
    players: allPlayers.map(p => ({ id: p.id, username: p.username, isBot: p.isBot }))
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
      availableGames: ['sol-bird-race', 'connect4', 'slither', 'agar', 'coinflip']
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

    // Count real players (non-bots)
    const realPlayerCount = lobby.players.filter(p => !p.isBot).length;
    const botCount = lobby.players.filter(p => p.isBot).length;
    const totalPlayers = lobby.players.length;

    // Enforce SolBird 1v1 rules
    if (lobby.gameType === 'sol-bird') {
      if (realPlayerCount >= 2) {
        socket.emit('error', { message: 'Lobby full (sol-bird is 1v1)', code: 'LOBBY_FULL_1V1' });
        return;
      }
    } else {
      // Check if lobby is full (real players + bots)
      if (totalPlayers >= lobby.maxPlayers) {
        // Try to replace a bot with this real player
        if (botCount > 0 && replaceBotWithRealPlayer(data.lobbyId, player)) {
          // Bot replaced successfully, continue
          playerLobbies.set(socket.id, data.lobbyId);
          socket.join(data.lobbyId);
          
          logActivity(`🚪 Player joined lobby (replaced bot)`, {
            playerId: player.id,
            username: player.username,
            lobbyId: data.lobbyId,
            gameType: lobby.gameType,
            playersInLobby: lobby.players.length,
            maxPlayers: lobby.maxPlayers
          });

          socket.emit('lobby-joined', {
            lobbyId: data.lobbyId,
            gameType: lobby.gameType,
            players: lobby.players,
            maxPlayers: lobby.maxPlayers,
            status: lobby.status
          });

          broadcastLobbyUpdate(data.lobbyId);
          broadcastLobbyListUpdate();
          checkLobbyReady(data.lobbyId);
          return;
        } else {
          socket.emit('error', { message: 'Lobby is full.' });
          return;
        }
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

    // Try to replace a bot first (if bots are present)
    if (botCount > 0 && BOT_CONFIG.replacement) {
      if (replaceBotWithRealPlayer(data.lobbyId, player)) {
        // Bot replaced successfully
        playerLobbies.set(socket.id, data.lobbyId);
        socket.join(data.lobbyId);
      } else {
        // No bots to replace, add normally
        lobby.players.push(player);
        playerLobbies.set(socket.id, data.lobbyId);
        socket.join(data.lobbyId);
      }
    } else {
      // No bots to replace, add normally
      lobby.players.push(player);
      playerLobbies.set(socket.id, data.lobbyId);
      socket.join(data.lobbyId);
    }

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

    // Check for game over (only 1 player alive) – for classic Sol-Bird only
    if (aliveCount === 1 && lobby.status === 'in-progress' && lobby.gameType === 'sol-bird') {
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

  // ===== BIRDMMO SOCKET.IO HANDLERS =====
  // Handle BirdMMO connection (with matchKey in query)
  const matchKey = (socket.handshake.query?.matchKey as string) || null;
  const playerId = (socket.handshake.query?.playerId as string) || null;
  
  if (matchKey && playerId) {
    // This is a BirdMMO game client connecting
    console.log('[MATCHMAKER] 🎮 BirdMMO client connected:', { matchKey, playerId, socketId: socket.id });
    
    const match = matches.get(matchKey);
    if (match) {
      // Store socket in match
      match.sockets.set(playerId, socket as any);
      
      // Send socket ID (BirdMMO expects this)
      socket.emit('id', socket.id);
      
      // Send GAME_START with all players (including bots)
      const lobby = lobbies.get(match.lobbyId);
      if (lobby && match.gameType === 'sol-bird-race') {
        const allPlayers = lobby.players.map(p => ({
          id: p.id,
          playerId: p.id,
          socketId: p.socketId,
          username: p.username || (p.isBot ? 'Bot' : 'Player'),
          wallet: p.walletAddress,
          isBot: !!p.isBot
        }));
        
        socket.emit('GAME_START', {
          lobbyId: match.lobbyId,
          playerId,
          players: allPlayers,
          maxPlayers: lobby.maxPlayers,
          entryFee: lobby.entryAmount || 0,
          pot: (lobby.entryAmount || 0) * lobby.players.length,
          roundTimer: 180000
        });
        
        console.log('[MATCHMAKER] 📤 Sent GAME_START via Socket.IO:', {
          matchKey,
          playerId,
          playersCount: allPlayers.length,
          players: allPlayers.map(p => ({ id: p.id, username: p.username, isBot: p.isBot }))
        });
      }
      
      // Initialize BirdMMO position tracking for this match
      if (!match.birdmmoClients) {
        match.birdmmoClients = new Map();
      }
      match.birdmmoClients.set(socket.id, {
        playerId,
        position: { x: -260, y: 1, z: 0 },
        timestamp: Date.now()
      });
      
      // Broadcast clients every 50ms (BirdMMO format)
      if (!match.birdmmoBroadcastInterval) {
        match.birdmmoBroadcastInterval = setInterval(() => {
          const currentMatch = matches.get(matchKey);
          if (!currentMatch || !currentMatch.birdmmoClients) return;
          
          // Build clients object in BirdMMO format: { socketId: { t: timestamp, p: position } }
          const clients: Record<string, { t: number; p: { x: number; y: number; z: number } }> = {};
          currentMatch.birdmmoClients.forEach((data, socketId) => {
            clients[socketId] = {
              t: data.timestamp,
              p: data.position
            };
          });
          
          // Broadcast to all sockets in this match
          currentMatch.sockets.forEach((ws) => {
            if (ws && typeof ws.emit === 'function') {
              (ws as any).emit('clients', clients);
            }
          });
        }, 50);
      }
    }
    
    // Handle BirdMMO position updates
    socket.on('update', (message: { t: number; p: { x: number; y: number; z: number } }) => {
      if (!matchKey || !match) return;
      
      if (match.birdmmoClients) {
        match.birdmmoClients.set(socket.id, {
          playerId: playerId || socket.id,
          position: message.p,
          timestamp: message.t || Date.now()
        });
      }
    });
    
    // Handle BirdMMO player death
    // Handle MATCH_RESULT from BirdMMO (last-man-standing winner)
    socket.on('MATCH_RESULT', async (data: { winner: string; rankings: Array<{ playerId: string; position: number }>; timestamp?: number }) => {
      if (!matchKey || !match) return;
      
      const { winner, rankings } = data;
      const lobby = lobbies.get(match.lobbyId);
      
      if (!lobby) {
        console.error('[MATCHMAKER] Lobby not found for MATCH_RESULT:', match.lobbyId);
        return;
      }

      console.log('[MATCHMAKER] 🏆 MATCH_RESULT received (last-man-standing):', { matchKey, winner, rankings });

      // Last-man-standing: Winner takes 90%, house takes 10%
      const entryAmount = lobby.entryTier || lobby.entryAmount || 0;
      const totalPot = entryAmount * lobby.players.length;
      const houseRake = totalPot * 0.10; // 10% rake
      const winnerPayout = totalPot - houseRake; // Winner gets 90%

      logActivity(`💰 Finalizing last-man-standing match payout`, {
        matchKey,
        lobbyId: match.lobbyId,
        totalPot,
        houseRake,
        winnerPayout,
        winner,
        entryAmount,
        playerCount: lobby.players.length
      });

      // Find winner player
      const winnerPlayer = lobby.players.find(p => p.id === winner);
      
      if (!winnerPlayer) {
        console.error(`[MATCHMAKER] Winner player not found: ${winner}`);
        return;
      }

      // Payout winner (90% of pot)
      if (winnerPlayer.walletAddress && winnerPayout > 0 && !winnerPlayer.isBot) {
        try {
          // TODO: Implement actual Solana payout
          console.log(`[PAYOUT] Winner ${winnerPlayer.username} (${winnerPlayer.walletAddress}) receives ${winnerPayout} SOL`);
        } catch (error) {
          console.error(`[PAYOUT] Error paying winner:`, error);
        }
      } else if (winnerPlayer.isBot) {
        // Bot wins - send to bot wallet (house keeps it)
        fundBotWallet(winnerPayout);
        logActivity(`🤖 Bot won - payout to bot wallet`, {
          botId: winner,
          amount: winnerPayout
        });
      }

      // Send game over to all players
      lobby.players.forEach(player => {
        if (!player.isBot) {
          io.to(player.socketId).emit('gameOver', {
            matchKey,
            lobbyId: match.lobbyId,
            winner: {
              playerId: winner,
              username: winnerPlayer.username,
              payout: winnerPayout
            },
            rankings,
            pot: totalPot,
            houseRake,
            timestamp: Date.now()
          });
        }
      });

      // Clean up
      match.state = 'ended';
      lobby.status = 'cancelled';
      
      logActivity(`✅ Last-man-standing match finalized`, {
        matchKey,
        winner,
        payout: winnerPayout
      });
    });

    socket.on('PLAYER_DEATH', (data: { deathReason: string; timestamp?: number }) => {
      if (!matchKey || !match) return;
      
      console.log('[MATCHMAKER] 💀 BirdMMO player death:', { matchKey, playerId, reason: data.deathReason });
      
      // Update match state
      match.playerAlive.set(playerId, false);
      
      // Broadcast to other players
      match.sockets.forEach((ws, pid) => {
        if (pid !== playerId && ws && typeof ws.emit === 'function') {
          (ws as any).emit('PLAYER_DEATH', {
            playerId,
            deathReason: data.deathReason,
            timestamp: data.timestamp || Date.now()
          });
        }
      });
      
      // Check if match should end (only 1 player alive)
      const aliveCount = Array.from(match.playerAlive.values()).filter(alive => alive).length;
      if (aliveCount === 1) {
        const winnerId = Array.from(match.playerAlive.entries()).find(([_, alive]) => alive)?.[0];
        if (winnerId) {
          match.state = 'ended';
          
          // Broadcast match end
          match.sockets.forEach((ws) => {
            if (ws && typeof ws.emit === 'function') {
              (ws as any).emit('GAME_END', {
                winnerId,
                matchKey
              });
            }
          });
          
          // Finalize match
          finalizeRaceMatch(matchKey);
        }
      }
    });
    
    // Handle disconnect - remove from BirdMMO clients
    socket.on('disconnect', () => {
      if (matchKey && match) {
        if (match.birdmmoClients) {
          match.birdmmoClients.delete(socket.id);
        }
        match.sockets.delete(playerId);
        
        // Broadcast removal to other players
        match.sockets.forEach((ws) => {
          if (ws && typeof ws.emit === 'function') {
            (ws as any).emit('removeClient', socket.id);
          }
        });
        
        // Clean up interval if no more clients
        if (match.birdmmoClients && match.birdmmoClients.size === 0 && match.birdmmoBroadcastInterval) {
          clearInterval(match.birdmmoBroadcastInterval);
          match.birdmmoBroadcastInterval = null;
        }
      }
    });
  }

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
app.get('/health', (req: Request, res: Response) => {
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

app.get('/lobbies', (req: Request, res: Response) => {
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

// Helper: Find or create lobby at specific tier (auto-matchmaking)
function findOrCreateLobby(gameType: string, entryTier: number): Lobby {
  // Validate entry tier
  if (!ENTRY_FEE_TIERS.includes(entryTier)) {
    throw new Error(`Invalid entry tier. Must be one of: ${ENTRY_FEE_TIERS.join(', ')}`);
  }

  // Get game config
  const config = GAME_CONFIG[gameType as keyof typeof GAME_CONFIG];
  if (!config) {
    throw new Error(`Invalid game type: ${gameType}`);
  }

  // Find existing lobby at tier with available slots
  // Prefer lobbies that already have players (filling up)
  const availableLobbies: Array<{ lobby: Lobby; priority: number }> = [];
  
  for (const [lobbyId, lobby] of lobbies.entries()) {
    if (
      lobby.gameType === gameType &&
      lobby.entryTier === entryTier &&
      lobby.status === 'waiting' &&
      lobby.players.length < lobby.maxPlayers
    ) {
      // Priority: lobbies with more players get higher priority (fill existing lobbies first)
      const priority = lobby.players.length;
      availableLobbies.push({ lobby, priority });
    }
  }
  
  // Sort by priority (most players first) and return the best match
  if (availableLobbies.length > 0) {
    availableLobbies.sort((a, b) => b.priority - a.priority);
    const bestLobby = availableLobbies[0].lobby;
    logActivity(`🔍 Found existing lobby at tier ${entryTier}`, { 
      lobbyId: bestLobby.id, 
      currentPlayers: bestLobby.players.length, 
      maxPlayers: bestLobby.maxPlayers 
    });
    return bestLobby;
  }

  // Create new lobby at tier
  const lobbyId = generateLobbyId();
  const lobby: Lobby = {
    id: lobbyId,
    gameType: gameType as any,
    players: [],
    maxPlayers: config.maxPlayers,
    status: 'waiting',
    createdAt: new Date(),
    createdBy: 'AUTO_MATCHMAKING',
    entryTier: entryTier,
    entryAmount: entryTier, // For backwards compatibility
    settings: {
      maxPlayers: config.maxPlayers,
      entryFee: entryTier,
      pot: entryTier * config.maxPlayers
    }
  };

  lobbies.set(lobbyId, lobby);
  logActivity(`🏠 Created new lobby at tier ${entryTier}`, {
    lobbyId,
    gameType,
    minPlayers: config.minPlayers,
    maxPlayers: config.maxPlayers,
    entryTier
  });

  // Setup timeout for minimum players
  setupLobbyTimeout(lobbyId);

  broadcastLobbyListUpdate();
  return lobby;
}

// NEW: Auto-matchmaking endpoint (tier-based)
app.post('/find-or-join-lobby', (req: Request, res: Response) => {
  const { gameType, entryTier } = req.body;

  if (!gameType || typeof entryTier !== 'number') {
    return res.status(400).json({
      error: 'gameType and entryTier are required'
    });
  }

  if (!ENTRY_FEE_TIERS.includes(entryTier)) {
    return res.status(400).json({
      error: `Invalid entry tier. Must be one of: ${ENTRY_FEE_TIERS.join(', ')}`,
      validTiers: ENTRY_FEE_TIERS
    });
  }

  try {
    const lobby = findOrCreateLobby(gameType, entryTier);
    
    res.json({
      success: true,
      lobby: {
        id: lobby.id,
        gameType: lobby.gameType,
        entryTier: lobby.entryTier,
        maxPlayers: lobby.maxPlayers,
        currentPlayers: lobby.players.length,
        status: lobby.status,
        pot: lobby.entryTier * lobby.maxPlayers
      }
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to find or create lobby'
    });
  }
});

app.post('/create-lobby', (req: Request, res: Response) => {
    const { gameType, maxPlayers, entryAmount } = req.body;
  
    // ✅ Default allowed games (you can add more)
    const VALID_GAMES = ['sol-bird', 'sol-bird-race', 'connect4', 'slither', 'agar', 'coinflip', 'flappybird'];
  
    // ✅ If someone sends "flappybird", automatically map it to internal ID
    const normalizedGameType =
      gameType === 'flappybird' ? 'sol-bird-race' : gameType;
  
    // ✅ Validate input
    if (!normalizedGameType || !VALID_GAMES.includes(normalizedGameType)) {
      return res.status(400).json({
        error: `Invalid gameType. Must be one of: ${VALID_GAMES.join(', ')}`
      });
    }

    // ✅ Enforce SolBird rules
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
    } else if (normalizedGameType === 'sol-bird-race') {
      // Sol Bird: Race Royale — allow 2–8 players
      const requested = typeof maxPlayers === 'number' ? maxPlayers : 2;
      if (requested < 2 || requested > 8) {
        return res.status(400).json({
          error: 'Sol Bird: Race Royale must have between 2 and 8 players.',
          gameType: 'sol-bird-race',
          minPlayers: 2,
          maxPlayersAllowed: 8
        });
      }
      finalMaxPlayers = requested;
    } else {
      finalMaxPlayers = maxPlayers && maxPlayers >= 2 && maxPlayers <= 50 ? maxPlayers : 2;
    }
  
    const finalEntryAmount = entryAmount && entryAmount >= 0 ? entryAmount : undefined;
    
    // Calculate entryTier from entryAmount (round to nearest tier)
    const entryTier = finalEntryAmount 
      ? ENTRY_FEE_TIERS.find(tier => tier >= finalEntryAmount) || ENTRY_FEE_TIERS[ENTRY_FEE_TIERS.length - 1]
      : ENTRY_FEE_TIERS[0]; // Default to lowest tier if no amount specified
  
    const lobbyId = generateLobbyId();
    const lobby: Lobby = {
      id: lobbyId,
      gameType: normalizedGameType as any,
      players: [],
      maxPlayers: finalMaxPlayers,
      status: 'waiting',
      createdAt: new Date(),
      createdBy: 'API',
      entryTier: entryTier,
      entryAmount: finalEntryAmount,
      settings: normalizedGameType === 'sol-bird-race'
        ? {
            maxPlayers: finalMaxPlayers,
            entryFee: finalEntryAmount || 0,
            pot: (finalEntryAmount || 0) * finalMaxPlayers
          }
        : undefined
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
  

app.get('/stats', (req: Request, res: Response) => {
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
app.post('/api/pay-entry', async (req: Request, res: Response) => {
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

app.post('/api/verify-entry', async (req: Request, res: Response) => {
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
app.post('/start-match', async (req: Request, res: Response) => {
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

    // Use startGame() function to create match and send game:start event
    // This ensures match is created before game:start event is sent
    startGame(lobbyId);

    // Get the matchKey from the match that was just created
    // Find the match by lobbyId (matchKey format is ${lobbyId}_${timestamp})
    let matchKey: string | undefined;
    let matchId: string | undefined;
    for (const [key, match] of matches.entries()) {
      if (match.lobbyId === lobbyId && match.state === 'in-progress') {
        matchKey = key;
        // Extract matchId from matchKey or generate one
        matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        break;
      }
    }

    if (!matchKey) {
      console.error('[MATCHMAKER] ❌ Could not find matchKey for lobby:', lobbyId);
      return res.status(500).json({ error: 'Failed to create match' });
    }

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
            id: matchId!,
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

// Helper: Calculate Top 3 payouts (75% / 10% / 5% to players, 10% house rake)
// Total: 75% + 10% + 5% + 10% = 100%
function calculateTop3Payouts(pot: number) {
  const playerPot = pot * 0.90; // 90% to players
  const houseRake = pot * 0.10; // 10% house rake
  
  return {
    first: playerPot * (75/90),   // 75% of total pot
    second: playerPot * (10/90),   // 10% of total pot
    third: playerPot * (5/90),    // 5% of total pot
    houseRake: houseRake,         // 10% house rake
    // Rest get 0%
  };
}

// Helper: finalize Sol Bird: Race Royale match
// NEW: Game ends when all players finish (first to finish = winner)
// NEW: Top 3 payouts (75% / 10% / 5%)
async function finalizeRaceMatch(matchKey: string) {
  const match = matches.get(matchKey);
  if (!match || match.state === 'ended' || match.gameType !== 'sol-bird-race') return;

  const lobby = lobbies.get(match.lobbyId);
  const coinsMap = match.coins || new Map<string, number>();
  
  // Track finish order (who reached end first)
  // For now, use coins as proxy (will be replaced with actual finish order from Godot)
  const finishOrder: Array<{ playerId: string; coins: number; finishTime?: number; isBot?: boolean }> = [];
  coinsMap.forEach((coins, playerId) => {
    // Check if player is a bot
    const player = match.players.find(p => p.playerId === playerId);
    const isBot = lobby?.players.find(p => p.id === playerId)?.isBot || false;
    finishOrder.push({ playerId, coins, isBot });
  });
  
  // Sort by coins (descending) - highest = first to finish
  finishOrder.sort((a, b) => b.coins - a.coins);

  // Apply bot win rate logic
  const totalPlayers = match.players.length;
  const isSmallLobby = totalPlayers <= BOT_CONFIG.smallLobbyThreshold;
  const botWinRate = isSmallLobby ? BOT_CONFIG.winRates.small : BOT_CONFIG.winRates.large;
  
  // Check if any bots are in top 3
  const top3Bots = finishOrder.slice(0, 3).filter(p => p.isBot);
  
  // Apply bot win rate: if random roll < botWinRate, let a bot win (if bots are in top 3)
  if (top3Bots.length > 0) {
    const randomRoll = Math.random();
    if (randomRoll < botWinRate) {
      // Bot wins - swap positions to put a bot in 1st place
      const botToWin = top3Bots[0];
      const currentFirst = finishOrder[0];
      
      // Swap bot to first place
      const botIndex = finishOrder.findIndex(p => p.playerId === botToWin.playerId);
      if (botIndex > 0) {
        [finishOrder[0], finishOrder[botIndex]] = [finishOrder[botIndex], finishOrder[0]];
        logActivity(`🤖 Bot win applied (${(botWinRate * 100).toFixed(0)}% rate)`, {
          matchKey,
          botId: botToWin.playerId,
          lobbySize: totalPlayers,
          winRate: botWinRate
        });
      }
    }
  }

  // Get Top 3
  const firstPlace = finishOrder[0];
  const secondPlace = finishOrder[1];
  const thirdPlace = finishOrder[2];

  const entryTier = lobby?.entryTier || lobby?.entryAmount || 0;
  const pot = entryTier * match.players.length;

  match.state = 'ended';

  const payouts = calculateTop3Payouts(pot);

  // Broadcast GAME_END with Top 3 rankings
  broadcastToMatch(matchKey, {
    type: 'GAME_END',
    rankings: [
      { playerId: firstPlace?.playerId, position: 1, payout: payouts.first },
      secondPlace ? { playerId: secondPlace.playerId, position: 2, payout: payouts.second } : null,
      thirdPlace ? { playerId: thirdPlace.playerId, position: 3, payout: payouts.third } : null,
    ].filter(Boolean),
    pot,
    houseRake: payouts.houseRake, // 10% house rake
  });

  logActivity('🏁 Race Royale match ended', {
    matchKey,
    lobbyId: match.lobbyId,
    gameType: match.gameType,
    firstPlace: firstPlace?.playerId,
    secondPlace: secondPlace?.playerId,
    thirdPlace: thirdPlace?.playerId,
    pot,
    payouts,
  });

  // Send payouts directly via Solana (immediate transfers)
  if (lobby && pot > 0 && escrowKeypair) {
    const payoutResults: Array<{ player: string; amount: number; signature: string | null }> = [];

    // Send to 1st place (or bot wallet if bot wins)
    if (firstPlace?.playerId) {
      const firstPlayer = match.players.find(p => p.playerId === firstPlace.playerId);
      const isBot = firstPlace.isBot || lobby?.players.find(p => p.id === firstPlace.playerId)?.isBot || false;
      
      if (isBot && payouts.first > 0) {
        // Bot wins - send to bot wallet (house keeps it)
        fundBotWallet(payouts.first);
        payoutResults.push({ player: '1st (BOT)', amount: payouts.first, signature: 'BOT_WALLET' });
        logActivity(`🤖 Bot won 1st place - payout to bot wallet`, {
          botId: firstPlace.playerId,
          amount: payouts.first
        });
      } else if (firstPlayer?.wallet && payouts.first > 0) {
        // Real player wins
        const sig = await sendPayout(firstPlayer.wallet, payouts.first);
        payoutResults.push({ player: '1st', amount: payouts.first, signature: sig });
      }
    }

    // Send to 2nd place (or bot wallet if bot wins)
    if (secondPlace?.playerId) {
      const secondPlayer = match.players.find(p => p.playerId === secondPlace.playerId);
      const isBot = secondPlace.isBot || lobby?.players.find(p => p.id === secondPlace.playerId)?.isBot || false;
      
      if (isBot && payouts.second > 0) {
        // Bot wins - send to bot wallet (house keeps it)
        fundBotWallet(payouts.second);
        payoutResults.push({ player: '2nd (BOT)', amount: payouts.second, signature: 'BOT_WALLET' });
        logActivity(`🤖 Bot won 2nd place - payout to bot wallet`, {
          botId: secondPlace.playerId,
          amount: payouts.second
        });
      } else if (secondPlayer?.wallet && payouts.second > 0) {
        // Real player wins
        const sig = await sendPayout(secondPlayer.wallet, payouts.second);
        payoutResults.push({ player: '2nd', amount: payouts.second, signature: sig });
      }
    }

    // Send to 3rd place (or bot wallet if bot wins)
    if (thirdPlace?.playerId) {
      const thirdPlayer = match.players.find(p => p.playerId === thirdPlace.playerId);
      const isBot = thirdPlace.isBot || lobby?.players.find(p => p.id === thirdPlace.playerId)?.isBot || false;
      
      if (isBot && payouts.third > 0) {
        // Bot wins - send to bot wallet (house keeps it)
        fundBotWallet(payouts.third);
        payoutResults.push({ player: '3rd (BOT)', amount: payouts.third, signature: 'BOT_WALLET' });
        logActivity(`🤖 Bot won 3rd place - payout to bot wallet`, {
          botId: thirdPlace.playerId,
          amount: payouts.third
        });
      } else if (thirdPlayer?.wallet && payouts.third > 0) {
        // Real player wins
        const sig = await sendPayout(thirdPlayer.wallet, payouts.third);
        payoutResults.push({ player: '3rd', amount: payouts.third, signature: sig });
      }
    }

    // Send house rake to your wallet (IMMEDIATE - every match)
    if (payouts.houseRake > 0) {
      const houseSig = await sendHouseRake(payouts.houseRake);
      payoutResults.push({ player: 'HOUSE', amount: payouts.houseRake, signature: houseSig });
      console.log(`💰 House rake (10%) sent immediately: ${payouts.houseRake} SOL to ${getHouseWalletAddress()}`);
      
      // Replenish bot wallet from house rake if needed
      replenishBotWalletIfNeeded();
    }

    logActivity('💰 All payouts sent', {
      lobbyId: lobby.id,
      pot,
      payouts: payoutResults,
    });

    // Also log to Supabase if available (for record keeping)
    const db = getSupabaseClient();
    if (db) {
      try {
        await db.rpc('log_payout', {
          lobby_id: lobby.id,
          first_place_wallet: match.players.find(p => p.playerId === firstPlace?.playerId)?.wallet,
          first_place_payout: payouts.first,
          second_place_wallet: secondPlace ? match.players.find(p => p.playerId === secondPlace.playerId)?.wallet : null,
          second_place_payout: secondPlace ? payouts.second : 0,
          third_place_wallet: thirdPlace ? match.players.find(p => p.playerId === thirdPlace.playerId)?.wallet : null,
          third_place_payout: thirdPlace ? payouts.third : 0,
          house_rake: payouts.houseRake,
          pot_amount: pot,
        } as any);
      } catch (rpcError) {
        // Non-critical - just logging
        console.warn('[MATCHMAKER] Could not log payout to Supabase:', rpcError);
      }
    }
  }

  // Cleanup match after delay
  setTimeout(() => {
    matches.delete(matchKey);
    console.log('[MATCHMAKER] 🗑️ Cleaned up race match:', matchKey);
  }, 60000);
}

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

        // For Sol Bird: Race Royale, send GAME_START payload with lobby settings
        if (match.gameType === 'sol-bird-race') {
          const lobby = lobbies.get(match.lobbyId);
          const settings = lobby?.settings;
          const roundTimer = 180000; // 3 minutes

          const lobbyPlayers = lobby?.players ?? [];

          // Keep match players in sync with latest lobby state (bots + real players)
          if (!match.players || match.players.length !== lobbyPlayers.length) {
            match.players = lobbyPlayers.map(p => ({
              playerId: p.id,
              socketId: p.socketId || '',
              wallet: p.walletAddress,
              username: p.username || (p.isBot ? 'Bot' : 'Player'),
              isBot: !!p.isBot
            }));
          }

          // Include all players (including bots) in GAME_START
          // Use lobbyPlayers (which are Player[]) and normalize to the format needed
          const allPlayers = lobbyPlayers.map(p => ({
            id: p.id,
            playerId: p.id,
            socketId: p.socketId,
            username: p.username || (p.isBot ? 'Bot' : 'Player'),
            wallet: p.walletAddress,
            isBot: !!p.isBot
          }));

          const gameStartPayload = {
            type: 'GAME_START',
            lobbyId: match.lobbyId,
            playerId,
            players: allPlayers, // Include all players including bots
            maxPlayers: settings?.maxPlayers || lobby?.maxPlayers,
            entryFee: settings?.entryFee ?? lobby?.entryAmount ?? 0,
            pot: settings?.pot ?? (lobby?.entryAmount || 0) * (lobby?.maxPlayers || match.players.length),
            roundTimer,
          };
          
          console.log('[MATCHMAKER] 📤 Sending GAME_START via WebSocket:', {
            matchKey,
            playerId,
            playersCount: allPlayers.length,
            players: allPlayers.map(p => ({ id: p.id, username: p.username, isBot: p.isBot }))
          });
          
          ws.send(JSON.stringify(gameStartPayload));

          // Ensure timer is scheduled once
          if (match.roundEndsAt && match.roundEndsAt > Date.now()) {
            const delay = match.roundEndsAt - Date.now();
            setTimeout(() => {
              finalizeRaceMatch(matchKey);
            }, delay);
          }
        }
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

        // In Race Royale, death is a respawn event – do not eliminate players
        if (match.gameType === 'sol-bird-race') {
          console.log('[MATCHMAKER] 💀 Player death in race (ignored for elimination):', {
            matchKey,
            playerId,
          });
          return;
        }
        
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
      } else if (data.type === 'COIN_UPDATE') {
        const { matchKey, playerId, coins } = data;

        const match = matches.get(matchKey);
        if (!match || match.gameType !== 'sol-bird-race') return;

        if (!match.coins) {
          match.coins = new Map<string, number>();
        }

        const numericCoins = typeof coins === 'number' ? coins : parseInt(coins || '0', 10) || 0;
        match.coins.set(playerId, numericCoins);

        // Broadcast PLAYER_UPDATE to all players in the match
        broadcastToMatch(matchKey, {
          type: 'PLAYER_UPDATE',
          playerId,
          coins: numericCoins,
          timestamp: Date.now(),
        });
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

    // Initialize bot wallet
    initializeBotWallet();

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
            console.log(`🤖 Bot system enabled: max entry ${BOT_CONFIG.maxEntryFee} SOL, win rates: ${(BOT_CONFIG.winRates.small * 100).toFixed(0)}% (small) / ${(BOT_CONFIG.winRates.large * 100).toFixed(0)}% (large)`);
            console.log(`💰 Bot wallet balance: ${getBotWalletBalance().toFixed(2)} SOL`);
            
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

