'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Coins, Play, Clock, Trophy } from 'lucide-react';
import { useArcadeStore } from '@/store/arcadeStore';
import { useRoomsRealtime } from '@/hooks/useRoomRealtime';

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
  player_count: number;
}

interface LobbyProps {
  game: string;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ game, onJoinRoom, onCreateRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { credits, isWalletConnected } = useArcadeStore();

  // Real-time room updates
  useRoomsRealtime(
    (newRoom) => {
      if (newRoom.game === game) {
        setRooms(prev => [{ ...newRoom, player_count: 0 }, ...prev]);
      }
    },
    (updatedRoom) => {
      if (updatedRoom.game === game) {
        setRooms(prev => prev.map(room => 
          room.id === updatedRoom.id 
            ? { ...room, ...updatedRoom }
            : room
        ));
      }
    },
    (completedRoom) => {
      if (completedRoom.game === game) {
        setRooms(prev => prev.filter(room => room.id !== completedRoom.id));
      }
    }
  );

  // Fetch available rooms
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/arcade/rooms?game=${game}`);
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch rooms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [game]);

  const handleJoinRoom = (room: Room) => {
    if (!isWalletConnected) {
      alert('Please connect your wallet to join a room');
      return;
    }

    if (credits < room.min_entry) {
      alert(`Insufficient credits. You need at least ${room.min_entry} credits to join this room.`);
      return;
    }

    onJoinRoom(room.id);
  };

  const getGameDisplayName = (gameId: string) => {
    const gameNames: Record<string, string> = {
      'coinraid': 'CoinRaid',
      'sol-serpent-royale': 'SOL Serpent Royale',
      'minefield-mania': 'Minefield Mania',
      'moon-blaster': 'Moon Blaster',
      'flip-wars': 'Flip Wars'
    };
    return gameNames[gameId] || gameId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
        <span className="ml-3 text-gray-300">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-cyber font-bold text-white">
            {getGameDisplayName(game)} Lobby
          </h2>
          <p className="text-gray-400 mt-1">
            Join a room or create your own to start playing
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="cyber-border rounded-full px-4 py-2 text-sm">
            <span className="text-gray-400">Your Credits: </span>
            <span className="text-neon-green font-bold">{credits.toLocaleString()}</span>
          </div>
          
          <button
            onClick={onCreateRoom}
            disabled={!isWalletConnected}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="cyber-border border-red-500/30 bg-red-500/10 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
          <button
            onClick={fetchRooms}
            className="mt-2 text-sm text-red-200 hover:text-white underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {rooms.map((room) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="game-card group"
            >
              {/* Room Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white group-hover:text-neon-blue transition-colors">
                  {room.name}
                </h3>
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                  room.status === 'waiting' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {room.status === 'waiting' ? 'Open' : 'In Progress'}
                </div>
              </div>

              {/* Room Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>Players</span>
                  </div>
                  <span className="text-white">
                    {room.player_count}/{room.max_players}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Coins className="w-4 h-4" />
                    <span>Entry</span>
                  </div>
                  <span className="text-neon-green">
                    {room.min_entry === room.max_entry 
                      ? `${room.min_entry}` 
                      : `${room.min_entry}-${room.max_entry}`
                    } Credits
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Created</span>
                  </div>
                  <span className="text-gray-300">
                    {new Date(room.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Trophy className="w-4 h-4" />
                    <span>Prize Pool</span>
                  </div>
                  <span className="text-neon-purple font-bold">
                    ~{Math.floor(room.min_entry * room.player_count * 0.92)} Credits
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Room Capacity</span>
                  <span>{Math.round((room.player_count / room.max_players) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-neon-blue to-neon-purple h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(room.player_count / room.max_players) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Join Button */}
              <button
                onClick={() => handleJoinRoom(room)}
                disabled={
                  room.status !== 'waiting' || 
                  room.player_count >= room.max_players ||
                  !isWalletConnected ||
                  credits < room.min_entry
                }
                className={`w-full py-2 px-4 rounded-full font-semibold text-center transition-all duration-300 flex items-center justify-center gap-2 ${
                  room.status !== 'waiting' || room.player_count >= room.max_players
                    ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed'
                    : !isWalletConnected
                    ? 'bg-yellow-600/20 text-yellow-400 cursor-not-allowed'
                    : credits < room.min_entry
                    ? 'bg-red-600/20 text-red-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:scale-105 hover:shadow-lg'
                }`}
              >
                <Play className="w-4 h-4" />
                {room.status !== 'waiting' 
                  ? 'In Progress'
                  : room.player_count >= room.max_players
                  ? 'Room Full'
                  : !isWalletConnected
                  ? 'Connect Wallet'
                  : credits < room.min_entry
                  ? 'Insufficient Credits'
                  : 'Join Room'
                }
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {rooms.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Rooms</h3>
          <p className="text-gray-400 mb-6">
            Be the first to create a room for {getGameDisplayName(game)}!
          </p>
          <button
            onClick={onCreateRoom}
            disabled={!isWalletConnected}
            className="btn-primary"
          >
            Create First Room
          </button>
        </div>
      )}
    </div>
  );
};


