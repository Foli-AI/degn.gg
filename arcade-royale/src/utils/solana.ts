'use client';

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Solana network configuration
export const SOLANA_NETWORK = 'devnet'; // Change to 'mainnet-beta' for production
export const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

// Wallet utilities
export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// Get SOL balance for a wallet address
export const getSolBalance = async (address: string): Promise<number> => {
  try {
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
};

// Format SOL amount for display
export const formatSol = (amount: number, decimals = 4): string => {
  return amount.toFixed(decimals);
};

// Game-specific utilities
export const CREDITS_PER_SOL = 1000; // 1 SOL = 1000 credits

export const solToCredits = (sol: number): number => {
  return Math.floor(sol * CREDITS_PER_SOL);
};

export const creditsToSol = (credits: number): number => {
  return credits / CREDITS_PER_SOL;
};


