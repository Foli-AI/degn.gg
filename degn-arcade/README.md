# DEGN.gg Landing Page

High-converting neon landing built with Next.js 14, TailwindCSS, TypeScript, and Framer Motion to showcase the DEGN hybrid crypto casino + arcade experience.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS with custom neon theme tokens
- Framer Motion for scroll and marquee animations
- Lucide icons

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the landing page.

## Available Scripts

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run start` – serve production build
- `npm run lint` – lint with ESLint
- `npm run format` – format with Prettier

## Structure

- `src/app/page.tsx` – main landing page composition
- `src/components/*` – modular sections (hero, game grid, live feed, stats bar, footer)
- `src/styles` – global Tailwind styling
- `public` – static assets (favicon, OG image)

## Design Notes

- Color palette: `#0E0E12`, `#18181E`, `#9333EA`, `#14B8A6`
- Font: Inter, via `next/font`
- Responsive, accessible, and animation-optimized for both desktop and mobile

# DEGN Casino + Arcade

Hybrid Solana-powered casino and multiplayer arcade platform built with Next.js 14, TypeScript, TailwindCSS, shadcn/ui-style components, and Framer Motion.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion
- **UI Toolkit:** Custom shadcn-inspired component library (Button, Card, Badge, etc.)
- **Wallets:** Solana wallet adapter stack (Phantom, Solflare, more coming)
- **Backend (planned):** Supabase for auth, storage, analytics
- **On-Chain (planned):** Anchor programs + Solana Pay flows

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 to view the neon MVP shell.

## Project Roadmap

1. **Phase 1 – Casino Core (WIP)**
   - Wallet connect flow, Supabase integration
   - CoinFlip Royale with fairness hashes + logging
2. **Phase 2 – Arcade Engine**
   - Phaser/Pixi-based multiplayer stack
   - CoinRaid + SOL Serpent Royale launch titles
3. **Phase 3 – Monetisation + Leaderboards**
   - XP, achievements, rewards, daily ladders
4. **Phase 4 – Scaling + Token**
   - $DEGN utility token, NFTs, skins marketplace

## Scripts

- `npm run dev` – start local dev server
- `npm run build` – create production build
- `npm run start` – serve production build
- `npm run lint` – lint the codebase
- `npm run format` – format with Prettier

## Environment

Create `.env.local` with the following placeholders before wiring up Supabase and Solana Pay:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SOLANA_RPC=
```

## Notes

- Tailwind design tokens live in `tailwind.config.js`.
- Global theme styling in `src/app/globals.css`.
- Layout shell (`SiteHeader`, `SiteFooter`) handles navigation and wallet CTA.
- Placeholder wallet interaction is mocked until wallet adapters are wired in later steps.



