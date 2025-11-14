"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BetEntry = {
  player: string;
  game: string;
  win: number;
};

type PlayerStat = {
  label: string;
  value: string;
};

type TabKey = "live" | "wins" | "stats";

const initialLive: BetEntry[] = [
  { player: "@NeonPilot", game: "Crash", win: 4.2 },
  { player: "@Orbit", game: "Wheel of Sol", win: 6.8 },
  { player: "@Cipher", game: "CoinRaid", win: 3.1 }
];

const initialWins: BetEntry[] = [
  { player: "@Zenith", game: "Pixel Brawl Royale", win: 18.7 },
  { player: "@Glitch", game: "Moon Blaster", win: 15.9 },
  { player: "@NovaGG", game: "Plinko", win: 15.5 }
];

const stats: PlayerStat[] = [
  { label: "24h Active Players", value: "8,423" },
  { label: "Average RTP", value: "97.2%" },
  { label: "High Roller Online", value: "@SolSovereign" },
  { label: "Season XP Leader", value: "@Crystal" }
];

export function RightRail() {
  const [activeTab, setActiveTab] = useState<TabKey>("live");
  const [liveBets, setLiveBets] = useState(initialLive);
  const [bigWins, setBigWins] = useState(initialWins);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveBets((prev) => {
        const next = {
          player: mockName(),
          game: randomGame(),
          win: parseFloat((Math.random() * 6 + 2).toFixed(2))
        };
        return [next, ...prev].slice(0, 6);
      });
      setBigWins((prev) => {
        const next = {
          player: mockName(),
          game: randomGame(),
          win: parseFloat((Math.random() * 40 + 10).toFixed(2))
        };
        return [next, ...prev].slice(0, 6);
      });
    }, 5200);

    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => {
    if (activeTab === "live") return liveBets;
    if (activeTab === "wins") return bigWins;
    return [];
  }, [activeTab, liveBets, bigWins]);

  return (
    <aside className="relative sticky top-[88px] hidden h-[calc(100vh-160px)] w-[280px] shrink-0 flex-col gap-6 lg:flex">
      <div className="absolute inset-0 -z-10 rounded-[28px] bg-gradient-to-b from-neon/18 via-transparent to-aqua/10 blur-3xl" />
      <div className="flex h-full flex-col gap-5 rounded-[28px] border border-white/10 bg-black/25 p-5 pt-4 shadow-[0_45px_80px_-70px_rgba(20,184,166,0.55)] backdrop-blur-2xl">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted">
            Live Casino Data
          </span>
          <h3 className="text-lg font-semibold text-white">Lobby Pulse</h3>
          <p className="text-xs text-muted/80 leading-relaxed">Track wagers, epic wins, and player momentum.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList className="w-full justify-between bg-black/25 p-1">
            <TabsTrigger value="live" className="flex-1 px-2 py-1.5 text-[10px]">Live</TabsTrigger>
            <TabsTrigger value="wins" className="flex-1 px-2 py-1.5 text-[10px]">Wins</TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 px-2 py-1.5 text-[10px]">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <AnimatedTable entries={rows} emptyLabel="Waiting for action" />
          </TabsContent>
          <TabsContent value="wins">
            <AnimatedTable entries={rows} emptyLabel="Big win feed warming up" highlight />
          </TabsContent>
          <TabsContent value="stats">
            <motion.ul
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2 text-xs text-muted"
            >
              {stats.map((stat) => (
                <li key={stat.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                  <span className="text-[10px] uppercase tracking-[0.25em] leading-tight">{stat.label}</span>
                  <span className="text-xs text-white font-medium">{stat.value}</span>
                </li>
              ))}
            </motion.ul>
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}

function AnimatedTable({ entries, emptyLabel, highlight = false }: { entries: BetEntry[]; emptyLabel: string; highlight?: boolean }) {
  return entries.length ? (
    <div className="relative max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-black/25">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="sticky top-0 grid grid-cols-[1.3fr_1fr_0.9fr] gap-2 border-b border-white/5 bg-black/25 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-muted/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <span>Player</span>
          <span>Game</span>
          <span className="text-right">Win</span>
        </div>
        <div>
          <AnimatePresence initial={false}>
            {entries.map((entry, idx) => (
              <motion.div
                key={`${entry.player}-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className={`grid grid-cols-[1.3fr_1fr_0.9fr] gap-2 border-b border-white/5 px-3 py-2 text-xs text-muted transition-colors ${
                  highlight ? "hover:bg-neon/15 hover:shadow-[0_0_8px_rgba(147,51,234,0.15)]" : "hover:bg-white/10"
                }`}
              >
                <span className="truncate text-white text-xs">{entry.player}</span>
                <span className="truncate text-xs">{entry.game}</span>
                <span className="text-right text-neon text-xs font-semibold">{entry.win.toFixed(2)} SOL</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  ) : (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-8 text-center text-xs text-muted">{emptyLabel}</div>
  );
}

function mockName() {
  const handles = ["@Solaris", "@Pulse", "@ZeroDay", "@Flux", "@Aurora", "@NeonApe", "@Helix", "@NovaGG"];
  return handles[Math.floor(Math.random() * handles.length)];
}

function randomGame() {
  const games = [
    "Dice",
    "Crash",
    "Wheel of Sol",
    "Plinko",
    "Roulette",
    "CoinRaid",
    "SOL Serpent Royale",
    "Quick Draw Arena",
    "Moon Blaster",
    "Pixel Brawl Royale"
  ];
  return games[Math.floor(Math.random() * games.length)];
}
