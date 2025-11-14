'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Zap } from 'lucide-react';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';

interface Player {
  id: string;
  user_id: string;
  bet_amount: number;
  user?: {
    username: string;
  };
}

interface GameEvent {
  tick: number;
  type: 'spawn' | 'hit' | 'powerup' | 'elimination' | 'score';
  playerId?: string;
  data: any;
}

interface CoinRaidGameProps {
  roomId: string;
  players: Player[];
  onMatchEnd: (result: any) => void;
  onBack: () => void;
}

export const CoinRaidGame: React.FC<CoinRaidGameProps> = ({
  roomId,
  players,
  onMatchEnd,
  onBack
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<{
    players: Record<string, any>;
    events: GameEvent[];
    currentTick: number;
    isComplete: boolean;
  }>({
    players: {},
    events: [],
    currentTick: 0,
    isComplete: false
  });

  const [playerStats, setPlayerStats] = useState<Record<string, {
    health: number;
    score: number;
    eliminated: boolean;
    position?: number;
  }>>({});

  // Initialize player stats
  useEffect(() => {
    const initialStats: Record<string, any> = {};
    players.forEach(player => {
      initialStats[player.user_id] = {
        health: 100,
        score: 0,
        eliminated: false
      };
    });
    setPlayerStats(initialStats);
  }, [players]);

  // Real-time match updates
  useRoomRealtime(roomId, {
    onMatchTick: (data) => {
      // Update game state with tick data
      if (data.events) {
        setGameState(prev => ({
          ...prev,
          events: [...prev.events, ...data.events],
          currentTick: data.tick || prev.currentTick + 1
        }));
        
        // Process events to update player stats
        data.events.forEach((event: GameEvent) => {
          if (event.type === 'hit' && event.playerId) {
            setPlayerStats(prev => ({
              ...prev,
              [event.playerId!]: {
                ...prev[event.playerId!],
                health: event.data.newHealth
              }
            }));
          } else if (event.type === 'score' && event.playerId) {
            setPlayerStats(prev => ({
              ...prev,
              [event.playerId!]: {
                ...prev[event.playerId!],
                score: event.data.score,
                health: event.data.health
              }
            }));
          } else if (event.type === 'elimination' && event.playerId) {
            setPlayerStats(prev => ({
              ...prev,
              [event.playerId!]: {
                ...prev[event.playerId!],
                eliminated: true,
                score: event.data.finalScore
              }
            }));
          }
        });
      }
    },
    onMatchEnd: (result) => {
      setGameState(prev => ({ ...prev, isComplete: true }));
      
      // Update final positions
      if (result.matchResult?.positions) {
        setPlayerStats(prev => {
          const updated = { ...prev };
          Object.entries(result.matchResult.positions).forEach(([playerId, position]) => {
            if (updated[playerId]) {
              updated[playerId].position = position as number;
            }
          });
          return updated;
        });
      }
      
      setTimeout(() => {
        onMatchEnd(result);
      }, 3000); // Show results for 3 seconds
    }
  });

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid background
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw players as colored circles
      players.forEach((player, index) => {
        const stats = playerStats[player.user_id];
        if (!stats) return;

        const x = 100 + (index * 150);
        const y = canvas.height - 100;
        const radius = 20;

        // Player circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (stats.eliminated) {
          ctx.fillStyle = '#666666';
        } else {
          const colors = ['#00d4ff', '#b347d9', '#ff47d9', '#47ff88'];
          ctx.fillStyle = colors[index % colors.length];
        }
        
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Health bar
        const barWidth = 40;
        const barHeight = 4;
        const barX = x - barWidth / 2;
        const barY = y - radius - 15;

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        const healthPercent = Math.max(0, stats.health / 100);
        ctx.fillStyle = healthPercent > 0.5 ? '#47ff88' : healthPercent > 0.25 ? '#ffff47' : '#ff4747';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Player name and score
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          player.user?.username || `P${index + 1}`,
          x,
          y + radius + 15
        );
        ctx.fillText(
          `Score: ${stats.score}`,
          x,
          y + radius + 30
        );

        if (stats.eliminated) {
          ctx.fillStyle = '#ff4747';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('ELIMINATED', x, y);
        }
      });

      // Draw floating particles for visual effect
      const time = Date.now() * 0.001;
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time + i) * 100) + canvas.width / 2;
        const y = (Math.cos(time * 0.7 + i) * 50) + 100;
        const size = Math.sin(time * 2 + i) * 2 + 3;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, [players, playerStats]);

  const activePlayers = Object.values(playerStats).filter(p => !p.eliminated).length;
  const totalPot = players.reduce((sum, p) => sum + p.bet_amount, 0);
  const prizePool = Math.floor(totalPot * 0.92);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neon-blue hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div>
            <h2 className="text-2xl font-cyber font-bold text-white">
              CoinRaid Battle
            </h2>
            <p className="text-gray-400">Live Match in Progress</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="cyber-border rounded-full px-4 py-2 text-sm">
            <span className="text-gray-400">Players: </span>
            <span className="text-neon-blue font-bold">{activePlayers}/{players.length}</span>
          </div>
          
          <div className="cyber-border rounded-full px-4 py-2 text-sm">
            <span className="text-gray-400">Prize: </span>
            <span className="text-neon-green font-bold">{prizePool} Credits</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Game Canvas */}
        <div className="xl:col-span-3">
          <div className="cyber-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full bg-dark-900"
            />
          </div>
        </div>

        {/* Player Stats Sidebar */}
        <div className="space-y-4">
          <div className="cyber-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Live Stats
            </h3>
            
            <div className="space-y-3">
              {players
                .sort((a, b) => {
                  const statsA = playerStats[a.user_id];
                  const statsB = playerStats[b.user_id];
                  if (!statsA || !statsB) return 0;
                  
                  // Sort by elimination status, then by score
                  if (statsA.eliminated && !statsB.eliminated) return 1;
                  if (!statsA.eliminated && statsB.eliminated) return -1;
                  return statsB.score - statsA.score;
                })
                .map((player, index) => {
                  const stats = playerStats[player.user_id];
                  if (!stats) return null;

                  return (
                    <motion.div
                      key={player.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`cyber-border rounded-lg p-3 ${
                        stats.eliminated 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-dark-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            stats.eliminated ? 'bg-red-500' : 'bg-green-500'
                          } animate-pulse`}></div>
                          <span className="text-white font-semibold text-sm">
                            {player.user?.username || `Player ${index + 1}`}
                          </span>
                        </div>
                        {stats.position && (
                          <span className="text-xs text-neon-purple font-bold">
                            #{stats.position}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Health:</span>
                          <span className={`font-bold ${
                            stats.health > 50 ? 'text-green-400' : 
                            stats.health > 25 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {stats.health}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-400">Score:</span>
                          <span className="text-neon-blue font-bold">
                            {stats.score.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bet:</span>
                          <span className="text-neon-green">
                            {player.bet_amount} Credits
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>

          {/* Match Info */}
          <div className="cyber-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Match Info
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Pot:</span>
                <span className="text-white font-bold">{totalPot} Credits</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Prize Pool:</span>
                <span className="text-neon-green font-bold">{prizePool} Credits</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">House Rake:</span>
                <span className="text-gray-300">{totalPot - prizePool} Credits (8%)</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Active Players:</span>
                <span className="text-neon-blue font-bold">{activePlayers}</span>
              </div>
            </div>
          </div>

          {/* Game Status */}
          <div className="cyber-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-semibold">Game Status</span>
            </div>
            
            <div className={`text-sm font-bold ${
              gameState.isComplete ? 'text-red-400' : 'text-green-400'
            }`}>
              {gameState.isComplete ? 'Match Complete!' : 'Battle in Progress...'}
            </div>
            
            <div className="text-xs text-gray-400 mt-1">
              Tick: {gameState.currentTick}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


