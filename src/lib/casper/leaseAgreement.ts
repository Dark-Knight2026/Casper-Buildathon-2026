/**
 * `Lease` deploy-arg builder / contract client (Casper / Odra 2.5).
 *
 * Encodes `create_lease_agreement(params)` and builds the unsigned transaction
 * the landlord signs + submits via CSPR.click to record a fully-signed lease
 * on-chain (LA-12). The landlord is the deploy signer (the contract reads the
 * caller as the landlord via `get_caller_landlord`).
 *
 * Encoding follows the same Odra convention proven in `propertyRegistry.ts`:
 *   • a `#[odra::odra_type]` struct/enum serializes as `CLType::Any` whose bytes
 *     are its `ToBytes` output;
 *   • a struct's `ToBytes` is the plain concatenation of its fields' `ToBytes`
 *     (no outer length prefix), in declaration order;
 *   • `Option<T>` is a 1-byte tag (0 = None, 1 = Some) then `T::to_bytes`;
 *   • `U64`/`u32` are fixed little-endian; `U256` is a 1-byte length then the
 *     significant little-endian bytes;
 *   • `Address` serializes as a `Key` (`Address::to_bytes == Key::to_bytes`).
 *
 * ⚠️ Versioning: this matches the contract DEPLOYED on casper-test from
 * `2025_anthony_leasefi` **user-registry** (package `2b76bee4…fea38`, deployed
 * 2026-06-19) — `tenant: U256` (the tenant's on-chain UserRegistry user id, NOT
 * their wallet account hash) and a `rent_distribution_terms` field in 2nd
 * position. The older `master` struct (`tenant: Address`, no
 * `rent_distribution_terms`) is what `docs/lease_schema.json` still mirrors; if
 * the contract is redeployed from master, this encoder must be reverted to match.
 */

import { Args, CLValue, Key } from 'casper-js-sdk';
import type { Transaction } from 'casper-js-sdk';

import { createContractCallTransaction } from '@/services/ico/casperClient';

/** `Lease` **package** hash (versioned call), raw hex, no `hash-` prefix. */
const LEASE_AGREEMENT_PACKAGE_HASH =
  import.meta.env.VITE_LEASE_AGREEMENT_PACKAGE_HASH ?? '';

/**
 * Whether on-chain lease commit is wired up. When the package hash is unset the
 * whole surface stays dark (signing + off-chain lease flow are unaffected), so
 * it can ship before the contract is deployed in a given environment.
 */
export const isLeaseAgreementEnabled = Boolean(LEASE_AGREEMENT_PACKAGE_HASH);

/**
 * Gas for `create_lease_agreement` (motes). The call mints the tenant's lease
 * NFT and writes a security-deposit invoice plus one invoice per rental month,
 * so it is heavier than the `PropertyRegistry` writes — 20 CSPR by default.
 * Override via env if testnet measurements differ.
 */
const GAS_CREATE_LEASE = BigInt(
  import.meta.env.VITE_LEASE_AGREEMENT_CREATE_GAS ?? '20000000000'
);

// ── Inputs (raw on-chain values — already resolved/scaled by the caller) ─────

/** A numeric on-chain value supplied as a decimal string or a bigint. */
export type U256Input = string | bigint;

/** A `CurrencyAmount { currency: Option<Address>, amount: U256 }`. */
export interface CurrencyAmountInput {
  /** Token contract hash for a CEP-18 currency; null/undefined = native CSPR. */
  currency?: string | null;
  /** Smallest-unit amount (already scaled to the currency's decimals). */
  amount: U256Input;
}

/**
 * `RentDistributionTerms { property_manager: Option<U256>, property_manager_bps: u32 }`.
 * Omit (or leave `propertyManagerUserId` null) for a lease with no manager — the
 * contract requires `property_manager_bps == 0` in that case.
 */
export interface RentDistributionTermsInput {
  /** Property manager's UserRegistry user id; null/undefined = no manager. */
  propertyManagerUserId?: U256Input | null;
  /** Manager's rent share in basis points (10_000 = 100%); must be 0 when there is no manager. */
  propertyManagerBps?: number;
}

export interface CreateLeaseAgreementParamsInput {
  /** Tenant's UserRegistry user id (`U256`) — NOT a wallet account hash. */
  tenantUserId: U256Input;
  /** Rent split for an optional property manager; omit for none. */
  rentDistributionTerms?: RentDistributionTermsInput;
  /** Equity property's on-chain id; null = no equity option. */
  equityPropertyId?: U256Input | null;
  monthlyRent: CurrencyAmountInput;
  securityDeposit: CurrencyAmountInput;
  /** Lease start, unix seconds. */
  startUnixSeconds: U256Input;
  /** Lease end, unix seconds. `(end - start)` must be a whole 30-day multiple. */
  endUnixSeconds: U256Input;
  /** Seconds added to invoice creation time to compute invoice deadlines. */
  invoiceValidityDuration: U256Input;
}

// ── Pure byte encoders (Casper `bytesrepr` `ToBytes`) ────────────────

const U256_MAX = (1n << 256n) - 1n;

