/**
 * ICO Contract Service
 *
 * Reads ICO contract state directly from the blockchain using Odra's
 * dictionary-based storage. No deploy/transaction required - just RPC queries.
 *
 * Odra stores all contract state in a "state" dictionary with blake2b-hashed keys.
 * See odraStorage.ts for key calculation details.
 *
 * Entry-point equivalents:
 *   get_ico_schedules_count  → getSchedulesCount()
 *   get_ico_schedule_by_id   → getScheduleById(id)
 *   get_current_ico_schedule → getCurrentSchedule()
 *   get_ico_token_price      → getTokenPriceUsd()
 *   get_currency_by_key      → getCurrencyInfo(currency)
 *
 * Reference: https://odra.dev/docs/tutorials/build-deploy-read/#reading-the-state
 */

import { ICO_CONFIG } from '@/constants/ico';
import {
  queryOdraState,
  clValueListU8ToHex,
  hexToBytes,
  readU64LE,
  readU128VarLen,
  readU256VarLen,
} from './casperClient';
import {
  ICO_DICTIONARY_KEYS,
  getScheduleKey,
  getCurrencyKey,
  debugLogKeys,
} from './odraStorage';
import {
  Currency,
  type ICOSchedule,
  type ICOScheduleWithId,
  type CurrencyInfo,
} from './contractTypes';

// ── Bytes Parsing ───────────────────────────────────────────────────

/**
 * Parses ICOSchedule from hex bytes returned by Odra storage.
 *
 * Format (after 4-byte length prefix):
 * - start_timestamp: u64 (8 bytes LE)
 * - end_timestamp: u64 (8 bytes LE)
 * - sale_amount: U256 (variable-length)
 * - sold_amount: U256 (variable-length)
 * - price: U256 (variable-length)
 */
function parseICOSchedule(hex: string): ICOSchedule | null {
  try {
    const bytes = hexToBytes(hex);

    // Skip 4-byte length prefix
    const offset = 4;

    // Read timestamps
    const [startTimestamp, off1] = readU64LE(bytes, offset);
    const [endTimestamp, off2] = readU64LE(bytes, off1);

    // Read U256 values
    const [saleAmount, off3] = readU256VarLen(bytes, off2);
    const [soldAmount, off4] = readU256VarLen(bytes, off3);
    const [price] = readU256VarLen(bytes, off4);

    return {
      startTimestamp,
      endTimestamp,
      saleAmount,
      soldAmount,
      price,
    };
  } catch (err) {
    console.error('[parseICOSchedule] Failed to parse:', err);
    return null;
  }
}

/**
 * Parses U128 count from hex bytes (variable-length format).
 */
function parseU128Count(hex: string): bigint {
  try {
    const bytes = hexToBytes(hex);
    // Skip 4-byte length prefix
    const [value] = readU128VarLen(bytes, 4);
    return value;
  } catch {
    return 0n;
  }
}

// ── Contract hash ──────────────────────────────────────────────────

const ICO_HASH = ICO_CONFIG.CONTRACTS.icoAddress;

// ── State cache ────────────────────────────────────────────────────

// Cache for 5 minutes - schedule data rarely changes
const CACHE_TTL_MS = 5 * 60 * 1000;

let schedulesCache: {
  data: ICOScheduleWithId[];
  fetchedAt: number;
} | null = null;

let schedulesCountCache: {
  count: bigint;
  fetchedAt: number;
} | null = null;

// In-flight request promise to prevent concurrent fetches
let inFlightSchedulesRequest: Promise<ICOScheduleWithId[]> | null = null;

// ── CLValue Parsing for ICOSchedule ─────────────────────────────────

/**
 * Parses an ICOSchedule from CLValue bytes.
 *
 * ICOSchedule struct layout:
 *   start_timestamp: U64
 *   end_timestamp: U64
 *   sale_amount: U256
 *   sold_amount: U256
 *   price: U256
 */
// function parseICOScheduleFromBytes(bytes: Uint8Array): ICOSchedule | null {
//   try {
//     let offset = 0;

//     // Read U64 (8 bytes, little-endian)
//     const readU64 = (): bigint => {
//       const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
//       offset += 8;
//       return view.getBigUint64(0, true);
//     };

//     // Read U256 (32 bytes, little-endian)
//     const readU256 = (): bigint => {
//       let value = 0n;
//       for (let i = 0; i < 32; i++) {
//         value |= BigInt(bytes[offset + i]) << BigInt(i * 8);
//       }
//       offset += 32;
//       return value;
//     };

//     const startTimestamp = readU64();
//     const endTimestamp = readU64();
//     const saleAmount = readU256();
//     const soldAmount = readU256();
//     const price = readU256();

