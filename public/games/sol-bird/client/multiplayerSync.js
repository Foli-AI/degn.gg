/**
 * Sol-Bird Real-Time Multiplayer Synchronization
 * Handles WebSocket connection, position sync, and opponent rendering
 */

class SolBirdMultiplayerSync {
    constructor() {
        this.socket = null;
        this.lobbyId = null;
        this.playerId = null;
        this.socketUrl = null;
        this.gameStarted = false;
        this.gameFrozen = false;
        this.opponentBird = null;
        this.opponentPosition = { y: 180, rotation: 0, alive: true };
        this.playerPositions = {}; // All players' positions
        this.lastPositionSent = 0;
        this.positionSendInterval = null;
        this.wsConnected = false;
        this.assetsLoaded = false;
        this.gameReadySent = false;
        
        this.initialize();
    }
    
    initialize() {
        const config = window.MULTIPLAYER_CONFIG || {};
        this.lobbyId = config.lobbyId || new URLSearchParams(window.location.search).get('lobbyId') || 'unknown';
        this.playerId = config.playerId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.socketUrl = config.socketUrl || 'http://localhost:3001';
        
        console.log('[MultiplayerSync] Initializing:', { lobbyId: this.lobbyId, playerId: this.playerId, socketUrl: this.socketUrl });
        
        this.connectToMatchmaker();
    }
    
    connectToMatchmaker() {
        const mockWallet = this.getMockWallet();
        
        console.log('[MultiplayerSync] Connecting to:', this.socketUrl);
        this.socket = io(this.socketUrl, {
            transports: ['websocket'],
            withCredentials: true
        });
        
        this.socket.on('connect', () => {
            console.log('[MultiplayerSync] ✅ Connected to matchmaker');
            this.wsConnected = true;
            document.getElementById('connectionStatus').textContent = 'Connected';
            
            // Join as player
            this.socket.emit('player:join', {
                username: mockWallet?.username || `Player_${this.playerId.slice(-4)}`,
                walletAddress: mockWallet?.address
            });
            
            // Try to start game if assets are loaded
            this.tryStartGame();
        });
        
        this.socket.on('disconnect', () => {
            console.log('[MultiplayerSync] ❌ Disconnected');
            this.wsConnected = false;
            document.getElementById('connectionStatus').textContent = 'Disconnected';
            this.stopPositionUpdates();
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('[MultiplayerSync] ❌ Connection error:', error);
            this.wsConnected = false;
        });
        
        this.socket.on('matchmaker:welcome', (data) => {
            console.log('[MultiplayerSync] 👋 Welcome:', data);
            this.playerId = data.playerId || this.playerId;
            
            // Join the specific lobby
            if (this.lobbyId && this.lobbyId !== 'unknown') {
                this.socket.emit('join-lobby', { lobbyId: this.lobbyId });
            }
        });
        
        this.socket.on('lobby-joined', (data) => {
            console.log('[MultiplayerSync] 🚪 Joined lobby:', data);
            document.getElementById('connectionStatus').textContent = 'In Lobby';
        });
        
        // Listen for game start
        this.socket.on('startGame', (data) => {
            console.log('[MultiplayerSync] 🎮 Game starting!', data);
            this.tryStartGame();
        });
        
        this.socket.on('GAME_START', (data) => {
            console.log('[MultiplayerSync] 🎮 GAME_START received:', data);
            this.tryStartGame();
        });
        
        this.socket.on('game:start', (data) => {
            console.log('[MultiplayerSync] 🎮 game:start received:', data);
            this.tryStartGame();
        });
        
        // Listen for player positions
        this.socket.on('playerPositions', (data) => {
            this.updateOpponentPositions(data);
        });
        
        // Listen for player death
        this.socket.on('playerDied', (data) => {
            console.log('[MultiplayerSync] 💀 Player died:', data);
            if (data.playerId && this.playerPositions[data.playerId]) {
                this.playerPositions[data.playerId].alive = false;
                if (this.opponentBird && data.playerId !== this.playerId) {
                    this.opponentPosition.alive = false;
                }
            }
        });
        
        // Listen for game over
        this.socket.on('gameOver', (data) => {
            console.log('[MultiplayerSync] 🏁 Game Over!', data);
            this.handleGameOver(data);
        });
        
        this.socket.on('game:over', (data) => {
            console.log('[MultiplayerSync] 🏁 game:over received:', data);
            this.handleGameOver(data);
        });
        
        // Heartbeat
        this.socket.on('PONG', () => {
            // Connection alive
        });
    }
    
    tryStartGame() {
        // Only start if both WebSocket and assets are ready
        if (!this.wsConnected || !this.assetsLoaded) {
            console.log('[MultiplayerSync] Waiting for initialization...', {
                wsConnected: this.wsConnected,
                assetsLoaded: this.assetsLoaded
            });
            return;
        }
        
        if (this.gameStarted) return;
        
        this.gameStarted = true;
        document.getElementById('connectionStatus').textContent = 'Starting...';
        
        // Wait for game engine to be ready
        const checkGameReady = () => {
            if (!window.FB) {
                setTimeout(checkGameReady, 100);
                return;
            }
            
            // Create opponent bird
            this.createOpponentBird();
            
            // Start sending position updates
            this.startPositionUpdates();
            
            // Hook into game loop to render opponent
            this.hookGameRender();
            
            // Start the game if it's in Splash state
            if (window.FB.game && window.FB.game.constructor.name === 'Splash') {
                // Wait a moment then start
                setTimeout(() => {
                    if (window.FB && window.FB.changeState) {
                        window.FB.changeState('Play');
                        document.getElementById('connectionStatus').textContent = 'Playing';
                    }
                }, 1000);
            } else {
                document.getElementById('connectionStatus').textContent = 'Playing';
            }
            
            console.log('[MultiplayerSync] ✅ Game started, multiplayer sync active');
            
            // Send GAME_READY to parent
            this.sendGameReady();
        };
        
        checkGameReady();
    }
    
