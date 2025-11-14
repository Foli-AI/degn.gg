"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";

const PARTICLE_COUNT = 16;

export const AmbientParticles = memo(function AmbientParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, index) => ({
        id: `particle-${index}`,
        delay: Math.random() * 8,
        duration: Math.random() * 12 + 10,
        size: Math.random() * 6 + 4,
        x: Math.random() * 100,
        y: Math.random() * 100
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-neon/30 via-aqua/15 to-transparent blur-[1px]"
          style={{ width: particle.size, height: particle.size, top: `${particle.y}%`, left: `${particle.x}%` }}
          animate={{
            y: ["0%", "-8%", "0%"],
            opacity: [0.1, 0.3, 0.1],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
});
