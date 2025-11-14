'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Coins, Users, Zap } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  totalWon: number;
  totalBet: number;
  wins: number;
  winRate: number;
  lastActive: string;
  rank: number;
}

interface LeaderboardProps {
  compact?: boolean;
  maxEntries?: number;
}

export function Leaderboard({ compact = false, maxEntries = 10 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all'>('weekly');

  useEffect(() => {
    fetchLeaderboard();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real app, fetch from API
      const mockData: LeaderboardEntry[] = [
        {
          id: '1',
          username: 'CryptoKing',
          totalWon: 15420,
          totalBet: 12000,
          wins: 89,
          winRate: 0.74,
          lastActive: new Date(Date.now() - 300000).toISOString(), // 5 min ago
          rank: 1
        },
        {
          id: '2',
          username: 'SolanaQueen',
          totalWon: 12850,
          totalBet: 11200,
          wins: 76,
          winRate: 0.68,
          lastActive: new Date(Date.now() - 600000).toISOString(), // 10 min ago
          rank: 2
        },
        {
          id: '3',
          username: 'ArcadeMaster',
          totalWon: 9750,
          totalBet: 8900,
          wins: 65,
          winRate: 0.73,
          lastActive: new Date(Date.now() - 900000).toISOString(), // 15 min ago
          rank: 3
        },
        {
          id: '4',
          username: 'GameChanger',
          totalWon: 8200,
          totalBet: 7500,
          wins: 52,
          winRate: 0.69,
          lastActive: new Date(Date.now() - 1200000).toISOString(), // 20 min ago
          rank: 4
        },
        {
          id: '5',
          username: 'PixelPro',
          totalWon: 7100,
          totalBet: 6800,
          wins: 48,
          winRate: 0.71,
          lastActive: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          rank: 5
        },
        {
          id: '6',
          username: 'RetroGamer',
          totalWon: 6500,
          totalBet: 6200,
          wins: 41,
          winRate: 0.66,
          lastActive: new Date(Date.now() - 2400000).toISOString(), // 40 min ago
          rank: 6
        },
        {
          id: '7',
          username: 'BlockchainBoss',
          totalWon: 5800,
          totalBet: 5500,
          wins: 38,
          winRate: 0.69,
          lastActive: new Date(Date.now() - 3000000).toISOString(), // 50 min ago
          rank: 7
        },
        {
          id: '8',
          username: 'CoinCollector',
          totalWon: 5200,
          totalBet: 5000,
          wins: 35,
          winRate: 0.70,
          lastActive: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          rank: 8
        },
        {
          id: '9',
          username: 'DigitalDuke',
          totalWon: 4700,
          totalBet: 4500,
          wins: 32,
          winRate: 0.71,
          lastActive: new Date(Date.now() - 4200000).toISOString(), // 70 min ago
          rank: 9
        },
        {
          id: '10',
          username: 'MetaPlayer',
          totalWon: 4200,
          totalBet: 4100,
          wins: 29,
          winRate: 0.71,
          lastActive: new Date(Date.now() - 4800000).toISOString(), // 80 min ago
          rank: 10
        }
      ];

      setLeaderboard(mockData.slice(0, maxEntries));
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">#{rank}</span>;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (compact) {
    return (
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Top Players
          </h3>
          <TrendingUp className="w-4 h-4 text-neon-blue" />
        </div>
        
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-dark-800 rounded-lg h-12"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getRankIcon(player.rank)}
                  <div>
                    <p className="text-white font-semibold text-sm">{player.username}</p>
                    <p className="text-xs text-gray-400">{player.wins} wins</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-neon-blue font-bold text-sm">{player.totalWon} SOL</p>
                  <p className="text-xs text-gray-400">{Math.round(player.winRate * 100)}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Leaderboard
        </h2>
        
        <div className="flex gap-2">
          {(['daily', 'weekly', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                timeframe === period
                  ? 'bg-neon-blue text-white'
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-dark-800 rounded-lg">
          <Users className="w-5 h-5 text-neon-blue mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{leaderboard.length}</p>
          <p className="text-xs text-gray-400">Active Players</p>
        </div>
        <div className="text-center p-3 bg-dark-800 rounded-lg">
          <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">
            {leaderboard.reduce((sum, p) => sum + p.totalWon, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Total Won</p>
        </div>
        <div className="text-center p-3 bg-dark-800 rounded-lg">
          <Zap className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">
            {Math.round(leaderboard.reduce((sum, p) => sum + p.winRate, 0) / leaderboard.length * 100) || 0}%
          </p>
          <p className="text-xs text-gray-400">Avg Win Rate</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(maxEntries)].map((_, i) => (
            <div key={i} className="animate-pulse bg-dark-800 rounded-lg h-16"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${
                player.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:border-yellow-500/40'
                  : 'bg-dark-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(player.rank)}
                    <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-sm font-bold text-white">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-white font-bold">{player.username}</h3>
                    <p className="text-sm text-gray-400">
                      Last active {formatTimeAgo(player.lastActive)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-neon-blue font-bold text-lg">{player.totalWon.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">SOL Won</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{player.wins}</p>
                    <p className="text-xs text-gray-400">Wins</p>
                  </div>
                  <div>
                    <p className="text-green-400 font-bold text-lg">{Math.round(player.winRate * 100)}%</p>
                    <p className="text-xs text-gray-400">Win Rate</p>
                  </div>
                  <div>
                    <p className="text-gray-300 font-bold text-lg">{player.totalBet.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Total Bet</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View More */}
      {leaderboard.length >= maxEntries && (
        <div className="text-center mt-6">
          <button className="btn-secondary">
            View Full Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}

