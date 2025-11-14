import { motion } from "framer-motion";
import { Coins, Trophy, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type FeedItem = {
  icon: JSX.Element;
  message: string;
};

const feed: FeedItem[] = [
  { icon: <Trophy className="h-4 w-4 text-neon" />, message: "@CryptoBro just won 2.4 SOL on Crash" },
  { icon: <Zap className="h-4 w-4 text-aqua" />, message: "@LunaDegen hit 4x on Serpent Royale" },
  { icon: <Coins className="h-4 w-4 text-neon" />, message: "@NovaGG dropped 1.2 SOL on Plinko" },
  { icon: <Trophy className="h-4 w-4 text-neon" />, message: "@BladeRunner cleared CoinRaid arena" },
  { icon: <Zap className="h-4 w-4 text-aqua" />, message: "@PixelPulse banked 18 streak on Tower Rush" }
];

interface LiveFeedProps {
  className?: string;
  compact?: boolean;
  hideHeading?: boolean;
}

export function LiveFeed({ className, compact = false, hideHeading = false }: LiveFeedProps) {
  const duplicatedFeed = [...feed, ...feed, ...feed];

  return (
    <section
      className={cn(
        "bg-base px-6 py-16 sm:px-10 lg:px-16",
        hideHeading && "px-0 py-0",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-8",
          hideHeading && "max-w-full gap-6"
        )}
      >
        {!hideHeading && (
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-muted lg:self-start">
              Live Feed
            </span>
            <h3 className="text-3xl font-semibold text-white sm:text-4xl">Wins Streaming In 24/7</h3>
            <p className="text-sm text-muted">
              Real-time updates from DEGN tables and arenas. The feed never sleeps—neither should your
              bets.
            </p>
          </div>
        )}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10 bg-card-glow",
            compact ? "h-64" : "h-48"
          )}
        >
          <motion.div
            className="flex h-full flex-col gap-4 py-6"
            animate={{ y: ["0%", "-50%"] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          >
            {duplicatedFeed.map((item, index) => (
              <div
                key={`${item.message}-${index}`}
                className="mx-6 flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-muted shadow-[0_10px_25px_-20px_rgba(147,51,234,0.6)]"
              >
                {item.icon}
                <span className="text-white/90">{item.message}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

