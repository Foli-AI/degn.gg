'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Zap, Play, Pause, RotateCcw } from 'lucide-react';
import { useArcadeStore } from '@/store/arcadeStore';

// Game metadata (in a real app, this would come from an API)
const GAME_METADATA: Record<string, any> = {
  'coinraid': {
    title: 'CoinRaid',
    description: 'Classic space shooter with crypto rewards. Blast asteroids and collect SOL tokens while avoiding enemy fire.',
    longDescription: 'Navigate through space in this retro-inspired shooter. Destroy asteroids to earn points and collect SOL tokens. Each level increases in difficulty with more enemies and obstacles. Master the controls and climb the leaderboard to earn massive crypto rewards.',
    difficulty: 'Medium',
    players: 1247,
    rewards: '50-500 SOL',
    controls: ['Arrow Keys: Move', 'Spacebar: Shoot', 'Shift: Boost'],
    tips: ['Collect power-ups to increase firepower', 'Avoid asteroid clusters', 'Save boost for emergencies']
  },
  'sol-serpent-royale': {
    title: 'SOL Serpent Royale',
    description: 'Battle royale snake game. Last serpent standing wins the prize pool.',
    longDescription: 'Enter the arena with up to 100 other players in this modern take on the classic snake game. Grow your serpent by collecting tokens while avoiding other players. The arena shrinks over time, forcing intense encounters. Only the last serpent standing claims the entire prize pool.',
    difficulty: 'Hard',
    players: 892,
    rewards: '100-1000 SOL',
    controls: ['Arrow Keys: Change Direction', 'Space: Boost', 'Tab: View Leaderboard'],
    tips: ['Stay near the center early game', 'Use boost strategically', 'Cut off other players']
  },
  // Add more game metadata as needed...
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { credits, setCurrentGame, isWalletConnected } = useArcadeStore();
  
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [gameStarted, setGameStarted] = React.useState(false);

  const gameData = GAME_METADATA[gameId] || {
    title: gameId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'An exciting arcade game with crypto rewards.',
    longDescription: 'Experience the thrill of classic arcade gaming with modern blockchain integration.',
    difficulty: 'Medium',
    players: 500,
    rewards: '10-100 SOL',
    controls: ['Arrow Keys: Move', 'Spacebar: Action'],
    tips: ['Practice makes perfect', 'Collect all power-ups']
  };

  React.useEffect(() => {
    setCurrentGame(gameId);
    return () => setCurrentGame(null);
  }, [gameId, setCurrentGame]);

  const handleStartGame = () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet to start playing!');
      return;
    }
    setGameStarted(true);
    setIsPlaying(true);
  };

  const handlePauseGame = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestartGame = () => {
    setGameStarted(false);
    setIsPlaying(false);
    // In a real game, this would reset the game state
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'Hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-neon-blue hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-cyber font-bold text-white mb-2">
                {gameData.title}
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl">
                {gameData.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Game Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{gameData.players.toLocaleString()}</span>
                </div>
                <div className={`flex items-center gap-1 ${getDifficultyColor(gameData.difficulty)}`}>
                  <Zap className="w-4 h-4" />
                  <span>{gameData.difficulty}</span>
                </div>
                <div className="flex items-center gap-1 text-neon-green">
                  <Trophy className="w-4 h-4" />
                  <span>{gameData.rewards}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Game Canvas */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="xl:col-span-3"
          >
            <div className="relative">
              {/* Game Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {!gameStarted ? (
                    <button
                      onClick={handleStartGame}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Game
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handlePauseGame}
                        className="btn-secondary flex items-center gap-2"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={handleRestartGame}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restart
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="cyber-border rounded-full px-3 py-1">
                    <span className="text-gray-400">Credits: </span>
                    <span className="text-neon-green font-bold">{credits.toLocaleString()}</span>
                  </div>
                  <div className="cyber-border rounded-full px-3 py-1">
                    <span className="text-gray-400">Status: </span>
                    <span className={gameStarted ? 'text-green-400' : 'text-yellow-400'}>
                      {gameStarted ? (isPlaying ? 'Playing' : 'Paused') : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Canvas Placeholder */}
              <div className="w-full h-96 bg-dark-800 rounded-lg flex items-center justify-center border border-gray-700">
                <div className="text-center">
                  <div className="text-4xl mb-4">🎮</div>
                  <p className="text-gray-400">Game will load here</p>
                </div>
              </div>

              {/* Overlay for non-started game */}
              {!gameStarted && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready to Play?</h3>
                    <p className="text-gray-300 mb-4">
                      {isWalletConnected 
                        ? 'Click Start Game to begin your adventure!' 
                        : 'Connect your wallet to start playing and earning rewards!'
                      }
                    </p>
                    <button
                      onClick={handleStartGame}
                      className="btn-primary"
                    >
                      {isWalletConnected ? 'Start Game' : 'Connect Wallet First'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Game Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Game Description */}
            <div className="cyber-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-3">About This Game</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {gameData.longDescription}
              </p>
            </div>

            {/* Controls */}
            <div className="cyber-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-3">Controls</h3>
              <ul className="space-y-2">
                {gameData.controls.map((control: string, index: number) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 bg-neon-blue rounded-full mt-2 flex-shrink-0"></span>
                    {control}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="cyber-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-3">Pro Tips</h3>
              <ul className="space-y-2">
                {gameData.tips.map((tip: string, index: number) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="w-1 h-1 bg-neon-purple rounded-full mt-2 flex-shrink-0"></span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Leaderboard Preview */}
            <div className="cyber-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-3">Top Players</h3>
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'CryptoKing', score: '125,430' },
                  { rank: 2, name: 'BlockchainBoss', score: '98,765' },
                  { rank: 3, name: 'SolanaSlayer', score: '87,234' }
                ].map((player) => (
                  <div key={player.rank} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-xs font-bold">
                        {player.rank}
                      </span>
                      <span className="text-white">{player.name}</span>
                    </div>
                    <span className="text-neon-green font-mono">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

