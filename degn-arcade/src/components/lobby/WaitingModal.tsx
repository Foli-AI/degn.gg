"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WaitingModalProps {
  isOpen: boolean;
  currentPlayers: number;
  maxPlayers: number;
  entryAmount: number;
  onClose?: () => void;
}

export function WaitingModal({ 
  isOpen, 
  currentPlayers, 
  maxPlayers, 
  entryAmount,
  onClose 
}: WaitingModalProps) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) return;
    
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const progress = (currentPlayers / maxPlayers) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 glass rounded-2xl p-8 border border-primary/30 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold neon-text" style={{ fontFamily: "var(--font-heading)" }}>
              Waiting for Players
            </h2>
            <p className="text-muted-foreground">
              Entry Fee: <span className="font-bold text-primary">{entryAmount} SOL</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-6xl font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {currentPlayers}/{maxPlayers}
            </div>
            
            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">
              {currentPlayers < maxPlayers 
                ? `Waiting for ${maxPlayers - currentPlayers} more player${maxPlayers - currentPlayers > 1 ? 's' : ''}...`
                : "Lobby full! Starting game..."}
            </p>
            {countdown > 0 && (
              <p className="text-xs text-muted-foreground">
                Game will start in {countdown}s or when full
              </p>
            )}
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Matchmaking...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

