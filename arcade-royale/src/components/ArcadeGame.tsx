'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Trophy, Clock } from 'lucide-react';
import { MatchResult } from '@/lib/socket';

interface ArcadeGameProps {
  game: string;
  isActive: boolean;
  countdown?: number | null;
  matchResult?: MatchResult | null;
}

export function ArcadeGame({ game, isActive, countdown, matchResult }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const gameStateRef = useRef({
    players: [] as Array<{ x: number; y: number; color: string; name: string; eliminated: boolean }>,
    obstacles: [] as Array<{ x: number; y: number; width: number; height: number }>,
    coins: [] as Array<{ x: number; y: number; collected: boolean }>,
    progress: 0,
    gameTime: 0
  });

  const [gamePhase, setGamePhase] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');

  useEffect(() => {
    if (countdown !== null && countdown !== undefined && countdown > 0) {
      setGamePhase('countdown');
    } else if (isActive && (countdown === null || countdown === undefined)) {
      setGamePhase('playing');
    } else if (matchResult) {
      setGamePhase('finished');
    } else {
      setGamePhase('waiting');
    }
  }, [isActive, countdown, matchResult]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize game state based on game type
    initializeGame();

    // Start game loop
    const gameLoop = () => {
      updateGame();
      renderGame(ctx, canvas);
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [game, gamePhase]);

  const initializeGame = () => {
    const state = gameStateRef.current;
    
    // Reset game state
    state.players = [];
    state.obstacles = [];
    state.coins = [];
    state.progress = 0;
    state.gameTime = 0;

    // Initialize based on game type
    switch (game) {
      case 'CoinRaid':
        initializeCoinRaid();
        break;
      case 'SolSerpentRoyale':
        initializeSerpentRoyale();
        break;
      case 'QuickDrawArena':
        initializeQuickDraw();
        break;
      case 'MoonBlaster':
        initializeMoonBlaster();
        break;
      default:
        initializeCoinRaid();
    }
  };

  const initializeCoinRaid = () => {
    const state = gameStateRef.current;
    
    // Add demo players
    const playerColors = ['#00FFFF', '#8A2BE2', '#FF6B6B', '#4ECDC4'];
    const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana'];
    
    for (let i = 0; i < 4; i++) {
      state.players.push({
        x: 50 + i * 100,
        y: 300,
        color: playerColors[i],
        name: playerNames[i],
        eliminated: false
      });
    }

    // Add coins
    for (let i = 0; i < 20; i++) {
      state.coins.push({
        x: Math.random() * 700 + 50,
        y: Math.random() * 400 + 50,
        collected: false
      });
    }

    // Add obstacles
    for (let i = 0; i < 8; i++) {
      state.obstacles.push({
        x: Math.random() * 600 + 100,
        y: Math.random() * 300 + 100,
        width: 40 + Math.random() * 40,
        height: 40 + Math.random() * 40
      });
    }
  };

  const initializeSerpentRoyale = () => {
    const state = gameStateRef.current;
    
    // Snake-like players
    const colors = ['#00FF00', '#FF0000', '#0000FF', '#FFFF00'];
    const names = ['Viper', 'Cobra', 'Python', 'Anaconda'];
    
    for (let i = 0; i < 4; i++) {
      state.players.push({
        x: 100 + i * 150,
        y: 100 + i * 100,
        color: colors[i],
        name: names[i],
        eliminated: false
      });
    }
  };

  const initializeQuickDraw = () => {
    const state = gameStateRef.current;
    
    // Target-based game
    const colors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44'];
    const names = ['Gunner', 'Sniper', 'Ranger', 'Hunter'];
    
    for (let i = 0; i < 4; i++) {
      state.players.push({
        x: 100 + i * 150,
        y: 400,
        color: colors[i],
        name: names[i],
        eliminated: false
      });
    }

    // Add targets
    for (let i = 0; i < 10; i++) {
      state.coins.push({
        x: Math.random() * 600 + 100,
        y: Math.random() * 200 + 50,
        collected: false
      });
    }
  };

  const initializeMoonBlaster = () => {
    const state = gameStateRef.current;
    
    // Space ships
    const colors = ['#00CCFF', '#FF6600', '#CC00FF', '#00FF66'];
    const names = ['Apollo', 'Artemis', 'Orion', 'Nova'];
    
    for (let i = 0; i < 4; i++) {
      state.players.push({
        x: 100 + i * 150,
        y: 450,
        color: colors[i],
        name: names[i],
        eliminated: false
      });
    }

    // Add asteroids
    for (let i = 0; i < 12; i++) {
      state.obstacles.push({
        x: Math.random() * 700 + 50,
        y: Math.random() * 300 + 50,
        width: 30 + Math.random() * 30,
        height: 30 + Math.random() * 30
      });
    }
  };

  const updateGame = () => {
    if (gamePhase !== 'playing') return;

    const state = gameStateRef.current;
    state.gameTime += 0.016; // ~60fps
    state.progress = Math.min(state.gameTime / 30, 1); // 30 second matches

    // Animate players based on game type
    switch (game) {
      case 'CoinRaid':
        updateCoinRaid();
        break;
      case 'SolSerpentRoyale':
        updateSerpentRoyale();
        break;
      case 'QuickDrawArena':
        updateQuickDraw();
        break;
      case 'MoonBlaster':
        updateMoonBlaster();
        break;
    }

    // Simulate eliminations
    if (state.gameTime > 10 && Math.random() < 0.001) {
      const activePlayers = state.players.filter(p => !p.eliminated);
      if (activePlayers.length > 1) {
        const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        randomPlayer.eliminated = true;
      }
    }
  };

  const updateCoinRaid = () => {
    const state = gameStateRef.current;
    
    // Move players around collecting coins
    state.players.forEach((player, index) => {
      if (!player.eliminated) {
        player.x += Math.sin(state.gameTime + index) * 2;
        player.y += Math.cos(state.gameTime * 0.5 + index) * 1;
        
        // Keep in bounds
        player.x = Math.max(20, Math.min(780, player.x));
        player.y = Math.max(20, Math.min(480, player.y));
      }
    });

    // Collect coins
    state.coins.forEach(coin => {
      if (!coin.collected) {
        state.players.forEach(player => {
          if (!player.eliminated) {
            const dist = Math.sqrt((player.x - coin.x) ** 2 + (player.y - coin.y) ** 2);
            if (dist < 30) {
              coin.collected = true;
            }
          }
        });
      }
    });
  };

  const updateSerpentRoyale = () => {
    const state = gameStateRef.current;
    
    // Snake-like movement
    state.players.forEach((player, index) => {
      if (!player.eliminated) {
        const angle = state.gameTime * 0.5 + index * Math.PI / 2;
        player.x = 400 + Math.cos(angle) * (150 - index * 20);
        player.y = 250 + Math.sin(angle) * (150 - index * 20);
      }
    });
  };

  const updateQuickDraw = () => {
    const state = gameStateRef.current;
    
    // Players aim at targets
    state.players.forEach((player, index) => {
      if (!player.eliminated) {
        player.x += Math.sin(state.gameTime * 2 + index) * 0.5;
      }
    });

    // Targets move
    state.coins.forEach((target, index) => {
      if (!target.collected) {
        target.x += Math.sin(state.gameTime + index) * 1;
        target.y += Math.cos(state.gameTime * 0.8 + index) * 0.5;
        
        // Keep targets in bounds
        target.x = Math.max(50, Math.min(750, target.x));
        target.y = Math.max(50, Math.min(200, target.y));
      }
    });
  };

  const updateMoonBlaster = () => {
    const state = gameStateRef.current;
    
    // Spaceships dodge asteroids
    state.players.forEach((player, index) => {
      if (!player.eliminated) {
        player.x += Math.sin(state.gameTime * 1.5 + index) * 1.5;
        player.y = 450 + Math.sin(state.gameTime * 3 + index) * 20;
      }
    });

    // Asteroids fall
    state.obstacles.forEach(asteroid => {
      asteroid.y += 1;
      if (asteroid.y > 500) {
        asteroid.y = -50;
        asteroid.x = Math.random() * 700 + 50;
      }
    });
  };

  const renderGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // Clear canvas
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);

    // Draw grid background
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const state = gameStateRef.current;

    // Render based on game phase
    if (gamePhase === 'waiting') {
      renderWaitingState(ctx, width, height);
    } else if (gamePhase === 'countdown') {
      renderCountdownState(ctx, width, height);
    } else if (gamePhase === 'playing') {
      renderPlayingState(ctx, width, height, state);
    } else if (gamePhase === 'finished') {
      renderFinishedState(ctx, width, height);
    }
  };

  const renderWaitingState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#333';
    ctx.fillRect(width / 2 - 100, height / 2 - 50, 200, 100);
    
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for Players...', width / 2, height / 2);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = '#AAA';
    ctx.fillText(`Game: ${game}`, width / 2, height / 2 + 25);
  };

  const renderCountdownState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText((countdown ?? 0).toString(), width / 2, height / 2);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Match Starting...', width / 2, height / 2 + 50);
  };

  const renderPlayingState = (ctx: CanvasRenderingContext2D, width: number, height: number, state: any) => {
    // Render game-specific elements
    switch (game) {
      case 'CoinRaid':
        renderCoinRaid(ctx, state);
        break;
      case 'SolSerpentRoyale':
        renderSerpentRoyale(ctx, state);
        break;
      case 'QuickDrawArena':
        renderQuickDraw(ctx, state);
        break;
      case 'MoonBlaster':
        renderMoonBlaster(ctx, state);
        break;
    }

    // Render progress bar
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 10, width - 20, 20);
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(10, 10, (width - 20) * state.progress, 20);
    
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Progress: ${Math.floor(state.progress * 100)}%`, 15, 24);
  };

  const renderFinishedState = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 Match Complete!', width / 2, height / 2 - 50);
    
    if (matchResult) {
      ctx.font = '24px Arial';
      ctx.fillStyle = '#FFF';
      ctx.fillText(`Winner: ${matchResult.winner.username}`, width / 2, height / 2);
      
      ctx.font = '18px Arial';
      ctx.fillStyle = '#00FFFF';
      ctx.fillText(`Payout: ${matchResult.winner.payout} SOL`, width / 2, height / 2 + 30);
    }
  };

  const renderCoinRaid = (ctx: CanvasRenderingContext2D, state: any) => {
    // Draw coins
    state.coins.forEach((coin: any) => {
      if (!coin.collected) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw obstacles
    state.obstacles.forEach((obstacle: any) => {
      ctx.fillStyle = '#666';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // Draw players
    state.players.forEach((player: any) => {
      ctx.fillStyle = player.eliminated ? '#666' : player.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
      ctx.fill();
      
      if (!player.eliminated) {
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y - 20);
      }
    });
  };

  const renderSerpentRoyale = (ctx: CanvasRenderingContext2D, state: any) => {
    // Draw arena boundary
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(400, 250, 200, 0, Math.PI * 2);
    ctx.stroke();

    // Draw players as snakes
    state.players.forEach((player: any) => {
      ctx.fillStyle = player.eliminated ? '#666' : player.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Snake body trail
      if (!player.eliminated) {
        for (let i = 1; i <= 5; i++) {
          ctx.globalAlpha = 1 - (i * 0.15);
          ctx.beginPath();
          ctx.arc(player.x - i * 8, player.y, 12 - i, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    });
  };

  const renderQuickDraw = (ctx: CanvasRenderingContext2D, state: any) => {
    // Draw targets
    state.coins.forEach((target: any) => {
      if (!target.collected) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw players
    state.players.forEach((player: any) => {
      ctx.fillStyle = player.eliminated ? '#666' : player.color;
      ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
      
      if (!player.eliminated) {
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y + 25);
      }
    });
  };

  const renderMoonBlaster = (ctx: CanvasRenderingContext2D, state: any) => {
    // Draw stars background
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % 800;
      const y = (i * 73.3) % 500;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw asteroids
    state.obstacles.forEach((asteroid: any) => {
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2, asteroid.width / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw spaceships
    state.players.forEach((player: any) => {
      if (!player.eliminated) {
        ctx.fillStyle = player.color;
        // Draw simple spaceship shape
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 15);
        ctx.lineTo(player.x - 10, player.y + 10);
        ctx.lineTo(player.x + 10, player.y + 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#FFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y + 25);
      }
    });
  };

  return (
    <div className="relative w-full h-96 bg-dark-900 rounded-lg overflow-hidden border border-gray-700">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* Game UI Overlay */}
      <div className="absolute top-4 right-4 flex gap-2">
        {gamePhase === 'countdown' && countdown !== null && countdown !== undefined && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-neon-blue/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-neon-blue/30"
          >
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4" />
              <span className="font-bold">{countdown}</span>
            </div>
          </motion.div>
        )}
        
        {gamePhase === 'finished' && matchResult && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-yellow-500/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-500/30"
          >
            <div className="flex items-center gap-2 text-white">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">Complete!</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Game Info */}
      <div className="absolute bottom-4 left-4">
        <div className="bg-dark-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600">
          <p className="text-sm text-gray-300">{game}</p>
          <p className="text-xs text-gray-400">
            {gamePhase === 'waiting' && 'Waiting for players...'}
            {gamePhase === 'countdown' && 'Starting soon...'}
            {gamePhase === 'playing' && 'Match in progress'}
            {gamePhase === 'finished' && 'Match completed'}
          </p>
        </div>
      </div>
    </div>
  );
}
