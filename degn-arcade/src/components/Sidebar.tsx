"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Dice5, Gamepad2, Home, Joystick, Rocket, ShieldCheck, Sparkles, Trophy, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";

const PRIMARY_NAV = [{ label: "Lobby", href: "/", icon: <Home className="h-4 w-4" /> }];

const CASINO_GAMES = [
  { label: "Dice", href: "/games/dice", icon: <Dice5 className="h-4 w-4" /> },
  { label: "Crash", href: "/games/crash", icon: <Rocket className="h-4 w-4" /> },
  { label: "Plinko", href: "/games/plinko", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Wheel of Sol", href: "/games/wheel", icon: <Crown className="h-4 w-4" /> },
  { label: "Roulette", href: "/games/roulette", icon: <Trophy className="h-4 w-4" /> }
];

const ARCADE_GAMES = [
  { label: "CoinRaid", href: "/games/coinraid", icon: <Sparkles className="h-4 w-4" /> },
  { label: "SOL Serpent Royale", href: "/games/serpent-royale", icon: <Waves className="h-4 w-4" /> },
  { label: "Quick Draw Arena", href: "/games/quick-draw", icon: <Gamepad2 className="h-4 w-4" /> },
  { label: "Moon Blaster", href: "/games/moon-blaster", icon: <Joystick className="h-4 w-4" /> },
  { label: "Pixel Brawl Royale", href: "/games/pixel-brawl", icon: <Joystick className="h-4 w-4" /> }
];

export function Sidebar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const sidebarGames = useMemo(() => ({ casino: CASINO_GAMES.slice(0, 4), arcade: ARCADE_GAMES.slice(0, 4) }), []);

  return (
    <aside className="sticky top-[72px] hidden h-[calc(100vh-136px)] w-[260px] shrink-0 flex-col gap-5 rounded-3xl border border-white/10 bg-black/25 px-4 py-5 backdrop-blur-lg lg:flex">
      <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] text-muted/80">
        Menu
      </div>

      <nav className="space-y-1.5 text-sm text-muted">
        {PRIMARY_NAV.map((item) => (
          <NavButton key={item.label} href={item.href} label={item.label} icon={item.icon} hovered={hovered} setHovered={setHovered} />
        ))}
      </nav>

      <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] text-muted/80">
        Casino
      </div>

      <nav className="space-y-1.5 text-sm text-muted">
        {sidebarGames.casino.map((item) => (
          <NavButton key={item.label} href={item.href} label={item.label} icon={item.icon} hovered={hovered} setHovered={setHovered} />
        ))}
      </nav>

      <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] text-muted/80">
        Arcade
      </div>

      <nav className="space-y-1.5 text-sm text-muted">
        {sidebarGames.arcade.map((item) => (
          <NavButton key={item.label} href={item.href} label={item.label} icon={item.icon} hovered={hovered} setHovered={setHovered} />
        ))}
      </nav>
    </aside>
  );
}

function NavButton({
  href,
  label,
  icon,
  hovered,
  setHovered
}: {
  href: string;
  label: string;
  icon: ReactNode;
  hovered: string | null;
  setHovered: (value: string | null) => void;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="default"
      className={`w-full justify-start gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-muted/80 transition-colors hover:border-neon/40 hover:bg-neon/10 hover:text-white hover:shadow-[0_0_12px_rgba(147,51,234,0.2)] ${
        hovered === label ? "text-white" : ""
      }`}
      onMouseEnter={() => setHovered(label)}
      onMouseLeave={() => setHovered(null)}
    >
      <Link href={href} className="flex w-full items-center gap-3">
        <span className="text-neon flex-shrink-0">{icon}</span>
        <span>{label}</span>
      </Link>
    </Button>
  );
}

