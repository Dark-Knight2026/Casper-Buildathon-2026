/**
 * ICO Contract Service
 *
 * Read methods that correspond to entry points from ico_schema.json:
 *   get_ico_schedules_count  → getSchedulesCount()
 *   get_ico_schedule_by_id   → getScheduleById(id)
 *   get_current_ico_schedule → getCurrentSchedule()  (computed client-side)
 *   get_ico_token_price      → getTokenPriceUsd()    (reads schedule price)
 *   get_currency_by_key      → getCurrencyInfo(currency)
 *
 * All read operations query the Casper RPC via `queryLatestGlobalState`
 * or `queryDictionaryItem` and parse the CLValues client-side.
 *
 * ─────────────────────────────────────────────────────────────────────
 * NOTE: Odra stores module fields under named keys whose exact names
 * depend on the contract source. The key names below are the expected
 * conventions — if they don't match the deployed contract, update the
 * STORAGE_KEYS constants after inspecting the entity on-chain:
 *
 *   const entity = await rpcClient.getLatestEntity(
 *     EntityIdentifier.fromEntityAddr(
 *       EntityAddr.fromPrefixedString('entity-contract-<hex>')
 *     )
 *   );
 *   console.log(entity);  // inspect named keys
 * ─────────────────────────────────────────────────────────────────────
 */

import { ICO_CONFIG } from '@/constants/ico';
import {
  queryContractState,
  queryDictionaryItem,
  clValueToBigInt,
} from './casperClient';
import type {
  ICOSchedule,
  ICOScheduleWithId,
  CurrencyInfo,
  Currency,
} from './contractTypes';

// ── Contract hash ──────────────────────────────────────────────────

const ICO_HASH = ICO_CONFIG.CONTRACTS.icoAddress;

/**
 * Named-key / dictionary names used by the Odra-compiled ICO contract.
 * Update these if inspection of the on-chain entity reveals different names.
 */
const STORAGE_KEYS = {
  /** Named key that stores the total number of ICO schedules (U128) */
  schedulesCount: 'ico_schedules_count',
  /** Dictionary that maps schedule id → ICOSchedule */
  schedules: 'ico_schedules',
  /** Dictionary that maps Currency discriminant → (Bool, Option<Key>) */
  currencies: 'currencies',
} as const;

// ── Public read methods ────────────────────────────────────────────

/**
 * Returns the total number of registered ICO schedules.
 * Maps to entry point `get_ico_schedules_count() → U128`.
 */
export async function getSchedulesCount(): Promise<number> {
  const stored = await queryContractState(ICO_HASH, [
    STORAGE_KEYS.schedulesCount,
  ]);
  if (!stored?.clValue) return 0;
  return Number(clValueToBigInt(stored.clValue));
}

/**
 * Returns a single ICO schedule by its ID.
 * Maps to entry point `get_ico_schedule_by_id(id: U128) → Option<ICOSchedule>`.
 */
export async function getScheduleById(
  id: number | bigint,
): Promise<ICOSchedule | null> {
  const stored = await queryDictionaryItem(
    ICO_HASH,
    STORAGE_KEYS.schedules,
    String(id),
  );

  if (!stored?.clValue) return null;
  return parseICOSchedule(stored.clValue);
}

/**
 * Reads all schedules and returns the one whose time range includes `Date.now()`.
 * Maps to entry point `get_current_ico_schedule() → Option<(U128, ICOSchedule)>`.
 *
 * Because this is a *computed* getter in the contract (iterates schedules),
 * we replicate the logic client-side by reading the count + each schedule.
 */
export async function getCurrentSchedule(): Promise<ICOScheduleWithId | null> {
  const count = await getSchedulesCount();
  if (count === 0) return null;

  const nowMs = BigInt(Date.now());

  // Read all schedules in parallel
  const promises = Array.from({ length: count }, (_, i) => getScheduleById(i));
  const schedules = await Promise.all(promises);

  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    if (!schedule) continue;

    if (nowMs >= schedule.startTimestamp && nowMs < schedule.endTimestamp) {
      return { id: BigInt(i), schedule };
    }
  }

  return null;
}

/**
 * Returns all registered ICO schedules.
 * Useful for building a timeline or showing past/future schedules.
 */
export async function getAllSchedules(): Promise<ICOScheduleWithId[]> {
  const count = await getSchedulesCount();
  if (count === 0) return [];

  const promises = Array.from({ length: count }, (_, i) => getScheduleById(i));
  const schedules = await Promise.all(promises);

  return schedules
    .map((schedule, i) =>
      schedule ? { id: BigInt(i), schedule } : null,
    )
    .filter((s): s is ICOScheduleWithId => s !== null);
}

