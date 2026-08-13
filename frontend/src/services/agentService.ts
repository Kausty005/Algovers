/**
 * IronIQ — Agent Service
 *
 * The "brain" of the agentic payment system. Monitors the user's form
 * score during a workout and autonomously decides when to purchase
 * AI guidance services via x402 micro-payments.
 *
 * Decision logic:
 * - If formScore < 50% for 30+ seconds → purchase text guidance ($0.01)
 * - If still < 50% after text guidance → purchase voice guidance ($0.02)
 *
 * All payments are signed silently using the Session Wallet.
 */

import { BASE_URL, apiFetch } from './api';
import { getSessionAccount } from './sessionWallet';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactAvmScheme } from '@x402/avm/exact/client';
import type { ClientAvmSigner } from '@x402/avm';
import algosdk from 'algosdk';
import type { AgentDecision, AgentGuidanceResponse, FrameResult } from '../types';

// ─── Agent Configuration ─────────────────────────────────────────
const FORM_SCORE_THRESHOLD = 50;      // Below this triggers agent
const BAD_SCORE_LIMIT = 15;           // Roughly 15 frames (since API calls add latency, this is ~3-5 seconds)
const AGENT_COOLDOWN_MS = 10_000;     // Don't re-purchase within 10s

const SERVICE_PRICES: Record<string, number> = {
  'text-guidance': 0.01,
  'voice-guidance': 0.02,
};

// ─── Agent State ─────────────────────────────────────────────────
let badScoreAccumulator = 0;
let textGuidancePurchased = true;
let voiceGuidancePurchased = true;
let lastPurchaseTime = 0;
let lastFailureTime = 0;
let activityLog: AgentDecision[] = [];
let isPurchasing = false;

/**
 * Reset agent state for a new workout session.
 */
export function resetAgent(): void {
  badScoreAccumulator = 0;
  textGuidancePurchased = true;
  voiceGuidancePurchased = true;
  lastPurchaseTime = 0;
  lastFailureTime = 0;
  activityLog = [];
  isPurchasing = false;
}

/**
 * Get all agent decisions made during this session.
 */
export function getAgentLog(): AgentDecision[] {
  return [...activityLog];
}

/**
 * Check if text guidance has been purchased by the agent.
 */
export function isTextGuidanceUnlocked(): boolean {
  return textGuidancePurchased || voiceGuidancePurchased;
}

/**
 * Check if voice guidance has been purchased by the agent.
 */
export function isVoiceGuidanceUnlocked(): boolean {
  return voiceGuidancePurchased;
}

/**
 * Core agent evaluation. Call this every time a new frame result arrives.
 * Returns an AgentGuidanceResponse if the agent decided to purchase,
 * or null if no action was taken.
 */
