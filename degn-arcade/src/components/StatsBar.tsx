import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";

type Stat = {
  label: string;
  value: string;
};

const stats: Stat[] = [
  { label: "Players Online", value: "2,431" },
  { label: "Wagered Today", value: "$58,204" },
  { label: "Average RTP", value: "97%" }
];

export function StatsBar() {
  return (
    <div className="glass-panel flex w-full flex-wrap items-center justify-center gap-6 rounded-2xl px-6 py-4 text-sm text-muted">
      <motion.div
        className="flex items-center gap-2 uppercase tracking-[0.3em]"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Sparkle className="h-4 w-4 text-neon" />
        LIVE STATS
      </motion.div>
      <div className="flex flex-wrap items-center gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
          >
            <span className="text-xs uppercase tracking-[0.2em] text-muted">{stat.label}</span>
            <span className="font-semibold text-white">{stat.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

