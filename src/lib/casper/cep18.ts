/**
 * Generic CEP-18 helpers shared by every "approve then pull" flow (ICO purchase,
 * lease deposit/rent payments). A CEP-18 spender — an Odra contract that moves
 * tokens out of the holder's wallet via `transfer_from` — must first be granted
 * an allowance with `approve(spender, amount)`. Cross-contract calls are
 * identified by the spender's **package** hash, so allowances are keyed on it.
 *
 * Allowance *state*, however, lives on the token's **instance** hash, not its
 * package hash (`isApproveNeeded` takes the instance hash); see `cep18Service`.
 */

import { Args, CLValue, Key, Transaction } from 'casper-js-sdk';

import {
  contractHashToEntityKey,
  createContractCallTransaction,
} from '@/services/ico/casperClient';
import { getAllowance } from '@/services/ico/cep18Service';

/** Default gas for an `approve` deploy (3 CSPR), env-overridable. */
const GAS_APPROVE = BigInt(
  import.meta.env.VITE_CEP18_APPROVE_GAS ?? '3000000000'
);

export interface ApproveParams {
  /** Token holder's public key (hex). */
  senderPublicKey: string;
  /** CEP-18 token **package** hash (the `approve` is called on the token). */
  tokenHash: string;
  /** Spender contract's **package** hash (e.g. the escrow contract). */
  spenderPackageHash: string;
  /** Allowance to grant, in the token's smallest unit (already scaled). */
  amount: bigint;
  /** Payment ceiling override; defaults to {@link GAS_APPROVE}. */
  gas?: bigint;
}

/**
 * Builds an unsigned `approve(spender: Key, amount: U256)` transaction granting
 * `spenderPackageHash` an allowance of `amount` on the `tokenHash` token.
 */
export function buildApproveTransaction({
  senderPublicKey,
  tokenHash,
  spenderPackageHash,
  amount,
  gas = GAS_APPROVE,
}: ApproveParams): Transaction {
  const args = Args.fromMap({
    spender: CLValue.newCLKey(
      Key.newKey(contractHashToEntityKey(spenderPackageHash))
    ),
    amount: CLValue.newCLUInt256(amount),
  });
  return createContractCallTransaction(
    senderPublicKey,
    tokenHash,
    'approve',
    args,
    gas,
    true // token contracts are addressed by package hash
  );
}

export interface AllowanceCheck {
  /** CEP-18 token **instance** hash — allowance state lives here, not the package. */
  tokenInstanceHash: string;
  /** Allowance owner's account hash. */
  ownerAccountHash: string;
  /** Spender contract's **package** hash. */
  spenderPackageHash: string;
  /** Amount about to be pulled, in the token's smallest unit. */
  requiredRaw: bigint;
}

/**
 * Whether an `approve` is still needed before the spender can pull `requiredRaw`
 * — `false` when the existing allowance already covers it, letting callers skip
 * a redundant approve deploy (and its gas + signature).
 */
export async function isApproveNeeded({
  tokenInstanceHash,
  ownerAccountHash,
  spenderPackageHash,
  requiredRaw,
}: AllowanceCheck): Promise<boolean> {
  const current = await getAllowance(
    tokenInstanceHash,
    ownerAccountHash,
    contractHashToEntityKey(spenderPackageHash)
  );
  return current < requiredRaw;
}
