'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Gamepad2, 
  Users, 
  Coins, 
  Trophy, 
  Play, 
  Info,
  Star,
  Clock,
  Zap
} from 'lucide-react';
import { GameLobby } from '@/components/GameLobby';
import { Leaderboard } from '@/components/Leaderboard';

const games = [
  {
    id: 'CoinRaid',
    name: 'Coin Raid',
    icon: '🪙',
    description: 'Navigate through obstacles while collecting coins. Last player standing wins the pot!',
    difficulty: 'Easy',
    avgDuration: '2-3 min',
    maxPlayers: 8,
    minBet: 10,
    maxBet: 1000,
    features: ['Real-time multiplayer', 'Obstacle avoidance', 'Coin collection', 'Elimination rounds'],
    popularity: 95,
    activeRooms: 12
  },
  {
    id: 'SolSerpentRoyale',
    name: 'Sol Serpent Royale',
    icon: '🐍',
    description: 'Snake battle royale where players grow by consuming others. Survive to claim victory!',
    difficulty: 'Medium',
    avgDuration: '3-5 min',
    maxPlayers: 6,
    minBet: 25,
    maxBet: 2000,
    features: ['Snake mechanics', 'Growth system', 'PvP combat', 'Shrinking arena'],
    popularity: 88,
    activeRooms: 8
  },
  {
    id: 'QuickDrawArena',
    name: 'Quick Draw Arena',
    icon: '🎯',
    description: 'Fast-paced shooting competition. Hit targets quickly and accurately to outgun opponents!',
    difficulty: 'Hard',
    avgDuration: '1-2 min',
    maxPlayers: 4,
    minBet: 50,
    maxBet: 5000,
    features: ['Precision shooting', 'Moving targets', 'Speed bonus', 'Accuracy scoring'],
    popularity: 82,
    activeRooms: 6
  },
  {
    id: 'MoonBlaster',
    name: 'Moon Blaster',
    icon: '🚀',
    description: 'Space shooter adventure. Dodge asteroids and blast enemies in zero gravity combat!',
    difficulty: 'Medium',
    avgDuration: '4-6 min',
    maxPlayers: 6,
    minBet: 20,
    maxBet: 1500,
    features: ['Space combat', 'Asteroid fields', 'Power-ups', 'Zero gravity'],
    popularity: 76,
    activeRooms: 4
  }
];

