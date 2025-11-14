"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Clock, Zap } from 'lucide-react';
import { LobbyListItem } from '@/lib/socket';

interface LobbyCardProps {
  lobby: LobbyListItem;
  onJoin: (lobbyId: string) => void;
  isJoining?: boolean;
}

export function LobbyCard({ lobby, onJoin, isJoining = false }: LobbyCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleJoinClick = () => {
    if (lobby.entryAmount > 0) {
      setShowConfirm(true);
    } else {
      onJoin(lobby.id);
    }
  };

  const handleConfirmJoin = () => {
    setShowConfirm(false);
    onJoin(lobby.id);
  };

  const getGameIcon = () => {
    switch (lobby.gameType) {
      case 'coinflip': return '🪙';
      case 'connect4': return '🔴';
      case 'sol-bird': return '🐦';
      case 'slither': return '🐍';
      case 'agar': return '🟢';
      default: return '🎮';
    }
  };

  const getGameAccent = () => {
    switch (lobby.gameType) {
      case 'coinflip': return 'from-yellow-400 to-orange-500';
      case 'connect4': return 'from-red-400 to-red-600';
      case 'sol-bird': return 'from-blue-400 to-cyan-500';
      case 'slither': return 'from-green-400 to-emerald-500';
      case 'agar': return 'from-purple-400 to-pink-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getGameName = () => {
    switch (lobby.gameType) {
      case 'coinflip': return 'Coinflip';
      case 'connect4': return 'Connect4';
      case 'sol-bird': return 'Sol Bird';
      case 'slither': return 'Slither';
      case 'agar': return 'Agar';
      default: return lobby.gameType;
    }
  };

  const isLobbyFull = lobby.currentPlayers >= lobby.maxPlayers;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6 transition-all hover:border-white/20 hover:bg-black/40"
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${getGameAccent()} opacity-5 group-hover:opacity-10 transition-opacity`} />
        
        {/* Game header */}
        <div className="relative flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getGameIcon()}</div>
            <div>
              <h3 className="text-lg font-semibold text-white">{getGameName()}</h3>
              <p className="text-sm text-gray-400">
                {lobby.gameType === 'coinflip' || lobby.gameType === 'connect4' ? '1v1 Match' : 'Battle Royale'}
              </p>
            </div>
          </div>
          
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Open
          </span>
        </div>

        {/* Lobby details */}
        <div className="relative space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Users className="h-4 w-4" />
              <span>{lobby.currentPlayers}/{lobby.maxPlayers} players</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <span>Waiting...</span>
            </div>
          </div>

          {lobby.entryAmount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-white font-medium">{lobby.entryAmount} SOL</span>
              <span className="text-gray-400">
                • Pot: {(lobby.entryAmount * lobby.maxPlayers).toFixed(3)} SOL
              </span>
            </div>
          )}

          {lobby.entryAmount === 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium">Free Play</span>
            </div>
          )}
        </div>

        {/* Join button */}
        <div className="relative mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoinClick}
            disabled={isJoining || isLobbyFull}
            className={`w-full rounded-xl px-4 py-3 font-semibold transition-all ${
              isLobbyFull
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : isJoining
                ? 'bg-blue-600 text-white cursor-wait'
                : `bg-gradient-to-r ${getGameAccent()} text-white hover:shadow-lg hover:shadow-blue-500/25`
            }`}
          >
            {isJoining ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Joining...
              </div>
            ) : isLobbyFull ? (
              'Lobby Full'
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" />
                Join Game
              </div>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 max-w-md rounded-2xl border border-white/20 bg-black/80 p-6 backdrop-blur-xl"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">{getGameIcon()}</div>
              <h3 className="text-xl font-bold text-white mb-2">Join Match</h3>
              <p className="text-gray-300 mb-6">
                You are about to join a {getGameName()} match for{' '}
                <span className="font-bold text-yellow-400">{lobby.entryAmount} SOL</span>
              </p>
              
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 mb-4">
                <p className="text-yellow-300 text-sm">
                  ⚡ Your wallet will be prompted to sign a transaction for the entry fee.
                  Make sure you have sufficient SOL balance plus gas fees.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-white/20 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmJoin}
                  className={`flex-1 rounded-xl bg-gradient-to-r ${getGameAccent()} px-4 py-3 font-semibold text-white transition-all hover:shadow-lg`}
                >
                  Confirm Join
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}