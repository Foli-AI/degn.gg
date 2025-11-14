import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, PlayCircle } from "lucide-react";

import { StatsBar } from "@/components/StatsBar";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-28 sm:px-10 lg:px-16">
      <div className="absolute inset-0 bg-hero-gradient opacity-90" />
      <motion.div
        className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-neon/25 blur-3xl"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-aqua/30 blur-3xl"
        animate={{ y: [0, -26, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12">
        <motion.div
          className="flex flex-col gap-6 text-center lg:max-w-3xl lg:text-left"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.4em] text-muted sm:self-start">
            Neon Crypto Arcade
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Welcome to DEGN — The Next Generation Crypto Arcade
          </h1>
          <p className="text-base text-muted sm:text-lg">
            Play. Bet. Win. Earn. The most addictive hybrid arcade + casino built for degens. Strap
            in for 2-minute battles, provably fair casino rounds, and constant rewards.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/games"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-neon px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white drop-shadow-lg transition hover:shadow-neon"
            >
              Play Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#games"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-8 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-muted transition hover:border-neon/40 hover:text-white"
            >
              Browse Games
              <Gamepad2 className="h-4 w-4" />
            </a>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em] text-muted sm:justify-start">
            <PlayCircle className="h-4 w-4 text-aqua" />
            2,431 players online • $58,204 wagered today • 97% RTP average
          </div>
        </motion.div>
        <StatsBar />
      </div>
    </section>
  );
}

