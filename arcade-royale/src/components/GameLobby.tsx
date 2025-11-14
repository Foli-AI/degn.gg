'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Coins, 
  Play, 
  Clock, 
  Settings, 
  Plus,
  Gamepad2,
  Zap
} from 'lucide-react';
import { useSocket, GameRoom } from '@/lib/socket';

interface GameLobbyProps {
  onRoomSelect?: (roomId: string) => void;
  showCreateRoom?: boolean;
}

export function GameLobby({ onRoomSelect, showCreateRoom = true }: GameLobbyProps) {
  const socket = useSocket();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    game: 'CoinRaid',
    minEntry: 50,
    maxEntry: 500,
    maxPlayers: 4
  });

  const games = [
    { id: 'CoinRaid', name: 'Coin Raid', icon: '🪙', description: 'Collect coins while avoiding obstacles' },
    { id: 'SolSerpentRoyale', name: 'Sol Serpent Royale', icon: '🐍', description: 'Snake battle royale with crypto rewards' },
    { id: 'QuickDrawArena', name: 'Quick Draw Arena', icon: '🎯', description: 'Fast-paced shooting competition' },
    { id: 'MoonBlaster', name: 'Moon Blaster', icon: '🚀', description: 'Space shooter with lunar rewards' }
  ];

  useEffect(() => {
    const socketInstance = socket.connect();

    // Listen for rooms updates
    socket.on('rooms-list', (roomsList: GameRoom[]) => {
      setRooms(roomsList);
    });

    socket.on('room-updated', (room: GameRoom) => {
      setRooms(prev => {
        const updated = prev.map(r => r.id === room.id ? room : r);
        if (!updated.find(r => r.id === room.id)) {
          updated.push(room);
        }
        return updated;
      });
    });

    // Request initial data
    socket.emit('request-rooms');

    // Refresh rooms every 30 seconds
    const interval = setInterval(() => {
      socket.emit('request-rooms');
    }, 30000);

    return () => {
      socket.off('rooms-list');
      socket.off('room-updated');
      clearInterval(interval);
    };
  }, [socket]);

  const handleCreateRoom = async () => {
    try {
      // Mock room creation for now
      const mockRoom: GameRoom = {
        id: `room_${Date.now()}`,
        game: newRoom.game,
        name: newRoom.name,
        host: { id: 'current_user', username: 'You' },
        players: [],
        status: 'waiting',
        minEntry: newRoom.minEntry,
        maxEntry: newRoom.maxEntry,
        maxPlayers: newRoom.maxPlayers,
        totalPot: 0,
        createdAt: new Date().toISOString()
      };

      setRooms(prev => [mockRoom, ...prev]);
      setShowCreateModal(false);
      setNewRoom({
        name: '',
        game: 'CoinRaid',
        minEntry: 50,
        maxEntry: 500,
        maxPlayers: 4
      });

      if (onRoomSelect) {
        onRoomSelect(mockRoom.id);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const getGameInfo = (gameId: string) => {
    return games.find(g => g.id === gameId) || games[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Game Lobby</h2>
          <p className="text-gray-400">Join active rooms or create your own match</p>
        </div>
        
        {showCreateRoom && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Room
          </button>
        )}
      </div>

      {/* Active Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const gameInfo = getGameInfo(room.game);
          
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              className="game-card group cursor-pointer hover:bg-gradient-to-br hover:from-neon-purple/10 hover:to-neon-blue/10"
              onClick={() => onRoomSelect?.(room.id)}
            >
              {/* Room Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{gameInfo.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{room.name}</h3>
                    <p className="text-sm text-neon-blue font-semibold">{gameInfo.name}</p>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  room.status === 'waiting' ? 'bg-green-500/20 text-green-400' :
                  room.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {room.status === 'waiting' ? 'Open' : 
                   room.status === 'running' ? 'Live' : 'Finished'}
                </div>
              </div>

              {/* Room Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Players</span>
                  </div>
                  <div className="text-white font-bold">
                    {room.players.length}/{room.maxPlayers}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-300 mb-1">
                    <Coins className="w-4 h-4" />
                    <span className="text-sm">Pot</span>
                  </div>
                  <div className="text-neon-blue font-bold">
                    {room.totalPot} SOL
                  </div>
                </div>
              </div>

              {/* Entry Range */}
              <div className="text-center mb-4">
                <p className="text-sm text-gray-400">
                  Entry: {room.minEntry} - {room.maxEntry} SOL
                </p>
              </div>

              {/* Players Preview */}
              <div className="mb-4">
                <div className="flex -space-x-2 justify-center">
                  {room.players.slice(0, 4).map((player, index) => (
                    <div
                      key={player.id}
                      className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-dark-800"
                      title={player.username}
                    >
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {room.players.length > 4 && (
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-dark-800">
                      +{room.players.length - 4}
                    </div>
                  )}
                  {room.players.length === 0 && (
                    <div className="text-sm text-gray-400">No players yet</div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-neon-blue group-hover:text-white transition-colors">
                {room.status === 'waiting' ? (
                  <>
                    <Play className="w-4 h-4" />
                    Join Game
                  </>
                ) : room.status === 'running' ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Spectate
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    View Results
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Empty State */}
        {rooms.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Active Rooms</h3>
            <p className="text-gray-500 mb-6">Be the first to create a game room!</p>
            {showCreateRoom && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Room
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-dark-800 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-6">Create New Room</h3>
            
            <div className="space-y-4">
              {/* Room Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Room Name</label>
                <input
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter room name..."
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                />
              </div>

              {/* Game Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Game</label>
                <select
                  value={newRoom.game}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, game: e.target.value }))}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                >
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.icon} {game.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entry Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Min Entry (SOL)</label>
                  <input
                    type="number"
                    value={newRoom.minEntry}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, minEntry: Number(e.target.value) }))}
                    min="1"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Entry (SOL)</label>
                  <input
                    type="number"
                    value={newRoom.maxEntry}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, maxEntry: Number(e.target.value) }))}
                    min={newRoom.minEntry}
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                  />
                </div>
              </div>

              {/* Max Players */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Max Players</label>
                <select
                  value={newRoom.maxPlayers}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, maxPlayers: Number(e.target.value) }))}
                  className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                >
                  <option value={2}>2 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={6}>6 Players</option>
                  <option value={8}>8 Players</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoom.name.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