/**
 * Returns the token price in USD from the current (or specified) schedule.
 *
 * The on-chain `get_ico_token_price(currency)` entry point incorporates
 * the CSPR/USD rate from StyksPriceFeed for CSPR payments. For USDC/USDT
 * it returns the schedule price directly. Since we can't easily call the
 * oracle from the frontend, this method returns the base USD price and
 * lets the caller convert to CSPR using an external rate if needed.
 */
export async function getTokenPriceUsd(
  scheduleId?: number | bigint,
): Promise<bigint> {
  if (scheduleId !== undefined) {
    const schedule = await getScheduleById(scheduleId);
    return schedule?.price ?? 0n;
  }

  const current = await getCurrentSchedule();
  return current?.schedule.price ?? 0n;
}

/**
 * Returns info about whether a currency is supported in the ICO contract.
 * Maps to entry point `get_currency_by_key(currency) → (Bool, Option<Key>)`.
 */
export async function getCurrencyInfo(
  currency: Currency,
): Promise<CurrencyInfo> {
  const stored = await queryDictionaryItem(
    ICO_HASH,
    STORAGE_KEYS.currencies,
    String(currency),
  );

  if (!stored?.clValue) {
    return { supported: false, address: null };
  }

  // The return type is Tuple2<Bool, Option<Key>>
  // Parsing depends on how Odra serializes tuples in dictionaries
  // For now return a safe default; refine after on-chain testing
  return { supported: true, address: null };
}

// ── CLValue parsers ────────────────────────────────────────────────

/**
 * Parses a CLValue into an ICOSchedule.
 *
 * The on-chain struct is a Casper CLValue struct with fields:
 *   start_timestamp: U64
 *   end_timestamp:   U64
 *   sale_amount:     U256
 *   sold_amount:     U256
 *   price:           U256
 *
 * Odra may serialize this as a CLValue::Any (Borsh-encoded bytes) or
 * as a nested struct. We attempt multiple parsing strategies.
 */
import { CLValue } from 'casper-js-sdk';

function parseICOSchedule(clValue: CLValue): ICOSchedule | null {
  try {
    // Strategy 1: Tuple-like access if Odra stores as named fields
    // The SDK may expose fields via the map/list or raw bytes
    if (clValue.any) {
      return parseICOScheduleFromBytes(clValue.any.bytes());
    }

    // Strategy 2: If returned as a raw JSON (some RPC versions)
    const raw = (clValue as unknown as { rawJSON?: unknown }).rawJSON;
    if (raw && typeof raw === 'object') {
      return parseICOScheduleFromJSON(raw as Record<string, unknown>);
    }

    console.warn('[icoContractService] Unable to parse ICOSchedule CLValue');
    return null;
  } catch (err) {
    console.warn('[icoContractService] parseICOSchedule error:', err);
    return null;
  }
}

/**
 * Parse ICOSchedule from raw Borsh-encoded bytes.
 *
 * Layout (little-endian):
 *   start_timestamp: u64  (8 bytes)
 *   end_timestamp:   u64  (8 bytes)
 *   sale_amount:     U256 (32 bytes)
 *   sold_amount:     U256 (32 bytes)
 *   price:           U256 (32 bytes)
 */
function parseICOScheduleFromBytes(bytes: Uint8Array): ICOSchedule | null {
  if (bytes.length < 8 + 8 + 32 + 32 + 32) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  const startTimestamp = view.getBigUint64(offset, true);
  offset += 8;

  const endTimestamp = view.getBigUint64(offset, true);
  offset += 8;

  const saleAmount = bytesToU256(bytes.slice(offset, offset + 32));
  offset += 32;

  const soldAmount = bytesToU256(bytes.slice(offset, offset + 32));
  offset += 32;

  const price = bytesToU256(bytes.slice(offset, offset + 32));

  return { startTimestamp, endTimestamp, saleAmount, soldAmount, price };
}

/** Parse ICOSchedule from a JSON object (fallback for raw RPC responses) */
function parseICOScheduleFromJSON(
  json: Record<string, unknown>,
): ICOSchedule | null {
  const get = (key: string) => {
    const val = json[key];
    if (val === undefined || val === null) return 0n;
    return BigInt(String(val));
  };

  return {
    startTimestamp: get('start_timestamp'),
    endTimestamp: get('end_timestamp'),
    saleAmount: get('sale_amount'),
    soldAmount: get('sold_amount'),
    price: get('price'),
  };
}

/** Converts little-endian bytes to a BigInt (U256) */
function bytesToU256(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}
