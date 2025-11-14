import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = ["Latest Bets", "High Rollers", "Leaderboard", "Tournaments"] as const;

type Tab = typeof tabs[number];

type FeedItem = {
  user: string;
  action: string;
  game: string;
  value: string;
};

type LeaderboardItem = {
  user: string;
  xp: number;
  rank: number;
};

const latestBets: FeedItem[] = [
  { user: "@NeonPilot", action: "cashed", game: "CrashX", value: "4.5x" },
  { user: "@OrbitMara", action: "cleared", game: "Moon Blaster", value: "6.3 SOL" },
  { user: "@Blade", action: "hit", game: "Wheel of Sol", value: "Tier 4" },
  { user: "@Cipher", action: "won", game: "CoinRaid", value: "12.4 SOL" },
  { user: "@NovaGG", action: "dropped", game: "Plinko", value: "8.2 SOL" }
];

const highRollers: FeedItem[] = [
  { user: "@Seraph", action: "staked", game: "CrashX", value: "48 SOL" },
  { user: "@Zenith", action: "queued", game: "CoinRaid Royale", value: "32 SOL" },
  { user: "@DeltaFox", action: "double down", game: "Blackjack", value: "24 SOL" }
];

const leaderboard: LeaderboardItem[] = [
  { user: "@Crystal", rank: 1, xp: 128_420 },
  { user: "@Pulse", rank: 2, xp: 121_030 },
  { user: "@Nebula", rank: 3, xp: 117_540 },
  { user: "@Shift", rank: 4, xp: 110_220 }
];

const tournaments: FeedItem[] = [
  { user: "Moon Blaster", action: "starts", game: "19:00 UTC", value: "50 SOL Pool" },
  { user: "CrashX Velocity", action: "qualifiers", game: "18:30 UTC", value: "Top 10" }
];

export function LiveFeedPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("Latest Bets");

  const content = useMemo(() => {
    switch (activeTab) {
      case "Latest Bets":
        return latestBets;
      case "High Rollers":
        return highRollers;
      case "Leaderboard":
        return leaderboard;
      case "Tournaments":
        return tournaments;
      default:
        return latestBets;
    }
  }, [activeTab]);

  return (
    <section id="live" className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_45px_90px_-65px_rgba(147,51,234,0.5)]">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Live Feed</h2>
            <p className="text-sm text-muted">Track wins, whales, and tournament heat in real time.</p>
          </div>
          <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.35em] transition ${
                  tab === activeTab ? "bg-neon/20 text-white" : "text-muted hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <AnimatePresence mode="wait">
            {activeTab === "Leaderboard" ? (
              <motion.ul
                key="leaderboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 text-sm text-muted"
              >
                {leaderboard.map((item) => (
                  <li
                    key={item.user}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 text-white">
                      <span className="rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-neon">
                        #{item.rank}
                      </span>
                      <span>{item.user}</span>
                    </div>
                    <span>{item.xp.toLocaleString()} XP</span>
                  </li>
                ))}
              </motion.ul>
            ) : (
              <motion.ul
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 text-sm text-muted"
              >
                {(content as FeedItem[]).map((item, index) => (
                  <li
                    key={`${item.user}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-white">{item.user}</span>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-muted">
                        {item.action} • {item.game}
                      </p>
                    </div>
                    <span className="text-neon text-sm font-semibold">{item.value}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
