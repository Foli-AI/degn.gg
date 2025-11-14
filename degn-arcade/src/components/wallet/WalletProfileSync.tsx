"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export function WalletProfileSync() {
  const { connected, publicKey } = useWallet();
  const [alias, setAlias] = useState<string | null>(null);
  const lastSyncedAddress = useRef<string | null>(null);

  useEffect(() => {
    const address = publicKey?.toBase58();
    if (!connected || !address) {
      lastSyncedAddress.current = null;
      setAlias(null);
      return;
    }

    if (lastSyncedAddress.current === address) return;

    let aborted = false;
    lastSyncedAddress.current = address;

    void (async () => {
      try {
        const response = await fetch("/api/profile/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address })
        });
        if (!response.ok) throw new Error("Profile sync failed");
        const data = (await response.json()) as { alias?: string };
        if (!aborted) {
          setAlias(data.alias ?? null);
          if (data.alias) {
            window.localStorage.setItem("degn-last-alias", data.alias);
          }
        }
      } catch (error) {
        console.error("Wallet profile sync error", error);
        if (!aborted) {
          setAlias(null);
        }
      }
    })();

    return () => {
      aborted = true;
    };
  }, [connected, publicKey]);

  return alias ? <span className="hidden" data-wallet-alias={alias} /> : null;
}
