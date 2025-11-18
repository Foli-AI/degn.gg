"use client";

import { Button } from "@/components/ui/button";
import { Eye, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMatchmaker } from "@/hooks/useMatchmaker";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

interface GameRoom {
  id: number;
  title: string;
  icon: string;
  players: number;
  maxPlayers: number;
  entryBet: number;
  status: "waiting" | "in_progress" | "completed";
  color: string;
}

const BET_OPTIONS = [0.05, 0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

export function GameRoomCard({ room }: { room: GameRoom }) {
  const [selectedBet, setSelectedBet] = useState<number>(room.entryBet);
  const [isJoining, setIsJoining] = useState(false);
  const { findAndJoinBestMatch, connect, connected } = useMatchmaker();
  const { connected: walletConnected } = useWallet();
  const router = useRouter();

  // Map game titles to game types
  const getGameType = (title: string): string => {
    const gameMap: Record<string, string> = {
      "Sol Bird": "sol-bird-race",
      "Suroi": "suroi",
      "Slither": "slither",
      "Agar": "agar",
      "Coinflip": "coinflip",
    };
    return gameMap[title] || "sol-bird-race";
  };

  const handleJoinGame = async () => {
    if (!walletConnected) {
      alert("Please connect your wallet first");
      return;
    }

    setIsJoining(true);
    try {
      // Ensure connected to matchmaker
      if (!connected) {
        await connect();
        // Wait a bit for connection
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const gameType = getGameType(room.title) as any;
      await findAndJoinBestMatch({
        gameType,
        entryAmount: selectedBet,
      });
      
      // The hook will handle navigation to the game page
    } catch (error) {
      console.error("Failed to join game:", error);
      alert(error instanceof Error ? error.message : "Failed to join game. Make sure the backend is running.");
    } finally {
      setIsJoining(false);
    }
  };

  const statusConfig = {
    waiting: {
      label: "Waiting",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
      icon: Play,
    },
    in_progress: {
      label: "In Progress",
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      icon: Play,
    },
    completed: {
      label: "Completed",
      color: "text-gray-400",
      bgColor: "bg-gray-400/10",
      icon: Check,
    },
  };

  const status = statusConfig[room.status];
  const StatusIcon = status.icon;

  return (
    <div className="glass rounded-xl p-4 hover:bg-card/60 transition-all group cursor-pointer border border-border/30 hover:border-primary/50">
      {/* Game icon and title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center text-2xl",
              room.color,
            )}
          >
            {room.icon}
          </div>
          <div>
            <h3
              className="font-bold text-lg group-hover:text-primary transition-colors font-heading tracking-tight"
            >
              {room.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", status.bgColor, status.color)}
              >
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Players</span>
          <span className="font-semibold font-numbers">
            {room.players}/{room.maxPlayers}
          </span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all"
            style={{ width: `${(room.players / room.maxPlayers) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entry Bet</span>
          <span className="font-bold text-primary font-numbers">{room.entryBet} SOL</span>
        </div>
      </div>

      {/* Bet Amount Dropdown */}
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-2">Bet Amount (SOL)</label>
        <select
          value={selectedBet}
          onChange={(e) => setSelectedBet(parseFloat(e.target.value))}
          className={cn(
            "w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/30",
            "text-sm font-semibold text-foreground font-numbers",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
            "hover:border-primary/40 transition-colors",
            "bg-background/50 backdrop-blur-sm"
          )}
          disabled={room.status !== "waiting"}
        >
          {BET_OPTIONS.map((bet) => (
            <option key={bet} value={bet}>
              {bet} SOL
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {room.status === "waiting" ? (
          <>
            <Button 
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-none" 
              size="sm"
              onClick={handleJoinGame}
              disabled={isJoining || !walletConnected}
            >
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
            <Button variant="outline" size="sm" className="border-primary/30 bg-transparent">
              <Eye className="w-4 h-4" />
            </Button>
          </>
        ) : room.status === "in_progress" ? (
          <Button variant="outline" className="flex-1 border-primary/30 bg-transparent" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Spectate
          </Button>
        ) : (
          <Button variant="ghost" className="flex-1" size="sm" disabled>
            Game Ended
          </Button>
        )}
      </div>
    </div>
  );
}

