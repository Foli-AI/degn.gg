'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ArcadeState {
  // Wallet state
  walletAddress: string | null;
  isWalletConnected: boolean;
  
  // Game state
  credits: number;
  currentGame: string | null;
  
  // Actions
  setWalletAddress: (address: string | null) => void;
  setWalletConnected: (connected: boolean) => void;
  setCredits: (credits: number) => void;
  addCredits: (amount: number) => void;
  subtractCredits: (amount: number) => void;
  setCurrentGame: (gameId: string | null) => void;
  resetStore: () => void;
}

const initialState = {
  walletAddress: null,
  isWalletConnected: false,
  credits: 1000,
  currentGame: null,
};

export const useArcadeStore = create<ArcadeState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setWalletAddress: (address) => set({ walletAddress: address }),
      
      setWalletConnected: (connected) => set({ 
        isWalletConnected: connected,
        walletAddress: connected ? get().walletAddress : null 
      }),
      
      setCredits: (credits) => set({ credits: Math.max(0, credits) }),
      
      addCredits: (amount) => set((state) => ({ 
        credits: state.credits + Math.abs(amount) 
      })),
      
      subtractCredits: (amount) => set((state) => ({ 
        credits: Math.max(0, state.credits - Math.abs(amount)) 
      })),
      
      setCurrentGame: (gameId) => set({ currentGame: gameId }),
      
      resetStore: () => set(initialState),
    }),
    {
      name: 'arcade-royale-store',
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        isWalletConnected: state.isWalletConnected,
        credits: state.credits,
      }),
    }
  )
);


