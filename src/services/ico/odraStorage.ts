/**
 * Odra Storage Key Calculator
 *
 * Odra framework stores contract state in a single dictionary called "state".
 * Each field gets a numeric index, and the dictionary key is the blake2b hash
 * of the index bytes.
 *
 * Storage Layout Rules:
 * - Simple fields: index starts from 0
 * - SubModules: shift by 4 bits - (parent_index << 4) + field_index
 * - Mappings: append encoded key to the index bytes before hashing
 * - Lists: use index for count, index + encoded item key for items
 *
 * Reference: https://odra.dev/docs/tutorials/build-deploy-read/#reading-the-state
 */

import { blake2bHex } from 'blakejs';
import logger from '@/lib/logger';

// ── Constants ───────────────────────────────────────────────────────

/** Odra uses blake2b-256 (32 bytes output) */
const BLAKE2B_HASH_LENGTH = 32;

/** Storage index is encoded as U32 (4 bytes) */
const U32_SIZE = 4;

/** The dictionary name used by Odra for contract state */
export const ODRA_STATE_DICTIONARY = 'state';

// ── Key Calculation ─────────────────────────────────────────────────

/**
 * Calculates the Odra dictionary key.
 *
 * Algorithm (from Odra docs):
 * 1. Convert the index to a big-endian byte array (U32 = 4 bytes)
 * 2. Concatenate the index with the mapping data
 * 3. Hash the concatenated bytes using blake2b
 * 4. Return the hex representation of the hash
 *
 * Reference: https://odra.dev/docs/tutorials/build-deploy-read/
 */
export function calculateOdraKey(
  index: number | bigint,
  mappingData: Uint8Array = new Uint8Array([]),
): string {
  const key = new Uint8Array(U32_SIZE + mappingData.length);
  new DataView(key.buffer).setUint32(0, Number(index), false); // false = big-endian
  key.set(mappingData, U32_SIZE);

  return blake2bHex(key, undefined, BLAKE2B_HASH_LENGTH);
}

/**
 * Calculates the dictionary key for a simple storage index.
 * This is used for basic fields like u64, u128, Key, etc.
 *
 * @param index The storage field index
 * @returns Hex-encoded blake2b hash to use as dictionary key
 */
export function calculateStorageKey(index: number | bigint): string {
  return calculateOdraKey(index);
}

/**
 * Calculates the dictionary key for a SubModule field.
 * SubModules shift the parent index by 4 bits.
 *
 * @param parentIndex The parent module's index
 * @param fieldIndex The field index within the submodule
 * @returns The calculated index for the submodule field
 */
export function calculateSubmoduleIndex(
  parentIndex: number | bigint,
  fieldIndex: number | bigint,
): bigint {
  return (BigInt(parentIndex) << 4n) + BigInt(fieldIndex);
}

/**
 * Calculates the dictionary key for a Mapping entry.
 * Mappings concatenate the index bytes with the encoded key before hashing.
 *
 * @param mappingIndex The mapping's storage index
 * @param keyBytes The encoded key bytes (depends on key type)
 * @returns Hex-encoded blake2b hash
 */
export function calculateMappingKey(
  mappingIndex: number | bigint,
  keyBytes: Uint8Array,
): string {
  return calculateOdraKey(mappingIndex, keyBytes);
}

/**
 * Calculates the dictionary key for a List item.
 * Lists store count at the base index, and items at index + encoded item index.
 *
 * @param listIndex The list's storage index
 * @param itemIndex The item index within the list (0-based)
 * @returns Hex-encoded blake2b hash for the list item
 */
export function calculateListItemKey(
  listIndex: number | bigint,
  itemIndex: number | bigint,
): string {
  // For list items, the itemIndex is encoded as U32 little-endian (as mapping data)
  const itemIndexBytes = encodeU32Key(Number(itemIndex));
  return calculateOdraKey(listIndex, itemIndexBytes);
}

/**
 * Encodes a u8 value for use as a mapping key.
 */
export function encodeU8Key(value: number): Uint8Array {
  return new Uint8Array([value]);
}

/**
 * Encodes a u32 value for use as a mapping key (little-endian as per Casper).
 */
export function encodeU32Key(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value, true); // little-endian
  return bytes;
}