//     return {
//       startTimestamp,
//       endTimestamp,
//       saleAmount,
//       soldAmount,
//       price,
//     };
//   } catch (err) {
//     console.error('[icoService] Failed to parse ICOSchedule bytes:', err);
//     return null;
//   }
// }

// ── Diagnostic: test Odra dictionary keys ───────────────────────────

/**
 * Tests the calculated Odra dictionary keys against the contract.
 * Use this to verify the storage layout is correct.
 *
 * Call from browser console:
 *   import { diagnoseOdraKeys } from '@/services/ico/icoContractService';
 *   diagnoseOdraKeys();
 */
/**
 * Formats a bigint timestamp to a readable date string.
 * Auto-detects if timestamp is in seconds or milliseconds based on magnitude.
 */
function formatTimestamp(ts: bigint): string {
  // If timestamp > 1e12, it's likely milliseconds (year > 2001 in ms)
  // If timestamp < 1e12, it's likely seconds
  const tsNumber = Number(ts);
  const msValue = tsNumber > 1e12 ? tsNumber : tsNumber * 1000;
  const date = new Date(msValue);
  return date.toISOString();
}

/**
 * Converts timestamp to milliseconds for comparison.
 */
function toMilliseconds(ts: bigint): bigint {
  // If > 1e12, already in ms; otherwise convert from seconds
  return ts > 1000000000000n ? ts : ts * 1000n;
}

/**
 * Formats a bigint amount with decimals for display.
 * Default 18 decimals for token amounts, 8 for USD prices.
 */
function formatAmount(amount: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fracStr}`;
}

/**
 * Reads and displays all ICO data in human-readable format.
 * Call from browser console:
 *   import { testReadICOData } from '@/services/ico/icoContractService';
 *   testReadICOData();
 */
export async function testReadICOData(): Promise<void> {
  console.log('\n========================================');
  console.log('ICO Contract Data Reader');
  console.log('========================================\n');

  try {
    // Read schedules count
    const count = await readSchedulesCount();
    console.log(`📊 Total ICO Schedules: ${count}\n`);

    if (count === 0n) {
      console.log('⚠️ No schedules found. Check if icoSchedulesCount key is correct.');
      return;
    }

    // Read and show raw hex for each schedule
    console.log('── RAW HEX DATA ──────────────────────');
    for (let i = 0n; i < count; i++) {
      const key = getScheduleKey(i);
      console.log(`  Schedule[${i}] dictionary key: ${key}`);
      const stored = await queryOdraState(ICO_HASH, key);
      if (stored?.clValue) {
        const hex = clValueListU8ToHex(stored.clValue);
        console.log(`  Schedule[${i}] raw hex (${hex?.length ?? 0} chars):`, hex?.slice(0, 80) + '...');
      } else {
        console.log(`  Schedule[${i}]: ❌ no data returned`);
      }
    }

    // Read and parse each schedule
    console.log('\n── PARSED SCHEDULES ──────────────────────');
    for (let i = 0n; i < count; i++) {
      const schedule = await readScheduleByIndex(i);
      if (schedule) {
        console.log(`\n── Schedule #${i} ──────────────────────`);
        console.log(`  Start:       ${formatTimestamp(schedule.startTimestamp)} (raw: ${schedule.startTimestamp})`);
        console.log(`  End:         ${formatTimestamp(schedule.endTimestamp)} (raw: ${schedule.endTimestamp})`);
        console.log(`  Sale Amount: ${formatAmount(schedule.saleAmount)} tokens (raw: ${schedule.saleAmount})`);
        console.log(`  Sold Amount: ${formatAmount(schedule.soldAmount)} tokens (raw: ${schedule.soldAmount})`);
        console.log(`  Price:       ${formatAmount(schedule.price, 8)} USD (raw: ${schedule.price})`);

        // Calculate progress
        if (schedule.saleAmount > 0n) {
          const progress = Number(schedule.soldAmount * 100n / schedule.saleAmount);
          console.log(`  Progress:    ${progress}%`);
        }

        // Check if active (timestamps might be in ms or seconds)
        const nowMs = BigInt(Date.now());
        const startMs = toMilliseconds(schedule.startTimestamp);
        const endMs = toMilliseconds(schedule.endTimestamp);
        console.log(`  Now (ms):    ${nowMs}`);
        console.log(`  Start (ms):  ${startMs}`);
        console.log(`  End (ms):    ${endMs}`);
        if (nowMs >= startMs && nowMs < endMs) {
          console.log(`  Status:      🟢 ACTIVE`);
        } else if (nowMs < startMs) {
          console.log(`  Status:      ⏳ Upcoming`);
        } else {
          console.log(`  Status:      ⏹️ Ended`);
        }
      } else {
        console.log(`\n── Schedule #${i} ──────────────────────`);
        console.log(`  ❌ Failed to parse schedule bytes`);
      }
    }

    // Read current schedule
    const current = await getCurrentSchedule();
    console.log('\n\n── Current Active Schedule ──────────────');
    if (current) {
      console.log(`  ID: ${current.id}`);
      console.log(`  Price: ${formatAmount(current.schedule.price, 8)} USD`);
    } else {
      console.log('  No active schedule at this time (all schedules are past/future)');
    }

  } catch (err) {
    console.error('❌ Error reading ICO data:', err);
  }

  console.log('\n========================================\n');
}