function toBigInt(value: U256Input): bigint {
  const result = typeof value === 'bigint' ? value : BigInt(value);
  if (result < 0n) throw new RangeError('value cannot be negative');
  if (result > U256_MAX) throw new RangeError('value exceeds U256');
  return result;
}

/**
 * `U256::to_bytes`: a 1-byte length of the significant little-endian bytes,
 * followed by those bytes. Zero serializes to a single `0x00`.
 */
export function u256ToBytes(value: U256Input): Uint8Array {
  let v = toBigInt(value);
  if (v === 0n) return new Uint8Array([0]);

  const le: number[] = [];
  while (v > 0n) {
    le.push(Number(v & 0xffn));
    v >>= 8n;
  }
  return new Uint8Array([le.length, ...le]);
}

/** Fixed little-endian encoder for `u32` (4 bytes) / `U64` (8 bytes). */
function uintLeToBytes(value: U256Input, byteLength: number): Uint8Array {
  let v = toBigInt(value);
  const out = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i += 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n)
    throw new RangeError(`value exceeds ${byteLength * 8}-bit range`);
  return out;
}

/** `u32::to_bytes` — 4 little-endian bytes. */
export function u32ToBytes(value: number): Uint8Array {
  return uintLeToBytes(BigInt(value), 4);
}

/** `U64::to_bytes` — 8 little-endian bytes. */
export function u64ToBytes(value: U256Input): Uint8Array {
  return uintLeToBytes(value, 8);
}

/** `Option::to_bytes` — `0x00` for `None`, `0x01` followed by the inner bytes. */
function optionToBytes(inner: Uint8Array | null): Uint8Array {
  return inner === null
    ? new Uint8Array([0])
    : concatBytes(new Uint8Array([1]), inner);
}

/**
 * `Address::to_bytes` == `Key::to_bytes` (key-type tag then 32-byte hash). A
 * CEP-18 token currency is a contract → `Key::Hash` (`Address::Contract`).
 */
