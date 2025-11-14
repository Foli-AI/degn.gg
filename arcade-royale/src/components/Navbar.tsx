'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gamepad2, Coins, Zap, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect, WalletStatus } from './WalletConnect';
import { WalletModal } from './WalletModal';
import { useArcadeStore } from '@/store/arcadeStore';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { credits } = useArcadeStore();
  const { connected } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', icon: Zap },
    { href: '/games', label: 'Games', icon: Gamepad2 },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 cyber-border border-t-0 border-l-0 border-r-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg flex items-center justify-center"
            >
              <Gamepad2 className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-cyber font-bold text-white group-hover:text-neon-blue transition-colors">
                ARCADE
              </span>
              <span className="text-xs text-neon-purple font-cyber tracking-wider -mt-1">
                ROYALE
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                  pathname === href
                    ? 'text-neon-blue bg-neon-blue/10 border border-neon-blue/30'
                    : 'text-gray-300 hover:text-neon-blue hover:bg-neon-blue/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* Credits & Wallet */}
          <div className="flex items-center space-x-4">
            {/* Credits Display */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center space-x-2 cyber-border rounded-full px-4 py-2 cursor-pointer hover:bg-neon-blue/5 transition-colors"
              onClick={() => setShowWalletModal(true)}
            >
              <Coins className="w-4 h-4 text-neon-green" />
              <span className="font-bold text-neon-green font-mono">
                {credits.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400">SOL</span>
            </motion.div>

            {/* Wallet Status */}
            <WalletStatus />

            {/* Wallet Connect/Modal Button */}
            {connected ? (
              <button
                onClick={() => setShowWalletModal(true)}
                className="p-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full hover:scale-110 transition-all duration-300 animate-pulse-neon"
                title="Open Wallet"
              >
                <Wallet className="w-5 h-5 text-white" />
              </button>
            ) : (
              <WalletConnect variant="compact" showBalance={false} showAddress={false} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-white/10">
        <div className="px-4 py-2 flex justify-center space-x-8">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                pathname === href
                  ? 'text-neon-blue'
                  : 'text-gray-400 hover:text-neon-blue'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />
    </nav>
  );
};