export async function diagnoseOdraKeys(): Promise<void> {
  console.log('[diag] Testing Odra dictionary keys...');
  console.log('[diag] Contract hash:', ICO_HASH);

  // First, inspect the contract to see actual named keys
  console.log('\n[diag] === STEP 1: Inspecting contract named keys ===');
  const { inspectContractEntity, getContractInfo } = await import('./casperClient');
  await inspectContractEntity(ICO_HASH);

  const contractInfo = await getContractInfo(ICO_HASH);
  if (contractInfo) {
    console.log('[diag] Contract named keys:', contractInfo.namedKeys);
    console.log('[diag] Contract entry points:', contractInfo.entryPoints);

    // Find dictionary-like named keys
    const dictionaryKeys = contractInfo.namedKeys.filter(
      nk => nk.name.includes('state') ||
            nk.name.includes('dict') ||
            nk.name.includes('storage') ||
            nk.name.includes('__')
    );
    console.log('[diag] Potential dictionary keys:', dictionaryKeys);
  }

  console.log('\n[diag] === STEP 2: Testing calculated blake2b keys ===');
  // Log all pre-calculated keys
  debugLogKeys();

  // Test main storage fields
  const keysToTest = [
    { name: 'owner (17)', key: ICO_DICTIONARY_KEYS.owner },
    { name: 'icoSchedulesCount (4)', key: ICO_DICTIONARY_KEYS.icoSchedulesCount },
    { name: 'styksPriceFeed (5)', key: ICO_DICTIONARY_KEYS.styksPriceFeed },
    { name: 'tailorCoin (6)', key: ICO_DICTIONARY_KEYS.tailorCoin },
    { name: 'treasury (7)', key: ICO_DICTIONARY_KEYS.treasury },
    // Schedules (mapping at index 3)
    { name: 'schedule[0]', key: getScheduleKey(0) },
    { name: 'schedule[1]', key: getScheduleKey(1) },
    // Currencies (mapping at index 2)
    { name: 'currency[CSPR]', key: getCurrencyKey('CSPR') },
  ];

  for (const { name, key } of keysToTest) {
    try {
      const stored = await queryOdraState(ICO_HASH, key);
      if (stored?.clValue) {
        const cl = stored.clValue;
        const typeName = cl.type?.toString() ?? '?';
        const hexValue = clValueListU8ToHex(cl);
        console.log(`[diag] ✅ ${name} → ${typeName}, hex: ${hexValue?.slice(0, 40)}...`);
      } else {
        console.log(`[diag] ❌ ${name} → null`);
      }
    } catch {
      console.log(`[diag] ❌ ${name} → error`);
    }
  }

  console.log('\n[diag] Done.');
}

// ── Core data readers ───────────────────────────────────────────────

/**
 * Reads the total count of ICO schedules from contract state.
 */
async function readSchedulesCount(): Promise<bigint> {
  if (schedulesCountCache && Date.now() - schedulesCountCache.fetchedAt < CACHE_TTL_MS) {
    return schedulesCountCache.count;
  }

  try {
    const stored = await queryOdraState(ICO_HASH, ICO_DICTIONARY_KEYS.icoSchedulesCount);

    if (stored?.clValue) {
      const hex = clValueListU8ToHex(stored.clValue);
      if (hex) {
        const count = parseU128Count(hex);
        schedulesCountCache = { count, fetchedAt: Date.now() };
        return count;
      }
    }
  } catch (err) {
    console.warn('[icoService] Failed to read schedules count:', err);
  }

  return 0n;
}

/**
 * Reads a single ICO schedule by index from contract state.
 */
async function readScheduleByIndex(index: number | bigint): Promise<ICOSchedule | null> {
  try {
    const key = getScheduleKey(index);
    const stored = await queryOdraState(ICO_HASH, key);

    if (stored?.clValue) {
      const hex = clValueListU8ToHex(stored.clValue);
      if (hex) {
        const schedule = parseICOSchedule(hex);
        if (schedule) {
          return schedule;
        }
      }
    }
  } catch (err) {
    console.warn(`[icoService] Failed to read schedule ${index}:`, err);
  }

  return null;
}

