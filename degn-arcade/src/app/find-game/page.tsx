"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Filter, Plus, Zap, Users, Trophy, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMatchmaker, GameType, GAME_CONFIG } from '@/hooks/useMatchmaker';
import { LobbyCard } from '@/components/LobbyCard';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';

export default function FindGamePage() {
  const {
    status,
    lobbies,
    isLoading,
    error,
    connected,
    publicKey,
    connect,
    listLobbies,
    createLobby,
    joinLobbyWithPayment,
    findAndJoinBestMatch,
    getMockWallet
  } = useMatchmaker();

  const [selectedGame, setSelectedGame] = useState<GameType>('coinflip');
  const [minWager, setMinWager] = useState(0.01);
  const [maxWager, setMaxWager] = useState(1.0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customWager, setCustomWager] = useState(0.1);
  const [customPlayerCount, setCustomPlayerCount] = useState(2);
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null);

  // Auto-connect and refresh lobbies
  useEffect(() => {
    if (status === 'disconnected') {
      connect();
    }
  }, [status, connect]);

  useEffect(() => {
    if (status === 'connected') {
      listLobbies(selectedGame);
      const interval = setInterval(() => listLobbies(selectedGame), 5000);
      return () => clearInterval(interval);
    }
  }, [status, selectedGame, listLobbies]);

  // Listen for match_start events via Supabase Realtime
  useEffect(() => {
    const supabase = (async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      return getSupabaseClient();
    })();

    let channels: any[] = [];

    const setupRealtimeListeners = async () => {
      const client = await supabase;
      if (!client) {
        console.warn('[CLIENT] Supabase client not available for realtime');
        return;
      }

      // Subscribe to all lobbies the user might be in
      // We'll listen on a global channel and filter by lobbyId in the payload
      const channel = client.channel('match_start_global');
      
      channel.on('broadcast', { event: 'match_start' }, (payload: any) => {
        console.log('[CLIENT] Received match_start event:', payload);
        
        const { matchId, lobbyId } = payload.payload || payload;
        
        if (matchId && lobbyId) {
          console.log('[CLIENT] Redirecting to game:', { matchId, lobbyId });
          // Redirect to game page
          window.location.href = `/play/${selectedGame}?lobbyId=${lobbyId}&matchId=${matchId}`;
        }
      });

      await channel.subscribe();
      channels.push(channel);
      console.log('[CLIENT] ✅ Subscribed to match_start events via Supabase Realtime');
    };

    setupRealtimeListeners();

    return () => {
      channels.forEach(ch => {
        ch.unsubscribe();
      });
      channels = [];
    };
  }, [selectedGame]);

  // Also listen via Socket.IO for compatibility
  useEffect(() => {
    const { socket } = require('@/lib/socket');
    
    const handleMatchStart = (payload: any) => {
      console.log('[CLIENT] Received match_start via Socket.IO:', payload);
      
      const { matchId, lobbyId } = payload;
      
      if (matchId && lobbyId) {
        console.log('[CLIENT] Redirecting to game:', { matchId, lobbyId });
        // Redirect to game page
        window.location.href = `/play/${selectedGame}?lobbyId=${lobbyId}&matchId=${matchId}`;
      }
    };

    socket.on('match_start', handleMatchStart);

    return () => {
      socket.off('match_start', handleMatchStart);
    };
  }, [selectedGame]);

  const handleJoinLobby = async (lobbyId: string) => {
    setJoiningLobby(lobbyId);
    try {
      // Check wallet connection
      if (!connected || !publicKey) {
        // Fall back to mock wallet for development
        const mockWallet = getMockWallet();
        if (!mockWallet) {
          throw new Error('Please connect your wallet first');
        }
        
        // Join via socket (mock wallet flow)
        const { socketEvents } = await import('@/lib/socket');
        socketEvents.joinLobby(lobbyId);
      } else {
        // Use real Phantom wallet with balance verification and payment
        await joinLobbyWithPayment(lobbyId);
      }
    } catch (error) {
      console.error('Failed to join lobby:', error);
      // Show error to user
      alert(error instanceof Error ? error.message : 'Failed to join lobby');
    } finally {
      setJoiningLobby(null);
    }
  };

  const handleCreateLobby = async () => {
    try {
      const config = GAME_CONFIG[selectedGame];
      await createLobby({
        gameType: selectedGame,
        maxPlayers: config.type === '1v1' ? 2 : customPlayerCount,
        entryAmount: config.type === '1v1' ? customWager : config.defaultEntry
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create lobby:', error);
    }
  };

  const handleQuickPlay = async () => {
    try {
      if (selectedGame === 'sol-bird' || selectedGame === 'slither' || selectedGame === 'agar') {
        await findAndJoinBestMatch({ 
          gameType: selectedGame,
          entryAmount: GAME_CONFIG[selectedGame].defaultEntry
        });
      }
    } catch (error) {
      console.error('Quick play failed:', error);
    }
  };

  const filteredLobbies = lobbies.filter(lobby => {
    if (lobby.gameType !== selectedGame) return false;
    
    const config = GAME_CONFIG[selectedGame];
    if (config.type === '1v1') {
      return lobby.entryAmount >= minWager && lobby.entryAmount <= maxWager;
    }
    
    return true;
  });

  const config = GAME_CONFIG[selectedGame];

  if (status === 'disconnected' || status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to matchmaker...</p>
          <p className="text-gray-400 text-sm mt-2">Make sure the backend server is running on port 3001</p>
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
                href="/"
                className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Find Game
              </h1>
            </div>
            
            {/* Wallet Status */}
            <div className="flex items-center gap-4">
              {connected && publicKey ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span>Phantom Connected</span>
                  <span className="text-gray-400">({publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)})</span>
                </div>
              ) : (
                <ConnectWalletButton variant="compact" showAddress={false} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Game Selection & Filters */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Game Selection */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <h3 className="text-lg font-semibold mb-4">Select Game</h3>
                <div className="space-y-2">
                  {Object.entries(GAME_CONFIG).map(([key, gameConfig]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedGame(key as GameType)}
                      className={`w-full rounded-xl p-3 text-left transition-all ${
                        selectedGame === key
                          ? 'bg-purple-500/20 border border-purple-400/50 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <div className="font-medium">{gameConfig.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {gameConfig.type === '1v1' ? '1v1 Match' : 'Battle Royale'} • {gameConfig.minPlayers}-{gameConfig.maxPlayers} players
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters for 1v1 games */}
              {config.type === '1v1' && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">Wager Filter</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Min Wager (SOL)</label>
                      <input
                        type="number"
                        min={config.minEntry}
                        max={config.maxEntry}
                        step="0.01"
                        value={minWager}
                        onChange={(e) => setMinWager(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Wager (SOL)</label>
                      <input
                        type="number"
                        min={config.minEntry}
                        max={config.maxEntry}
                        step="0.01"
                        value={maxWager}
                        onChange={(e) => setMaxWager(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Player count for battle royale */}
              {config.type === 'battle-royale' && (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                  <h3 className="text-lg font-semibold mb-4">Player Count</h3>
                  <select
                    value={customPlayerCount}
                    onChange={(e) => setCustomPlayerCount(parseInt(e.target.value))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                  >
                    {Array.from({ length: config.maxPlayers - config.minPlayers + 1 }, (_, i) => {
                      const count = config.minPlayers + i;
                      return (
                        <option key={count} value={count} className="bg-slate-800">
                          {count} players
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Quick Actions */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {config.type === 'battle-royale' ? (
                    <button
                      onClick={handleQuickPlay}
                      disabled={isLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quick Play ({config.defaultEntry} SOL)
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      disabled={isLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Match
                      </div>
                    </button>
                  )}
                  
                  <button
                    onClick={() => listLobbies(selectedGame)}
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/20 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh Lobbies
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Lobby List */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {config.name} {config.type === '1v1' ? 'Matches' : 'Lobbies'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="h-4 w-4" />
                  <span>{filteredLobbies.length} available</span>
                </div>
              </div>
              
              {config.type === '1v1' && (
                <p className="text-gray-400 mt-2">
                  Join an existing match or create your own with a custom wager amount.
                </p>
              )}
              
              {config.type === 'battle-royale' && (
                <p className="text-gray-400 mt-2">
                  Battle royale games have fixed entry amounts. Use Quick Play to join or create a lobby.
                </p>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-500/20 border border-red-400/50 p-4 text-red-300">
                {error}
              </div>
            )}

            {/* Lobby Grid */}
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-black/30 p-6 animate-pulse">
                      <div className="h-6 bg-white/10 rounded mb-4"></div>
                      <div className="h-4 bg-white/10 rounded mb-2"></div>
                      <div className="h-4 bg-white/10 rounded mb-4"></div>
                      <div className="h-10 bg-white/10 rounded"></div>
                    </div>
                  ))}
                </motion.div>
              ) : filteredLobbies.length > 0 ? (
                <motion.div
                  key="lobbies"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {filteredLobbies.map((lobby) => (
                    <LobbyCard
                      key={lobby.id}
                      lobby={lobby}
                      onJoin={handleJoinLobby}
                      isJoining={joiningLobby === lobby.id}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-xl font-semibold mb-2">No {config.type === '1v1' ? 'matches' : 'lobbies'} found</h3>
                  <p className="text-gray-400 mb-6">
                    {config.type === '1v1' 
                      ? 'Be the first to create a match with your preferred wager!'
                      : 'Start a new lobby and wait for other players to join.'
                    }
                  </p>
                  <button
                    onClick={config.type === '1v1' ? () => setShowCreateModal(true) : handleQuickPlay}
                    className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/25"
                  >
                    {config.type === '1v1' ? 'Create First Match' : 'Start Quick Play'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 max-w-md rounded-2xl border border-white/20 bg-black/80 p-6 backdrop-blur-xl"
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Create {config.name} Match</h3>
              <p className="text-gray-300">Set your wager amount for this {config.type === '1v1' ? '1v1 match' : 'battle royale'}</p>
            </div>
            
            <div className="space-y-4">
              {config.type === '1v1' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Wager Amount (SOL)</label>
                  <input
                    type="number"
                    min={config.minEntry}
                    max={config.maxEntry}
                    step="0.01"
                    value={customWager}
                    onChange={(e) => setCustomWager(parseFloat(e.target.value) || config.defaultEntry)}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Min: {config.minEntry} SOL • Max: {config.maxEntry} SOL
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Max Players</label>
                  <select
                    value={customPlayerCount}
                    onChange={(e) => setCustomPlayerCount(parseInt(e.target.value))}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                  >
                    {Array.from({ length: config.maxPlayers - config.minPlayers + 1 }, (_, i) => {
                      const count = config.minPlayers + i;
                      return (
                        <option key={count} value={count} className="bg-slate-800">
                          {count} players
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              
              <div className="rounded-lg bg-white/5 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Entry fee:</span>
                  <span className="text-white font-medium">
                    {config.type === '1v1' ? customWager : config.defaultEntry} SOL
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total pot:</span>
                  <span className="text-yellow-400 font-medium">
                    {config.type === '1v1' 
                      ? (customWager * 2).toFixed(3) 
                      : (config.defaultEntry * customPlayerCount).toFixed(3)
                    } SOL
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-xl border border-white/20 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLobby}
                disabled={isLoading}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}