function addressToBytes(contractHash: string): Uint8Array {
  const hex = contractHash.replace(/^(hash-|contract-|entity-contract-)/, '');
  return Key.newKey(`hash-${hex}`).bytes(true);
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** `CurrencyAmount::to_bytes` — `Option<Address>` then `amount` (U256). */
export function encodeCurrencyAmount(value: CurrencyAmountInput): Uint8Array {
  const currency =
    value.currency == null ? null : addressToBytes(value.currency);
  return concatBytes(optionToBytes(currency), u256ToBytes(value.amount));
}

/**
 * `RentDistributionTerms::to_bytes` — `Option<U256>` (property_manager) then a
 * `u32` (property_manager_bps, 4 little-endian bytes).
 */
export function encodeRentDistributionTerms(
  terms?: RentDistributionTermsInput
): Uint8Array {
  const managerId = terms?.propertyManagerUserId ?? null;
  const bps = terms?.propertyManagerBps ?? 0;
  if (managerId == null && bps !== 0) {
    throw new RangeError(
      'property_manager_bps must be 0 when there is no property manager'
    );
  }
  const manager = managerId == null ? null : u256ToBytes(managerId);
  return concatBytes(optionToBytes(manager), u32ToBytes(bps));
}

/**
 * `CreateLeaseAgreementParams::to_bytes` — concatenated fields in declaration
 * order (deployed `user-registry` struct):
 *   tenant (U256), rent_distribution_terms (RentDistributionTerms),
 *   equity_option: Option<{ property_id: U256 }>, monthly_rent (CurrencyAmount),
 *   security_deposit (CurrencyAmount), start (U64), end (U64),
 *   invoice_validity_duration (U64).
 */
export function encodeCreateLeaseAgreementParams(
  params: CreateLeaseAgreementParamsInput
): Uint8Array {
  const equityOption =
    params.equityPropertyId == null
      ? null
      : u256ToBytes(params.equityPropertyId);

  return concatBytes(
    u256ToBytes(params.tenantUserId),
    encodeRentDistributionTerms(params.rentDistributionTerms),
    optionToBytes(equityOption),
    encodeCurrencyAmount(params.monthlyRent),
    encodeCurrencyAmount(params.securityDeposit),
    u64ToBytes(params.startUnixSeconds),
    u64ToBytes(params.endUnixSeconds),
    u64ToBytes(params.invoiceValidityDuration)
  );
}

// ── Runtime-args + unsigned transaction builders ─────────────────────

export function buildCreateLeaseAgreementArgs(
  params: CreateLeaseAgreementParamsInput
): Args {
  return Args.fromMap({
    params: CLValue.newCLAny(encodeCreateLeaseAgreementParams(params)),
  });
}

/** `create_lease_agreement(params) -> U256` — records the lease + invoices on-chain. */
export function createLeaseAgreementTransaction(
  senderPublicKeyHex: string,
  params: CreateLeaseAgreementParamsInput
): Transaction {
  return createContractCallTransaction(
    senderPublicKeyHex,
    LEASE_AGREEMENT_PACKAGE_HASH,
    'create_lease_agreement',
    buildCreateLeaseAgreementArgs(params),
    GAS_CREATE_LEASE,
    true // Odra contract — call via package hash
  );
}

// ── Revert-reason mapping ────────────────────────────────────────────

// User-error discriminants surfaced by `create_lease_agreement`. The ranges of
// the contracts in the call chain don't overlap, so a flat map is unambiguous:
//   • lease  (src/lease.rs)  400–417 — the lease contract's own checks
//   • escrow (src/escrow.rs) 300–318 — surfaced when writing the deposit/rent invoices
//   • NFT    (src/nft.rs)    100–106 — surfaced when minting the tenant's lease NFT
// The escrow/NFT codes are cross-contract: they almost always mean the contracts
// aren't wired together on-chain (roles/addresses), not bad landlord input.
const LEASE_ERROR_MAP: Record<string, string> = {
  // ── lease ─────────────────────────────────────────────────────────
  '400': 'Only the lease’s landlord can record it on-chain.',
  '401': 'Unknown on-chain lease id.',
  '402': 'The tenant and landlord must be different accounts.',
  '403':
    'Invalid lease dates — the term must be a whole number of 30-day months.',
  '404': 'The monthly rent must be greater than zero.',
  '405': 'Invalid landlord — register your on-chain identity first.',
  '411':
    'The property-manager share is invalid (must be 0 when there is no manager).',
  '412': 'Invalid property manager — check the manager’s on-chain id.',
  '415':
    'Invalid tenant — the tenant must be a registered on-chain user with the tenant role.',
  // ── NFT (minting the tenant's lease NFT) ──────────────────────────
  '100':
    'The lease contract isn’t authorized to mint the lease NFT (NFT: CallerNotMinter). Grant the lease contract the minter role on the lease-NFT contract.',
  '101':
    'The lease contract isn’t authorized to burn the lease NFT (NFT: CallerNotBurner).',
  '102':
    'The lease contract is neither minter nor burner on the lease-NFT contract (NFT: CallerNotMinterNorBurner).',
  '106': 'Not authorized on the lease-NFT contract (NFT: NotAuthorized).',
  // ── escrow (creating the deposit + rent invoices) ─────────────────
  '300':
    'The escrow contract rejected the caller (Escrow: CallerNotLeaseContract). The lease contract isn’t registered on the escrow contract.',
  '301':
    'The escrow contract has no lease contract configured (Escrow: LeaseContractIsNotSet).',
  '302':
    'The escrow contract has no treasury configured (Escrow: TreasuryContractIsNotSet).',
  '303': 'An invoice amount is zero (Escrow: ZeroAmount).',
  '304':
    'An invoice deadline is invalid (Escrow: InvalidDeadline) — check the invoice validity duration.',
  '314':
    'The security-deposit currency isn’t allowed by the escrow contract (Escrow: InvalidSecurityDepositCurrency).',
  '318':
    'The escrow contract has no user registry configured (Escrow: UserRegistryContractIsNotSet).',
};

// Odra framework (non-user) errors are reported as `64536 + discriminant`
// (odra-core `ExecutionError::code`). These never come from the lease contract's
// own logic — they signal a malformed call. The deserialization cluster almost
// always means the encoded params don't match the deployed contract's ABI.
const ODRA_USER_ERROR_TOO_HIGH = 64536;
const ODRA_FRAMEWORK_ERROR_MAP: Record<number, string> = {
  111: 'The contract couldn’t read the lease parameters (the on-chain format doesn’t match). This usually means the deployed contract version differs from the app — check the lease package hash / ABI.', // EarlyEndOfStream
  112: 'The contract couldn’t parse the lease parameters (format mismatch). Check the deployed contract version / ABI.', // Formatting
  113: 'The lease parameters had unexpected extra data (format mismatch). Check the deployed contract version / ABI.', // LeftOverBytes
  119: 'A lease parameter had the wrong type for the contract (ABI mismatch).', // TypeMismatch
  122: 'A required lease parameter was missing for the contract (ABI mismatch).', // MissingArg
  124: 'The deploy ran out of gas. Increase the gas limit and try again.', // OutOfGas
};

/** Maps a Casper `User error: <n>` message to friendly copy. */
export function parseLeaseAgreementError(rawMessage?: string): string {
  if (!rawMessage) return 'On-chain lease commit failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) {
    const code = Number(match[1]);
    if (code >= ODRA_USER_ERROR_TOO_HIGH) {
      return (
        ODRA_FRAMEWORK_ERROR_MAP[code - ODRA_USER_ERROR_TOO_HIGH] ??
        `The contract rejected the call with a framework error (${code}).`
      );
    }
    return LEASE_ERROR_MAP[match[1]] ?? rawMessage;
  }

  const lowered = rawMessage.toLowerCase();
  if (
    lowered.includes('no such addressable entity') ||
    lowered.includes('insufficient') ||
    lowered.includes('does not have enough')
  ) {
    return 'Your wallet needs some testnet CSPR before it can commit on-chain. Add funds and try again.';
  }

  return rawMessage;
}
