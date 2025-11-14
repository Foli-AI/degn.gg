'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Coins, Play, Crown, Clock, Trophy, Zap } from 'lucide-react';
import { useArcadeStore } from '@/store/arcadeStore';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { CoinRaidGame } from './CoinRaidGame';

interface Room {
  id: string;
  game: string;
  host_id: string;
  name: string;
  min_entry: number;
  max_entry: number;
  max_players: number;
  status: 'waiting' | 'running' | 'completed';
  created_at: string;
}

interface RoomPlayer {
  id: string;
  user_id: string;
  bet_amount: number;
  position?: number;
  payout: number;
  status: 'active' | 'eliminated' | 'winner';
  joined_at: string;
  user?: {
    username: string;
  };
}

interface RoomViewProps {
  roomId: string;
  onBack: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({ roomId, onBack }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [isJoining, setIsJoining] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [showGame, setShowGame] = useState(false);

  const { credits, isWalletConnected } = useArcadeStore();
  const currentUserId = 'temp-user-id'; // TODO: Get from auth

  // Real-time room updates
  const { isConnected, connectionState } = useRoomRealtime(roomId, {
    onPlayerJoin: (data) => {
      fetchRoomDetails();
    },
    onPlayerLeave: (data) => {
      fetchRoomDetails();
    },
    onMatchStart: (data) => {
      setShowGame(true);
      fetchRoomDetails();
    },
    onMatchEnd: (data) => {
      setMatchResult(data);
      setShowGame(false);
      fetchRoomDetails();
    },
    onRoomUpdate: (data) => {
      fetchRoomDetails();
    },
    onError: (error) => {
      console.error('Room realtime error:', error);
    }
  });

  // Fetch room details
  const fetchRoomDetails = async () => {
    try {
      const response = await fetch(`/api/arcade/rooms/${roomId}`);
      const data = await response.json();

      if (data.success) {
        setRoom(data.room);
        setPlayers(data.players);
        
        // Set default bet amount to minimum entry
        if (data.room && betAmount === 0) {
          setBetAmount(data.room.min_entry);
        }
        
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch room details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch room details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomDetails();
  }, [roomId]);

  // Join room
  const handleJoinRoom = async () => {
    if (!isWalletConnected || !room) return;

    try {
      setIsJoining(true);
      const response = await fetch('/api/arcade/placeBet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          roomId: room.id,
          amount: betAmount
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local credits
        // TODO: Update Zustand store with new credits
        await fetchRoomDetails();
      } else {
        alert(data.error || 'Failed to join room');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // Start match (host only)
  const handleStartMatch = async () => {
    if (!room || room.host_id !== currentUserId) return;

    try {
      const response = await fetch('/api/arcade/startMatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to start match');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start match');
    }
  };

  const isPlayerInRoom = players.some(p => p.user_id === currentUserId);
  const isHost = room?.host_id === currentUserId;
  const canStartMatch = isHost && players.length >= 2 && room?.status === 'waiting';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
        <span className="ml-3 text-gray-300">Loading room...</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-center py-12">
        <div className="cyber-border border-red-500/30 bg-red-500/10 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-red-300 mb-2">Room Error</h3>
          <p className="text-red-200 mb-4">{error || 'Room not found'}</p>
          <button onClick={onBack} className="btn-secondary">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show game view during match
  if (showGame && room.status === 'running') {
    return (
      <CoinRaidGame
        roomId={roomId}
        players={players}
        onMatchEnd={(result) => {
          setMatchResult(result);
          setShowGame(false);
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neon-blue hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>
          
          <div>
            <h2 className="text-2xl font-cyber font-bold text-white">
              {room.name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
              <span>Game: {room.game}</span>
              <span>•</span>
              <span className={`flex items-center gap-1 ${
                connectionState === 'connected' ? 'text-green-400' : 'text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-400' : 'bg-red-400'
                } animate-pulse`}></div>
                {connectionState === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-full text-sm font-bold ${
          room.status === 'waiting' 
            ? 'bg-green-500/20 text-green-400' 
            : room.status === 'running'
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {room.status === 'waiting' ? 'Waiting for Players' : 
           room.status === 'running' ? 'Match in Progress' : 'Completed'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Info & Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Room Stats */}
          <div className="cyber-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Room Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>Players</span>
                </div>
                <span className="text-white">{players.length}/{room.max_players}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Coins className="w-4 h-4" />
                  <span>Entry Range</span>
                </div>
                <span className="text-neon-green">
                  {room.min_entry === room.max_entry 
                    ? `${room.min_entry}` 
                    : `${room.min_entry}-${room.max_entry}`
                  } Credits
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Trophy className="w-4 h-4" />
                  <span>Prize Pool</span>
                </div>
                <span className="text-neon-purple font-bold">
                  {Math.floor(players.reduce((sum, p) => sum + p.bet_amount, 0) * 0.92)} Credits
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Created</span>
                </div>
                <span className="text-gray-300">
                  {new Date(room.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Join Controls */}
          {!isPlayerInRoom && room.status === 'waiting' && (
            <div className="cyber-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Join Room</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Bet Amount (Credits)
                  </label>
                  <input
                    type="number"
                    min={room.min_entry}
                    max={Math.min(room.max_entry, credits)}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full cyber-border rounded-lg px-3 py-2 bg-dark-800/50 text-white focus:outline-none focus:border-neon-blue/50"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Min: {room.min_entry}</span>
                    <span>Max: {Math.min(room.max_entry, credits)}</span>
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <p>Your Credits: <span className="text-neon-green font-bold">{credits}</span></p>
                  <p>After Bet: <span className="text-white">{credits - betAmount}</span></p>
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={
                    !isWalletConnected || 
                    isJoining || 
                    betAmount < room.min_entry || 
                    betAmount > room.max_entry ||
                    betAmount > credits ||
                    players.length >= room.max_players
                  }
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Joining...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" />
                      Join Room ({betAmount} Credits)
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Host Controls */}
          {isHost && room.status === 'waiting' && (
            <div className="cyber-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Host Controls</h3>
              
              <button
                onClick={handleStartMatch}
                disabled={!canStartMatch}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Start Match
                </div>
              </button>
              
              {players.length < 2 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Need at least 2 players to start
                </p>
              )}
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="lg:col-span-2">
          <div className="cyber-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Players ({players.length}/{room.max_players})
            </h3>
            
            <div className="space-y-3">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between cyber-border rounded-lg p-4 bg-dark-800/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-white font-bold">
                          {(player.user?.username || `P${index + 1}`).charAt(0).toUpperCase()}
                        </div>
                        {player.user_id === room.host_id && (
                          <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      
                      <div>
                        <p className="text-white font-semibold">
                          {player.user?.username || `Player ${index + 1}`}
                          {player.user_id === room.host_id && (
                            <span className="text-yellow-400 text-xs ml-2">(Host)</span>
                          )}
                          {player.user_id === currentUserId && (
                            <span className="text-neon-blue text-xs ml-2">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-400">
                          Joined {new Date(player.joined_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-neon-green font-bold">
                        {player.bet_amount} Credits
                      </p>
                      {player.position && (
                        <p className="text-xs text-gray-400">
                          Position: #{player.position}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Empty slots */}
              {Array.from({ length: room.max_players - players.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center justify-center cyber-border rounded-lg p-4 bg-dark-800/10 border-dashed"
                >
                  <p className="text-gray-500">Waiting for player...</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Match Result Modal */}
      <AnimatePresence>
        {matchResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="cyber-border rounded-lg p-8 max-w-md w-full mx-4 bg-dark-900"
            >
              <h3 className="text-2xl font-bold text-white mb-4 text-center">
                Match Complete!
              </h3>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg text-neon-green font-bold">
                  Winner gets {matchResult.payoutAmount} Credits!
                </p>
                <p className="text-sm text-gray-400">
                  Total pot: {matchResult.totalPot} Credits
                </p>
              </div>
              
              <button
                onClick={() => setMatchResult(null)}
                className="w-full btn-primary"
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


