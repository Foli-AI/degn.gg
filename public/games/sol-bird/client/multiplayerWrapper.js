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
        this.gameState = 'waiting'; // waiting, ready, playing, finished
        this.isAlive = true;
        this.score = 0;
        this.gameStartTime = null;
        this.playerReady = false;
        this.gameControlsEnabled = false;
        this.heartbeatInterval = null;
        
        this.initializeUI();
        this.connectToMatchmaker();
        this.setupGameHooks();
    }
    
    initializeUI() {
        // Get config from window.MULTIPLAYER_CONFIG (set in index.html)
        const config = window.MULTIPLAYER_CONFIG || {};
        this.lobbyId = config.lobbyId || new URLSearchParams(window.location.search).get('lobbyId') || 'unknown';
        this.playerId = config.playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.socketUrl = config.socketUrl || 'http://localhost:3001';
        
        document.getElementById('lobbyId').textContent = this.lobbyId;
    }
    
    connectToMatchmaker() {
        const mockWallet = this.getMockWallet();
        
        console.log('[Multiplayer] Connecting to:', this.socketUrl);
        this.socket = io(this.socketUrl, {
            transports: ['websocket'],
            withCredentials: true
        });
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to matchmaker');
            this.updateConnectionStatus('Connected');
            
            // Join as player
            this.socket.emit('player:join', {
                username: mockWallet?.username || `Player_${this.playerId.slice(-4)}`,
                walletAddress: mockWallet?.address
            });
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from matchmaker');
            this.updateConnectionStatus('Disconnected');
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        });
        
        this.socket.on('matchmaker:welcome', (data) => {
            console.log('👋 Welcome to matchmaker:', data);
            this.playerId = data.playerId || this.playerId;
            
            // Join the specific lobby
            if (this.lobbyId && this.lobbyId !== 'unknown') {
                this.socket.emit('join-lobby', { lobbyId: this.lobbyId });
            }
        });
        
        this.socket.on('lobby-joined', (data) => {
            console.log('🚪 Joined lobby:', data);
            this.updateConnectionStatus('In Lobby');
            this.updatePlayersList(data.players || []);
            
            // Send player ready
            this.sendPlayerReady();
        });
        
        this.socket.on('lobby-update', (lobby) => {
            console.log('🔄 Lobby updated:', lobby);
            this.updatePlayersList(lobby.players || []);
        });
        
        // Listen for LOBBY_UPDATE (from STATE_UPDATE broadcasts)
        this.socket.on('LOBBY_UPDATE', (data) => {
            console.log('🔄 LOBBY_UPDATE received:', data);
            if (data.players) {
                this.updatePlayersList(data.players);
            }
            if (data.aliveCount === 1 && this.gameState === 'playing') {
                this.handleGameOver();
            }
        });
        
        this.socket.on('lobby-ready', (data) => {
            console.log('🚀 Lobby ready, waiting for GAME_START...');
            this.updateConnectionStatus('Ready - Waiting for start');
        });
        
        // Listen for GAME_START (sent when both players are ready)
        this.socket.on('GAME_START', (data) => {
            console.log('🎮 GAME_START received:', data);
            this.startMultiplayerGame(data);
        });
        
        this.socket.on('game:start', (data) => {
            console.log('🎮 game:start received:', data);
            this.startMultiplayerGame(data);
        });
        
        this.socket.on('PONG', () => {
            // Heartbeat response - connection is alive
            console.log('[Heartbeat] PONG received');
        });
        
        this.socket.on('error', (error) => {
            console.error('🚫 Socket error:', error);
            this.updateConnectionStatus('Error: ' + (error.message || error));
        });
        
        // Start heartbeat ping
        this.startHeartbeat();
    }
    
    sendPlayerReady() {
        if (this.playerReady) return;
        
        this.playerReady = true;
        console.log('[Multiplayer] Sending playerReady');
        this.sendStateUpdate('playerReady', { ready: true });
    }
    
    sendStateUpdate(type, payload) {
        if (!this.socket || !this.socket.connected) {
            console.warn('[Multiplayer] Socket not connected, cannot send state update');
            return;
        }
        
        const message = {
            type: 'STATE_UPDATE',
            lobbyId: this.lobbyId,
            playerId: this.playerId,
            eventType: type,
            payload: payload
        };
        
        console.log('[Multiplayer] Sending STATE_UPDATE:', message);
        this.socket.emit('STATE_UPDATE', message);
    }
    
    startHeartbeat() {
        // Send ping every 5 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('PING');
            }
        }, 5000);
    }
    
    setupGameHooks() {
        // Wait for game engine to be available
        const checkGameEngine = () => {
            if (!window.FB || !window.FB.bird) {
                setTimeout(checkGameEngine, 100);
                return;
            }
            
            // Hook into FB.Input to detect flaps
            const originalInputSet = window.FB.Input.set;
            const self = this;
            
            window.FB.Input.set = function(data) {
                originalInputSet.call(window.FB.Input, data);
                
                // Send flap event if game is playing and controls enabled
                if (self.gameControlsEnabled && self.gameState === 'playing' && self.isAlive) {
                    self.sendStateUpdate('playerFlap', { 
                        timestamp: Date.now() 
                    });
                }
            };
            
            // Hook into FB.Collides to detect death
            const originalCollides = window.FB.Collides;
            window.FB.Collides = function(bird, pipe) {
                const result = originalCollides.call(window.FB, bird, pipe);
                
                if (result && self.isAlive && self.gameState === 'playing') {
                    self.handleLocalPlayerDeath();
                }
                
                return result;
            };
            
            // Monitor score updates
            let lastScore = 0;
            const scoreCheckInterval = setInterval(() => {
                if (self.gameState === 'playing' && self.isAlive && window.FB && window.FB.score) {
                    const currentScore = window.FB.score.coins || 0;
                    if (currentScore !== lastScore) {
                        lastScore = currentScore;
                        self.score = currentScore;
                        self.sendStateUpdate('playerAlive', {
                            alive: true,
                            score: currentScore
                        });
                    }
                }
            }, 500);
            
            // Cleanup on game end
            const originalChangeState = window.FB.changeState;
            window.FB.changeState = function(state) {
                if (state === 'GameOver') {
                    clearInterval(scoreCheckInterval);
                }
                return originalChangeState.call(window.FB, state);
            };
        };
        
        checkGameEngine();
    }
    
    startMultiplayerGame(data) {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.isAlive = true;
        this.score = 0;
        this.gameControlsEnabled = true; // Enable controls after GAME_START
        
        // Initialize all players as alive
        if (data.players) {
            data.players.forEach(player => {
                this.players.set(player.id || player.playerId, {
                    id: player.id || player.playerId,
                    username: player.username || `Player ${(player.id || player.playerId).slice(-4)}`,
                    isAlive: true,
                    score: 0
                });
            });
        }
        
        this.updatePlayersList(Array.from(this.players.values()));
        this.updateConnectionStatus('Playing');
        
        // Send gameStart event
        this.sendStateUpdate('gameStart', {
            startTime: this.gameStartTime,
            players: Array.from(this.players.keys())
        });
        
        // Start the game if FB is available
        if (window.FB && window.FB.changeState) {
            // Change to Play state
            window.FB.changeState('Play');
        }
        
        console.log('🎮 Multiplayer game started with', this.players.size, 'players');
    }
    
    handleLocalPlayerDeath() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        const survivalTime = Date.now() - (this.gameStartTime || Date.now());
        
        console.log('💀 Local player died, score:', this.score, 'survival time:', survivalTime);
        
        // Send death event via STATE_UPDATE
        this.sendStateUpdate('playerDied', {
            alive: false,
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
    }
    
    handleGameOver() {
        if (this.gameState === 'finished') return;
        
        this.gameState = 'finished';
        this.gameControlsEnabled = false;
        
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
        const winner = alivePlayers.length > 0 ? alivePlayers[0] : null;
        
        console.log('🏁 Game Over! Winner:', winner);
        
        // Send game over event
        this.sendStateUpdate('gameOver', {
            winner: winner ? winner.id : null,
            scores: Array.from(this.players.values()).map(p => ({
                playerId: p.id,
                username: p.username,
                score: p.score,
                isAlive: p.isAlive
            }))
        });
        
        this.updateConnectionStatus(winner ? `Winner: ${winner.username}` : 'Game Over');
    }
    
    updatePlayersList(players) {
        // Update internal players map
        if (Array.isArray(players)) {
            players.forEach(player => {
                const playerId = player.id || player.playerId;
                if (playerId) {
                    this.players.set(playerId, {
                        id: playerId,
                        username: player.username || `Player ${playerId.slice(-4)}`,
                        isAlive: player.isAlive !== false,
                        score: player.score || 0
                    });
                }
            });
        }
        
        // Update UI if element exists
        const playersListEl = document.getElementById('playersList');
        if (playersListEl) {
            playersListEl.innerHTML = '';
            
            Array.from(this.players.values()).forEach(player => {
                const playerEl = document.createElement('div');
                playerEl.className = `player-item ${player.isAlive ? 'player-alive' : 'player-dead'}`;
                playerEl.innerHTML = `
                    <span>${player.username}</span>
                    <span>${player.isAlive ? '🟢' : '💀'} ${player.score || 0}</span>
                `;
                playersListEl.appendChild(playerEl);
            });
        }
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
