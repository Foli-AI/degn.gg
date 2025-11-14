"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Crown, Trophy, Users, Wallet2, Zap } from "lucide-react";

import { AmbientParticles } from "@/components/AmbientParticles";
import { Sidebar } from "@/components/Sidebar";
import { GameGrid } from "@/components/GameGrid";
import { RightRail } from "@/components/RightRail";
import { StickyFooter } from "@/components/StickyFooter";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

import { fetchLobbySnapshot } from "@/lib/supabase/stats";

const gamesCopy = {
  headline: "Dive Into The Neon Arena",
  subheading:
    "High-voltage Solana wagers in real time—raid vaults, ride crash multipliers, and stack rakeback while the neon floor pays out.",
  ctas: {
    enter: "Enter Arcade",
    connect: "Connect Wallet"
  }
};

type HeroStat = {
  label: "Players Online" | "Total Wagered" | "Jackpot Pool" | "Biggest Win Today";
  value: number;
  formatter: (value: number) => string;
  icon: JSX.Element;
};

export default function Page() {
  const [playersOnline, setPlayersOnline] = useState(2431);
  const [wageredToday, setWageredToday] = useState(58204);
  const [jackpot, setJackpot] = useState(94.6);
  const [jackpotProgress, setJackpotProgress] = useState(0.68);
  const [biggestWin, setBiggestWin] = useState(68.4);
  const [rainCountdown, setRainCountdown] = useState(12 * 60 + 45);

  const { connected, publicKey } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const displayAddress = useMemo(() => {
    if (!publicKey) return null;
    const base58 = publicKey.toBase58();
    return `${base58.slice(0, 4)}…${base58.slice(-4)}`;
  }, [publicKey]);

  const openWalletModal = useCallback(() => {
    setWalletModalVisible(true);
  }, [setWalletModalVisible]);

  useEffect(() => {
    let isActive = true;

    const hydrateFromSupabase = async () => {
      const snapshot = await fetchLobbySnapshot();
      if (!snapshot || !isActive) return;

      setPlayersOnline((prev) => Math.max(snapshot.playersOnline, prev));
      setWageredToday((prev) => (snapshot.totalWagered > 0 ? Math.round(snapshot.totalWagered) : prev));
      setJackpot((prev) => (snapshot.jackpotPool > 0 ? snapshot.jackpotPool : prev));
      setBiggestWin((prev) => Math.max(prev, snapshot.biggestWin));
    };

    void hydrateFromSupabase();
    const refresh = setInterval(() => void hydrateFromSupabase(), 30000);

    return () => {
      isActive = false;
      clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    const ticker = setInterval(() => {
      setPlayersOnline((prev) => {
        const delta = Math.floor(Math.random() * 60) - 30;
        return Math.max(1200, prev + delta);
      });
      setWageredToday((prev) => prev + Math.floor(Math.random() * 540 + 160));
      setJackpot((prev) => parseFloat((prev + Math.random() * 1.4).toFixed(2)));
      setJackpotProgress((prev) => {
        const next = prev + Math.random() * 0.03;
        return next >= 1 ? 0.18 : next;
      });
      setBiggestWin((prev) => {
        if (Math.random() < 0.35) {
          const candidate = parseFloat((Math.random() * 90 + 20).toFixed(2));
          return candidate > prev ? candidate : prev;
        }
        return prev;
      });
    }, 3600);

    const countdownTimer = setInterval(() => {
      setRainCountdown((prev) => (prev <= 0 ? 15 * 60 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(ticker);
      clearInterval(countdownTimer);
    };
  }, []);

  const statBar: HeroStat[] = useMemo(
    () => [
      {
        label: "Players Online",
        value: playersOnline,
        formatter: (value) => value.toLocaleString(),
        icon: <Users className="h-4 w-4 text-aqua" />
      },
      {
        label: "Total Wagered",
        value: wageredToday,
        formatter: (value) => `$${value.toLocaleString()}`,
        icon: <Zap className="h-4 w-4 text-neon" />
      },
      {
        label: "Jackpot Pool",
        value: jackpot,
        formatter: (value) => `${value.toFixed(2)} SOL`,
        icon: <Trophy className="h-4 w-4 text-neon" />
      },
      {
        label: "Biggest Win Today",
        value: biggestWin,
        formatter: (value) => `${value.toFixed(2)} SOL`,
        icon: <Crown className="h-4 w-4 text-aqua" />
      }
    ],
    [biggestWin, jackpot, playersOnline, wageredToday]
  );

  return (
    <div className="min-h-screen bg-base text-white">
      <TopNav connected={connected} address={displayAddress} onWalletAction={openWalletModal} />
      <div className="mx-auto grid w-full max-w-[1680px] grid-cols-1 gap-6 px-4 pb-36 pt-10 lg:grid-cols-[280px_1fr_280px] lg:gap-8 lg:px-8 xl:gap-10">
        <Sidebar />
        <div className="flex min-h-[calc(100vh-200px)] flex-col gap-16">
          <HeroSection
            headline={gamesCopy.headline}
            subheading={gamesCopy.subheading}
            statBar={statBar}
            rainCountdown={rainCountdown}
            isConnected={connected}
            address={displayAddress}
            onEnterClick={() => window.location.href = "/find-game"}
            onConnectClick={openWalletModal}
          />
          <GameGrid />
        </div>
        <RightRail />
      </div>
      <StickyFooter jackpot={jackpot} progress={jackpotProgress} />
      <Footer />
    </div>
  );
}

function HeroSection({
  headline,
  subheading,
  statBar,
  rainCountdown,
  isConnected,
  address,
  onEnterClick,
  onConnectClick
}: {
  headline: string;
  subheading: string;
  statBar: HeroStat[];
  rainCountdown: number;
  isConnected: boolean;
  address: string | null;
  onEnterClick: () => void;
  onConnectClick: () => void;
}) {
  const formattedCountdown = useMemo(() => {
    const minutes = Math.floor(rainCountdown / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (rainCountdown % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [rainCountdown]);

  const walletLabel = isConnected ? address ?? "Wallet Connected" : gamesCopy.ctas.connect;

  return (
    <section className="relative mx-auto w-full max-w-[900px]">
      <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-r from-neon/35 via-aqua/20 to-transparent blur-3xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/35 p-6 shadow-[0_45px_90px_-65px_rgba(147,51,234,0.45)] backdrop-blur-2xl sm:p-10">
        <AmbientParticles />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative z-10 flex flex-col gap-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-muted">
                Neon Lobby
              </span>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">{headline}</h1>
              <p className="max-w-xl text-sm text-muted/80">{subheading}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEnterClick}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-neon via-aqua to-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_0_35px_rgba(147,51,234,0.4)] hover:shadow-[0_0_45px_rgba(147,51,234,0.55)]"
              >
                {gamesCopy.ctas.enter}
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConnectClick}
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] transition hover:border-neon/40 hover:text-white hover:shadow-[0_0_15px_rgba(147,51,234,0.25)] ${
                    isConnected ? "border-neon/50 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]" : "border-white/15 text-muted"
                  }`}
                >
                  {walletLabel}
                  <Wallet2 className="h-4 w-4" />
                </motion.button>
                {isConnected && (
                  <span className="inline-flex items-center justify-center gap-2 rounded-full border border-neon/40 bg-neon/10 px-4 py-1 text-[10px] uppercase tracking-[0.3em] text-neon shadow-[0_0_12px_rgba(147,51,234,0.25)]">
                    Live Balance Sync
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs uppercase tracking-[0.35em] text-muted lg:grid-cols-4">
            {statBar.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_20px_40px_-35px_rgba(147,51,234,0.65)] transition-shadow hover:shadow-[0_25px_50px_-40px_rgba(147,51,234,0.8)]">
                <p className="flex items-center gap-2 text-muted/80">
                  {stat.icon}
                  {stat.label}
                </p>
                <p className="mt-2 text-[1.35rem] font-semibold text-white">
                  <AnimatedNumber value={stat.value} formatter={stat.formatter} />
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-muted sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 text-sm text-white/90">
              <motion.div
                className="rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-neon"
                animate={{ boxShadow: ["0 0 12px rgba(147,51,234,0.25)", "0 0 22px rgba(147,51,234,0.55)", "0 0 12px rgba(147,51,234,0.25)"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                Rain Pot
              </motion.div>
              unlocks in <span className="text-neon">{formattedCountdown}</span>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted/80">
              Stay staked, stay online—active bettors split neon rain bonuses the second it hits.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimatedNumber({ value, formatter }: { value: number; formatter: (value: number) => string }) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 160, damping: 22, mass: 0.8 });
  const displayValue = useTransform(spring, (latest) => formatter(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{displayValue}</motion.span>;
}

function TopNav({ connected, address, onWalletAction }: { connected: boolean; address: string | null; onWalletAction: () => void }) {
  const walletLabel = connected ? address ?? "Wallet" : "Connect";

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between px-4 py-4 lg:px-8">
        <div className="flex w-full items-center justify-between rounded-full border border-white/10 bg-black/35 px-5 py-3 shadow-[0_25px_60px_-45px_rgba(20,184,166,0.55)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon to-aqua text-sm font-semibold tracking-[0.3em] text-base shadow-neon">
              D
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white">DEGN.GG</p>
              <span className="text-[10px] uppercase tracking-[0.4em] text-muted/80">Arcade + Casino</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="whitespace-nowrap border border-white/10 px-3 text-muted/80 hover:border-neon/40">
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={onWalletAction}
              className={`whitespace-nowrap px-4 ${connected ? "shadow-[0_0_18px_rgba(147,51,234,0.35)]" : ""}`}
            >
              <Wallet2 className="h-4 w-4" />
              {walletLabel}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

