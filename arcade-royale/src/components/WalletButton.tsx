'use client';

import React, { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useArcadeStore } from '@/store/arcadeStore';
import { shortenAddress } from '@/utils/solana';

export const WalletButton: React.FC = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { setWalletAddress, setWalletConnected, walletAddress } = useArcadeStore();

  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toString();
      setWalletAddress(address);
      setWalletConnected(true);
    } else {
      setWalletAddress(null);
      setWalletConnected(false);
    }
  }, [connected, publicKey, setWalletAddress, setWalletConnected]);

  return (
    <div className="flex items-center gap-3">
      {connected && walletAddress && (
        <div className="hidden sm:flex items-center gap-2 cyber-border rounded-full px-4 py-2 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-neon-blue font-mono">
            {shortenAddress(walletAddress)}
          </span>
        </div>
      )}
      
      <WalletMultiButton className="!bg-gradient-to-r !from-neon-purple !to-neon-blue !border-0 !rounded-full !font-bold !text-white !transition-all !duration-300 hover:!scale-105 hover:!shadow-lg" />
    </div>
  );
};


