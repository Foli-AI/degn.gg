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
  Shield,
  Rocket
} from 'lucide-react';
// Removed wallet imports for SSR compatibility

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

export default function MoonBlasterPage() {
  const router = useRouter();
  
  const [betAmount, setBetAmount] = useState<number>(0.2);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock rooms data
  useEffect(() => {
    const mockRooms: Room[] = [
      {
        id: 'moonblaster_1',
        name: 'Asteroid Field Alpha',
        players: 2,
        maxPlayers: 6,
        minBet: 0.2,
        maxBet: 2.0,
        status: 'waiting',
        host: 'SpacePilot'
      },
      {
        id: 'moonblaster_2',
        name: 'Zero-G Combat Zone',
        players: 4,
        maxPlayers: 6,
        minBet: 0.5,
        maxBet: 5.0,
        status: 'waiting',
        host: 'AstroCommander'
      },
      {
        id: 'moonblaster_3',
        name: 'Nebula Nightmare',
        players: 1,
        maxPlayers: 4,
        minBet: 1.0,
        maxBet: 10.0,
        status: 'waiting',
        host: 'CosmicAce'
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
                🚀 Moon Blaster
              </h1>
              <p className="text-gray-400">
                Jetpack through asteroid fields and blast enemies in zero gravity combat!
              </p>
            </div>
          </div>

          <button 
            onClick={() => alert('Connect your Solana wallet to play!')}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rooms List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Space Combat Rooms</h2>
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
                  className="game-card hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        🚀
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
                        <span className="text-sm">Pilots</span>
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
                            Launching...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Rocket className="w-4 h-4" />
                            Launch Mission ({betAmount} SOL)
                          </div>
                        )}
                      </button>
                    </div>
                  ) : room.status === 'active' ? (
                    <div className="text-center py-3">
                      <span className="text-yellow-400 font-semibold">Mission in Progress</span>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <span className="text-gray-400">Hangar Full</span>
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
                <Shield className="w-5 h-5 text-blue-400" />
                Mission Briefing
              </h3>
              
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Use jetpack to navigate through asteroid fields</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Blast enemy sentries and collect power-ups</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Survive the longest or reach highest altitude</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  <span>Last pilot standing wins the mission pot!</span>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Combat Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Missions:</span>
                  <span className="text-white font-bold">{rooms.filter(r => r.status !== 'finished').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pilots Online:</span>
                  <span className="text-white font-bold">{rooms.reduce((sum, r) => sum + r.players, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Mission Time:</span>
                  <span className="text-white font-bold">4-6 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difficulty:</span>
                  <span className="text-yellow-400 font-bold">Medium</span>
                </div>
              </div>
            </div>

            {/* Top Pilots */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Ace Pilots
              </h3>
              
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'ZeroG', missions: 34, earnings: '89.2 SOL' },
                  { rank: 2, name: 'AstroAce', missions: 29, earnings: '76.8 SOL' },
                  { rank: 3, name: 'StarFighter', missions: 25, earnings: '65.4 SOL' }
                ].map((pilot) => (
                  <div key={pilot.rank} className="flex items-center justify-between p-2 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">#{pilot.rank}</span>
                      <span className="text-white text-sm">{pilot.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-neon-green text-xs font-bold">{pilot.earnings}</div>
                      <div className="text-gray-400 text-xs">{pilot.missions} missions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Power-ups Info */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4">Power-ups</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400">⚡ Speed Boost</span>
                  <span className="text-gray-400">+50% velocity</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-400">🔥 Rapid Fire</span>
                  <span className="text-gray-400">Double shot rate</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-400">🛡️ Shield</span>
                  <span className="text-gray-400">Damage immunity</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-400">💎 Score Multiplier</span>
                  <span className="text-gray-400">2x points</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

