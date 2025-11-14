'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Users, 
  Trophy, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Shield
} from 'lucide-react';

interface RakeData {
  currentBalance: number;
  totalCollected: number;
  todayCollected: number;
  lastUpdated: string;
  recentTransactions: any[];
}

interface AdminStats {
  totalUsers: number;
  activeRooms: number;
  completedMatches: number;
  totalVolume: number;
}

export default function AdminArcadePage() {
  const [rakeData, setRakeData] = useState<RakeData | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundMatchId, setRefundMatchId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const adminKey = 'admin-key-123'; // In production, this should be from secure auth

  const fetchRakeData = async () => {
    try {
      const response = await fetch('/api/admin/rake', {
        headers: {
          'x-admin-key': adminKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rake data');
      }

      const data = await response.json();
      setRakeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rake data');
    }
  };

  const fetchAdminStats = async () => {
    try {
      // Mock stats for now - in production, create dedicated admin stats endpoint
      setAdminStats({
        totalUsers: 1247,
        activeRooms: 23,
        completedMatches: 892,
        totalVolume: 45678
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin stats');
    }
  };

  const handleRefund = async () => {
    if (!refundMatchId.trim()) {
      alert('Please enter a match ID');
      return;
    }

    try {
      setIsRefunding(true);
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          matchId: refundMatchId,
          reason: refundReason || 'Admin refund'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully refunded ${data.refundedPlayers} players`);
        setRefundMatchId('');
        setRefundReason('');
        // Refresh data
        await fetchRakeData();
      } else {
        alert(`Refund failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Refund error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRefunding(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRakeData(), fetchAdminStats()]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
        <span className="ml-3 text-gray-300">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-neon-purple" />
            <h1 className="text-3xl font-cyber font-bold text-white">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-gray-400">DEGN.gg Arcade Management Console</p>
        </motion.div>

        {error && (
          <div className="cyber-border border-red-500/30 bg-red-500/10 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="cyber-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">
                  {adminStats?.totalUsers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-neon-blue" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="cyber-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Rooms</p>
                <p className="text-2xl font-bold text-white">
                  {adminStats?.activeRooms}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-neon-green" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="cyber-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed Matches</p>
                <p className="text-2xl font-bold text-white">
                  {adminStats?.completedMatches.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-neon-purple" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="cyber-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-2xl font-bold text-white">
                  {adminStats?.totalVolume.toLocaleString()} Credits
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-neon-green" />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rake Information */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="cyber-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Rake Account</h2>
              <button
                onClick={fetchRakeData}
                className="p-2 rounded-lg bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {rakeData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="cyber-border rounded-lg p-4 bg-dark-800/30">
                    <p className="text-gray-400 text-sm">Current Balance</p>
                    <p className="text-xl font-bold text-neon-green">
                      {rakeData.currentBalance.toLocaleString()} Credits
                    </p>
                  </div>

                  <div className="cyber-border rounded-lg p-4 bg-dark-800/30">
                    <p className="text-gray-400 text-sm">Total Collected</p>
                    <p className="text-xl font-bold text-neon-blue">
                      {rakeData.totalCollected.toLocaleString()} Credits
                    </p>
                  </div>

                  <div className="cyber-border rounded-lg p-4 bg-dark-800/30">
                    <p className="text-gray-400 text-sm">Today's Rake</p>
                    <p className="text-xl font-bold text-neon-purple">
                      {rakeData.todayCollected.toLocaleString()} Credits
                    </p>
                  </div>
                </div>

                <div className="cyber-border rounded-lg p-4 bg-dark-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-400 text-sm">Last Updated</p>
                  </div>
                  <p className="text-white">
                    {new Date(rakeData.lastUpdated).toLocaleString()}
                  </p>
                </div>

                {/* Recent Rake Transactions */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Rake Transactions</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {rakeData.recentTransactions.slice(0, 10).map((transaction, index) => (
                      <div
                        key={transaction.id || index}
                        className="cyber-border rounded-lg p-3 bg-dark-800/20"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">
                              +{parseFloat(transaction.amount).toFixed(2)} Credits
                            </p>
                            <p className="text-gray-400 text-xs">
                              {new Date(transaction.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-xs">
                              Match: {transaction.meta?.matchId?.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Admin Tools */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="cyber-border rounded-lg p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6">Admin Tools</h2>

            {/* Refund Tool */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Refund Match
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Match ID
                    </label>
                    <input
                      type="text"
                      value={refundMatchId}
                      onChange={(e) => setRefundMatchId(e.target.value)}
                      placeholder="Enter match ID to refund"
                      className="w-full cyber-border rounded-lg px-3 py-2 bg-dark-800/50 text-white focus:outline-none focus:border-neon-blue/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Reason for refund"
                      className="w-full cyber-border rounded-lg px-3 py-2 bg-dark-800/50 text-white focus:outline-none focus:border-neon-blue/50"
                    />
                  </div>

                  <button
                    onClick={handleRefund}
                    disabled={isRefunding || !refundMatchId.trim()}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefunding ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing Refund...
                      </div>
                    ) : (
                      'Refund Match'
                    )}
                  </button>
                </div>

                <div className="mt-4 p-3 cyber-border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
                  <p className="text-yellow-200 text-xs">
                    ⚠️ This will refund all players in the match and cannot be undone.
                    Make sure to verify the match ID before proceeding.
                  </p>
                </div>
              </div>

              {/* Additional Admin Tools */}
              <div className="pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3">System Status</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="cyber-border rounded-lg p-3 bg-green-500/10">
                    <p className="text-green-400 text-sm font-semibold">Database</p>
                    <p className="text-green-300 text-xs">Connected</p>
                  </div>
                  
                  <div className="cyber-border rounded-lg p-3 bg-green-500/10">
                    <p className="text-green-400 text-sm font-semibold">Realtime</p>
                    <p className="text-green-300 text-xs">Active</p>
                  </div>
                  
                  <div className="cyber-border rounded-lg p-3 bg-blue-500/10">
                    <p className="text-blue-400 text-sm font-semibold">Game Engine</p>
                    <p className="text-blue-300 text-xs">Running</p>
                  </div>
                  
                  <div className="cyber-border rounded-lg p-3 bg-purple-500/10">
                    <p className="text-purple-400 text-sm font-semibold">Rake System</p>
                    <p className="text-purple-300 text-xs">Operational</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


