"use client";

import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp } from "lucide-react";

const TOP_PLAYERS = [
  { rank: 1, player: "CryptoWhale", earnings: 156.8, wins: 234, icon: "👑" },
  { rank: 2, player: "SolMaster", earnings: 142.3, wins: 198, icon: "🥈" },
  { rank: 3, player: "MoonRanger", earnings: 128.7, wins: 176, icon: "🥉" },
  { rank: 4, player: "DegenPro", earnings: 98.4, wins: 143 },
  { rank: 5, player: "NeonDreamer", earnings: 87.2, wins: 129 },
];

export function LeaderboardPreview() {
  return (
    <div className="glass rounded-xl p-6 border border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading tracking-tight">
              Top Players
            </h3>
            <p className="text-xs text-muted-foreground">All-time leaders</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-primary/30 bg-transparent">
          View All
          <TrendingUp className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Leaderboard table */}
      <div className="space-y-3">
        {TOP_PLAYERS.map((player) => (
          <div
            key={player.rank}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/20 transition-all group border border-transparent hover:border-primary/20"
          >
            {/* Rank */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-numbers ${
                player.rank === 1
                  ? "bg-yellow-500/20 text-yellow-400"
                  : player.rank === 2
                    ? "bg-gray-400/20 text-gray-300"
                    : player.rank === 3
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-muted/30 text-muted-foreground"
              }`}
            >
              {player.icon || player.rank}
            </div>

            {/* Player info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm group-hover:text-primary transition-colors">{player.player}</div>
              <div className="text-xs text-muted-foreground">{player.wins} wins</div>
            </div>

            {/* Earnings */}
            <div className="text-right">
              <div className="font-bold text-primary text-sm font-numbers">{player.earnings} SOL</div>
              <div className="text-xs text-muted-foreground">earned</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

