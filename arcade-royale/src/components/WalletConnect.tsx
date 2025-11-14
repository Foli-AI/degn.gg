'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

interface WalletConnectProps {
  variant?: 'default' | 'compact' | 'icon';
  showBalance?: boolean;
  showAddress?: boolean;
  className?: string;
}

export function WalletConnect({ 
  variant = 'default', 
  showBalance = true, 
  showAddress = true,
  className = '' 
}: WalletConnectProps) {
  const { connection } = useConnection();
  const { 
    publicKey, 
    connected, 
    connecting, 
    disconnect,
    wallet 
  } = useWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userRecord, setUserRecord] = useState<any>(null);

  // Fetch SOL balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    try {
      setLoadingBalance(true);
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, [publicKey, connection]);

  // Update user record in Supabase when wallet connects
  const updateUserRecord = useCallback(async () => {
    if (!publicKey) return;

    try {
      const response = await fetch('/api/solana/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          walletType: wallet?.adapter.name || 'Unknown'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserRecord(data.user);
      }
    } catch (error) {
      console.error('Failed to update user record:', error);
    }
  }, [publicKey, wallet]);

  // Copy wallet address to clipboard
  const copyAddress = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }, [publicKey]);

  // Effects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
      updateUserRecord();
    } else {
      setBalance(null);
      setUserRecord(null);
    }
  }, [connected, publicKey, fetchBalance, updateUserRecord]);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, fetchBalance]);

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Render based on variant
  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        {connected ? (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="p-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full hover:scale-110 transition-all duration-300 animate-pulse-neon"
            onClick={copyAddress}
            title={`Connected: ${formatAddress(publicKey?.toString() || '')}`}
          >
            <Wallet className="w-5 h-5 text-white" />
          </motion.button>
        ) : (
          <WalletMultiButton className="!p-3 !bg-gray-700 hover:!bg-gray-600 !rounded-full !min-w-0">
            <Wallet className="w-5 h-5" />
          </WalletMultiButton>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {connected ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg border border-neon-blue/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-white font-semibold">
                {formatAddress(publicKey?.toString() || '')}
              </span>
              {showBalance && balance !== null && (
                <span className="text-xs text-neon-blue">
                  {balance.toFixed(3)} SOL
                </span>
              )}
            </div>
            <button
              onClick={copyAddress}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy address"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </>
        ) : (
          <WalletMultiButton className="!bg-gradient-to-r !from-neon-blue !to-neon-purple hover:!scale-105 !transition-all !duration-300" />
        )}
      </div>
    );
  }

  // Default variant - full featured
  return (
    <div className={`space-y-4 ${className}`}>
      {!connected ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 text-sm mb-4">
              Connect your Solana wallet to start playing with real SOL
            </p>
          </div>
          <WalletMultiButton className="!w-full !bg-gradient-to-r !from-neon-blue !to-neon-purple hover:!scale-105 !transition-all !duration-300 !py-3 !text-lg !font-bold" />
          {connecting && (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Connecting...</span>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Wallet Info */}
          <div className="game-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {wallet?.adapter.name || 'Wallet'} Connected
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">Active</span>
                  </div>
                </div>
              </div>
              <WalletDisconnectButton className="!bg-red-500/20 hover:!bg-red-500/30 !text-red-400 !border-red-500/30" />
            </div>

            {/* Address */}
            {showAddress && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
                <div className="flex items-center gap-2 p-3 bg-dark-800 rounded-lg border border-gray-700">
                  <code className="flex-1 text-sm text-white font-mono">
                    {publicKey?.toString()}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <a
                    href={`https://solscan.io/account/${publicKey?.toString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                    title="View on Solscan"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              </div>
            )}

            {/* Balance */}
            {showBalance && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-dark-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">SOL Balance</span>
                    {loadingBalance && (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {balance !== null ? `${balance.toFixed(4)} SOL` : '--'}
                  </div>
                  {balance !== null && (
                    <div className="text-sm text-gray-400">
                      ≈ ${(balance * 100).toFixed(2)} USD
                    </div>
                  )}
                </div>

                <div className="p-4 bg-dark-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Game Credits</span>
                    <Zap className="w-4 h-4 text-neon-blue" />
                  </div>
                  <div className="text-2xl font-bold text-neon-blue">
                    {userRecord?.credits || 0}
                  </div>
                  <div className="text-sm text-gray-400">
                    Available for betting
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Address copied to clipboard!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// Wallet status indicator for navbar
export function WalletStatus() {
  const { connected, publicKey } = useWallet();

  if (!connected) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-full"
    >
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      <span className="text-sm text-green-400 font-semibold">
        {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
      </span>
    </motion.div>
  );
}

