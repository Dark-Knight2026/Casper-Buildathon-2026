/**
 * `PropertyRegistry` deploy-arg builder / contract client (Casper / Odra 2.5).
 *
 * Encodes the write entry-point arguments per
 * `docs/casper_contract_schemas/property_registry_schema.json` and builds the
 * unsigned transactions the landlord signs + submits via CSPR.click (PL-32).
 * The landlord is both the deploy signer and the `issuer` (their own on-chain
 * UserRegistry user id) — the contract's `PROPERTY_MANAGER` gate is removed on
 * testnet, so a user wallet calls `create_property` / `set_*` directly.
 *
 * Odra encoding (confirmed against odra-macros 2.5 `odra_type` codegen):
 *   • a `#[odra::odra_type]` struct/enum serializes as `CLType::Any` whose bytes
 *     are its `ToBytes` output;
 *   • a struct's `ToBytes` is the plain concatenation of its fields' `ToBytes`
 *     (no outer length prefix), in declaration order;
 *   • a unit enum's `ToBytes` is a single u8 discriminant.
 * So `CreatePropertyParams` and `PropertyStatus` go on the wire as `newCLAny`.
 *
 * The byte-level encoders here are pure and unit-tested against the frozen
 * schema; the live sign+submit (PL-32) only adds the wallet + RPC.
 */

import { Args, CLValue, Key } from 'casper-js-sdk';
import type { Transaction } from 'casper-js-sdk';

import { createContractCallTransaction } from '@/services/ico/casperClient';
import {
  PROPERTY_ONCHAIN_STATUSES,
  type PropertyOnChainStatus,
} from '@/types/propertyOnChain';

/** PropertyRegistry **package** hash (versioned call), raw hex, no `hash-` prefix. */
const PROPERTY_REGISTRY_PACKAGE_HASH =
  import.meta.env.VITE_PROPERTY_REGISTRY_PACKAGE_HASH ?? '';

/**
 * Whether on-chain property registration is wired up. When the package hash is
 * unset the whole surface stays dark (the off-chain listing flow is unaffected),
 * so it can ship before the contract is deployed in a given environment.
 */
export const isPropertyRegistryEnabled = Boolean(
  PROPERTY_REGISTRY_PACKAGE_HASH
);

/**
 * Gas per entry point (motes). `create_property` does a cross-contract issuer
 * check plus a few storage writes and an event → 5 CSPR default; the lighter
 * `set_*` calls default to 3 CSPR. Override via env if testnet measurements
 * differ.
 */
const GAS_CREATE_PROPERTY = BigInt(
  import.meta.env.VITE_PROPERTY_REGISTRY_CREATE_GAS ?? '5000000000'
);
const GAS_SET = BigInt(
  import.meta.env.VITE_PROPERTY_REGISTRY_SET_GAS ?? '3000000000'
);

// ── Inputs ───────────────────────────────────────────────────────────

/**
 * Default intended ownership-token supply, used until fractionalization config
 * exists (neither the backend nor the contract carries a per-property default;
 * the contract only requires `> 0`). 1,000,000 gives room for fine-grained
 * fractional shares. Override when the landlord can set it.
 */
export const DEFAULT_OWNERSHIP_TOKEN_SUPPLY = '1000000';

/** A numeric on-chain value supplied as a decimal string or a bigint. */
export type U256Input = string | bigint;

export interface CreatePropertyParamsInput {
  /** Landlord's UserRegistry user id (the `issuer`). */
  issuerUserId: U256Input;
  /** Intended ownership-token supply. */
  totalSupply: U256Input;
  /** IPFS URI / content hash of the canonical property payload. */
  metadataUri: string;
}

// ── Pure byte encoders (Casper `bytesrepr` `ToBytes`) ────────────────

const U256_MAX = (1n << 256n) - 1n;

