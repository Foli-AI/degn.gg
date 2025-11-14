"use client";

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle, AlertCircle } from 'lucide-react';

interface ConnectWalletButtonProps {
  className?: string;
  showAddress?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

export default function ConnectWalletButton({ 
  className = '', 
  showAddress = true,
  variant = 'default'
}: ConnectWalletButtonProps) {
  const { connected, publicKey, connecting, disconnecting } = useWallet();

  const getStatusIcon = () => {
    if (connecting || disconnecting) {
      return <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />;
    }
    if (connected) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    return <Wallet className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (connecting) return 'Connecting...';
    if (disconnecting) return 'Disconnecting...';
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return 'Connect Wallet';
  };

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <WalletMultiButton className="!bg-transparent !border-none !p-0 !text-inherit !font-inherit" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-2 ${className}`}
      >
        {getStatusIcon()}
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !border-none !rounded-lg !px-4 !py-2 !text-sm !font-semibold" />
      </motion.div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !border-none !rounded-xl !px-6 !py-3 !text-base !font-semibold !text-white !shadow-lg hover:!shadow-purple-500/25 !transition-all" />
        
        {/* Connection status indicator */}
        <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-black ${
          connected ? 'bg-green-400' : connecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
        }`} />
      </motion.div>

      {/* Connection status */}
      {showAddress && (
        <div className="flex items-center gap-2 text-sm">
          {getStatusIcon()}
          <span className={`${
            connected ? 'text-green-400' : connecting ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {getStatusText()}
          </span>
        </div>
      )}

      {/* Network indicator */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <div className="h-2 w-2 rounded-full bg-orange-400" />
        <span>Devnet</span>
      </div>
    </div>
  );
}

// Utility hook for wallet info
export function useWalletInfo() {
  const { connected, publicKey, wallet, connecting, disconnecting } = useWallet();
  
  return {
    connected,
    address: publicKey?.toBase58() || null,
    shortAddress: publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : null,
    walletName: wallet?.adapter.name || null,
    connecting,
    disconnecting,
    publicKey
  };
}
