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
  Shield
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

export default function SerpentRoyalePage() {
  const router = useRouter();
  const { connected } = useWallet();
  
  const [betAmount, setBetAmount] = useState<number>(0.25);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mockRooms: Room[] = [
      {
        id: 'serpent_1',
        name: 'Neon Arena',
        players: 3,
        maxPlayers: 6,
        minBet: 0.25,
        maxBet: 2.0,
        status: 'waiting',
        host: 'SerpentKing'
      },
      {
        id: 'serpent_2',
        name: 'Cyber Pit',
        players: 2,
        maxPlayers: 8,
        minBet: 0.5,
        maxBet: 5.0,
        status: 'waiting',
        host: 'NeonViper'
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
                🐍 SOL Serpent Royale
              </h1>
              <p className="text-gray-400">
                Grow your serpent by consuming others. Last snake standing wins!
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
              <h2 className="text-xl font-bold text-white">Battle Arenas</h2>
              <button className="btn-primary text-sm">Create Arena</button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="game-card hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        🐍
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
                        <span className="text-sm">Serpents</span>
                      </div>
                      <div className="text-white font-bold">{room.players}/{room.maxPlayers}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Coins className="w-4 h-4" />
                        <span className="text-sm">Entry</span>
                      </div>
                      <div className="text-neon-blue font-bold text-sm">
                        {room.minBet}-{room.maxBet} SOL
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm">Prize</span>
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
                            Slithering In...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Play className="w-4 h-4" />
                            Enter Arena ({betAmount} SOL)
                          </div>
                        )}
                      </button>
                    </div>
                  ) : room.status === 'active' ? (
                    <div className="text-center py-3">
                      <span className="text-yellow-400 font-semibold">Battle in Progress</span>
                    </div>
                  ) : !connected ? (
                    <div className="text-center py-3">
                      <span className="text-gray-400">Connect wallet to join</span>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <span className="text-gray-400">Arena Full</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Battle Rules
              </h3>
              
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">1.</span>
                  <span>Consume glowing orbs to grow your serpent</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">2.</span>
                  <span>Trap other serpents with your body</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">3.</span>
                  <span>Avoid hitting walls or other serpents</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">4.</span>
                  <span>Last serpent alive claims the prize!</span>
                </div>
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Arena Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Arenas:</span>
                  <span className="text-white font-bold">{rooms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Serpents Online:</span>
                  <span className="text-white font-bold">{rooms.reduce((sum, r) => sum + r.players, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Battle Time:</span>
                  <span className="text-white font-bold">3-5 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difficulty:</span>
                  <span className="text-yellow-400 font-bold">Medium</span>
                </div>
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Serpent Lords
              </h3>
              
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'SerpentKing', wins: 52, earnings: '134.7 SOL' },
                  { rank: 2, name: 'NeonViper', wins: 48, earnings: '118.3 SOL' },
                  { rank: 3, name: 'CobraStrike', wins: 41, earnings: '95.8 SOL' }
                ].map((player) => (
                  <div key={player.rank} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">#{player.rank}</span>
                      <span className="text-white text-sm">{player.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-neon-green text-xs font-bold">{player.earnings}</div>
                      <div className="text-gray-400 text-xs">{player.wins} wins</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

