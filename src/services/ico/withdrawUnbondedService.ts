/**
 * Withdraw Unbonded Service
 *
 * Builds the `withdraw_unbonded` transaction for the Staking contract.
 * Entry point: withdraw_unbonded() — no arguments.
 *
 * Must be called after the 48-hour unbonding period has elapsed.
 * Transfers unbonded BIG tokens from the staking contract to the caller's wallet.
 */

import { Args } from 'casper-js-sdk';
import type { Transaction } from 'casper-js-sdk';
import logger from '@/lib/logger';
import { createContractCallTransaction } from './casperClient';

const STAKING_CONTRACT_HASH = import.meta.env.VITE_STAKING_CONTRACT_HASH ?? '';

/** Gas estimate for withdraw_unbonded (2.5 CSPR in motes). */
const GAS_WITHDRAW = 2_500_000_000n;

// ── Error code mapping (from staking contract) ───────────────────────

const STAKING_ERROR_MAP: Record<string, string> = {
  '601': 'Staking contract is not configured',
  '602': 'Invalid amount',
  '603': 'Not authorized to unstake',
  '604': 'Nothing staked',
  '605': 'Insufficient staked amount',
  '606': 'Unbonding already in progress',
  '607': 'Vesting contract is not set',
  '608': 'No rewards to claim',
  '609': 'No unbonding in progress',
  '610': 'Unbonding period not finished yet — please wait',
  '611': 'No active stake',
  '612': 'Not authorized to stake',
  '613': 'Unstake blocked by active vesting lock',
  '614': 'Not authorized to manage locks',
};

export function parseWithdrawError(rawMessage?: string): string {
  if (!rawMessage) return 'Withdraw failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) {
    return STAKING_ERROR_MAP[match[1]] || rawMessage;
  }

  return rawMessage;
}

// ── Transaction builder ──────────────────────────────────────────────

/**
 * Creates an unsigned Transaction that calls `withdraw_unbonded()` on the
 * Staking contract. No arguments required.
 *
 * @param senderPublicKey  Sender's public key hex string
 */
export function createWithdrawUnbondedTransaction(
  senderPublicKey: string,
): Transaction {
  logger.debug('[createWithdrawUnbondedTransaction] building tx for:', senderPublicKey);

  return createContractCallTransaction(
    senderPublicKey,
    STAKING_CONTRACT_HASH,
    'withdraw_unbonded',
    Args.fromMap({}),
    GAS_WITHDRAW,
    true, // Odra contract — call via package hash
  );
}