function toBigInt(value: U256Input): bigint {
  const result = typeof value === 'bigint' ? value : BigInt(value);
  if (result < 0n) throw new RangeError('U256 cannot be negative');
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

/** `String::to_bytes`: a u32 little-endian length prefix, then the UTF-8 bytes. */
export function stringToBytes(value: string): Uint8Array {
  const utf8 = new TextEncoder().encode(value);
  const out = new Uint8Array(4 + utf8.length);
  new DataView(out.buffer).setUint32(0, utf8.length, true);
  out.set(utf8, 4);
  return out;
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

/**
 * `CreatePropertyParams::to_bytes` — concatenated fields in declaration order:
 * `issuer` (U256), `total_supply` (U256), `metadata_uri` (String).
 */
export function encodeCreatePropertyParams(
  params: CreatePropertyParamsInput
): Uint8Array {
  return concatBytes(
    u256ToBytes(params.issuerUserId),
    u256ToBytes(params.totalSupply),
    stringToBytes(params.metadataUri)
  );
}

/** The contract discriminant for a `PropertyStatus` (its index in the enum). */
export function propertyStatusDiscriminant(
  status: PropertyOnChainStatus
): number {
  return PROPERTY_ONCHAIN_STATUSES.indexOf(status);
}

/** `PropertyStatus::to_bytes` — a single u8 discriminant. */
export function encodePropertyStatus(
  status: PropertyOnChainStatus
): Uint8Array {
  return new Uint8Array([propertyStatusDiscriminant(status)]);
}

/** Normalizes a contract/token hash to a `hash-<hex>` `Key`. */
function tokenKey(tokenHash: string): Key {
  const hex = tokenHash.replace(/^(hash-|contract-|entity-contract-)/, '');
  return Key.newKey(`hash-${hex}`);
}

// ── Runtime-args builders (pure) ─────────────────────────────────────

export function buildCreatePropertyArgs(
  params: CreatePropertyParamsInput
): Args {
  return Args.fromMap({
    params: CLValue.newCLAny(encodeCreatePropertyParams(params)),
  });
}

export function buildSetPropertyTokenArgs(
  propertyId: U256Input,
  tokenHash: string
): Args {
  return Args.fromMap({
    property_id: CLValue.newCLUInt256(toBigInt(propertyId).toString()),
    token: CLValue.newCLKey(tokenKey(tokenHash)),
  });
}

export function buildSetMetadataUriArgs(
  propertyId: U256Input,
  metadataUri: string
): Args {
  return Args.fromMap({
    property_id: CLValue.newCLUInt256(toBigInt(propertyId).toString()),
    metadata_uri: CLValue.newCLString(metadataUri),
  });
}

export function buildSetPropertyStatusArgs(
  propertyId: U256Input,
  status: PropertyOnChainStatus
): Args {
  return Args.fromMap({
    property_id: CLValue.newCLUInt256(toBigInt(propertyId).toString()),
    status: CLValue.newCLAny(encodePropertyStatus(status)),
  });
}

// ── Unsigned transaction builders ────────────────────────────────────

function callPropertyRegistry(
  senderPublicKeyHex: string,
  entryPoint: string,
  args: Args,
  gas: bigint
): Transaction {
  return createContractCallTransaction(
    senderPublicKeyHex,
    PROPERTY_REGISTRY_PACKAGE_HASH,
    entryPoint,
    args,
    gas,
    true // Odra contract — call via package hash
  );
}

/** `create_property(params) -> property_id` — creates a `Draft` record. */
export function createCreatePropertyTransaction(
  senderPublicKeyHex: string,
  params: CreatePropertyParamsInput
): Transaction {
  return callPropertyRegistry(
    senderPublicKeyHex,
    'create_property',
    buildCreatePropertyArgs(params),
    GAS_CREATE_PROPERTY
  );
}

/** `set_property_token(property_id, token)` — only while `Draft`. */
export function createSetPropertyTokenTransaction(
  senderPublicKeyHex: string,
  propertyId: U256Input,
  tokenHash: string
): Transaction {
  return callPropertyRegistry(
    senderPublicKeyHex,
    'set_property_token',
    buildSetPropertyTokenArgs(propertyId, tokenHash),
    GAS_SET
  );
}

/** `set_metadata_uri(property_id, metadata_uri)` — only while `Draft`. */
export function createSetMetadataUriTransaction(
  senderPublicKeyHex: string,
  propertyId: U256Input,
  metadataUri: string
): Transaction {
  return callPropertyRegistry(
    senderPublicKeyHex,
    'set_metadata_uri',
    buildSetMetadataUriArgs(propertyId, metadataUri),
    GAS_SET
  );
}

/**
 * `set_property_status(property_id, status)` — `active` requires a token set; no
 * demote to `draft`; `sold`/`closed` are terminal; `liquidating → closed` only.
 */
export function createSetPropertyStatusTransaction(
  senderPublicKeyHex: string,
  propertyId: U256Input,
  status: PropertyOnChainStatus
): Transaction {
  return callPropertyRegistry(
    senderPublicKeyHex,
    'set_property_status',
    buildSetPropertyStatusArgs(propertyId, status),
    GAS_SET
  );
}

// ── Revert-reason mapping ────────────────────────────────────────────

// PropertyRegistry user-error discriminants (property_registry_schema.json).
const PROPERTY_REGISTRY_ERROR_MAP: Record<string, string> = {
  '900': 'Not authorized to register properties on-chain.',
  '901': 'Unknown property id.',
  '902': 'Total supply must be greater than zero.',
  '903': 'Metadata URI is required.',
  '904': 'This property is no longer a draft and can no longer be configured.',
  '905': 'Set the ownership token before activating the property.',
  '907': 'That status change is not allowed from the current state.',
  '908': 'This token is already registered to another property.',
  '909': 'Not authorized.',
  '910': 'Invalid issuer — register your on-chain identity first.',
  '20003': 'Missing required on-chain role.',
};

/** Maps a Casper `User error: <n>` message to friendly copy. */
export function parsePropertyRegistryError(rawMessage?: string): string {
  if (!rawMessage) return 'On-chain property registration failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) return PROPERTY_REGISTRY_ERROR_MAP[match[1]] ?? rawMessage;

  const lowered = rawMessage.toLowerCase();
  if (
    lowered.includes('no such addressable entity') ||
    lowered.includes('insufficient') ||
    lowered.includes('does not have enough')
  ) {
    return 'Your wallet needs some testnet CSPR before it can register on-chain. Add funds and try again.';
  }

  return rawMessage;
}