export default function GamesPage() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showGameInfo, setShowGameInfo] = useState<string | null>(null);

  const handleRoomSelect = (roomId: string) => {
    router.push(`/game/${roomId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-400 bg-green-500/20';
      case 'Medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'Hard':
        return 'text-red-400 bg-red-500/20';
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
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-cyber font-bold mb-4">
            <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
              Game Arcade
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose your game, place your bets, and compete for crypto rewards in real-time multiplayer matches
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Games Selection */}
          <div className="lg:col-span-2">
            {!selectedGame ? (
              <>
                {/* Game Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {games.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="game-card group cursor-pointer hover:bg-gradient-to-br hover:from-neon-purple/10 hover:to-neon-blue/10"
                      onClick={() => setSelectedGame(game.id)}
                    >
                      {/* Game Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{game.icon}</div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{game.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(game.difficulty)}`}>
                                {game.difficulty}
                              </span>
                              <span className="text-sm text-gray-400">{game.avgDuration}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowGameInfo(showGameInfo === game.id ? null : game.id);
                          }}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Info className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>

                      {/* Game Info Expandable */}
                      {showGameInfo === game.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mb-4 p-4 bg-dark-800 rounded-lg border border-gray-700"
                        >
                          <p className="text-gray-300 text-sm mb-3">{game.description}</p>
                          <div className="space-y-2">
                            <h4 className="text-white font-semibold text-sm">Features:</h4>
                            <div className="grid grid-cols-2 gap-1">
                              {game.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs text-gray-400">
                                  <Star className="w-3 h-3 text-neon-blue" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Game Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Max</span>
                          </div>
                          <div className="text-white font-bold">{game.maxPlayers}</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                            <Coins className="w-4 h-4" />
                            <span className="text-sm">Range</span>
                          </div>
                          <div className="text-neon-blue font-bold text-sm">
                            {game.minBet}-{game.maxBet}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">Rooms</span>
                          </div>
                          <div className="text-green-400 font-bold">{game.activeRooms}</div>
                        </div>
                      </div>

                      {/* Popularity Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">Popularity</span>
                          <span className="text-sm text-white font-semibold">{game.popularity}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-neon-blue to-neon-purple h-2 rounded-full transition-all duration-500"
                            style={{ width: `${game.popularity}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Play Button */}
                      <button 
                        onClick={() => {
                          if (game.id === 'CoinRaid') {
                            router.push('/games/coinraid');
                          } else if (game.id === 'MoonBlaster') {
                            router.push('/games/moonblaster');
                          } else if (game.id === 'SolSerpentRoyale') {
                            router.push('/games/serpent');
                          } else if (game.id === 'QuickDrawArena') {
                            router.push('/games/quickdraw');
                          } else {
                            // For games without dedicated pages, show lobby
                            setSelectedGame(game.id);
                          }
                        }}
                        className="w-full btn-primary group-hover:bg-gradient-to-r group-hover:from-neon-blue group-hover:to-neon-purple transition-all duration-300"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {game.id === 'CoinRaid' || game.id === 'MoonBlaster' || game.id === 'SolSerpentRoyale' || game.id === 'QuickDrawArena' 
                          ? 'Play Now' 
                          : 'Enter Lobby'
                        }
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {[
                    { label: 'Total Games', value: games.length.toString(), icon: Gamepad2 },
                    { label: 'Active Rooms', value: games.reduce((sum, g) => sum + g.activeRooms, 0).toString(), icon: Users },
                    { label: 'Min Bet', value: `${Math.min(...games.map(g => g.minBet))} SOL`, icon: Coins },
                    { label: 'Max Payout', value: `${Math.max(...games.map(g => g.maxBet))} SOL`, icon: Trophy }
                  ].map((stat, index) => (
                    <div key={index} className="game-card text-center">
                      <stat.icon className="w-8 h-8 text-neon-blue mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </>
            ) : (
              /* Game Lobby */
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="btn-secondary"
                  >
                    ← Back to Games
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{games.find(g => g.id === selectedGame)?.icon}</div>
                    <h2 className="text-2xl font-bold text-white">
                      {games.find(g => g.id === selectedGame)?.name} Lobby
                    </h2>
                  </div>
                </div>
                
                <GameLobby onRoomSelect={handleRoomSelect} />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leaderboard */}
            <Leaderboard compact maxEntries={5} />

            {/* Live Activity */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Live Activity
              </h3>
              
              <div className="space-y-3">
                {[
                  { user: 'CryptoKing', action: 'won 1,250 SOL', game: 'Coin Raid', time: '2m ago' },
                  { user: 'SolanaQueen', action: 'joined room', game: 'Serpent Royale', time: '3m ago' },
                  { user: 'ArcadeMaster', action: 'created room', game: 'Quick Draw', time: '5m ago' },
                  { user: 'GameChanger', action: 'won 850 SOL', game: 'Moon Blaster', time: '7m ago' },
                  { user: 'PixelPro', action: 'placed bet', game: 'Coin Raid', time: '9m ago' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-dark-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold text-sm">{activity.user}</span>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                    <p className="text-sm text-gray-400">{activity.action}</p>
                    <p className="text-xs text-neon-blue">{activity.game}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tournament Info */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Daily Tournament
              </h3>
              
              <div className="text-center space-y-3">
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">5,000 SOL</div>
                  <div className="text-sm text-gray-400">Prize Pool</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white font-semibold">Starts in</div>
                    <div className="text-neon-blue">2h 34m</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Entry Fee</div>
                    <div className="text-neon-blue">100 SOL</div>
                  </div>
                </div>
                
                <button className="w-full btn-primary text-sm">
                  Register Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}