/**
 * Encodes a u64 value for use as a mapping key (little-endian).
 */
export function encodeU64Key(value: bigint | number): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt(value), true); // little-endian
  return bytes;
}

/**
 * Encodes a u128 value for use as a mapping key (variable-length CLValue format).
 *
 * Casper CLValue uses variable-length encoding for U128:
 * - First byte: number of bytes needed to represent the value (0-16)
 * - Following bytes: little-endian value
 *
 * Examples:
 * - 0 → [0x00]
 * - 1 → [0x01, 0x01]
 * - 256 → [0x02, 0x00, 0x01]
 */
export function encodeU128Key(value: bigint | number): Uint8Array {
  const n = BigInt(value);

  if (n === 0n) {
    return new Uint8Array([0]);
  }

  // Calculate minimal bytes needed
  const tempBytes: number[] = [];
  let temp = n;
  while (temp > 0n) {
    tempBytes.push(Number(temp & 0xffn));
    temp >>= 8n;
  }

  // Result: [length, ...little-endian bytes]
  const result = new Uint8Array(1 + tempBytes.length);
  result[0] = tempBytes.length;
  for (let i = 0; i < tempBytes.length; i++) {
    result[1 + i] = tempBytes[i];
  }

  return result;
}

/**
 * Encodes a u128 value as fixed 16-byte little-endian (alternative format).
 * Some systems use this instead of variable-length.
 */
export function encodeU128KeyFixed(value: bigint | number): Uint8Array {
  const n = BigInt(value);
  const bytes = new Uint8Array(16);

  for (let i = 0; i < 16; i++) {
    bytes[i] = Number((n >> BigInt(i * 8)) & 0xffn);
  }

  return bytes;
}

/**
 * Encodes a string for use as a mapping key.
 * Format: 4-byte little-endian length + UTF-8 bytes
 */
export function encodeStringKey(value: string): Uint8Array {
  const encoder = new TextEncoder();
  const strBytes = encoder.encode(value);
  const lengthBytes = new Uint8Array(4);
  const view = new DataView(lengthBytes.buffer);
  view.setUint32(0, strBytes.length, true); // little-endian

  const result = new Uint8Array(4 + strBytes.length);
  result.set(lengthBytes, 0);
  result.set(strBytes, 4);

  return result;
}

// ── ICO Contract Storage Layout ─────────────────────────────────────

/**
 * ICO Contract Storage Layout (based on Odra docs + actual Rust struct)
 *
 * Odra storage rules:
 * - Module prefix starts at 0, fields start at index 1
 * - SubModule: takes an index as prefix, internal fields use (prefix << 4) + field_index
 * - Fields inside SubModule also start from 1
 *
 * ICO (prefix 0):
 *   ownable (SubModule):   prefix 1
 *     owner:               (1 << 4) + 1 = 17
 *     pending_owner:       (1 << 4) + 2 = 18
 *   currencies:            index 2
 *   ico_schedules:         index 3
 *   ico_schedules_count:   index 4
 *   styks_price_feed:      index 5
 *   tailor_coin:           index 6
 *   treasury:              index 7
 */
export const ICO_STORAGE_LAYOUT = {
  // Ownable SubModule at prefix 1, fields shifted by << 4
  ownable: {
    prefix: 1,
    owner: (1 << 4) + 1,         // 17
    pendingOwner: (1 << 4) + 2,  // 18
  },

  // Mapping<Currency, (bool, Option<Address>)>
  currencies: {
    base: 2,
  },

  // Mapping<ICOScheduleId, ICOSchedule>
  icoSchedules: {
    base: 3,
  },

  // Var<U128> - direct storage
  icoSchedulesCount: 4,

  // External addresses
  styksPriceFeed: 5,
  tailorCoin: 6,
  treasury: 7,
} as const;

/**
 * Currency enum values (matching Rust enum discriminants)
 */
export const CURRENCY_DISCRIMINANT = {
  CSPR: 0,
  USDC: 1,
  USDT: 2,
} as const;

// ── Pre-calculated Keys ─────────────────────────────────────────────

/**
 * Pre-calculated dictionary keys for common ICO contract fields.
 * Use these directly with queryContractDictionary.
 */