/**
 * Reads all ICO schedules from contract state.
 * Uses deduplication to prevent concurrent fetches.
 */
async function readSchedules(): Promise<ICOScheduleWithId[]> {
  // Return cached data if still valid
  if (schedulesCache && Date.now() - schedulesCache.fetchedAt < CACHE_TTL_MS) {
    return schedulesCache.data;
  }

  // If a fetch is already in progress, wait for it instead of starting a new one
  if (inFlightSchedulesRequest) {
    return inFlightSchedulesRequest;
  }

  // Start new fetch and store the promise
  inFlightSchedulesRequest = (async () => {
    try {
      const count = await readSchedulesCount();
      const schedules: ICOScheduleWithId[] = [];

      // Read each schedule in parallel
      const promises: Promise<ICOSchedule | null>[] = [];
      for (let i = 0n; i < count; i++) {
        promises.push(readScheduleByIndex(i));
      }

      const results = await Promise.all(promises);

      for (let i = 0; i < results.length; i++) {
        const schedule = results[i];
        if (schedule) {
          schedules.push({
            id: BigInt(i),
            schedule,
          });
        }
      }

      schedulesCache = { data: schedules, fetchedAt: Date.now() };
      return schedules;
    } finally {
      // Clear in-flight request when done
      inFlightSchedulesRequest = null;
    }
  })();

  return inFlightSchedulesRequest;
}

// ── Public read methods ────────────────────────────────────────────

export async function getSchedulesCount(): Promise<number> {
  const count = await readSchedulesCount();
  return Number(count);
}

export async function getScheduleById(
  id: number | bigint,
): Promise<ICOSchedule | null> {
  const all = await readSchedules();
  return all.find((s) => s.id === BigInt(id))?.schedule ?? null;
}

export async function getCurrentSchedule(): Promise<ICOScheduleWithId | null> {
  const all = await readSchedules();
  if (all.length === 0) return null;

  const nowMs = BigInt(Date.now());
  for (const item of all) {
    const s = item.schedule;
    const startMs = toMilliseconds(s.startTimestamp);
    const endMs = toMilliseconds(s.endTimestamp);
    if (nowMs >= startMs && nowMs < endMs) {
      return item;
    }
  }
  return null;
}

export async function getAllSchedules(): Promise<ICOScheduleWithId[]> {
  return readSchedules();
}

export async function getTokenPriceUsd(
  scheduleId?: number | bigint,
): Promise<bigint> {
  if (scheduleId !== undefined) {
    const s = await getScheduleById(scheduleId);
    return s?.price ?? 0n;
  }
  const current = await getCurrentSchedule();
  return current?.schedule.price ?? 0n;
}

export async function getCurrencyInfo(
  currency: Currency,
): Promise<CurrencyInfo> {
  try {
    // Map enum value to currency name for key lookup
    const currencyNames: Record<Currency, 'CSPR' | 'USDC' | 'USDT'> = {
      [Currency.CSPR]: 'CSPR',
      [Currency.USDC]: 'USDC',
      [Currency.USDT]: 'USDT',
    };
    const currencyName = currencyNames[currency];
    const key = getCurrencyKey(currencyName);
    const stored = await queryOdraState(ICO_HASH, key);

    if (stored?.clValue) {
      // CurrencyInfo is (bool, Option<Key>)
      // Parse the tuple to get supported flag and optional address
      console.log('[icoService] Currency info CLValue:', stored.clValue);
      return { supported: true, address: null };
    }
  } catch (err) {
    console.warn(`[icoService] Failed to read currency info for ${currency}:`, err);
  }

  return { supported: false, address: null };
}

// ── Contract address readers ────────────────────────────────────────

export async function getTailorCoinAddress(): Promise<string | null> {
  try {
    const stored = await queryOdraState(ICO_HASH, ICO_DICTIONARY_KEYS.tailorCoin);
    if (stored?.clValue?.key) {
      return stored.clValue.key.toString();
    }
  } catch (err) {
    console.warn('[icoService] Failed to read tailor coin address:', err);
  }
  return null;
}

export async function getTreasuryAddress(): Promise<string | null> {
  try {
    const stored = await queryOdraState(ICO_HASH, ICO_DICTIONARY_KEYS.treasury);
    if (stored?.clValue?.key) {
      return stored.clValue.key.toString();
    }
  } catch (err) {
    console.warn('[icoService] Failed to read treasury address:', err);
  }
  return null;
}

export async function getOwnerAddress(): Promise<string | null> {
  try {
    const stored = await queryOdraState(ICO_HASH, ICO_DICTIONARY_KEYS.owner);
    if (stored?.clValue?.key) {
      return stored.clValue.key.toString();
    }
  } catch (err) {
    console.warn('[icoService] Failed to read owner address:', err);
  }
  return null;
}
