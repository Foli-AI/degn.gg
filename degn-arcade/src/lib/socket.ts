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
  socket = io(MATCHMAKER_URL, { 
    transports: ["websocket", "polling"], // Fallback to polling if websocket fails
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000
  });

  // Add connection error logging
  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
    console.error("[Socket] Attempting to connect to:", MATCHMAKER_URL);
  });

  socket.on("connect", () => {
    console.log("[Socket] ✅ Connected to matchmaker:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected:", reason);
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