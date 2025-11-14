import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
  AccountMeta,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

// Configuration
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
  (NETWORK === 'mainnet-beta' 
    ? 'https://api.mainnet-beta.solana.com' 
    : 'https://api.devnet.solana.com');

// Treasury wallet for collecting rake - handle server-side safely
const getTreasuryWallet = () => {
  try {
    const walletAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET || 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
    return new PublicKey(walletAddress);
  } catch (error) {
    // Fallback for server-side rendering
    return new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
  }
};

// Program ID for our arcade smart contract (will be deployed)
const ARCADE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ARCADE_PROGRAM_ID ||
  'ArcadeRoyale11111111111111111111111111111111' // Placeholder
);

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface DepositResult extends TransactionResult {
  amount?: number;
  newBalance?: number;
}

export interface WithdrawResult extends TransactionResult {
  amount?: number;
  newBalance?: number;
}

export interface BetResult extends TransactionResult {
  gameId?: string;
  amount?: number;
  escrowAccount?: string;
}

export interface PayoutResult extends TransactionResult {
  winner?: string;
  amount?: number;
  rake?: number;
}

/**
 * Get connection to Solana network
 */
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, 'confirmed');
}

/**
 * Get current SOL price in USD
 */
export async function getSOLPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana?.usd || 100; // Fallback price
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    return 100; // Fallback price
  }
}

/**
 * Deposit SOL to user's game balance
 */
export async function depositSOL(
  wallet: WalletContextState,
  amount: number // Amount in SOL
): Promise<DepositResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    const connection = getConnection();
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Create transaction to transfer SOL to treasury
    const treasuryWallet = getTreasuryWallet();
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: treasuryWallet,
        lamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign transaction
    const signedTransaction = await wallet.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    // Update balance in database
    const response = await fetch('/api/solana/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.publicKey.toString(),
        amount,
        signature,
        type: 'deposit'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update balance in database');
    }

    const data = await response.json();

    return {
      success: true,
      signature,
      amount,
      newBalance: data.newBalance
    };
  } catch (error) {
    console.error('Deposit failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Withdraw SOL from user's game balance
 */
export async function withdrawSOL(
  wallet: WalletContextState,
  amount: number // Amount in SOL
): Promise<WithdrawResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    // First, verify user has sufficient balance and initiate withdrawal
    const response = await fetch('/api/solana/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.publicKey.toString(),
        amount
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Withdrawal request failed');
    }

    const data = await response.json();

    return {
      success: true,
      signature: data.signature,
      amount,
      newBalance: data.newBalance
    };
  } catch (error) {
    console.error('Withdrawal failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Place bet for a game (escrow SOL until match completion)
 */
export async function placeBet(
  wallet: WalletContextState,
  gameId: string,
  amount: number // Amount in SOL
): Promise<BetResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    const connection = getConnection();
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Generate escrow account for this bet
    const escrowKeypair = Keypair.generate();
    const escrowAccount = escrowKeypair.publicKey;

    // Create transaction to transfer SOL to escrow account
    const transaction = new Transaction().add(
      // Create escrow account
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: escrowAccount,
        lamports: lamports + 1000000, // Add rent exemption
        space: 0,
        programId: SystemProgram.programId,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign with both wallet and escrow keypair
    transaction.partialSign(escrowKeypair);
    const signedTransaction = await wallet.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm transaction
    await connection.confirmTransaction(signature, 'confirmed');

    // Record bet in database
    const response = await fetch('/api/solana/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: wallet.publicKey.toString(),
        gameId,
        amount,
        signature,
        escrowAccount: escrowAccount.toString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to record bet in database');
    }

    return {
      success: true,
      signature,
      gameId,
      amount,
      escrowAccount: escrowAccount.toString()
    };
  } catch (error) {
    console.error('Bet placement failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Payout winner and collect rake (called by server)
 */
export async function payoutWinner(
  winnerAddress: string,
  amount: number, // Amount in SOL
  rakeAmount: number, // Rake in SOL
  escrowAccounts: string[] // Escrow accounts to close
): Promise<PayoutResult> {
  try {
    // This would typically be called by a server-side process
    // with appropriate treasury keypair for signing
    
    // For now, we'll just record the payout in the database
    const response = await fetch('/api/solana/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winnerAddress,
        amount,
        rakeAmount,
        escrowAccounts
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process payout');
    }

    const data = await response.json();

    return {
      success: true,
      signature: data.signature,
      winner: winnerAddress,
      amount,
      rake: rakeAmount
    };
  } catch (error) {
    console.error('Payout failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get transaction history for a wallet
 */
export async function getTransactionHistory(
  walletAddress: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const response = await fetch(`/api/solana/history?wallet=${walletAddress}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch transaction history');
    }

    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    return [];
  }
}

/**
 * Verify transaction on-chain
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });
    
    return transaction !== null;
  } catch (error) {
    console.error('Transaction verification failed:', error);
    return false;
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  try {
    const connection = getConnection();
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
}

/**
 * Estimate transaction fee
 */
export async function estimateTransactionFee(
  transaction: Transaction
): Promise<number> {
  try {
    const connection = getConnection();
    const { feeCalculator } = await connection.getRecentBlockhash();
    return feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Failed to estimate transaction fee:', error);
    return 0.000005; // Default estimate
  }
}

/**
 * Format SOL amount for display
 */
export function formatSOL(amount: number, decimals: number = 4): string {
  return `${amount.toFixed(decimals)} SOL`;
}

/**
 * Format USD amount for display
 */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Convert SOL to USD
 */
export async function solToUSD(solAmount: number): Promise<number> {
  const price = await getSOLPrice();
  return solAmount * price;
}

/**
 * Convert USD to SOL
 */
export async function usdToSOL(usdAmount: number): Promise<number> {
  const price = await getSOLPrice();
  return usdAmount / price;
}

