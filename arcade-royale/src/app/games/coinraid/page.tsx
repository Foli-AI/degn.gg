'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Coins, 
  Play, 
  Clock,
  Trophy,
  Zap,
  Shield
} from 'lucide-react';

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

export default function CoinRaidPage() {
  const router = useRouter();
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before showing wallet-dependent UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock rooms data
  useEffect(() => {
    const mockRooms: Room[] = [
      {
        id: 'coinraid_1',
        name: 'Vault Raiders',
        players: 3,
        maxPlayers: 6,
        minBet: 0.1,
        maxBet: 1.0,
        status: 'waiting',
        host: 'CryptoKing'
      },
      {
        id: 'coinraid_2',
        name: 'Speed Heist',
        players: 5,
        maxPlayers: 8,
        minBet: 0.25,
        maxBet: 2.0,
        status: 'waiting',
        host: 'VaultMaster'
      },
      {
        id: 'coinraid_3',
        name: 'High Stakes Raid',
        players: 2,
        maxPlayers: 4,
        minBet: 1.0,
        maxBet: 10.0,
        status: 'waiting',
        host: 'SolanaWhale'
      },
      {
        id: 'coinraid_4',
        name: 'Beginner Friendly',
        players: 4,
        maxPlayers: 6,
        minBet: 0.05,
        maxBet: 0.5,
        status: 'active',
        host: 'NewbieHelper'
      }
    ];
    setRooms(mockRooms);
  }, []);

  const handleJoinRoom = async (roomId: string) => {
    setLoading(true);
    // Mock join logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push(`/game/${roomId}`);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'text-green-400 bg-green-500/20';
      case 'active':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'finished':
        return 'text-gray-400 bg-gray-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading CoinRaid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
                🪙 CoinRaid
              </h1>
              <p className="text-gray-400">
                Sprint through vaults, steal coins, and bank before time runs out!
              </p>
            </div>
          </div>

          <div className="text-center">
            <button 
              onClick={() => alert('Connect your Solana wallet to play!')}
              className="btn-primary"
            >
              Connect Wallet
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rooms List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Active Rooms</h2>
              <button className="btn-primary text-sm">
                Create Room
              </button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="game-card hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-yellow-500/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                        🪙
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
                        <span className="text-sm">Players</span>
                      </div>
                      <div className="text-white font-bold">
                        {room.players}/{room.maxPlayers}
                      </div>
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

                  {room.status === 'waiting' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Bet Amount (SOL)
                        </label>
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
                            Joining...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Play className="w-4 h-4" />
                            Join Room ({betAmount} SOL)
                          </div>
                        )}
                      </button>
                    </div>
                  ) : room.status === 'active' ? (
                    <div className="text-center py-3">
                      <span className="text-yellow-400 font-semibold">Match in Progress</span>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <span className="text-gray-400">Room Full</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Game Info Sidebar */}
          <div className="space-y-6">
            {/* Game Rules */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                How to Play
              </h3>
              
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">1.</span>
                  <span>Navigate through the vault maze collecting coins</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">2.</span>
                  <span>Avoid traps and obstacles that reduce your health</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">3.</span>
                  <span>Bank your coins at safe zones to secure points</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">4.</span>
                  <span>Last player standing or highest score wins!</span>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Game Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Rooms:</span>
                  <span className="text-white font-bold">{rooms.filter(r => r.status !== 'finished').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Players:</span>
                  <span className="text-white font-bold">{rooms.reduce((sum, r) => sum + r.players, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Match Time:</span>
                  <span className="text-white font-bold">3-5 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">House Edge:</span>
                  <span className="text-white font-bold">8%</span>
                </div>
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Top Players
              </h3>
              
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'VaultBandit', wins: 47, earnings: '125.6 SOL' },
                  { rank: 2, name: 'CoinMaster', wins: 42, earnings: '98.3 SOL' },
                  { rank: 3, name: 'RaidKing', wins: 38, earnings: '87.1 SOL' }
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

            {/* Connect Wallet CTA */}
            <div className="game-card bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border-neon-blue/30">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center mx-auto">
                  <Coins className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Ready to Play?</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Connect your Solana wallet to join the action and compete for real SOL prizes!
                  </p>
                </div>
                <button 
                  onClick={() => alert('Wallet connection coming soon! This is a preview of the CoinRaid game.')}
                  className="w-full btn-primary"
                >
                  Connect Wallet to Play
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}