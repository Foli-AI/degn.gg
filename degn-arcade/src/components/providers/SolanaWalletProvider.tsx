"use client";

import { useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

type Props = {
  children: React.ReactNode;
};

const defaultEndpoint = clusterApiUrl(WalletAdapterNetwork.Devnet);

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT ?? defaultEndpoint;

export function SolanaWalletProvider({ children }: Props) {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
