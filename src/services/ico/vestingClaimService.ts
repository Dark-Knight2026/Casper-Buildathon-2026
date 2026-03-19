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

// ── Error code mapping (from vesting_schema.json) ───────────────────

const VESTING_ERROR_MAP: Record<string, string> = {
  '65005': 'Vesting schedule not found',
  '65006': 'Only the beneficiary can claim these tokens',
  '65007': 'Nothing to claim — tokens are not yet unlocked',
  '65008': 'Claim blocked by active unbonding',
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

  logger.log('[createClaimTransaction] vestingId:', vestingId.toString());

  return createContractCallTransaction(
    senderPublicKey,
    VESTING_PACKAGE_HASH,
    'claim',
    args,
    GAS_CLAIM,
    true, // Odra contract — call via package hash
  );
}
