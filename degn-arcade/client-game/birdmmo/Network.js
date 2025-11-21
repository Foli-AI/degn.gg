/**
 * Network.js - Production Socket.IO Client
 * 
 * Connects to production Render.com Socket.IO server
 * Uses query parameters for authentication (no token required)
 */

import { io } from 'socket.io-client';
import events from './events';

// Production Socket.IO server URL
export const SERVER_URL = "https://degn-socket-server.onrender.com";

class DEGNNetwork {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.matchKey = '';
    this.playerId = '';
    this.username = '';
    this.walletAddress = null;
    this.entryFee = 0;
    this.potSize = 0;
    this.houseRake = 0;
    this.connected = false;
  }

  connect(matchKey, playerId, username, walletAddress = null, entryFee = 0) {
    return new Promise((resolve, reject) => {
      this.matchKey = matchKey;
      this.playerId = playerId;
      this.username = username;
      this.walletAddress = walletAddress;
      this.entryFee = entryFee;

      console.log('[Network] 🔌 Connecting to production server:', SERVER_URL);
      console.log('[Network] Match:', { matchKey, playerId, username, walletAddress, entryFee });

      // Connect with query parameters
      this.socket = io(SERVER_URL, {
        transports: ["websocket"],
        query: {
          matchKey,
          playerId,
          username,
          walletAddress: walletAddress || '',
          entryFee: entryFee.toString()
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('[Network] ✅ Socket.IO connected:', this.socket.id);
        this.connected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Network] ❌ Socket.IO connection error:', error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Network] 🔌 Socket.IO disconnected:', reason);
        this.connected = false;
      });

      // Lobby events
      this.socket.on('lobby_update', (data) => {
        console.log('[Network] Lobby update:', data);
        this.emit('lobby:update', data);
      });

      this.socket.on('lobby_ready', (data) => {
        console.log('[Network] Lobby ready, countdown:', data.countdown);
        this.emit('lobby:ready', data);
      });

      // Match events
      this.socket.on('match_start', (data) => {
        console.log('[Network] Match started:', data);
        // Calculate pot size from match data
        if (data.players && data.players.length > 0) {
          this.potSize = this.entryFee * (data.players.length + (data.bots?.length || 0));
          this.houseRake = this.potSize * 0.10; // 10% house rake
        }
        this.emit('game:start', data);
      });

      this.socket.on('player_update', (data) => {
        console.log('[Network] Player update:', data);
        this.emit('player:update', data);
      });

      this.socket.on('player_position', (data) => {
        this.emit('player:position', data);
      });

      this.socket.on('match_end', (data) => {
        console.log('[Network] Match ended:', data);
        this.emit('game:end', data);
        
        // Determine if player won
        // Check by wallet address first, then by userId
        const winnerWallet = data.winnerWallet || data.winner;
        const winnerUserId = data.winner; // Could be userId or wallet
        
        let isWinner = false;
        if (this.walletAddress && winnerWallet) {
          isWinner = winnerWallet.toLowerCase() === this.walletAddress.toLowerCase();
        } else if (winnerUserId && this.playerId) {
          // Fallback to userId comparison
          isWinner = winnerUserId === this.playerId;
        }
        
        // Calculate prize (90% of pot, 10% house rake)
        const prizeAmount = this.potSize * 0.90;
        
        if (isWinner) {
          // Player won
          events.emit('casino:win', prizeAmount);
          console.log(`[Network] 🎉 You won ${prizeAmount} SOL!`);
        } else {
          // Player lost
          events.emit('casino:loss', this.entryFee);
          console.log(`[Network] 💸 You lost ${this.entryFee} SOL`);
        }
        
        // Redirect to lobby after 4 seconds
        setTimeout(() => {
          window.location.href = '/lobby';
        }, 4000);
      });

      this.socket.on('winner_payout', (data) => {
        console.log('[Network] Winner payout:', data);
        this.emit('winner:payout', data);
      });
    });
  }

  // Send player death to server
  sendPlayerDeath(deathReason) {
    if (!this.socket || !this.connected) {
      console.warn('[Network] Cannot send - Socket.IO not connected');
      return;
    }

    this.socket.emit('player_death', {
      userId: this.playerId,
      lobbyId: this.matchKey,
      ts: Date.now()
    });
  }

  // Send player position update
  sendPlayerState(position, velocity) {
    if (!this.socket || !this.connected) {
      console.warn('[Network] Cannot send - Socket.IO not connected');
      return;
    }

    this.socket.emit('player_position', {
      position: {
        x: position.x || 0,
        y: position.y || 0,
        z: position.z || 0
      }
    });
  }

  // Generic send method (for compatibility)
  send(type, data) {
    if (!this.socket || !this.connected) {
      console.warn('[Network] Cannot send - Socket.IO not connected');
      return;
    }

    this.socket.emit(type, {
      matchKey: this.matchKey,
      playerId: this.playerId,
      ...data
    });
  }

  // Event emitter pattern
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }

  off(event, callback) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Network] Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.eventHandlers.clear();
  }
}

// Export singleton instance
const network = new DEGNNetwork();
export default network;

