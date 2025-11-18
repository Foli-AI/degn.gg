"use client";

import { Button } from "@/components/ui/button";
import { Wallet, Users, TrendingUp, User } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";

export function Navbar() {
  const { connected, publicKey } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const displayAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-lg font-bold font-display">D</span>
            </div>
            <span className="text-xl font-bold neon-text font-display tracking-tight">
              DEGN.gg
            </span>
          </div>

          {/* Center - Live players */}
          <div className="hidden md:flex items-center gap-2 glass px-4 py-2 rounded-lg">
            <Users className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">Live Players:</span>
            <span className="text-sm font-bold text-primary font-numbers">1,247</span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <TrendingUp className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>

            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>

            <Button
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 neon-glow"
              onClick={() => setWalletModalVisible(true)}
            >
              <Wallet className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{connected ? displayAddress || "Connected" : "Connect Wallet"}</span>
              <span className="sm:hidden">{connected ? displayAddress || "Connected" : "Connect"}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