export const ICO_DICTIONARY_KEYS = {
  // Owner (from Ownable submodule, storage index 17)
  owner: calculateStorageKey(ICO_STORAGE_LAYOUT.ownable.owner),
  pendingOwner: calculateStorageKey(ICO_STORAGE_LAYOUT.ownable.pendingOwner),

  // ICO Schedules count (Var<U128> at index 4)
  icoSchedulesCount: calculateStorageKey(ICO_STORAGE_LAYOUT.icoSchedulesCount),

  // External addresses (index 5, 6, 7)
  styksPriceFeed: calculateStorageKey(ICO_STORAGE_LAYOUT.styksPriceFeed),
  tailorCoin: calculateStorageKey(ICO_STORAGE_LAYOUT.tailorCoin),
  treasury: calculateStorageKey(ICO_STORAGE_LAYOUT.treasury),
} as const;

/**
 * Gets the dictionary key for a specific ICO schedule by ID.
 * ico_schedules is a Mapping<U128, ICOSchedule> at index 3.
 * Uses variable-length U128 encoding (CLValue format).
 */
export function getScheduleKey(scheduleId: number | bigint): string {
  const keyBytes = encodeU128Key(scheduleId);
  return calculateMappingKey(ICO_STORAGE_LAYOUT.icoSchedules.base, keyBytes);
}

/**
 * Alternative: Gets the dictionary key using fixed 16-byte encoding.
 */
export function getScheduleKeyFixed(scheduleId: number | bigint): string {
  const keyBytes = encodeU128KeyFixed(scheduleId);
  return calculateMappingKey(ICO_STORAGE_LAYOUT.icoSchedules.base, keyBytes);
}

/**
 * Gets the dictionary key for a specific currency info.
 * currencies is a Mapping<Currency, (bool, Option<Address>)> at index 2.
 * Currency is an enum encoded as U8.
 */
export function getCurrencyKey(currency: keyof typeof CURRENCY_DISCRIMINANT): string {
  const discriminant = CURRENCY_DISCRIMINANT[currency];
  const keyBytes = encodeU8Key(discriminant);
  return calculateMappingKey(ICO_STORAGE_LAYOUT.currencies.base, keyBytes);
}

// ── Debug Helpers ───────────────────────────────────────────────────

/**
 * Logs all pre-calculated keys for debugging.
 */
export function debugLogKeys(): void {
  logger.debug('[odraStorage] ICO Storage Layout (Odra indices from ico.rs):');
  logger.debug('  index 1: ownable (SubModule) -> owner at', ICO_STORAGE_LAYOUT.ownable.owner);
  logger.debug('  index 2: currencies (Mapping)');
  logger.debug('  index 3: ico_schedules (Mapping)');
  logger.debug('  index 4: ico_schedules_count (Var<U128>)');
  logger.debug('  index 5: styks_price_feed (External)');
  logger.debug('  index 6: tailor_coin (External)');
  logger.debug('  index 7: treasury (External)');
  logger.debug('');
  logger.debug('[odraStorage] Pre-calculated dictionary keys:');
  logger.debug('  owner (17):', ICO_DICTIONARY_KEYS.owner);
  logger.debug('  pendingOwner (18):', ICO_DICTIONARY_KEYS.pendingOwner);
  logger.debug('  icoSchedulesCount (4):', ICO_DICTIONARY_KEYS.icoSchedulesCount);
  logger.debug('  styksPriceFeed (5):', ICO_DICTIONARY_KEYS.styksPriceFeed);
  logger.debug('  tailorCoin (6):', ICO_DICTIONARY_KEYS.tailorCoin);
  logger.debug('  treasury (7):', ICO_DICTIONARY_KEYS.treasury);
  logger.debug('  schedule[0] (mapping 3 + key 0):', getScheduleKey(0));
  logger.debug('  schedule[1] (mapping 3 + key 1):', getScheduleKey(1));
  logger.debug('  currency[CSPR] (mapping 2 + key 0):', getCurrencyKey('CSPR'));
  logger.debug('  currency[USDC] (mapping 2 + key 1):', getCurrencyKey('USDC'));
  logger.debug('  currency[USDT] (mapping 2 + key 2):', getCurrencyKey('USDT'));
}
