'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Coins, 
  Play, 
  Trophy,
  Zap,
  Shield,
  Target
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from '@/components/WalletConnect';

interface Room {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  status: 'waiting' | 'active' | 'finished';
  host: string;
}

export default function QuickDrawPage() {
  const router = useRouter();
  const { connected } = useWallet();
  
  const [betAmount, setBetAmount] = useState<number>(0.5);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mockRooms: Room[] = [
      {
        id: 'quickdraw_1',
        name: 'Lightning Round',
        players: 2,
        maxPlayers: 4,
        minBet: 0.5,
        maxBet: 5.0,
        status: 'waiting',
        host: 'QuickShot'
      },
      {
        id: 'quickdraw_2',
        name: 'Reaction Masters',
        players: 3,
        maxPlayers: 6,
        minBet: 1.0,
        maxBet: 10.0,
        status: 'waiting',
        host: 'FastDraw'
      },
      {
        id: 'quickdraw_3',
        name: 'High Stakes Duel',
        players: 1,
        maxPlayers: 2,
        minBet: 2.0,
        maxBet: 20.0,
        status: 'waiting',
        host: 'GunSlinger'
      }
    ];
    setRooms(mockRooms);
  }, []);

  const handleJoinRoom = async (roomId: string) => {
    if (!connected) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push(`/game/${roomId}`);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-green-400 bg-green-500/20';
      case 'active': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/games')}
              className="flex items-center gap-2 text-neon-blue hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Games
            </button>
            
            <div>
              <h1 className="text-3xl font-cyber font-bold text-white flex items-center gap-3">
                🎯 Quick Draw Arena
              </h1>
              <p className="text-gray-400">
                Test your reflexes in lightning-fast reaction duels!
              </p>
            </div>
          </div>

          {!connected && (
            <WalletConnect variant="compact" showBalance={false} showAddress={false} />
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Duel Arenas</h2>
              <button className="btn-primary text-sm">Create Duel</button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="game-card hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                        🎯
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{room.name}</h3>
                        <p className="text-sm text-gray-400">Host: {room.host}</p>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(room.status)}`}>
                      {room.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Duelists</span>
                      </div>
                      <div className="text-white font-bold">{room.players}/{room.maxPlayers}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Coins className="w-4 h-4" />
                        <span className="text-sm">Stakes</span>
                      </div>
                      <div className="text-neon-blue font-bold text-sm">
                        {room.minBet}-{room.maxBet} SOL
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm">Winner Takes</span>
                      </div>
                      <div className="text-green-400 font-bold text-sm">
                        {Math.floor(room.players * room.minBet * 0.92)} SOL
                      </div>
                    </div>
                  </div>

                  {room.status === 'waiting' && connected ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Bet Amount (SOL)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            min={room.minBet}
                            max={room.maxBet}
                            step="0.01"
                            className="flex-1 px-3 py-2 bg-dark-800 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                          />
                          <button
                            onClick={() => setBetAmount(room.minBet)}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                          >
                            Min
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={loading || betAmount < room.minBet || betAmount > room.maxBet}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            Drawing...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Target className="w-4 h-4" />
                            Enter Duel ({betAmount} SOL)
                          </div>
                        )}
                      </button>
                    </div>
                  ) : room.status === 'active' ? (
                    <div className="text-center py-3">
                      <span className="text-yellow-400 font-semibold">Duel in Progress</span>
                    </div>
                  ) : !connected ? (
                    <div className="text-center py-3">
                      <span className="text-gray-400">Connect wallet to join</span>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <span className="text-gray-400">Duel Full</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Duel Rules
              </h3>
              
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">1.</span>
                  <span>Wait for the signal - don't shoot early!</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">2.</span>
                  <span>Click/tap as fast as possible when GO appears</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">3.</span>
                  <span>Fastest reaction time wins the round</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">4.</span>
                  <span>Elimination bracket - last duelist standing wins!</span>
                </div>
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Reaction Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Duels:</span>
                  <span className="text-white font-bold">{rooms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duelists Online:</span>
                  <span className="text-white font-bold">{rooms.reduce((sum, r) => sum + r.players, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Reaction Time:</span>
                  <span className="text-white font-bold">247ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difficulty:</span>
                  <span className="text-red-400 font-bold">Hard</span>
                </div>
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Fastest Guns
              </h3>
              
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'QuickShot', time: '89ms', earnings: '156.4 SOL' },
                  { rank: 2, name: 'LightningFast', time: '94ms', earnings: '142.7 SOL' },
                  { rank: 3, name: 'BulletTime', time: '98ms', earnings: '128.9 SOL' }
                ].map((player) => (
                  <div key={player.rank} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">#{player.rank}</span>
                      <span className="text-white text-sm">{player.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-neon-green text-xs font-bold">{player.earnings}</div>
                      <div className="text-gray-400 text-xs">Best: {player.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4">Pro Tips</h3>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⚡</span>
                  <span>Stay relaxed - tension slows reactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">👀</span>
                  <span>Focus on the center of the screen</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">🎯</span>
                  <span>Practice makes perfect - warm up first</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">⏱️</span>
                  <span>Don't anticipate - wait for the signal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

