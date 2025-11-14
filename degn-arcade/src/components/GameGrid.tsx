"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type GameCategory = "Arcade" | "Casino";

type Game = {
  name: string;
  category: GameCategory;
  tagline: string;
  players: number;
  avgWin: string;
  topPlayer: string;
  tag?: "Trending" | "New" | "Jackpot";
  accent: string;
  link?: string;
};

const games: Game[] = [
  // Arcade Games (4) - Coming Soon
  {
    name: "Sol Bird",
    category: "Arcade",
    players: 0,
    tagline: "Flap through pipes, collect coins, outlast the flock.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    tag: "New",
    accent: "from-[#F59E0B] via-[#F97316] to-[#22D3EE]"
  },
  {
    name: "Connect4",
    category: "Arcade",
    players: 0,
    tagline: "Drop tokens, connect four, claim the board.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    accent: "from-[#7C3AED] via-[#2563EB] to-[#22D3EE]"
  },
  {
    name: "Slither",
    category: "Arcade",
    players: 0,
    tagline: "Grow your snake, trap rivals, dominate the arena.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    tag: "New",
    accent: "from-[#F472B6] via-[#EC4899] to-[#F59E0B]"
  },
  {
    name: "Agar",
    category: "Arcade",
    players: 0,
    tagline: "Absorb cells, split strategically, become the biggest blob.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    accent: "from-[#14B8A6] via-[#0EA5E9] to-[#6366F1]"
  },
  // Casino Games (3) - Coming Soon
  {
    name: "Wheel of Sol",
    category: "Casino",
    players: 0,
    tagline: "Tiered jackpots spinning every 30 seconds.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    accent: "from-[#F97316] via-[#F472B6] to-[#60A5FA]"
  },
  {
    name: "Plinko",
    category: "Casino",
    players: 0,
    tagline: "Dial risk, chase the 100x slot.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    accent: "from-[#22D3EE] via-[#0EA5E9] to-[#6366F1]"
  },
  {
    name: "Roulette",
    category: "Casino",
    players: 0,
    tagline: "Classic wheel, neon odds, instant payouts.",
    avgWin: "Coming Soon",
    topPlayer: "TBD",
    accent: "from-[#F97316] via-[#F59E0B] to-[#38BDF8]"
  }
];

export function GameGrid() {
  const [activeCategory, setActiveCategory] = useState<GameCategory>("Arcade");

  const filtered = useMemo(() => games.filter((game) => game.category === activeCategory), [activeCategory]);

  return (
    <section id="games" className="relative mx-auto w-full max-w-[900px]">
      <div className="absolute inset-0 -z-10 rounded-[36px] bg-gradient-to-r from-neon/20 via-transparent to-aqua/15 blur-3xl" />
      <div className="rounded-[36px] border border-white/10 bg-black/32 p-6 shadow-[0_55px_95px_-70px_rgba(20,184,166,0.55)] backdrop-blur-2xl sm:p-10 lg:p-12">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-muted">
                Featured Games
              </span>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Pick Your Run</h2>
              <p className="max-w-2xl text-sm text-muted/80">
                Snap into a lobby, jack your stack, repeat. Flip to arcade chaos or classic house-edge heaters—every tile here pays if you play it right.
              </p>
            </div>
          </div>

          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as GameCategory)}>
            <TabsList className="w-full justify-start bg-black/25 p-1">
              <TabsTrigger value="Arcade">Arcade</TabsTrigger>
              <TabsTrigger value="Casino">Casino</TabsTrigger>
            </TabsList>
            <TabsContent value="Arcade">
              <CategoryGrid games={filtered} />
            </TabsContent>
            <TabsContent value="Casino">
              <CategoryGrid games={filtered} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function CategoryGrid({ games }: { games: Game[] }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={games[0]?.category ?? "empty"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {games.map((game, index) => (
          <GameTile key={game.name} game={game} index={index} />)
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function GameTile({ game, index }: { game: Game; index: number }) {
  const PlayElement = game.link ? Link : "button";

  return (
    <motion.article
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/30 p-6 transition shadow-[0_35px_70px_-65px_rgba(20,184,166,0.5)]"
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.04 }}
      whileHover={{ rotateX: 3, rotateY: -3 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-neon/25 blur-3xl opacity-0 transition group-hover:opacity-100" />
      <motion.div
        className={`relative h-24 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${game.accent}`}
        animate={{ scale: [1, 1.02, 1], rotate: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25),transparent_60%)]"
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.4em] text-white/85">
          {game.category}
        </span>
      </motion.div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted/80">{game.category}</p>
            <h3 className="text-xl font-semibold text-white">{game.name}</h3>
            <p className="text-[11px] uppercase tracking-[0.35em] text-muted/70">{game.players.toLocaleString()} online</p>
          </div>
          {game.tag && (
            <span className="rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-neon shadow-[0_0_10px_rgba(147,51,234,0.3)]">
              {game.tag === "Trending" && "🔥 Trending"}
              {game.tag === "New" && "🆕 New"}
              {game.tag === "Jackpot" && "💎 Jackpot"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted/80">{game.tagline}</p>
        <div className="flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            {game.link ? (
              <Link
                href={game.link}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-neon/40 hover:bg-neon/10 hover:shadow-[0_0_12px_rgba(147,51,234,0.3)]"
              >
                Play
              </Link>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-neon/40 hover:bg-neon/10 hover:shadow-[0_0_12px_rgba(147,51,234,0.3)]"
              >
                Play
              </button>
            )}
          </motion.div>
          <div className="relative text-xs text-muted">
            <div className="absolute inset-0 rounded-full bg-neon/10 opacity-0 blur-lg transition group-hover:opacity-100" />
            <p className="relative text-[11px] text-white/85">Avg win {game.avgWin}</p>
            <p className="relative text-[10px] uppercase tracking-[0.25em] text-muted/75">Top {game.topPlayer}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

