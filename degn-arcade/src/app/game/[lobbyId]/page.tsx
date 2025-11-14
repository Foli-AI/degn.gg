"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Clock, Zap, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMatchmaker, GAME_CONFIG, GameType } from '@/hooks/useMatchmaker';

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const lobbyId = params.lobbyId as string;
  
  const {
    status,
    currentLobby,
    isLoading,
    error,
    getMockWallet
  } = useMatchmaker();

  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Handle lobby ready -> game start
  useEffect(() => {
    if (currentLobby?.status === 'ready' && !gameStarted) {
      console.log('🚀 Lobby is ready, starting countdown...');
      setCountdown(5);
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            setGameStarted(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [currentLobby?.status, gameStarted]);

  const handleLeaveLobby = async () => {
    const { socketEvents } = await import('@/lib/socket');
    socketEvents.leaveLobby();
    router.push('/find-game');
  };

  const getGameUrl = () => {
    if (!currentLobby) return '';
    
    switch (currentLobby.gameType) {
      case 'sol-bird':
        return `/games/sol-bird/client/index.html?lobby=${lobbyId}`;
      case 'connect4':
        return `/games/connect4/client?lobby=${lobbyId}`;
      case 'slither':
        return `/games/slither/client?lobby=${lobbyId}`;
      case 'agar':
        return `/games/agar/client?lobby=${lobbyId}`;
      case 'coinflip':
        return `/games/coinflip/client?lobby=${lobbyId}`;
      default:
        return '';
    }
  };

  const config = currentLobby ? GAME_CONFIG[currentLobby.gameType as GameType] : null;
  const wallet = getMockWallet();

  if (status === 'disconnected' || status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to matchmaker...</p>
        </div>
      </div>
    );
  }

  if (!currentLobby && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Lobby Not Found</h1>
          <p className="text-gray-400 mb-6">This lobby may have been closed or doesn&apos;t exist.</p>
          <Link
            href="/find-game"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-semibold text-white transition-all hover:shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Find Game
          </Link>
        </div>
      </div>
    );
  }

  if (gameStarted && currentLobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Game Header */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLeaveLobby}
                  className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm transition-colors hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Leave Game
                </button>
                <h1 className="text-xl font-bold text-white">
                  {config?.name} - Game in Progress
                </h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="h-4 w-4" />
                  <span>{currentLobby.players.length} players</span>
                </div>
                {currentLobby.entryAmount && (
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-400 font-medium">
                      {(currentLobby.entryAmount * currentLobby.players.length).toFixed(3)} SOL pot
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game Client Container */}
        <div className="h-[calc(100vh-80px)]">
          {currentLobby.gameType === 'sol-bird' ? (
            // Embed Sol-Bird game client
            <iframe
              src={getGameUrl()}
              className="w-full h-full border-0"
              title="Sol Bird Game"
              allow="fullscreen"
            />
          ) : (
            // Placeholder for other games
            <div className="h-full flex items-center justify-center bg-black/30">
              <div className="text-center max-w-2xl mx-auto p-8">
                <div className="text-6xl mb-6">🎮</div>
                <h2 className="text-2xl font-bold text-white mb-4">Game Client Loading...</h2>
                <p className="text-gray-300 mb-6">
                  This is where the {config?.name} game client would be embedded.
                  The game client should connect to the matchmaker server for real-time gameplay.
                </p>
                
                <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Integration Points:</h3>
                  <div className="text-left space-y-2 text-sm text-gray-300">
                    <div>• Game URL: <code className="text-cyan-400">{getGameUrl()}</code></div>
                    <div>• Lobby ID: <code className="text-cyan-400">{lobbyId}</code></div>
                    <div>• Players: {currentLobby.players.map(p => p.username).join(', ')}</div>
                    <div>• Entry Amount: {currentLobby.entryAmount || 0} SOL</div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <a
                    href={getGameUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-semibold text-white transition-all hover:shadow-lg"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Game Client
                  </a>
                  <button
                    onClick={handleLeaveLobby}
                    className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Leave Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/find-game"
                className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Find Game
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Game Lobby
              </h1>
            </div>
            
            {wallet && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span>{wallet.username}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 border border-red-400/50 p-4 text-red-300">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg">Loading lobby...</p>
          </div>
        ) : currentLobby ? (
          <div className="space-y-8">
            {/* Countdown Overlay */}
            {countdown !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              >
                <div className="text-center">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="text-8xl font-bold text-white mb-4"
                  >
                    {countdown}
                  </motion.div>
                  <p className="text-2xl text-gray-300">Game starting...</p>
                </div>
              </motion.div>
            )}

            {/* Game Info */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{config?.name}</h2>
                  <p className="text-gray-400">
                    {config?.type === '1v1' ? '1v1 Match' : 'Battle Royale'} • {currentLobby.players.length}/{currentLobby.maxPlayers} players
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">
                    {currentLobby.entryAmount ? `${(currentLobby.entryAmount * currentLobby.maxPlayers).toFixed(3)} SOL` : 'Free Play'}
                  </div>
                  <div className="text-sm text-gray-400">Total Prize Pool</div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center mb-6">
                {currentLobby.status === 'waiting' ? (
                  <div className="flex items-center gap-3 rounded-full bg-yellow-500/20 px-6 py-3">
                    <Clock className="h-5 w-5 text-yellow-400 animate-pulse" />
                    <span className="text-yellow-400 font-medium">
                      Waiting for {currentLobby.maxPlayers - currentLobby.players.length} more player{currentLobby.maxPlayers - currentLobby.players.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : currentLobby.status === 'ready' ? (
                  <div className="flex items-center gap-3 rounded-full bg-green-500/20 px-6 py-3">
                    <Zap className="h-5 w-5 text-green-400 animate-pulse" />
                    <span className="text-green-400 font-medium">Ready to start!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-full bg-blue-500/20 px-6 py-3">
                    <Users className="h-5 w-5 text-blue-400" />
                    <span className="text-blue-400 font-medium">Game in progress</span>
                  </div>
                )}
              </div>

              {/* Game Rules */}
              <div className="rounded-xl bg-white/5 border border-white/10 p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Game Rules</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  {currentLobby.gameType === 'sol-bird' && (
                    <>
                      <div>• Flap through pipes and survive as long as possible</div>
                      <div>• Last player alive wins the pot</div>
                      <div>• If multiple players survive the time limit, pot is split equally</div>
                      <div>• Game duration: ~3 minutes</div>
                    </>
                  )}
                  {currentLobby.gameType === 'slither' && (
                    <>
                      <div>• Grow your snake by eating pellets</div>
                      <div>• Trap other players to eliminate them</div>
                      <div>• Last snake alive wins the pot</div>
                      <div>• No respawning - elimination is permanent</div>
                    </>
                  )}
                  {currentLobby.gameType === 'agar' && (
                    <>
                      <div>• Absorb smaller cells to grow your mass</div>
                      <div>• Split strategically to catch opponents</div>
                      <div>• Respawning allowed until timer ends</div>
                      <div>• Largest mass wins: 60% to 1st, 30% to 2nd, 10% to 3rd</div>
                    </>
                  )}
                  {(currentLobby.gameType === 'connect4' || currentLobby.gameType === 'coinflip') && (
                    <>
                      <div>• 1v1 match with winner takes all</div>
                      <div>• Entry fee: {currentLobby.entryAmount} SOL per player</div>
                      <div>• Winner receives the full pot minus platform fee</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Players List */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Players ({currentLobby.players.length}/{currentLobby.maxPlayers})</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLobby.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-4"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                      {player.username?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{player.username}</div>
                      <div className="text-xs text-gray-400">
                        {player.walletAddress ? 
                          `${player.walletAddress.slice(0, 4)}...${player.walletAddress.slice(-4)}` : 
                          'No wallet connected'
                        }
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                        Host
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: currentLobby.maxPlayers - currentLobby.players.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center gap-4 rounded-xl border-2 border-dashed border-white/20 p-4"
                  >
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-400">Waiting for player...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleLeaveLobby}
                className="rounded-xl border border-white/20 px-8 py-4 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Leave Lobby
              </button>
              
              {currentLobby.status === 'ready' && (
                <div className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-4 font-semibold text-white">
                  Game will start automatically
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}