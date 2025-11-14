/**
 * Sol-Bird Authoritative Game Server
 * Handles server-side game logic, collision detection, and score tracking
 */

import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  username: string;
  socketId: string;
  isAlive: boolean;
  score: number;
  survivalTime: number;
  lastFlap: number;
}

interface GameState {
  lobbyId: string;
  players: Map<string, Player>;
  gameStartTime: number;
  gameEndTime?: number;
  status: 'waiting' | 'playing' | 'finished';
  pipes: Array<{ x: number; y: number; passed: boolean }>;
  gameTimer?: NodeJS.Timeout;
}

class SolBirdGameServer {
  private matchmakerSocket: Socket;
  private games: Map<string, GameState> = new Map();
  private readonly GAME_DURATION = 180000; // 3 minutes
  private readonly PIPE_SPEED = 2;
  private readonly PIPE_GAP = 120;
  private readonly PIPE_WIDTH = 50;
  private readonly BIRD_SIZE = 20;

  constructor() {
    this.connectToMatchmaker();
  }

  private connectToMatchmaker() {
    this.matchmakerSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      withCredentials: true
    });

    this.matchmakerSocket.on('connect', () => {
      console.log('🎮 Sol-Bird Game Server connected to matchmaker');
      
      // Register as game server
      this.matchmakerSocket.emit('server:register', {
        gameType: 'sol-bird',
        serverType: 'authoritative'
      });
    });

    this.matchmakerSocket.on('match-start', (data) => {
      console.log('🚀 Starting Sol-Bird match:', data);
      this.startGame(data);
    });

    this.matchmakerSocket.on('player:flap', (data) => {
      this.handlePlayerFlap(data);
    });

    this.matchmakerSocket.on('player:died', (data) => {
      this.handlePlayerDeath(data);
    });

    this.matchmakerSocket.on('game:over', (data) => {
      this.handleGameOver(data);
    });

    this.matchmakerSocket.on('disconnect', () => {
      console.log('❌ Game server disconnected from matchmaker');
    });
  }

  private startGame(data: { lobbyId: string; players: any[] }) {
    const { lobbyId, players } = data;
    
    const gameState: GameState = {
      lobbyId,
      players: new Map(),
      gameStartTime: Date.now(),
      status: 'playing',
      pipes: this.generateInitialPipes()
    };

    // Initialize players
    players.forEach(player => {
      gameState.players.set(player.id, {
        id: player.id,
        username: player.username,
        socketId: player.socketId,
        isAlive: true,
        score: 0,
        survivalTime: 0,
        lastFlap: Date.now()
      });
    });

    this.games.set(lobbyId, gameState);

    // Start game loop
    this.startGameLoop(lobbyId);

    // Set game timer
    gameState.gameTimer = setTimeout(() => {
      this.endGame(lobbyId, 'timeout');
    }, this.GAME_DURATION);

    console.log(`🎮 Sol-Bird game started for lobby ${lobbyId} with ${players.length} players`);
  }

  private generateInitialPipes() {
    const pipes = [];
    for (let i = 0; i < 5; i++) {
      pipes.push({
        x: 400 + (i * 200), // Start pipes off-screen
        y: Math.random() * 200 + 100, // Random height
        passed: false
      });
    }
    return pipes;
  }

  private startGameLoop(lobbyId: string) {
    const gameState = this.games.get(lobbyId);
    if (!gameState) return;

    const gameLoop = setInterval(() => {
      if (gameState.status !== 'playing') {
        clearInterval(gameLoop);
        return;
      }

      this.updateGameState(lobbyId);
      this.checkCollisions(lobbyId);
      this.updateScores(lobbyId);
      
      // Check if game should end
      const alivePlayers = Array.from(gameState.players.values()).filter(p => p.isAlive);
      if (alivePlayers.length <= 1) {
        clearInterval(gameLoop);
        this.endGame(lobbyId, 'elimination');
      }
    }, 1000 / 60); // 60 FPS
  }

  private updateGameState(lobbyId: string) {
    const gameState = this.games.get(lobbyId);
    if (!gameState) return;

    // Update pipes
    gameState.pipes.forEach(pipe => {
      pipe.x -= this.PIPE_SPEED;
    });

    // Remove pipes that are off-screen and add new ones
    gameState.pipes = gameState.pipes.filter(pipe => pipe.x > -this.PIPE_WIDTH);
    
    while (gameState.pipes.length < 5) {
      const lastPipe = gameState.pipes[gameState.pipes.length - 1];
      gameState.pipes.push({
        x: (lastPipe?.x || 400) + 200,
        y: Math.random() * 200 + 100,
        passed: false
      });
    }

    // Broadcast state update to clients (simplified)
    this.matchmakerSocket.emit('game:state_update', {
      lobbyId,
      pipes: gameState.pipes,
      timestamp: Date.now()
    });
  }

  private checkCollisions(lobbyId: string) {
    const gameState = this.games.get(lobbyId);
    if (!gameState) return;

    // Simplified collision detection
    // In a real implementation, you'd track bird positions server-side
    // For now, we rely on client-side collision detection with server validation
  }

  private updateScores(lobbyId: string) {
    const gameState = this.games.get(lobbyId);
    if (!gameState) return;

    // Update survival time for alive players
    const currentTime = Date.now();
    gameState.players.forEach(player => {
      if (player.isAlive) {
        player.survivalTime = currentTime - gameState.gameStartTime;
        
        // Score based on survival time and pipes passed
        player.score = Math.floor(player.survivalTime / 1000);
      }
    });
  }

  private handlePlayerFlap(data: { lobbyId: string; playerId?: string }) {
    const gameState = this.games.get(data.lobbyId);
    if (!gameState || gameState.status !== 'playing') return;

    // Update player's last flap time (for anti-cheat)
    const playerId = data.playerId || this.getPlayerIdFromSocket();
    const player = gameState.players.get(playerId);
    
    if (player && player.isAlive) {
      player.lastFlap = Date.now();
    }
  }

  private handlePlayerDeath(data: { lobbyId: string; playerId?: string; score?: number; survivalTime?: number }) {
    const gameState = this.games.get(data.lobbyId);
    if (!gameState) return;

    const playerId = data.playerId || this.getPlayerIdFromSocket();
    const player = gameState.players.get(playerId);
    
    if (player && player.isAlive) {
      player.isAlive = false;
      player.score = data.score || player.score;
      player.survivalTime = data.survivalTime || player.survivalTime;
      
      console.log(`💀 Player ${player.username} died in lobby ${data.lobbyId}, score: ${player.score}`);
      
      // Broadcast player death
      this.matchmakerSocket.emit('player:died', {
        lobbyId: data.lobbyId,
        playerId: playerId,
        username: player.username,
        score: player.score,
        survivalTime: player.survivalTime
      });
    }
  }

  private handleGameOver(data: { lobbyId: string; winner?: string; scores: any[] }) {
    this.endGame(data.lobbyId, 'client_reported');
  }

  private endGame(lobbyId: string, reason: 'timeout' | 'elimination' | 'client_reported') {
    const gameState = this.games.get(lobbyId);
    if (!gameState || gameState.status === 'finished') return;

    gameState.status = 'finished';
    gameState.gameEndTime = Date.now();

    // Clear game timer
    if (gameState.gameTimer) {
      clearTimeout(gameState.gameTimer);
    }

    // Calculate final results
    const results = Array.from(gameState.players.values())
      .sort((a, b) => {
        // Sort by: alive status, then survival time, then score
        if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
        if (a.survivalTime !== b.survivalTime) return b.survivalTime - a.survivalTime;
        return b.score - a.score;
      })
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.id,
        username: player.username,
        score: player.score,
        survivalTime: player.survivalTime,
        isAlive: player.isAlive,
        prize: this.calculatePrize(index, gameState.players.size)
      }));

    console.log(`🏁 Sol-Bird game ended for lobby ${lobbyId} (${reason}):`, results);

    // Send results to matchmaker for payout processing
    this.sendMatchResults(lobbyId, results);

    // Broadcast match end to clients
    this.matchmakerSocket.emit('match-end', {
      lobbyId,
      reason,
      results: results.slice(0, 3), // Top 3 for display
      timestamp: Date.now()
    });

    // Clean up game state
    setTimeout(() => {
      this.games.delete(lobbyId);
    }, 30000); // Keep for 30 seconds for any late requests
  }

  private calculatePrize(rank: number, totalPlayers: number): number {
    // Prize distribution: winner gets most, others get participation
    if (rank === 0) return 0.8; // 80% to winner
    if (rank === 1 && totalPlayers > 2) return 0.15; // 15% to second
    if (rank === 2 && totalPlayers > 3) return 0.05; // 5% to third
    return 0; // No prize for others
  }

  private async sendMatchResults(lobbyId: string, results: any[]) {
    try {
      // TODO: Send results to matchmaker with authentication
      // This would typically be a POST request to /matches/:id/result
      // with a MATCHMAKER_SECRET header for security
      
      console.log(`📊 Sending match results for lobby ${lobbyId}:`, results);
      
      // For now, just emit via socket
      this.matchmakerSocket.emit('match:results', {
        lobbyId,
        results,
        timestamp: Date.now(),
        gameType: 'sol-bird'
      });
      
    } catch (error) {
      console.error('Failed to send match results:', error);
    }
  }

  private getPlayerIdFromSocket(): string {
    // Helper to get player ID from socket context
    // In a real implementation, this would be tracked per connection
    return 'unknown';
  }
}

// Start the game server
console.log('🚀 Starting Sol-Bird Authoritative Game Server...');
const gameServer = new SolBirdGameServer();

export default gameServer;
