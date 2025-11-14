import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

import { SolanaWalletProvider } from "@/components/wallet/WalletProvider";
import { WalletProfileSync } from "@/components/wallet/WalletProfileSync";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "DEGN.gg | The Next Generation Crypto Arcade",
  description:
    "Play, Bet, and Win across fast-paced arcade + casino games. Built for degens with neon aesthetics and provably fair mechanics.",
  icons: {
    icon: "/favicon.svg"
  },
  metadataBase: new URL("https://degn.gg"),
  openGraph: {
    title: "DEGN.gg | The Next Generation Crypto Arcade",
    description:
      "Experience a hybrid crypto casino and arcade. Connect your wallet, jump into DEGN Originals, and climb the leaderboards.",
    url: "https://degn.gg",
    siteName: "DEGN.gg",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "DEGN.gg | The Next Generation Crypto Arcade",
    description:
      "Play, Bet, Win. The neon crypto arcade merging casino thrills with fast-paced multiplayer.",
    site: "@degngg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        {/* TODO: Remove mock wallet script in production */}
        <script src="/mock-wallet.js" defer></script>
      </head>
      <body className="min-h-screen bg-base text-white">
        <SolanaWalletProvider>
          <WalletProfileSync />
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}

