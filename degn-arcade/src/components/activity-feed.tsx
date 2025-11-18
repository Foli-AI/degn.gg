"use client";

import { Trophy, Zap, Coins } from "lucide-react";

const ACTIVITIES = [
  { id: 1, player: "CryptoKing", action: "won", amount: 2.5, game: "Sol Bird", time: "2m ago", type: "win" },
  { id: 2, player: "MoonLord", action: "joined", amount: 0.5, game: "Suroi", time: "3m ago", type: "join" },
  { id: 3, player: "SolSniper", action: "won", amount: 1.8, game: "Slither", time: "5m ago", type: "win" },
  { id: 4, player: "DegenAce", action: "won", amount: 3.2, game: "Agar", time: "7m ago", type: "win" },
  { id: 5, player: "RocketMan", action: "joined", amount: 0.25, game: "Coinflip", time: "8m ago", type: "join" },
  { id: 6, player: "NeonNinja", action: "won", amount: 1.5, game: "Sol Bird", time: "10m ago", type: "win" },
];

export function ActivityFeed() {
  return (
    <div className="glass rounded-xl p-5 border border-border/30 sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 font-heading tracking-tight">
          <Zap className="w-5 h-5 text-primary" />
          Live Activity
        </h3>
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
      </div>

      {/* TOTAL POOL */}
      <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Pool</span>
          <Trophy className="w-4 h-4 text-accent" />
        </div>
        <div className="text-3xl font-bold text-accent neon-text font-numbers tracking-tight">127.8 SOL</div>
        <div className="text-xs text-muted-foreground mt-1">+2.4 SOL in last hour</div>
      </div>

      {/* Activity list */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {ACTIVITIES.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors border border-transparent hover:border-primary/20"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                activity.type === "win" ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              {activity.type === "win" ? <Trophy className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">
                <span className="font-semibold text-foreground">{activity.player}</span>{" "}
                <span className="text-muted-foreground">{activity.action}</span>{" "}
                <span className={activity.type === "win" ? "text-primary font-bold font-numbers" : "text-muted-foreground"}>
                  {activity.amount} SOL
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.game} · {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: oklch(0.4 0.1 265 / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: oklch(0.5 0.1 265 / 0.5);
        }
      `}</style>
    </div>
  );
}

