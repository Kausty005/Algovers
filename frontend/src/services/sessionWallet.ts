/**
 * IronIQ — Session Wallet Service
 *
 * Generates a temporary Algorand keypair in browser memory.
 * This "session wallet" is funded once by the user's Pera wallet,
 * and then the IronIQ agent uses it to silently sign x402 micro-payments
 * without requiring any further wallet popups.
 *
 * For the hackathon demo (Option C), the session wallet generates a real
 * Algorand address but payments are verified via the demo middleware
 * (which accepts any X-PAYMENT header). In production, you would fund
 * the session wallet with real USDC and opt-in to the ASA.
 */

import algosdk from 'algosdk';
import type { SessionWalletState } from '../types';

// ─── Session Wallet State ────────────────────────────────────────
let sessionAccount: algosdk.Account | null = null;
let walletState: SessionWalletState = {
  address: '',
  balance: 0,
  spent: 0,
  funded: 0,
  active: false,
};

// Keep track of the user's main wallet address for refunds
let mainWalletAddress: string = '';

/**
 * Generate a new session wallet keypair.
 * The private key lives ONLY in browser memory — never persisted.
 */
export function createSessionWallet(): SessionWalletState {
  sessionAccount = algosdk.generateAccount();

  walletState = {
    address: sessionAccount.addr,
    balance: 0,
    spent: 0,
    funded: 0,
    active: true,
  };

  return { ...walletState };
}

/**
 * Get the underlying Algorand account object (needed for signing).
 */
export function getSessionAccount(): algosdk.Account | null {
  return sessionAccount;
}

/**
 * Update the session wallet state after it has been successfully funded on-chain.
 *
 * @param amount USDC amount (e.g. 0.10)
 * @param userAddress The main wallet address (for refund tracking)
 */
export function markSessionWalletFunded(amount: number, userAddress: string): void {
  if (!sessionAccount) {
    throw new Error('Session wallet not created. Call createSessionWallet() first.');
  }

  mainWalletAddress = userAddress;

  walletState = {
    ...walletState,
    balance: walletState.balance + amount,
    funded: walletState.funded + amount,
    active: true,
  };
}

/**
 * Silently sign an x402 payment using the session wallet.
 * Returns a payment token that the backend demo middleware will accept.
 *
 * In production, this would use the session wallet's secret key to sign
 * a real Algorand transaction via algosdk.
 *
 * @param amount USDC cost of the service
 * @param service Name of the service being purchased
 * @returns Payment token string (used as X-PAYMENT header)
 */
export function signAgentPayment(amount: number, service: string): string {
  if (!sessionAccount || !walletState.active) {
    throw new Error('Session wallet is not active.');
  }

  if (walletState.balance < amount) {
    throw new Error(
      `Insufficient session wallet balance: ${walletState.balance} USDC, need ${amount} USDC`
    );
  }

  // Deduct from balance
  walletState = {
    ...walletState,
    balance: parseFloat((walletState.balance - amount).toFixed(6)),
    spent: parseFloat((walletState.spent + amount).toFixed(6)),
  };

  // Generate a realistic-looking transaction ID
  const txId = `AGENT-${service.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

  return txId;
}

/**
 * Refund remaining USDC from session wallet back to main wallet.
 * In the demo, this just marks the wallet as inactive.
 * In production, this would sign a real USDC transfer back.
 */
export function refundSessionWallet(): { refundAmount: number; txId: string } {
  const refundAmount = walletState.balance;

  const txId = refundAmount > 0
    ? `AGENT-REFUND-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    : '';

  walletState = {
    ...walletState,
    balance: 0,
    active: false,
  };

  sessionAccount = null;
  mainWalletAddress = '';

  return { refundAmount, txId };
}

/**
 * Get current session wallet state (immutable copy).
 */
export function getSessionWalletState(): SessionWalletState {
  return { ...walletState };
}

/**
 * Check if the session wallet has enough balance for a purchase.
 */
export function canAfford(amount: number): boolean {
  return walletState.active && walletState.balance >= amount;
}

/**
 * Check if the session wallet is active and funded.
 */
export function isSessionActive(): boolean {
  return walletState.active && sessionAccount !== null;
}
