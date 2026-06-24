/**
 * On-chain `pay_invoice` for the Escrow contract — the tenant's settlement of a
 * deposit or rent invoice (§3.5b). The escrow moves USDC out of the tenant's
 * wallet via CEP-18 `transfer_from`, so the tenant must first grant the escrow
 * an allowance (`approve`, see `cep18.ts`); this module only builds the
 * `pay_invoice(invoice_id, amount)` call itself.
 *
 * `pay_invoice` takes two primitive named runtime args (no wrapped struct), so —
 * unlike `create_lease_agreement` — it needs no custom `ToBytes` encoder.
 *
 * Targets the escrow deployed from `2025_anthony_leasefi` (`VITE_ESCROW_PACKAGE_HASH`).
 * When the hash is unset the feature is dark (`isEscrowEnabled === false`).
 */

import { Args, CLValue, Transaction } from 'casper-js-sdk';

import { createContractCallTransaction } from '@/services/ico/casperClient';

const ESCROW_PACKAGE_HASH = import.meta.env.VITE_ESCROW_PACKAGE_HASH ?? '';

/** Whether the escrow package hash is configured (feature is dark when false). */
export const isEscrowEnabled = Boolean(ESCROW_PACKAGE_HASH);

/** The configured escrow package hash — also the CEP-18 `approve` spender. */
export const escrowPackageHash = ESCROW_PACKAGE_HASH;

/**
 * Payment ceiling for a `pay_invoice` call (env-overridable). Covers the CEP-18
 * `transfer_from`, fee split / rent distribution, and event emission; unused gas
 * is refunded, so it's set generous. Default 10 CSPR.
 */
const GAS_PAY_INVOICE = BigInt(
  import.meta.env.VITE_ESCROW_PAY_INVOICE_GAS ?? '10000000000'
);

export interface PayInvoiceParams {
  /** Escrow `U256` invoice id (`onchainInvoiceId`) — decimal string or bigint. */
  onchainInvoiceId: string | bigint;
  /**
   * Amount to pay, in the token's **smallest unit** (already scaled via
   * `scaleToSmallestUnit`). Deposit must equal the full amount due; rent may be
   * any amount up to the remaining balance.
   */
  amount: string | bigint;
}

/** `pay_invoice(invoice_id: U256, amount: U256)` — settles a deposit/rent invoice. */
export function payInvoiceTransaction(
  senderPublicKeyHex: string,
  params: PayInvoiceParams
): Transaction {
  const args = Args.fromMap({
    invoice_id: CLValue.newCLUInt256(BigInt(params.onchainInvoiceId)),
    amount: CLValue.newCLUInt256(BigInt(params.amount)),
  });
  return createContractCallTransaction(
    senderPublicKeyHex,
    ESCROW_PACKAGE_HASH,
    'pay_invoice',
    args,
    GAS_PAY_INVOICE,
    true // Odra contract — call via package hash
  );
}

// ── Revert-reason mapping ────────────────────────────────────────────

// `pay_invoice` user-error discriminants from the escrow contract
// (`2025_anthony_leasefi/src/escrow.rs`, range 300–318). Only the codes
// reachable on the payment path are surfaced with friendly copy; anything else
// falls through to the raw message.
const ESCROW_ERROR_MAP: Record<string, string> = {
  '303': 'The payment amount can’t be zero.',
  '305':
    'Unknown on-chain invoice id — this invoice isn’t recorded on-chain yet.',
  '306': 'Only the tenant’s active wallet can pay this invoice.',
  '307': 'This invoice is already paid.',
  '308':
    'This invoice is past its deadline and can no longer be paid on-chain.',
  '311':
    'A deposit must be paid in full — the amount must equal the amount due.',
  '312': 'That’s more than the rent still due on this invoice.',
};

/** Maps a Casper `User error: <n>` (or a token/funds revert) to friendly copy. */
export function parseEscrowError(rawMessage?: string): string {
  if (!rawMessage) return 'On-chain payment failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) {
    return ESCROW_ERROR_MAP[match[1]] ?? rawMessage;
  }

  const lowered = rawMessage.toLowerCase();
  // CEP-18 transfer_from with a too-small allowance reverts from the token.
  if (lowered.includes('allowance')) {
    return 'The escrow isn’t approved to move enough USDC yet — approve the payment and try again.';
  }
  if (
    lowered.includes('no such addressable entity') ||
    lowered.includes('insufficient') ||
    lowered.includes('does not have enough')
  ) {
    return 'Your wallet needs more testnet USDC (and some CSPR for gas) to make this payment.';
  }

  return rawMessage;
}
