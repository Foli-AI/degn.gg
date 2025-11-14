"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Clock, Coins } from 'lucide-react';
import { useMatchmaker } from '@/hooks/useMatchmaker';

export default function CoinflipGamePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connected, publicKey } = useMatchmaker();
  
  const lobbyId = searchParams.get('lobbyId');
  const playerCount = parseInt(searchParams.get('players') || '2');
  const entryAmount = parseFloat(searchParams.get('entry') || '0');
  
  const [gameState, setGameState] = useState<'waiting' | 'flipping' | 'finished'>('waiting');
  const [players, setPlayers] = useState<Array<{
    id: string;
    username: string;
    choice: 'heads' | 'tails' | null;
    isWinner: boolean;
  }>>([]);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [flipAnimation, setFlipAnimation] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!lobbyId) {
      router.push('/find-game');
      return;
    }

    // Initialize players
    const mockPlayers = Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      username: i === 0 && publicKey ? `You (${publicKey.toBase58().slice(-4)})` : `Player ${i + 1}`,
      choice: null as 'heads' | 'tails' | null,
      isWinner: false
    }));
    setPlayers(mockPlayers);

    // Start countdown
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          startGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [lobbyId, playerCount, publicKey, router]);

  const startGame = () => {
    // Auto-assign choices for demo
    setPlayers(prev => prev.map((player, i) => ({
      ...player,
      choice: i === 0 ? 'heads' : 'tails'
    })));

    setGameState('flipping');
    setFlipAnimation(true);

    // Simulate coin flip after animation
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinResult(result);
      setFlipAnimation(false);
      
      // Determine winner
      setPlayers(prev => prev.map(player => ({
        ...player,
        isWinner: player.choice === result
      })));
      
      setGameState('finished');
    }, 3000);
  };

  const handleLeaveGame = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      router.push('/find-game');
    }
  };

  const makeChoice = (choice: 'heads' | 'tails') => {
    if (gameState !== 'waiting') return;
    
    setPlayers(prev => prev.map((player, i) => 
      i === 0 ? { ...player, choice } : player
    ));
  };

  if (!lobbyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Game Session</h1>
          <p className="text-gray-400 mb-6">No lobby ID provided.</p>
          <button
            onClick={() => router.push('/find-game')}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-semibold text-white"
          >
            Back to Find Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLeaveGame}
                className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Leave Game
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Coinflip - 1v1 Match</h1>
                <p className="text-sm text-gray-400">Lobby: {lobbyId}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-white">{playerCount} players</span>
              </div>
              
              {entryAmount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">
                    {(entryAmount * playerCount).toFixed(3)} SOL pot
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Game Status */}
        <div className="text-center mb-8">
          {gameState === 'waiting' && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Make Your Choice</h2>
              <p className="text-gray-400">Game starts in {countdown} seconds</p>
            </div>
          )}
          {gameState === 'flipping' && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Flipping Coin...</h2>
              <p className="text-gray-400">Good luck!</p>
            </div>
          )}
          {gameState === 'finished' && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {coinResult === 'heads' ? '🪙 Heads!' : '🪙 Tails!'}
              </h2>
              <p className="text-gray-400">
                Winner: {players.find(p => p.isWinner)?.username || 'None'}
              </p>
            </div>
          )}
        </div>

        {/* Coin Animation */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <motion.div
              className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl"
              animate={flipAnimation ? {
                rotateY: [0, 180, 360, 540, 720, 900, 1080],
                scale: [1, 1.2, 1, 1.2, 1, 1.2, 1]
              } : {}}
              transition={{ duration: 3, ease: "easeInOut" }}
            >
              <AnimatePresence mode="wait">
                {!flipAnimation && coinResult && (
                  <motion.div
                    key={coinResult}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    {coinResult === 'heads' ? '👑' : '🪙'}
                  </motion.div>
                )}
                {flipAnimation && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Coins className="h-12 w-12" />
                  </motion.div>
                )}
                {!flipAnimation && !coinResult && (
                  <Coins className="h-12 w-12" />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Choice Buttons */}
        {gameState === 'waiting' && (
          <div className="flex justify-center gap-8 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => makeChoice('heads')}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                players[0]?.choice === 'heads'
                  ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                  : 'border-white/20 bg-black/30 text-white hover:border-yellow-400/50'
              }`}
            >
              <div className="text-4xl">👑</div>
              <div className="font-semibold">HEADS</div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => makeChoice('tails')}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                players[0]?.choice === 'tails'
                  ? 'border-blue-400 bg-blue-400/20 text-blue-400'
                  : 'border-white/20 bg-black/30 text-white hover:border-blue-400/50'
              }`}
            >
              <div className="text-4xl">🪙</div>
              <div className="font-semibold">TAILS</div>
            </motion.button>
          </div>
        )}

        {/* Players */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className={`rounded-2xl border p-6 ${
                gameState === 'finished' && player.isWinner
                  ? 'border-green-400 bg-green-400/20'
                  : 'border-white/10 bg-black/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{player.username}</h3>
                {gameState === 'finished' && player.isWinner && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold">Winner!</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {player.choice === 'heads' ? '👑' : player.choice === 'tails' ? '🪙' : '❓'}
                </div>
                <div className="text-sm text-gray-400">
                  {player.choice ? `Chose ${player.choice}` : 'Choosing...'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Results */}
        {gameState === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Match Results</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Result:</span>
                  <span className="text-white font-medium">{coinResult?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Winner:</span>
                  <span className="text-green-400 font-medium">
                    {players.find(p => p.isWinner)?.username || 'None'}
                  </span>
                </div>
                {entryAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payout:</span>
                    <span className="text-yellow-400 font-medium">
                      {(entryAmount * playerCount * 0.9).toFixed(3)} SOL
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => router.push('/find-game')}
                className="mt-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-semibold text-white transition-all hover:shadow-lg"
              >
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
