/**
 * Sol-Bird Multiplayer Wrapper
 * Integrates the original CrappyBird game with DEGN.gg matchmaker
 */

class SolBirdMultiplayer {
    constructor() {
        this.socket = null;
        this.lobbyId = null;
        this.playerId = null;
        this.players = new Map();
        this.gameState = 'waiting'; // waiting, playing, finished
        this.isAlive = true;
        this.score = 0;
        this.gameStartTime = null;
        
        this.initializeUI();
        this.connectToMatchmaker();
        this.setupGameHooks();
    }
    
    initializeUI() {
        // Get lobby ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.lobbyId = urlParams.get('lobby') || 'unknown';
        document.getElementById('lobbyId').textContent = this.lobbyId;
    }
    
    connectToMatchmaker() {
        // TODO: integrate Phantom wallet here - get wallet address for player identification
        const mockWallet = this.getMockWallet();
        
        this.socket = io('http://localhost:3001', {
            transports: ['websocket'],
            withCredentials: true
        });
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to matchmaker');
            this.updateConnectionStatus('Connected');
            
            // Join as player
            this.socket.emit('player:join', {
                username: mockWallet?.username || `Player_${Date.now().toString().slice(-4)}`,
                walletAddress: mockWallet?.address
            });
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from matchmaker');
            this.updateConnectionStatus('Disconnected');
        });
        
        this.socket.on('matchmaker:welcome', (data) => {
            console.log('👋 Welcome to matchmaker:', data);
            this.playerId = data.playerId;
            
            // Join the specific lobby
            if (this.lobbyId && this.lobbyId !== 'unknown') {
                this.socket.emit('join-lobby', { lobbyId: this.lobbyId });
            }
        });
        
        this.socket.on('lobby-joined', (data) => {
            console.log('🚪 Joined lobby:', data);
            this.updateConnectionStatus('In Lobby');
            this.updatePlayersList(data.players || []);
        });
        
        this.socket.on('lobby-update', (lobby) => {
            console.log('🔄 Lobby updated:', lobby);
            this.updatePlayersList(lobby.players || []);
        });
        
        this.socket.on('lobby-ready', (data) => {
            console.log('🚀 Lobby ready, starting game!');
            this.startMultiplayerGame(data);
        });
        
        this.socket.on('match-start', (data) => {
            console.log('🎮 Match started:', data);
            this.gameState = 'playing';
            this.gameStartTime = Date.now();
            this.updateConnectionStatus('Playing');
        });
        
        this.socket.on('player:died', (data) => {
            console.log('💀 Player died:', data);
            this.handlePlayerDeath(data);
        });
        
        this.socket.on('match-end', (data) => {
            console.log('🏁 Match ended:', data);
            this.handleMatchEnd(data);
        });
        
        this.socket.on('error', (error) => {
            console.error('🚫 Socket error:', error);
            this.updateConnectionStatus('Error: ' + error.message);
        });
    }
    
    setupGameHooks() {
        // Hook into the original game's functions
        const originalGame = window.game || {};
        
        // Override the game's input handling to emit flap events
        const originalHandleInput = originalGame.handleInput || function() {};
        if (originalGame.handleInput) {
            originalGame.handleInput = (...args) => {
                // Call original input handler
                originalHandleInput.apply(originalGame, args);
                
                // Emit flap event for multiplayer
                if (this.gameState === 'playing' && this.isAlive) {
                    this.socket?.emit('player:flap', { lobbyId: this.lobbyId });
                }
            };
        }
        
        // Hook into collision detection
        const originalCheckCollision = originalGame.checkCollision || function() { return false; };
        if (originalGame.checkCollision) {
            originalGame.checkCollision = (...args) => {
                const collision = originalCheckCollision.apply(originalGame, args);
                
                if (collision && this.isAlive && this.gameState === 'playing') {
                    this.handleLocalPlayerDeath();
                }
                
                return collision;
            };
        }
        
        // Hook into score updates
        const originalUpdateScore = originalGame.updateScore || function() {};
        if (originalGame.updateScore) {
            originalGame.updateScore = (...args) => {
                originalUpdateScore.apply(originalGame, args);
                
                if (this.gameState === 'playing' && this.isAlive) {
                    this.score = originalGame.score || 0;
                }
            };
        }
        
        // Add keyboard and click listeners as fallback
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState === 'playing' && this.isAlive) {
                e.preventDefault();
                this.socket?.emit('player:flap', { lobbyId: this.lobbyId });
            }
        });
        
        document.getElementById('gameCanvas').addEventListener('click', () => {
            if (this.gameState === 'playing' && this.isAlive) {
                this.socket?.emit('player:flap', { lobbyId: this.lobbyId });
            }
        });
    }
    
    startMultiplayerGame(data) {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.isAlive = true;
        this.score = 0;
        
        // Initialize all players as alive
        data.players.forEach(player => {
            this.players.set(player.id, {
                ...player,
                isAlive: true,
                score: 0
            });
        });
        
        this.updatePlayersList(Array.from(this.players.values()));
        this.updateConnectionStatus('Playing');
        
        // Start the original game if it has a start method
        if (window.game && window.game.start) {
            window.game.start();
        }
        
        console.log('🎮 Multiplayer game started with', data.players.length, 'players');
    }
    
    handleLocalPlayerDeath() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        const survivalTime = Date.now() - (this.gameStartTime || Date.now());
        
        console.log('💀 Local player died, survival time:', survivalTime);
        
        // Emit death event to server
        this.socket?.emit('player:died', {
            lobbyId: this.lobbyId,
            score: this.score,
            survivalTime: survivalTime
        });
        
        // Update local player status
        if (this.players.has(this.playerId)) {
            const player = this.players.get(this.playerId);
            player.isAlive = false;
            player.score = this.score;
            this.players.set(this.playerId, player);
        }
        
        this.updatePlayersList(Array.from(this.players.values()));
        this.checkForGameEnd();
    }
    
    handlePlayerDeath(data) {
        if (this.players.has(data.playerId)) {
            const player = this.players.get(data.playerId);
            player.isAlive = false;
            player.score = data.score || 0;
            this.players.set(data.playerId, player);
            
            this.updatePlayersList(Array.from(this.players.values()));
        }
        
        this.checkForGameEnd();
    }
    
    checkForGameEnd() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
        
        if (alivePlayers.length <= 1 && this.gameState === 'playing') {
            // Game should end
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.endGame(alivePlayers);
                }
            }, 2000); // Wait 2 seconds for any final updates
        }
    }
    
    endGame(winners) {
        this.gameState = 'finished';
        
        // Emit game over event
        this.socket?.emit('game:over', {
            lobbyId: this.lobbyId,
            winner: winners.length > 0 ? winners[0].id : null,
            scores: Array.from(this.players.values()).map(p => ({
                playerId: p.id,
                username: p.username,
                score: p.score,
                isAlive: p.isAlive
            }))
        });
        
        this.showGameResults(winners);
    }
    
    handleMatchEnd(data) {
        this.gameState = 'finished';
        this.showGameResults(data.results || []);
    }
    
    showGameResults(results) {
        const statusDiv = document.getElementById('gameStatus');
        const titleEl = document.getElementById('statusTitle');
        const messageEl = document.getElementById('statusMessage');
        
        if (results.length === 0) {
            titleEl.textContent = 'Game Over';
            messageEl.textContent = 'No winners this round.';
        } else if (results.length === 1) {
            const winner = results[0];
            titleEl.textContent = winner.id === this.playerId ? 'You Won!' : 'Game Over';
            messageEl.textContent = `Winner: ${winner.username} with ${winner.score || 0} points`;
        } else {
            titleEl.textContent = 'Tie Game!';
            messageEl.textContent = `${results.length} players survived: ${results.map(r => r.username).join(', ')}`;
        }
        
        statusDiv.style.display = 'block';
        
        // TODO: integrate Phantom wallet here - handle payout distribution
        console.log('🏆 Game results:', results);
    }
    
    updateConnectionStatus(status) {
        document.getElementById('connectionStatus').textContent = status;
    }
    
    updatePlayersList(players) {
        const playersListEl = document.getElementById('playersList');
        playersListEl.innerHTML = '';
        
        players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = `player-item ${player.isAlive ? 'player-alive' : 'player-dead'}`;
            playerEl.innerHTML = `
                <span>${player.username}</span>
                <span>${player.isAlive ? '🟢' : '💀'} ${player.score || 0}</span>
            `;
            playersListEl.appendChild(playerEl);
        });
    }
    
    getMockWallet() {
        if (typeof localStorage === 'undefined') return null;
        
        const stored = localStorage.getItem('degn_wallet');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return null;
            }
        }
        return null;
    }
}

// Initialize multiplayer when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Initializing Sol-Bird Multiplayer...');
    window.solBirdMultiplayer = new SolBirdMultiplayer();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.solBirdMultiplayer) {
            window.solBirdMultiplayer = new SolBirdMultiplayer();
        }
    });
} else {
    window.solBirdMultiplayer = new SolBirdMultiplayer();
}
