'use client';

import { io, Socket } from 'socket.io-client';

export interface GameRoom {
  id: string;
  game: string;
  name: string;
  host: {
    id: string;
    username: string;
  };
  players: Array<{
    id: string;
    username: string;
    betAmount: number;
    status: 'active' | 'eliminated' | 'winner';
  }>;
  status: 'waiting' | 'running' | 'completed';
  minEntry: number;
  maxEntry: number;
  maxPlayers: number;
  totalPot: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MatchResult {
  matchId: string;
  roomId: string;
  winner: {
    id: string;
    username: string;
    payout: number;
  };
  positions: Array<{
    playerId: string;
    username: string;
    position: number;
    payout: number;
  }>;
  totalPot: number;
  rakeCollected: number;
  seed: string;
  completedAt: string;
}

export interface SocketEvents {
  // Client to Server
  'join-room': (roomId: string) => void;
  'leave-room': (roomId: string) => void;
  'place-bet': (data: { roomId: string; amount: number }) => void;
  'start-match': (roomId: string) => void;
  'request-rooms': () => void;

  // Server to Client
  'room-updated': (room: GameRoom) => void;
  'player-joined': (data: { roomId: string; player: GameRoom['players'][0] }) => void;
  'player-left': (data: { roomId: string; playerId: string }) => void;
  'bet-placed': (data: { roomId: string; playerId: string; amount: number }) => void;
  'match-started': (data: { roomId: string; startsAt: string }) => void;
  'match-progress': (data: { roomId: string; progress: number; eliminations: string[] }) => void;
  'match-completed': (result: MatchResult) => void;
  'rooms-list': (rooms: GameRoom[]) => void;
  'error': (error: { message: string; code?: string }) => void;
  'balance-updated': (data: { userId: string; newBalance: number }) => void;
}

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to game server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from game server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.reconnect();
    });

    return this.socket;
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔌 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    } else {
      console.error('🔌 Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit<K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>) {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn('🔌 Socket not connected, cannot emit:', event);
    }
  }

  on<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) {
    if (this.socket) {
      this.socket.on(event as string, handler);
    }
  }

  off<K extends keyof SocketEvents>(event: K, handler?: SocketEvents[K]) {
    if (this.socket) {
      this.socket.off(event as string, handler);
    }
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// Hook for React components
export function useSocket() {
  return socketManager;
}

