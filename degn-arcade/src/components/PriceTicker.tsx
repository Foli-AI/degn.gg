"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

type TickerItem = {
  label: string;
  value: number;
  change: number;
};

const INITIAL_ITEMS: TickerItem[] = [
  { label: "SOL/USDC", value: 162.43, change: 2.4 },
  { label: "DEGN Token", value: 0.42, change: 5.8 },
  { label: "AMPLIFIED POOL", value: 38.12, change: -1.3 },
  { label: "XP BOOST", value: 1.25, change: 8.2 },
  { label: "ARCADE VAULT", value: 12.6, change: 3.9 }
];

export function PriceTicker() {
  const [items, setItems] = useState<TickerItem[]>(INITIAL_ITEMS);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.5) * (item.label === "SOL/USDC" ? 0.8 : 0.12);
          const change = parseFloat((item.change + delta).toFixed(2));
          const value = parseFloat((item.value + delta).toFixed(3));
          return { ...item, change, value };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <motion.div
        className="flex gap-8 whitespace-nowrap px-6 py-4 text-xs uppercase tracking-[0.35em] text-muted"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2"
          >
            <TrendingUp className="h-4 w-4 text-neon" />
            <span className="text-white">{item.label}</span>
            <span className="text-white/70">{item.value.toFixed(2)}</span>
            <span
              className={`text-[10px] font-semibold ${
                item.change >= 0 ? "text-aqua" : "text-accent"
              }`}
            >
              {item.change >= 0 ? "+" : ""}
              {item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