export async function evaluateFrame(
  frameResult: FrameResult,
  exerciseType: string,
  elapsedSeconds: number,
  onPurchaseStart?: (service: string) => void,
  onPurchaseEnd?: () => void
): Promise<AgentGuidanceResponse | null> {
  if (isPurchasing) return null;

  const now = Date.now();
  // Cooldown: If a payment failed recently (e.g. insufficient funds), wait 30s before trying again
  if (now - lastFailureTime < 30000) {
    return null;
  }

  const { formScore, formFeedback, repCount, movementState } = frameResult;

  // ── Bypass form score check: Trigger after 5 seconds ───────────
  if (elapsedSeconds < 5) {
    return null; // Not long enough yet
  }

  // ── Check cooldown ─────────────────────────────────────────────
  if (now - lastPurchaseTime < AGENT_COOLDOWN_MS) {
    console.log(`[IronIQ Agent] Trigger reached, but in cooldown.`);
    return null; // Too soon after last purchase
  }

  // ── Determine what to buy (trigger voice directly) ──────
  let serviceType: 'text-guidance' | 'voice-guidance' = 'voice-guidance';
  let isAlreadyPurchased = voiceGuidancePurchased;

  const price = isAlreadyPurchased ? 0 : SERVICE_PRICES[serviceType];

  // ── Check if session wallet is active ──────────────────────
  const sessionAccount = getSessionAccount();
  if (!sessionAccount && !isAlreadyPurchased) {
    console.warn(`[IronIQ Agent] No session account to afford ${serviceType}.`);
    return null;
  }

  // ── Execute the x402 payment flow ──────────────────────────────
  try {
    const reason = `Form score < 50% for ~5s`;
    if (isAlreadyPurchased) {
      console.log(`[IronIQ Agent] 🤖 Using previously purchased ${serviceType} — ${reason}`);
    } else {
      console.log(`[IronIQ Agent] 🤖 Deciding to purchase ${serviceType} — ${reason}`);
      if (onPurchaseStart) onPurchaseStart(serviceType);
    }

    isPurchasing = true;

    // Reset accumulator so we don't immediately trigger again
    badScoreAccumulator = 0;

    const result = await purchaseGuidance(serviceType, {
      exercise: exerciseType,
      repCount,
      formScore,
      formFeedback,
      movementState,
    }, isAlreadyPurchased);

    // Mark as purchased
    if (serviceType === 'text-guidance') {
      textGuidancePurchased = true;
    } else {
      voiceGuidancePurchased = true;
    }
    lastPurchaseTime = now;

    // Log the decision
    const decision: AgentDecision = {
      id: `decision-${Date.now()}`,
      action: serviceType,
      amount: price.toString(),
      transactionId: result.transactionId,
      timestamp: now,
      reason,
      formScore,
    };
    activityLog.push(decision);

    console.log(`[IronIQ Agent] ✅ Purchased ${serviceType} — TX: ${result.transactionId}`);

    return result;
  } catch (err) {
    console.error(`[IronIQ Agent] ❌ Failed to purchase ${serviceType}:`, err);
    lastFailureTime = Date.now();
    throw err;
  } finally {
    isPurchasing = false;
    if (onPurchaseEnd) onPurchaseEnd();
  }
}

/**
 * Execute the x402 payment flow for a guidance service.
 * 1. Call the endpoint without payment → get 402
 * 2. Sign payment with session wallet
 * 3. Retry with X-PAYMENT header → get 200 + guidance
 */
async function purchaseGuidance(
  service: 'text-guidance' | 'voice-guidance',
  data: {
    exercise: string;
    repCount: number;
    formScore: number;
    formFeedback: string;
    movementState: string;
  },
  isAlreadyPurchased: boolean
): Promise<AgentGuidanceResponse> {
  const url = `${BASE_URL}/api/agent/${service}`;
  const sessionAccount = getSessionAccount();

  // If already purchased — replay with a token header so backend lets it through
  if (isAlreadyPurchased || !sessionAccount) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': `replay-${service}-${Date.now()}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // Set up x402 Client with the session wallet signer
  const signer: ClientAvmSigner = {
    address: sessionAccount.addr,
    signTransactions: async (txns, indexes) => {
      const signed = [];
      const indexesToSign = indexes || txns.map((_, i) => i);
      for (const i of indexesToSign) {
        const txn = algosdk.decodeUnsignedTransaction(txns[i]);
        signed.push(txn.signTxn(sessionAccount.sk));
      }
      return signed;
    }
  };

  const client = new x402Client();
  const scheme = new ExactAvmScheme(signer);
  const shortNet = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe';
  const fullNet  = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';
  client.registerV1(shortNet, scheme);
  client.registerV1(fullNet, scheme);
  client.register(shortNet, scheme);
  client.register(fullNet, scheme);
  
  const fetchWithPay = wrapFetchWithPayment(window.fetch, client);

  // x402-fetch will automatically intercept the 402, build the transaction, sign it, and retry!
  const response = await fetchWithPay(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Agent payment failed: HTTP ${response.status}`);
  }

  return response.json();
}
