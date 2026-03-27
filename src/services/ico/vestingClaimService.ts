/**
 * Vesting Claim Service
 *
 * Builds the `claim` transaction for the Vesting contract.
 * Entry point: claim(vesting_id: U256)
 * Emits: TokensClaimed { vesting_id, beneficiary, amount }
 */

import { Args, CLValue } from 'casper-js-sdk';
import type { Transaction } from 'casper-js-sdk';
import { ICO_CONFIG } from '@/constants/ico';
import logger from '@/lib/logger';
import { createContractCallTransaction } from './casperClient';

const VESTING_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.vestingPackageHash;

/** Gas estimate for a claim call (3 CSPR in motes). */
const GAS_CLAIM = 3_000_000_000n;

// ── Error code mapping ────────────────────────────────────────────────
// Covers both the Vesting contract (701-708) and the Staking contract (601-614).
// Staking errors can bubble up during claim() because the Vesting contract
// internally calls release_vesting_lock() on the Staking contract.

const VESTING_ERROR_MAP: Record<string, string> = {
  // Staking contract errors (staking_schema.json discriminants 601-614)
  '601': '[Staking] TailorCoin contract is not set',
  '602': '[Staking] InvalidAmount — amount passed to staking is zero or exceeds staked balance',
  '603': '[Staking] Caller not authorized to unstake',
  '604': '[Staking] Nothing staked',
  '605': '[Staking] Insufficient staked amount',
  '606': '[Staking] Unbonding already in progress',
  '607': '[Staking] Vesting contract is not set',
  '608': '[Staking] No rewards to claim',
  '609': '[Staking] No unbonding in progress',
  '610': '[Staking] Unbonding period not finished yet — please wait',
  '611': '[Staking] No active stake',
  '612': '[Staking] Caller not authorized to stake',
  '613': '[Staking] Unstake blocked by active vesting lock',
  '614': '[Staking] Caller not authorized to manage locks',
  // Vesting contract errors (vesting_schema.json discriminants 701-708)
  '701': '[Vesting] Not whitelisted for this vesting schedule',
  '702': '[Vesting] Invalid amount',
  '703': '[Vesting] Invalid vesting duration',
  '704': '[Vesting] Cliff period exceeds vesting duration',
  '705': '[Vesting] Vesting schedule not found',
  '706': '[Vesting] Only the beneficiary can claim these tokens',
  '707': '[Vesting] Nothing to claim — tokens are not yet unlocked',
  '708': '[Vesting] Claim blocked — complete the active unbonding withdrawal first',
  // Shared ownership/role errors
  '20000': 'Owner not set',
  '20001': 'Not authorized: caller is not the owner',
  '20002': 'Not authorized: caller is not the new owner',
  '20003': 'Missing required role',
  '20004': 'Cannot renounce role for another address',
};

export function parseVestingError(rawMessage?: string): string {
  if (!rawMessage) return 'Claim failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) {
    return VESTING_ERROR_MAP[match[1]] || rawMessage;
  }

  return rawMessage;
}

// ── Transaction builder ─────────────────────────────────────────────

/**
 * Creates an unsigned Transaction that calls `claim(vesting_id)` on the
 * Vesting contract. The caller must sign and submit it via CSPR.click.
 *
 * @param senderPublicKey  Sender's public key hex string
 * @param vestingId        Vesting schedule ID (U256 encoded as bigint)
 */
export function createClaimTransaction(
  senderPublicKey: string,
  vestingId: bigint,
): Transaction {
  const args = Args.fromMap({
    vesting_id: CLValue.newCLUInt256(vestingId),
  });

  logger.debug('[createClaimTransaction] vestingId:', vestingId.toString());

  return createContractCallTransaction(
    senderPublicKey,
    VESTING_PACKAGE_HASH,
    'claim',
    args,
    GAS_CLAIM,
    true, // Odra contract — call via package hash
  );
}
