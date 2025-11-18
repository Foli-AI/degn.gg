import { io } from "socket.io-client";

// Get matchmaker URL from environment or default to localhost:3001
// In production, this should be set to the deployed matchmaker URL
const getMatchmakerUrl = () => {
  // Always prefer environment variable
  const envUrl = process.env.NEXT_PUBLIC_MATCHMAKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) return envUrl;
  
  // Client-side fallback: construct from current host
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProduction) {
      // Production: try to construct matchmaker URL from current host
      // This is a fallback - should always use NEXT_PUBLIC_MATCHMAKER_URL in production
      console.warn('[Socket] No NEXT_PUBLIC_MATCHMAKER_URL set, using fallback');
      return `https://matchmaker.${window.location.hostname}`;
    }
  }
  return "http://localhost:3001";
};

// Only initialize socket on client side, not during build
let socket: ReturnType<typeof io> | null = null;

if (typeof window !== 'undefined') {
  const MATCHMAKER_URL = getMatchmakerUrl();
  
  // For Render.com, ensure we're using the correct protocol
  const socketUrl = MATCHMAKER_URL.startsWith('https://') 
    ? MATCHMAKER_URL 
    : MATCHMAKER_URL.startsWith('http://')
    ? MATCHMAKER_URL
    : `https://${MATCHMAKER_URL}`;
  
  // First, test if backend is reachable via HTTP
  const testBackendHealth = async () => {
    try {
      const healthUrl = `${socketUrl}/health`;
      const response = await fetch(healthUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (response.ok) {
        console.log('[Socket] ✅ Backend health check passed');
        return true;
      } else {
        console.warn('[Socket] ⚠️ Backend health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[Socket] ❌ Backend health check failed:', error);
      return false;
    }
  };
  
  // Test backend before connecting socket
  testBackendHealth().then((isHealthy) => {
    if (!isHealthy) {
      console.error('[Socket] ⚠️ Backend appears to be down or unreachable. Socket connection may fail.');
    }
  });
  
  socket = io(socketUrl, { 
    transports: ["polling", "websocket"], // Try polling first (more reliable on Render)
    withCredentials: false, // Disable credentials for Render
    reconnection: true,
    reconnectionDelay: 3000, // Increased delay
    reconnectionAttempts: 5, // Allow more attempts for Render
    reconnectionDelayMax: 15000,
    timeout: 20000, // Increased timeout for Render
    forceNew: false,
    autoConnect: false, // Don't auto-connect, let useMatchmaker handle it
    upgrade: true, // Allow transport upgrades
    rememberUpgrade: true // Remember transport upgrade
  });

  // Add connection error logging
  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
    console.error("[Socket] Attempting to connect to:", socketUrl);
  });

  socket.on("connect", () => {
    console.log("[Socket] ✅ Connected to matchmaker:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected:", reason);
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
  });

  socket.on("reconnect_failed", () => {
    console.error("[Socket] ❌ Reconnection failed after all attempts");
  });
}

// Export socket with fallback for server-side rendering
export { socket };

// Socket event types for TypeScript
export interface Player {
  id: string;
  username: string;
  socketId: string;
  walletAddress?: string;
  joinedAt: Date;
}

export interface Lobby {
  id: string;
  gameType: 'coinflip' | 'connect4' | 'sol-bird' | 'sol-bird-race' | 'slither' | 'agar';
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'ready' | 'in-progress';
  createdAt: Date;
  createdBy: string;
  entryAmount?: number;
}

export interface LobbyListItem {
  id: string;
  gameType: string;
  currentPlayers: number;
  maxPlayers: number;
  entryAmount: number;
}

// Socket event handlers
export const socketEvents = {
  // Client to server events
  playerJoin: (data: { username: string; walletAddress?: string }) => {
    if (socket) socket.emit('player:join', data);
  },
  
  joinLobby: (lobbyId: string) => {
    if (socket) socket.emit('join-lobby', { lobbyId });
  },
  
  leaveLobby: () => {
    if (socket) socket.emit('leave-lobby');
  },
  
  requestLobbies: () => {
    if (socket) socket.emit('lobbies:list');
  },

  // Game-specific events for Sol-Bird
  playerFlap: (lobbyId: string) => {
    if (socket) socket.emit('player:flap', { lobbyId });
  },
  
  playerDied: (lobbyId: string, score: number) => {
    if (socket) socket.emit('player:died', { lobbyId, score });
  },
  
  gameOver: (lobbyId: string, winner: string, scores: any[]) => {
    if (socket) socket.emit('game:over', { lobbyId, winner, scores });
  }
};

// Connection status
export const getConnectionStatus = () => ({
  connected: socket?.connected || false,
  id: socket?.id || null
});

export default socket;