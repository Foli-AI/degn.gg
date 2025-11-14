/**
 * Development wallet override for local testing
 * Allows testing with multiple wallets in different browser windows/terminals
 */

export function getDevWalletOverride(): string | null {
  if (typeof window === 'undefined') return null;
  
  const override = process.env.NEXT_PUBLIC_DEV_WALLET_OVERRIDE;
  if (override && override.trim()) {
    console.log(`🔧 Using dev wallet override: ${override.slice(0, 8)}...${override.slice(-4)}`);
    return override.trim();
  }
  
  return null;
}

export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get effective wallet address (override or real)
 */
export function getEffectiveWalletAddress(realAddress: string | null): string | null {
  if (!isDevMode()) {
    return realAddress;
  }
  
  const override = getDevWalletOverride();
  return override || realAddress;
}

/**
 * Generate test wallet addresses for development
 */
export const DEV_WALLETS = {
  ALICE: '11111111111111111111111111111112',
  BOB: '11111111111111111111111111111113',
  CHARLIE: '11111111111111111111111111111114',
  DIANA: '11111111111111111111111111111115'
} as const;

export type DevWalletName = keyof typeof DEV_WALLETS;
