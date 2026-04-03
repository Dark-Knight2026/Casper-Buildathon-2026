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
import { STAKING_ERROR_MAP } from './stakingErrors';

// NOTE: Despite the name "CONTRACT_HASH", this env var must contain the
// PACKAGE hash (not the contract instance hash), because isPackageHash=true
// below tells the builder to call via byPackageHash(). Verify your .env.
const STAKING_CONTRACT_HASH = import.meta.env.VITE_STAKING_CONTRACT_HASH ?? '';

/** Gas estimate for withdraw_unbonded (2.5 CSPR in motes). */
const GAS_WITHDRAW = 2_500_000_000n;

// ── Error code mapping (from staking contract) ───────────────────────
// Imported from shared stakingErrors.ts — single source of truth for codes 601-614.

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
