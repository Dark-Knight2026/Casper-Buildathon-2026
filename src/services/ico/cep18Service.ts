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
 * CEP-18 stores allowances in a dictionary keyed by a hash of (owner, spender).
 * The exact key format depends on the implementation.
 */
export async function getAllowance(
  contractHash: string,
  ownerHash: string,
  spenderHash: string,
): Promise<bigint> {
  // CEP-18 typically uses a combined key: hash(owner + spender)
  const dictKey = `${ownerHash}_${spenderHash}`;
  const stored = await queryDictionaryItem(
    contractHash,
    STORAGE_KEYS.allowances,
    dictKey,
  );

  if (!stored?.clValue) return 0n;
  return clValueToBigInt(stored.clValue);
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
