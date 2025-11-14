"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Trophy, Clock } from 'lucide-react';
import { useMatchmaker } from '@/hooks/useMatchmaker';
import GameEmbed from '@/components/GameEmbed';
import { socket } from '@/lib/socket';

export default function SolBirdGamePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connected, publicKey, playerId, currentLobby } = useMatchmaker();
  
  const lobbyId = searchParams.get('lobbyId');
  const playerCount = parseInt(searchParams.get('players') || '2');
  const entryAmount = parseFloat(searchParams.get('entry') || '0');
  
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading');
  const [players, setPlayers] = useState<Array<{
    id: string;
    username: string;
    isAlive: boolean;
    score: number;
  }>>([]);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [aliveCount, setAliveCount] = useState(0);
  const [matchKey, setMatchKey] = useState<string | null>(searchParams.get('matchKey'));
  const [wsUrl, setWsUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParam = searchParams.get('wsUrl');
      if (urlParam) return urlParam;
      
      // Use environment variable or construct from matchmaker URL
      const matchmakerUrl = process.env.NEXT_PUBLIC_MATCHMAKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      // Convert http:// to ws:// or https:// to wss://
      return matchmakerUrl.replace(/^http/, 'ws');
    }
    return 'ws://localhost:3001';
  });

  useEffect(() => {
    if (!lobbyId) {
      router.push('/find-game');
      return;
    }

    // Initialize game
    setGameState('playing');
    setGameStartTime(Date.now());
    
    // Initialize players from current lobby if available
    if (currentLobby && currentLobby.players) {
      const initialPlayers = currentLobby.players.map((p, i) => ({
        id: p.id,
        username: p.username || `Player ${i + 1}`,
        isAlive: true,
        score: 0
      }));
      setPlayers(initialPlayers);
      setAliveCount(initialPlayers.length);
    } else {
      // Fallback to mock players
      const mockPlayers = Array.from({ length: playerCount }, (_, i) => ({
        id: `player_${i}`,
        username: i === 0 && publicKey ? `You (${publicKey.toBase58().slice(-4)})` : `Player ${i + 1}`,
        isAlive: true,
        score: 0
      }));
      setPlayers(mockPlayers);
      setAliveCount(mockPlayers.length);
    }
  }, [lobbyId, playerCount, publicKey, router, currentLobby]);

  // Listen for WebSocket messages from matchmaker
  useEffect(() => {
    const handleLobbyUpdate = (data: any) => {
      console.log('[SolBird Page] LOBBY_UPDATE received:', data);
      
      if (data.type === 'LOBBY_UPDATE' && data.players) {
        const updatedPlayers = data.players.map((p: any) => ({
          id: p.id || p.playerId,
          username: p.username || `Player ${p.id?.slice(-4) || 'Unknown'}`,
          isAlive: p.isAlive !== false,
          score: p.score || 0
        }));
        
        setPlayers(updatedPlayers);
        setAliveCount(data.aliveCount || updatedPlayers.filter((p: any) => p.isAlive).length);
        
        // Check for game over
        if (data.aliveCount === 1 && gameState === 'playing') {
          const winner = updatedPlayers.find((p: any) => p.isAlive);
          if (winner) {
            setGameState('finished');
            console.log('[SolBird Page] Game Over! Winner:', winner);
          }
        }
      }
    };

    const handleGameStart = (data: any) => {
      console.log('[SolBird Page] GAME_START received:', data);
      setGameState('playing');
      setGameStartTime(Date.now());
      
      // Extract matchKey and wsUrl from match_start event
      if (data.matchKey) {
        setMatchKey(data.matchKey);
      }
      if (data.wsUrl) {
        setWsUrl(data.wsUrl);
      }
      
      if (data.players) {
        const gamePlayers = data.players.map((p: any) => ({
          id: p.id || p.playerId,
          username: p.username || `Player ${p.id?.slice(-4) || 'Unknown'}`,
          isAlive: true,
          score: 0
        }));
        setPlayers(gamePlayers);
        setAliveCount(gamePlayers.length);
      }
    };

    // Also listen for match_start event
    const handleMatchStart = (data: any) => {
      console.log('[SolBird Page] match_start received:', data);
      if (data.matchKey) {
        setMatchKey(data.matchKey);
      }
      if (data.wsUrl) {
        setWsUrl(data.wsUrl);
      }
      handleGameStart(data);
    };

    const handleGameOver = (data: any) => {
      console.log('[SolBird Page] GAME_OVER received:', data);
      setGameState('finished');
    };

    socket.on('LOBBY_UPDATE', handleLobbyUpdate);
    socket.on('GAME_START', handleGameStart);
    socket.on('match_start', handleMatchStart);
    socket.on('game:over', handleGameOver);

    return () => {
      socket.off('LOBBY_UPDATE', handleLobbyUpdate);
      socket.off('GAME_START', handleGameStart);
      socket.off('match_start', handleMatchStart);
      socket.off('game:over', handleGameOver);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeElapsed(Date.now() - gameStartTime);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [gameState, gameStartTime]);

  // Build client game URL with all parameters including WebSocket URL
  const username = currentLobby?.players?.find(p => p.id === playerId)?.username || 
                   (publicKey ? `Player_${publicKey.toBase58().slice(-4)}` : `Player_${Date.now().toString().slice(-4)}`);
  const finalMatchKey = matchKey || `${lobbyId}_${Date.now()}`;
  
  const clientSrc = `/games/sol-bird/client/index.html?lobbyId=${encodeURIComponent(lobbyId || '')}&players=${encodeURIComponent(playerCount.toString())}&entry=${encodeURIComponent(entryAmount.toString())}&playerId=${encodeURIComponent(playerId || '')}&wsUrl=${encodeURIComponent(wsUrl)}&username=${encodeURIComponent(username)}&matchKey=${encodeURIComponent(finalMatchKey)}`;

  const handleLeaveGame = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      router.push('/find-game');
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                <h1 className="text-xl font-bold text-white">Sol Bird - Multiplayer Flappy</h1>
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
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">
                  {formatTime(timeElapsed)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Game Area */}
        <div className="flex-1 p-4">
          <div className="h-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            {gameState === 'loading' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-lg">Loading Sol Bird...</p>
                </div>
              </div>
            ) : (
              <GameEmbed 
                src={clientSrc} 
                width="100%" 
                height="100%" 
                useIframe={true}
                allowFullScreen={true}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 p-4">
          <div className="space-y-4">
            {/* Game Status */}
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Game Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400 font-medium">
                    {gameState === 'loading' ? 'Loading...' : 
                     gameState === 'playing' ? 'In Progress' : 'Finished'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white font-medium">{formatTime(timeElapsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entry Fee:</span>
                  <span className="text-yellow-400 font-medium">
                    {entryAmount > 0 ? `${entryAmount} SOL` : 'Free'}
                  </span>
                </div>
              </div>
            </div>

            {/* Players List */}
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Players ({players.length})</h3>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.isAlive ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${player.isAlive ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-white font-medium">{player.username}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{player.score}</div>
                      <div className="text-xs text-gray-400">
                        {player.isAlive ? 'Alive' : 'Dead'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• Press <kbd className="bg-white/10 px-2 py-1 rounded">SPACE</kbd> or click to flap</div>
                <div>• Avoid the pipes and stay alive</div>
                <div>• Last player alive wins the pot</div>
                <div>• Score increases with time survived</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
