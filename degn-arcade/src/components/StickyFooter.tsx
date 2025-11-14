"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";

export function StickyFooter({ jackpot, progress }: { jackpot: number; progress: number }) {
  const cappedProgress = Math.min(1, Math.max(0, progress));

  const progressLabel = useMemo(() => `${Math.round(cappedProgress * 100)}%`, [cappedProgress]);

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto flex w-full max-w-[1680px] px-4 pb-4 lg:px-8">
        <div className="flex w-full flex-col gap-3 rounded-t-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_-25px_60px_-40px_rgba(20,184,166,0.75)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted">
            <Trophy className="h-4 w-4 text-neon" />
            <div>
              <p className="text-[10px]">Jackpot Pool</p>
              <p className="text-base font-semibold text-white">{jackpot.toFixed(2)} SOL</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:max-w-md">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-aqua" /> XP Progress
              </div>
              <span className="text-xs text-white">{progressLabel}</span>
            </div>
            <div className="relative">
              <AnimatePresence>
                <motion.div
                  key={progressLabel}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: [0.6, 0], scale: [1, 1.12] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className="absolute -inset-[6px] rounded-full bg-gradient-to-r from-neon/35 via-aqua/25 to-accent/25"
                />
              </AnimatePresence>
              <div className="relative h-2.5 overflow-hidden rounded-full border border-white/15 bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-neon via-aqua to-accent"
                  animate={{ width: `${cappedProgress * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button className="whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted transition hover:border-neon/40 hover:text-white">
              View My Stats
            </button>
            <button className="whitespace-nowrap rounded-full bg-gradient-to-r from-neon via-aqua to-accent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_25px_rgba(147,51,234,0.35)]">
              Join Jackpot
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
