import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Solana connection
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
  'confirmed'
);

// Convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

// Format SOL amount for display
export function formatSOL(amount: number, decimals: number = 4): string {
  return amount.toFixed(decimals);
}

// Get wallet balance in SOL
export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(publicKey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
}

// Check if wallet has sufficient balance
export async function checkSufficientBalance(
  publicKey: PublicKey, 
  requiredSOL: number
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const balance = await getWalletBalance(publicKey);
  return {
    sufficient: balance >= requiredSOL,
    balance,
    required: requiredSOL
  };
}

// Create entry fee transaction (unsigned)
export function createEntryTransaction(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  amountSOL: number
): Transaction {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: solToLamports(amountSOL),
    })
  );

  return transaction;
}

// Verify transaction on-chain
export async function verifyTransaction(signature: string): Promise<{
  confirmed: boolean;
  amount?: number;
  from?: string;
  to?: string;
  blockTime?: number;
}> {
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });

    if (!transaction) {
      return { confirmed: false };
    }

    // Extract transfer details
    const instruction = transaction.transaction.message.instructions[0];
    if (instruction && transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const amount = lamportsToSol(
        transaction.meta.preBalances[0] - transaction.meta.postBalances[0]
      );
      
      return {
        confirmed: true,
        amount,
        from: transaction.transaction.message.accountKeys[0].toBase58(),
        to: transaction.transaction.message.accountKeys[1].toBase58(),
        blockTime: transaction.blockTime || undefined
      };
    }

    return { confirmed: true };
  } catch (error) {
    console.error('Failed to verify transaction:', error);
    return { confirmed: false };
  }
}

// Request entry fee transaction from backend
export async function requestEntryTransaction(
  lobbyId: string,
  playerAddress: string
): Promise<{ transaction: string; escrowAddress: string }> {
  const response = await fetch('/api/pay-entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, playerAddress }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create entry transaction');
  }

  return response.json();
}

// Submit signed transaction to backend for verification
export async function submitEntryTransaction(
  lobbyId: string,
  signature: string,
  playerAddress: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/verify-entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyId, signature, playerAddress }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify entry transaction');
  }

  return response.json();
}

// Get current SOL price in USD (optional for display)
export async function getSOLPriceUSD(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana?.usd || 0;
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    return 0;
  }
}

// Format USD amount
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Calculate USD equivalent of SOL amount
export async function getUSDEquivalent(solAmount: number): Promise<string> {
  const solPrice = await getSOLPriceUSD();
  const usdAmount = solAmount * solPrice;
  return formatUSD(usdAmount);
}