    sendGameReady() {
        if (this.gameReadySent) return;
        
        this.gameReadySent = true;
        console.log('[MultiplayerSync] Sending GAME_READY to parent');
        
        try {
            window.parent.postMessage({ type: "GAME_READY" }, "*");
        } catch (error) {
            console.warn('[MultiplayerSync] Failed to send GAME_READY:', error);
        }
    }
    
    startGame() {
        // Alias for tryStartGame for compatibility
        this.tryStartGame();
    }
    
    createOpponentBird() {
        // Create opponent bird sprite (positioned to the right of player bird)
        this.opponentBird = {
            img: new Image(),
            x: 120, // Offset to the right so both birds are visible
            y: 180,
            width: 34,
            height: 24,
            rotation: 0,
            alive: true
        };
        this.opponentBird.img.src = '/games/sol-bird/client/bird.png';
        
        // Store reference in FB namespace
        window.FB.opponentBird = this.opponentBird;
    }
    
    startPositionUpdates() {
        // Send position every frame (60fps = ~16ms)
        this.positionSendInterval = setInterval(() => {
            if (!this.gameStarted || this.gameFrozen || !window.FB || !window.FB.bird) return;
            
            const bird = window.FB.bird;
            const now = Date.now();
            
            // Throttle to ~30fps to reduce network traffic
            if (now - this.lastPositionSent < 33) return;
            
            this.lastPositionSent = now;
            
            // Send player position
            this.socket.emit('playerMove', {
                lobbyId: this.lobbyId,
                playerId: this.playerId,
                y: bird.vy,
                rotation: bird.rotation,
                velocity: bird.velocity,
                alive: true
            });
        }, 33); // ~30fps
    }
    
    stopPositionUpdates() {
        if (this.positionSendInterval) {
            clearInterval(this.positionSendInterval);
            this.positionSendInterval = null;
        }
    }
    
    updateOpponentPositions(positions) {
        if (!positions || typeof positions !== 'object') return;
        
        // Update all player positions
        Object.keys(positions).forEach(playerId => {
            if (playerId === this.playerId) return; // Skip self
            
            const pos = positions[playerId];
            this.playerPositions[playerId] = {
                y: pos.y || 180,
                rotation: pos.rotation || 0,
                alive: pos.alive !== false
            };
            
            // Update opponent bird if this is the opponent
            if (this.opponentBird) {
                this.opponentPosition.y = pos.y || 180;
                this.opponentPosition.rotation = pos.rotation || 0;
                this.opponentPosition.alive = pos.alive !== false;
            }
        });
    }
    
    hookGameRender() {
        // Hook into FB.render to draw opponent bird
        const originalRender = window.FB.render;
        const self = this;
        
        window.FB.render = function() {
            // Call original render
            originalRender.call(window.FB);
            
            // Render opponent bird if game is started and opponent is alive
            if (self.gameStarted && !self.gameFrozen && self.opponentBird && self.opponentPosition.alive) {
                const opp = self.opponentBird;
                const pos = self.opponentPosition;
                
                // Draw opponent bird at opponent position
                if (opp.img.complete) {
                    window.FB.Draw.Sprite(
                        opp.img,
                        0, 0, // source x, y
                        opp.width, opp.height, // source width, height
                        opp.x, pos.y, // destination x, y
                        opp.width, opp.height, // destination width, height
                        pos.rotation
                    );
                }
            }
        };
    }
    
    handlePlayerDeath() {
        if (this.gameFrozen) return;
        
        console.log('[MultiplayerSync] 💀 Local player died');
        
        // Send death event
        this.socket.emit('playerDied', {
            lobbyId: this.lobbyId,
            playerId: this.playerId,
            score: window.FB ? (window.FB.score?.coins || 0) : 0
        });
        
        // Stop position updates
        this.stopPositionUpdates();
    }
    
    handleGameOver(data) {
        this.gameFrozen = true;
        this.stopPositionUpdates();
        
        document.getElementById('connectionStatus').textContent = data.winnerId === this.playerId ? 'You Won!' : 'Game Over';
        
        // Freeze game physics
        if (window.FB) {
            // Stop game loop updates (keep rendering for final frame)
            const originalUpdate = window.FB.update;
            window.FB.update = function() {
                // Don't update physics, but allow rendering
            };
        }
        
        // Send game over message to parent (don't redirect - let parent handle it)
        try {
            window.parent.postMessage({ 
                type: "GAME_OVER",
                lobbyId: this.lobbyId,
                winnerId: data.winnerId || 'none',
                data: data
            }, "*");
        } catch (error) {
            console.warn('[MultiplayerSync] Failed to send GAME_OVER:', error);
        }
        
        // Don't use window.location.href - it causes unmount loops
        // Parent component will handle navigation
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.solBirdMultiplayerSync = new SolBirdMultiplayerSync();
    });
} else {
    window.solBirdMultiplayerSync = new SolBirdMultiplayerSync();
}

