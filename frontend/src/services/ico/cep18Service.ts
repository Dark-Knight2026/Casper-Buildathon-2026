/**
 * CEP-18 Token Service
 *
 * Read methods for CEP-18 (ERC-20-like) contracts on Casper:
 *   balance_of    → getBalance()
 *   allowance     → getAllowance()
 *   total_supply  → getTotalSupply()
 *   name/symbol/decimals → getTokenMetadata()
 *
 * Works with any CEP-18 contract (BIG, USDC, USDT).
 *
 * Source schema: docs/casper_contract_schemas/tailor_coin_schema.json
 */

import { blake2bHex } from 'blakejs';

import { ICO_CONFIG } from '@/constants/ico';
import {
  queryContractState,
  queryDictionaryItem,
  clValueToBigInt,
  clValueToString,
} from './casperClient';
import type { TokenMetadata } from './contractTypes';

// ── Shortcut hashes ────────────────────────────────────────────────

export const TOKEN_HASHES = {
  BIG: ICO_CONFIG.CONTRACTS.tokenAddress,
  USDC: ICO_CONFIG.CONTRACTS.usdcAddress,
  USDT: ICO_CONFIG.CONTRACTS.usdtAddress,
} as const;

/**
 * CEP-18 named key conventions (Odra / standard CEP-18).
 * These may vary between implementations — update after on-chain verification.
 */
const STORAGE_KEYS = {
  name: 'name',
  symbol: 'symbol',
  decimals: 'decimals',
  totalSupply: 'total_supply',
  /** Dictionary: account_hash → U256 balance */
  balances: 'balances',
  /** Dictionary: (owner, spender) hash → U256 allowance */
  allowances: 'allowances',
} as const;

// ── Public read methods ────────────────────────────────────────────

/**
 * Returns the token balance for an account.
 * Maps to entry point `balance_of(address: Key) → U256`.
 *
 * @param contractHash CEP-18 contract hash (e.g. `ICO_CONFIG.CONTRACTS.tokenAddress`)
 * @param accountHash  The account's hash (hex, without `account-hash-` prefix typically)
 */
export async function getBalance(
  contractHash: string,
  accountHash: string,
): Promise<bigint> {
  const stored = await queryDictionaryItem(
    contractHash,
    STORAGE_KEYS.balances,
    accountHash,
  );

  if (!stored?.clValue) return 0n;
  return clValueToBigInt(stored.clValue);
}

/**
 * Returns the allowance granted by `owner` to `spender`.
 * Maps to entry point `allowance(owner: Key, spender: Key) → U256`.
 *
 * Standard CEP-18 stores allowances in a dictionary keyed by
 * blake2b256(owner_bytes + spender_bytes) encoded as hex.
 */
export async function getAllowance(
  contractHash: string,
  ownerHash: string,
  spenderHash: string,
): Promise<bigint> {
  // CEP-18 allowance dictionary key = blake2b(owner_key_bytes || spender_key_bytes)
  // Key bytes include a tag prefix: 0x00 for Account, 0x01 for Hash/Contract
  const ownerBytes = keyToBytes(ownerHash);
  const spenderBytes = keyToBytes(spenderHash);
  const combined = new Uint8Array(ownerBytes.length + spenderBytes.length);
  combined.set(ownerBytes, 0);
  combined.set(spenderBytes, ownerBytes.length);
  const dictKey = blake2bHex(combined, undefined, 32);

  const stored = await queryDictionaryItem(
    contractHash,
    STORAGE_KEYS.allowances,
    dictKey,
  );

  if (!stored?.clValue) return 0n;
  return clValueToBigInt(stored.clValue);
}

/** Casper Key tag bytes used in dictionary key hashing */
const KEY_TAG_ACCOUNT = 0x00;
const KEY_TAG_HASH = 0x01;

/**
 * Converts a Casper key string to tagged bytes for dictionary key hashing.
 * - `account-hash-<hex>` → [0x00, ...hash_bytes]
 * - `hash-<hex>`         → [0x01, ...hash_bytes]
 * - raw hex              → hash bytes without tag (fallback)
 */
function keyToBytes(key: string): Uint8Array {
  if (key.startsWith('account-hash-')) {
    const hex = key.slice('account-hash-'.length);
    const hashBytes = hexToBytes(hex);
    const tagged = new Uint8Array(1 + hashBytes.length);
    tagged[0] = KEY_TAG_ACCOUNT;
    tagged.set(hashBytes, 1);
    return tagged;
  }

  if (key.startsWith('hash-')) {
    const hex = key.slice('hash-'.length);
    const hashBytes = hexToBytes(hex);
    const tagged = new Uint8Array(1 + hashBytes.length);
    tagged[0] = KEY_TAG_HASH;
    tagged.set(hashBytes, 1);
    return tagged;
  }

  // Fallback: raw hex without tag
  return hexToBytes(key);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Returns total supply of the token.
 * Maps to entry point `total_supply() → U256`.
 */
export async function getTotalSupply(contractHash: string): Promise<bigint> {
  const stored = await queryContractState(contractHash, [
    STORAGE_KEYS.totalSupply,
  ]);
  if (!stored?.clValue) return 0n;
  return clValueToBigInt(stored.clValue);
}

/**
 * Returns basic token metadata (name, symbol, decimals, totalSupply).
 */
export async function getTokenMetadata(
  contractHash: string,
): Promise<TokenMetadata | null> {
  const [nameStored, symbolStored, decimalsStored, supplyStored] =
    await Promise.all([
      queryContractState(contractHash, [STORAGE_KEYS.name]),
      queryContractState(contractHash, [STORAGE_KEYS.symbol]),
      queryContractState(contractHash, [STORAGE_KEYS.decimals]),
      queryContractState(contractHash, [STORAGE_KEYS.totalSupply]),
    ]);

  const name = nameStored?.clValue
    ? clValueToString(nameStored.clValue)
    : '';
  const symbol = symbolStored?.clValue
    ? clValueToString(symbolStored.clValue)
    : '';
  const decimals = decimalsStored?.clValue
    ? Number(clValueToBigInt(decimalsStored.clValue))
    : 0;
  const totalSupply = supplyStored?.clValue
    ? clValueToBigInt(supplyStored.clValue)
    : 0n;

  if (!name && !symbol) return null;

  return { name, symbol, decimals, totalSupply };
}

// ── Convenience shortcuts ──────────────────────────────────────────

/** Get BIG token balance for an account */
export async function getBIGBalance(accountHash: string): Promise<bigint> {
  return getBalance(TOKEN_HASHES.BIG, accountHash);
}

/** Get BIG token metadata */
export async function getBIGTokenMetadata(): Promise<TokenMetadata | null> {
  return getTokenMetadata(TOKEN_HASHES.BIG);
}
