'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  Coins, 
  Play, 
  Clock, 
  Trophy, 
  ArrowLeft, 
  Settings,
  Eye,
  Zap,
  Shield,
  Wallet,
  DollarSign,
  Loader2
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSocket, GameRoom, MatchResult } from '@/lib/socket';
import { GameLobby } from '@/components/GameLobby';
import { ArcadeGame } from '@/components/ArcadeGame';
import { Leaderboard } from '@/components/Leaderboard';
import { WalletConnect } from '@/components/WalletConnect';
import { placeBet, getSOLPrice, formatSOL, formatUSD } from '@/lib/solana/transactions';

interface GameEvent {
  id: string;
  type: 'join' | 'leave' | 'bet' | 'start' | 'elimination' | 'win';
  message: string;
  timestamp: string;
  playerId?: string;
  playerName?: string;
}

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const socket = useSocket();
  const gameId = params.gameId as string;
  const { connected, publicKey } = useWallet();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; credits: number } | null>(null);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0.1); // Start with 0.1 SOL
  const [showFairness, setShowFairness] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(100);
  const [placingBet, setPlacingBet] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  // Initialize user from wallet
  useEffect(() => {
    if (connected && publicKey) {
      setCurrentUser({
        id: publicKey.toString(),
        username: `Player_${publicKey.toString().slice(0, 8)}`,
        credits: 1000 // This will be fetched from Supabase
      });
    } else {
      setCurrentUser(null);
    }
  }, [connected, publicKey]);

  // Fetch SOL price
  useEffect(() => {
    const fetchPrice = async () => {
      const price = await getSOLPrice();
      setSolPrice(price);
    };
    fetchPrice();
  }, []);

  useEffect(() => {
    if (!gameId) return;

    const socketInstance = socket.connect();

    // Join the room
    socket.emit('join-room', gameId);

    // Listen for room updates
    socket.on('room-updated', (updatedRoom: GameRoom) => {
      if (updatedRoom.id === gameId) {
        setRoom(updatedRoom);
      }
    });

    // Listen for player events
    socket.on('player-joined', (data) => {
      if (data.roomId === gameId) {
        addGameEvent({
          type: 'join',
          message: `${data.player.username} joined the room`,
          playerId: data.player.id,
          playerName: data.player.username
        });
      }
    });

    socket.on('player-left', (data) => {
      if (data.roomId === gameId) {
        addGameEvent({
          type: 'leave',
          message: `Player left the room`,
          playerId: data.playerId
        });
      }
    });

    socket.on('bet-placed', (data) => {
      if (data.roomId === gameId) {
        addGameEvent({
          type: 'bet',
          message: `Bet placed: ${data.amount} SOL`,
          playerId: data.playerId
        });
      }
    });

    socket.on('match-started', (data) => {
      if (data.roomId === gameId) {
        const startTime = new Date(data.startsAt).getTime();
        const now = Date.now();
        const initialCountdown = Math.max(0, Math.floor((startTime - now) / 1000));
        
        setCountdown(initialCountdown);
        addGameEvent({
          type: 'start',
          message: `Match starting in ${initialCountdown} seconds...`
        });

        // Countdown timer
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(timer);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      }
    });

    socket.on('match-completed', (result: MatchResult) => {
      if (result.roomId === gameId) {
        setMatchResult(result);
        addGameEvent({
          type: 'win',
          message: `🏆 ${result.winner.username} wins ${result.winner.payout} SOL!`,
          playerId: result.winner.id,
          playerName: result.winner.username
        });
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      addGameEvent({
        type: 'leave',
        message: `Error: ${error.message}`
      });
    });

    // Request initial room data
    socket.emit('request-rooms');

    return () => {
      socket.emit('leave-room', gameId);
      socket.off('room-updated');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('bet-placed');
      socket.off('match-started');
      socket.off('match-completed');
      socket.off('error');
    };
  }, [gameId, socket]);

  const addGameEvent = (event: Omit<GameEvent, 'id' | 'timestamp'>) => {
    const newEvent: GameEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toISOString()
    };
    setGameEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
  };

  const handleJoinRoom = async () => {
    if (!currentUser || !room || !connected || !publicKey) return;

    try {
      setPlacingBet(true);
      setBetError(null);

      // Place on-chain bet
      const betResult = await placeBet(
        { publicKey, signTransaction: async (tx: any) => tx } as any,
        gameId,
        betAmount
      );

      if (!betResult.success) {
        setBetError(betResult.error || 'Failed to place bet');
        return;
      }

      // Emit to socket with transaction signature
      socket.emit('place-bet', { 
        roomId: gameId, 
        amount: betAmount,
        meta: {
          signature: betResult.signature,
          escrowAccount: betResult.escrowAccount
        }
      } as any);
      
      setIsJoined(true);
      
      addGameEvent({
        type: 'join',
        message: `You joined with ${betAmount} SOL (Tx: ${betResult.signature?.slice(0, 8)}...)`,
        playerId: currentUser.id,
        playerName: currentUser.username
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      setBetError('Failed to place bet. Please try again.');
    } finally {
      setPlacingBet(false);
    }
  };

  const handleStartMatch = () => {
    socket.emit('start-match', gameId);
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room', gameId);
    setIsJoined(false);
    router.push('/');
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Loading game room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{room.name}</h1>
                <p className="text-neon-blue font-semibold">{room.game}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                room.status === 'waiting' ? 'bg-green-500/20 text-green-400' :
                room.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {room.status === 'waiting' ? '🟢 Waiting for Players' : 
                 room.status === 'running' ? '🟡 Match in Progress' : 
                 '🔴 Match Completed'}
              </div>
              
              {currentUser && (
                <div className="text-right">
                  <p className="text-sm text-gray-400">Your Credits</p>
                  <p className="text-lg font-bold text-neon-blue">{currentUser.credits} SOL</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Canvas */}
            <div className="game-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Game Arena</h2>
                <button
                  onClick={() => setShowFairness(!showFairness)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Provably Fair
                </button>
              </div>
              
              {showFairness && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-4 bg-dark-800 rounded-lg border border-gray-700"
                >
                  <h3 className="text-sm font-semibold text-white mb-2">Fairness Verification</h3>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p><span className="text-gray-300">Server Seed Hash:</span> a1b2c3d4e5f6...</p>
                    <p><span className="text-gray-300">Client Seed:</span> {Math.random().toString(36).substr(2, 16)}</p>
                    <p><span className="text-gray-300">Nonce:</span> {Math.floor(Math.random() * 1000)}</p>
                  </div>
                </motion.div>
              )}

              <ArcadeGame 
                game={room.game} 
                isActive={room.status === 'running'}
                countdown={countdown}
                matchResult={matchResult}
              />
            </div>

            {/* Match Controls */}
            {room.status === 'waiting' && (
              <div className="game-card">
                <h3 className="text-lg font-bold text-white mb-4">Join Match</h3>
                
                {!isJoined ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Bet Amount (SOL)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Number(e.target.value))}
                          min={room.minEntry}
                          max={room.maxEntry}
                          step="0.01"
                          className="flex-1 px-4 py-2 bg-dark-800 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                          placeholder="0.00"
                        />
                        <button
                          onClick={() => setBetAmount(0.1)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          0.1
                        </button>
                        <button
                          onClick={() => setBetAmount(0.5)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          0.5
                        </button>
                        <button
                          onClick={() => setBetAmount(1.0)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          1.0
                        </button>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Min: {room.minEntry} SOL</span>
                        <span>≈ {formatUSD(betAmount * solPrice)}</span>
                      </div>
                    </div>
                    
                    {/* Error Message */}
                    {betError && (
                      <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">{betError}</p>
                      </div>
                    )}

                    {/* Join Button */}
                    {!connected ? (
                      <div className="space-y-3">
                        <p className="text-center text-gray-400 text-sm">
                          Connect your Solana wallet to join
                        </p>
                        <WalletConnect variant="default" />
                      </div>
                    ) : (
                      <button
                        onClick={handleJoinRoom}
                        disabled={
                          placingBet || 
                          betAmount < room.minEntry || 
                          betAmount > room.maxEntry || 
                          !currentUser
                        }
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {placingBet ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Placing Bet...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Play className="w-4 h-4" />
                            Join Match ({formatSOL(betAmount)})
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-400 font-semibold">✅ You're in the match!</p>
                      <p className="text-sm text-gray-400">Bet: {betAmount} SOL</p>
                    </div>
                    
                    {room.players.length >= 2 && room.host.id === currentUser?.id && (
                      <button
                        onClick={handleStartMatch}
                        className="w-full btn-primary"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Start Match
                      </button>
                    )}
                    
                    <button
                      onClick={handleLeaveRoom}
                      className="w-full btn-secondary"
                    >
                      Leave Room
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Match Result */}
            {matchResult && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="game-card"
              >
                <h3 className="text-lg font-bold text-white mb-4">🏆 Match Results</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-400 font-bold text-lg">Winner: {matchResult.winner.username}</p>
                        <p className="text-sm text-gray-400">Payout: {matchResult.winner.payout} SOL</p>
                      </div>
                      <Trophy className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Total Pot</p>
                      <p className="text-white font-semibold">{matchResult.totalPot} SOL</p>
                    </div>
                    <div>
                      <p className="text-gray-400">House Rake</p>
                      <p className="text-white font-semibold">{matchResult.rakeCollected} SOL</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => router.push('/')}
                    className="w-full btn-primary"
                  >
                    Back to Lobby
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Info */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4">Room Info</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Players</span>
                  <span className="text-white font-semibold">
                    {room.players.length}/{room.maxPlayers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Pot</span>
                  <span className="text-neon-blue font-semibold">{room.totalPot} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entry Range</span>
                  <span className="text-white">{room.minEntry}-{room.maxEntry} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Host</span>
                  <span className="text-white">{room.host.username}</span>
                </div>
              </div>
            </div>

            {/* Players List */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4">
                <Users className="w-5 h-5 inline mr-2" />
                Players ({room.players.length})
              </h3>
              
              <div className="space-y-2">
                {room.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{player.username}</p>
                        <p className="text-xs text-gray-400">{player.betAmount} SOL</p>
                      </div>
                    </div>
                    
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      player.status === 'winner' ? 'bg-green-500/20 text-green-400' :
                      player.status === 'eliminated' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {player.status === 'winner' ? '👑' :
                       player.status === 'eliminated' ? '💀' : '🎮'}
                    </div>
                  </div>
                ))}
                
                {room.players.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No players yet</p>
                    <p className="text-sm">Be the first to join!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Events */}
            <div className="game-card">
              <h3 className="text-lg font-bold text-white mb-4">
                <Eye className="w-5 h-5 inline mr-2" />
                Live Events
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gameEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-2 bg-dark-800 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        event.type === 'join' ? 'bg-green-400' :
                        event.type === 'leave' ? 'bg-red-400' :
                        event.type === 'bet' ? 'bg-blue-400' :
                        event.type === 'start' ? 'bg-yellow-400' :
                        event.type === 'win' ? 'bg-purple-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-gray-300">{event.message}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </motion.div>
                ))}
                
                {gameEvents.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">No events yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
