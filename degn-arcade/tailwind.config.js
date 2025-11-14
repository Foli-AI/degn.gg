import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/styles/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#0E0E12",
        surface: "#18181E",
        neon: "#9333EA",
        aqua: "#14B8A6",
        muted: "#6E6E7A",
        border: "rgba(255,255,255,0.08)"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at 20% 20%, rgba(147, 51, 234, 0.28), transparent 55%), radial-gradient(circle at 80% 0%, rgba(20, 184, 166, 0.22), transparent 50%), linear-gradient(135deg, #0E0E12 0%, #101024 45%, #0E0E12 100%)",
        "card-glow":
          "linear-gradient(145deg, rgba(24, 24, 30, 0.96), rgba(14, 14, 18, 0.94))"
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans]
      },
      boxShadow: {
        neon: "0 0 25px rgba(147, 51, 234, 0.35)",
        aqua: "0 0 20px rgba(20, 184, 166, 0.35)"
      },
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        marquee: {
          "0%": { transform: "translateY(0%)" },
          "100%": { transform: "translateY(-100%)" }
        }
      },
      animation: {
        "float-slow": "float-slow 12s ease-in-out infinite",
        marquee: "marquee 18s linear infinite"
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem"
      }
    }
  },
  plugins: []
};

export default config;
