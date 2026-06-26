/**
 * Odra Storage Key Calculation Tests
 *
 * Verifies that storage indices and blake2b key hashing produce
 * the correct dictionary keys for the ICO contract.
 *
 * These keys have been validated against the deployed testnet contract —
 * the ICO page successfully reads schedule data using them.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOdraKey,
  calculateStorageKey,
  calculateMappingKey,
  encodeU8Key,
  encodeU128Key,
  ICO_STORAGE_LAYOUT,
  ICO_DICTIONARY_KEYS,
  getScheduleKey,
  getCurrencyKey,
  CURRENCY_DISCRIMINANT,
} from '@/services/ico/odraStorage';

// ── Storage Layout ──────────────────────────────────────────────────

describe('ICO_STORAGE_LAYOUT', () => {
  it('ownable submodule uses prefix 1 with bit-shifted fields', () => {
    expect(ICO_STORAGE_LAYOUT.ownable.prefix).toBe(1);
    expect(ICO_STORAGE_LAYOUT.ownable.owner).toBe(17);       // (1 << 4) + 1
    expect(ICO_STORAGE_LAYOUT.ownable.pendingOwner).toBe(18); // (1 << 4) + 2
  });

  it('field indices are sequential starting from 2', () => {
    expect(ICO_STORAGE_LAYOUT.currencies.base).toBe(2);
    expect(ICO_STORAGE_LAYOUT.icoSchedules.base).toBe(3);
    expect(ICO_STORAGE_LAYOUT.icoSchedulesCount).toBe(4);
    expect(ICO_STORAGE_LAYOUT.styksPriceFeed).toBe(5);
    expect(ICO_STORAGE_LAYOUT.tailorCoin).toBe(6);
    expect(ICO_STORAGE_LAYOUT.treasury).toBe(7);
  });
});

// ── Key Calculation ─────────────────────────────────────────────────

describe('calculateOdraKey', () => {
  it('produces 64-char hex string (blake2b-256)', () => {
    const key = calculateOdraKey(1);
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different indices produce different keys', () => {
    const key1 = calculateOdraKey(1);
    const key2 = calculateOdraKey(2);
    expect(key1).not.toBe(key2);
  });

  it('same index with different mapping data produces different keys', () => {
    const key1 = calculateOdraKey(3, new Uint8Array([0]));
    const key2 = calculateOdraKey(3, new Uint8Array([1]));
    expect(key1).not.toBe(key2);
  });

  it('is deterministic', () => {
    const key1 = calculateOdraKey(4);
    const key2 = calculateOdraKey(4);
    expect(key1).toBe(key2);
  });
});

describe('calculateStorageKey', () => {
  it('is equivalent to calculateOdraKey without mapping data', () => {
    expect(calculateStorageKey(4)).toBe(calculateOdraKey(4));
  });
});

// ── Encoding ────────────────────────────────────────────────────────

describe('encodeU128Key', () => {
  it('encodes 0 as single zero byte', () => {
    expect(encodeU128Key(0)).toEqual(new Uint8Array([0]));
  });

  it('encodes 1 as [length=1, value=1]', () => {
    expect(encodeU128Key(1)).toEqual(new Uint8Array([1, 1]));
  });

  it('encodes 256 as [length=2, 0x00, 0x01] (little-endian)', () => {
    expect(encodeU128Key(256)).toEqual(new Uint8Array([2, 0, 1]));
  });

  it('encodes bigint values', () => {
    const encoded = encodeU128Key(1000n);
    expect(encoded[0]).toBe(2); // needs 2 bytes
    // 1000 = 0x03E8 → LE: [0xE8, 0x03]
    expect(encoded[1]).toBe(0xe8);
    expect(encoded[2]).toBe(0x03);
  });
});

describe('encodeU8Key', () => {
  it('encodes single byte', () => {
    expect(encodeU8Key(0)).toEqual(new Uint8Array([0]));
    expect(encodeU8Key(2)).toEqual(new Uint8Array([2]));
  });
});

// ── Pre-calculated Keys ─────────────────────────────────────────────

describe('ICO_DICTIONARY_KEYS', () => {
  it('all keys are valid 64-char hex strings', () => {
    for (const [name, key] of Object.entries(ICO_DICTIONARY_KEYS)) {
      expect(key, `${name} should be 64-char hex`).toHaveLength(64);
      expect(key, `${name} should be hex`).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('icoSchedulesCount uses index 4', () => {
    expect(ICO_DICTIONARY_KEYS.icoSchedulesCount).toBe(calculateStorageKey(4));
  });

  it('owner uses submodule index 17', () => {
    expect(ICO_DICTIONARY_KEYS.owner).toBe(calculateStorageKey(17));
  });

  it('all keys are unique', () => {
    const values = Object.values(ICO_DICTIONARY_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ── Mapping Keys ────────────────────────────────────────────────────

describe('getScheduleKey', () => {
  it('produces valid hex key for schedule 0', () => {
    const key = getScheduleKey(0);
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different schedule IDs produce different keys', () => {
    expect(getScheduleKey(0)).not.toBe(getScheduleKey(1));
  });

  it('uses icoSchedules base index (3) with U128-encoded ID', () => {
    const expected = calculateMappingKey(3, encodeU128Key(0));
    expect(getScheduleKey(0)).toBe(expected);
  });
});

describe('getCurrencyKey', () => {
  it('produces different keys for each currency', () => {
    const cspr = getCurrencyKey('CSPR');
    const usdc = getCurrencyKey('USDC');
    const usdt = getCurrencyKey('USDT');

    expect(cspr).not.toBe(usdc);
    expect(cspr).not.toBe(usdt);
    expect(usdc).not.toBe(usdt);
  });

  it('uses currencies base index (2) with U8-encoded discriminant', () => {
    const expected = calculateMappingKey(2, encodeU8Key(CURRENCY_DISCRIMINANT.CSPR));
    expect(getCurrencyKey('CSPR')).toBe(expected);
  });
});
