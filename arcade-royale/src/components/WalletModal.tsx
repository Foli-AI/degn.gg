'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Copy, 
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { 
  depositSOL, 
  withdrawSOL, 
  getTransactionHistory, 
  getSOLPrice, 
  formatSOL, 
  formatUSD 
} from '@/lib/solana/transactions';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'deposit' | 'withdraw' | 'history';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  displayAmount: number;
  isCredit: boolean;
  typeLabel: string;
  signature: string;
  timestamp: string;
  status: string;
  statusColor: string;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [balance, setBalance] = useState<number | null>(null);
  const [gameCredits, setGameCredits] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(100);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      setLoading(true);
      
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      setBalance(solBalance / 1e9);

      // Fetch game credits
      const userResponse = await fetch(`/api/solana/user?wallet=${publicKey.toString()}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setGameCredits(userData.user?.credits || 0);
      }

      // Fetch SOL price
      const price = await getSOLPrice();
      setSolPrice(price);

      // Fetch transaction history
      const txHistory = await getTransactionHistory(publicKey.toString(), 20);
      setTransactions(txHistory);

    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (isOpen && connected) {
      fetchWalletData();
    }
  }, [isOpen, connected, fetchWalletData]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!publicKey || !depositAmount) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (balance && amount > balance) {
      setError('Insufficient SOL balance');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const result = await depositSOL({ publicKey, signTransaction: async (tx: any) => tx } as any, amount);

      if (result.success) {
        setSuccess(`Successfully deposited ${amount} SOL`);
        setDepositAmount('');
        await fetchWalletData(); // Refresh data
      } else {
        setError(result.error || 'Deposit failed');
      }
    } catch (error) {
      setError('Deposit transaction failed');
    } finally {
      setProcessing(false);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!publicKey || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > gameCredits) {
      setError('Insufficient game credits');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const result = await withdrawSOL({ publicKey, signTransaction: async (tx: any) => tx } as any, amount);

      if (result.success) {
        setSuccess(`Successfully withdrew ${amount} SOL`);
        setWithdrawAmount('');
        await fetchWalletData(); // Refresh data
      } else {
        setError(result.error || 'Withdrawal failed');
      }
    } catch (error) {
      setError('Withdrawal transaction failed');
    } finally {
      setProcessing(false);
    }
  };

  // Copy transaction signature
  const copySignature = async (signature: string) => {
    try {
      await navigator.clipboard.writeText(signature);
      setSuccess('Transaction signature copied!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      setError('Failed to copy signature');
    }
  };

  // Clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-dark-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Wallet</h2>
              <p className="text-sm text-gray-400">Manage your SOL and game credits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {!connected ? (
          <div className="p-6">
            <WalletConnect />
          </div>
        ) : (
          <div className="flex h-[600px]">
            {/* Sidebar */}
            <div className="w-64 bg-dark-900 border-r border-gray-700 p-4">
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: Wallet },
                  { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
                  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
                  { id: 'history', label: 'History', icon: History }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Status Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Wallet Overview</h3>
                  
                  {/* Balance Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="game-card">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">SOL Balance</h4>
                        <DollarSign className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-white">
                          {balance !== null ? formatSOL(balance) : '--'}
                        </div>
                        <div className="text-sm text-gray-400">
                          ≈ {balance !== null ? formatUSD(balance * solPrice) : '--'}
                        </div>
                      </div>
                    </div>

                    <div className="game-card">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">Game Credits</h4>
                        <Zap className="w-5 h-5 text-neon-blue" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-neon-blue">
                          {gameCredits.toFixed(4)} SOL
                        </div>
                        <div className="text-sm text-gray-400">
                          Available for betting
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className="p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                      <div className="text-left">
                        <div className="font-semibold text-green-400">Deposit SOL</div>
                        <div className="text-sm text-gray-400">Add funds to play</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('withdraw')}
                      className="p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <ArrowUpRight className="w-5 h-5 text-blue-400" />
                      <div className="text-left">
                        <div className="font-semibold text-blue-400">Withdraw SOL</div>
                        <div className="text-sm text-gray-400">Cash out winnings</div>
                      </div>
                    </button>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">Recent Activity</h4>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="text-sm text-neon-blue hover:text-white transition-colors"
                      >
                        View All
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {transactions.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 bg-dark-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full bg-${tx.statusColor}-400`}></div>
                            <div>
                              <div className="text-sm font-semibold text-white">{tx.typeLabel}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(tx.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${tx.isCredit ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.isCredit ? '+' : '-'}{tx.displayAmount.toFixed(4)} SOL
                          </div>
                        </div>
                      ))}
                      
                      {transactions.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No transactions yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'deposit' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Deposit SOL</h3>
                  
                  <div className="game-card max-w-md">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Amount (SOL)
                        </label>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                        />
                        {depositAmount && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ {formatUSD(parseFloat(depositAmount) * solPrice)}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {[0.1, 0.5, 1.0, 2.0].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setDepositAmount(amount.toString())}
                            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                          >
                            {amount} SOL
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleDeposit}
                        disabled={processing || !depositAmount}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <ArrowDownLeft className="w-4 h-4" />
                            Deposit SOL
                          </div>
                        )}
                      </button>

                      <div className="text-xs text-gray-400">
                        <p>• Minimum deposit: 0.01 SOL</p>
                        <p>• Funds are instantly available for gaming</p>
                        <p>• Network fees apply</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'withdraw' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Withdraw SOL</h3>
                  
                  <div className="game-card max-w-md">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Amount (SOL)
                        </label>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          max={gameCredits}
                          className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Available: {gameCredits.toFixed(4)} SOL</span>
                          {withdrawAmount && (
                            <span>≈ {formatUSD(parseFloat(withdrawAmount) * solPrice)}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setWithdrawAmount(gameCredits.toString())}
                        className="text-sm text-neon-blue hover:text-white transition-colors"
                      >
                        Withdraw All
                      </button>

                      <button
                        onClick={handleWithdraw}
                        disabled={processing || !withdrawAmount}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <ArrowUpRight className="w-4 h-4" />
                            Withdraw SOL
                          </div>
                        )}
                      </button>

                      <div className="text-xs text-gray-400">
                        <p>• Minimum withdrawal: 0.01 SOL</p>
                        <p>• Funds sent directly to your wallet</p>
                        <p>• Processing time: ~30 seconds</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white">Transaction History</h3>
                  
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="game-card"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full bg-${tx.statusColor}-400`}></div>
                            <div>
                              <div className="font-semibold text-white">{tx.typeLabel}</div>
                              <div className="text-sm text-gray-400">
                                {new Date(tx.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className={`text-lg font-bold ${tx.isCredit ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.isCredit ? '+' : '-'}{tx.displayAmount.toFixed(4)} SOL
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => copySignature(tx.signature)}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Copy signature"
                              >
                                <Copy className="w-4 h-4 text-gray-400" />
                              </button>
                              <a
                                href={`https://solscan.io/tx/${tx.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="View on Solscan"
                              >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {transactions.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-semibold mb-2">No transactions yet</h4>
                        <p>Your transaction history will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
