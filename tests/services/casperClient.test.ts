import { describe, it, expect, vi } from 'vitest';

// Mock casper-js-sdk before importing the module under test
vi.mock('casper-js-sdk', () => ({
  HttpHandler: vi.fn(),
  RpcClient: vi.fn(),
  CLValue: {},
  PublicKey: { fromHex: vi.fn() },
  ParamDictionaryIdentifier: vi.fn(),
  ParamDictionaryIdentifierContractNamedKey: vi.fn(),
  EntityAddr: {},
  EntityIdentifier: vi.fn(),
  Deploy: {},
  DeployHeader: vi.fn(),
  ExecutableDeployItem: {},
  StoredContractByHash: vi.fn(),
  ContractHash: { fromString: vi.fn() },
  Transaction: {},
  TransactionV1: {},
  ContractCallBuilder: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    byHash: vi.fn().mockReturnThis(),
    entryPoint: vi.fn().mockReturnThis(),
    runtimeArgs: vi.fn().mockReturnThis(),
    chainName: vi.fn().mockReturnThis(),
    payment: vi.fn().mockReturnThis(),
    build: vi.fn(),
  }),
  Args: { fromMap: vi.fn() },
  Timestamp: { build: vi.fn() },
  Duration: { build: vi.fn() },
}));

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CASPER: {
      rpcUrl: 'https://test.rpc.url',
      networkName: 'casper-test',
    },
    CONTRACTS: {
      icoAddress: 'hash-abc123',
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  contractHashToEntityKey,
  stripHashPrefix,
  hexToBytes,
  readU64LE,
  readU256VarLen,
  readU128VarLen,
  clValueToBigInt,
  clValueToString,
  clValueToBool,
} from '@/services/ico/casperClient';

// ── contractHashToEntityKey ─────────────────────────────────────────

describe('contractHashToEntityKey', () => {
  it('returns hash- prefixed input unchanged', () => {
    expect(contractHashToEntityKey('hash-abc123')).toBe('hash-abc123');
  });

  it('strips entity-contract- prefix and adds hash-', () => {
    expect(contractHashToEntityKey('entity-contract-abc123')).toBe('hash-abc123');
  });

  it('strips contract- prefix and adds hash-', () => {
    expect(contractHashToEntityKey('contract-abc123')).toBe('hash-abc123');
  });

  it('adds hash- prefix to raw hex', () => {
    expect(contractHashToEntityKey('abc123')).toBe('hash-abc123');
  });
});

// ── stripHashPrefix ─────────────────────────────────────────────────

describe('stripHashPrefix', () => {
  it('strips hash- prefix', () => {
    expect(stripHashPrefix('hash-abc123')).toBe('abc123');
  });

  it('strips contract- prefix', () => {
    expect(stripHashPrefix('contract-abc123')).toBe('abc123');
  });

  it('returns raw hex unchanged', () => {
    expect(stripHashPrefix('abc123')).toBe('abc123');
  });
});

// ── hexToBytes ──────────────────────────────────────────────────────

describe('hexToBytes', () => {
  it('converts empty string to empty array', () => {
    expect(hexToBytes('')).toEqual(new Uint8Array([]));
  });

  it('converts single byte hex', () => {
    expect(hexToBytes('ff')).toEqual(new Uint8Array([255]));
  });

  it('converts multi-byte hex', () => {
    expect(hexToBytes('0102ff')).toEqual(new Uint8Array([1, 2, 255]));
  });

  it('handles uppercase hex', () => {
    expect(hexToBytes('FF')).toEqual(new Uint8Array([255]));
  });
});

// ── readU64LE ───────────────────────────────────────────────────────

describe('readU64LE', () => {
  it('reads zero', () => {
    const bytes = new Uint8Array(8);
    const [value, newOffset] = readU64LE(bytes, 0);
    expect(value).toBe(0n);
    expect(newOffset).toBe(8);
  });

  it('reads 1 in little-endian', () => {
    const bytes = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]);
    const [value] = readU64LE(bytes, 0);
    expect(value).toBe(1n);
  });

  it('reads value at offset', () => {
    // 2 bytes padding + u64 value of 256
    const bytes = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    const [value, newOffset] = readU64LE(bytes, 2);
    expect(value).toBe(256n);
    expect(newOffset).toBe(10);
  });

  it('reads large timestamp value', () => {
    // 1706745600000 (2024-02-01T00:00:00Z) in LE bytes
    const ts = 1706745600000n;
    const bytes = new Uint8Array(8);
    const view = new DataView(bytes.buffer);
    view.setBigUint64(0, ts, true);
    const [value] = readU64LE(bytes, 0);
    expect(value).toBe(ts);
  });
});

// ── readU256VarLen ──────────────────────────────────────────────────

describe('readU256VarLen', () => {
  it('reads zero (length byte = 0)', () => {
    const bytes = new Uint8Array([0]);
    const [value, newOffset] = readU256VarLen(bytes, 0);
    expect(value).toBe(0n);
    expect(newOffset).toBe(1);
  });

  it('reads single-byte value', () => {
    const bytes = new Uint8Array([1, 42]); // length=1, value=42
    const [value, newOffset] = readU256VarLen(bytes, 0);
    expect(value).toBe(42n);
    expect(newOffset).toBe(2);
  });

  it('reads two-byte value in little-endian', () => {
    // 1000 = 0x03E8 → LE: [0xE8, 0x03]
    const bytes = new Uint8Array([2, 0xe8, 0x03]);
    const [value] = readU256VarLen(bytes, 0);
    expect(value).toBe(1000n);
  });

  it('reads at offset', () => {
    const bytes = new Uint8Array([0xff, 0xff, 1, 5]); // 2 bytes padding, then length=1, value=5
    const [value, newOffset] = readU256VarLen(bytes, 2);
    expect(value).toBe(5n);
    expect(newOffset).toBe(4);
  });

  it('reads large values', () => {
    // 1000000000000000000 (1e18) = 0x0DE0B6B3A7640000
    // LE bytes: [00, 00, 64, A7, B3, B6, E0, 0D]
    const bytes = new Uint8Array([8, 0x00, 0x00, 0x64, 0xa7, 0xb3, 0xb6, 0xe0, 0x0d]);
    const [value] = readU256VarLen(bytes, 0);
    expect(value).toBe(1000000000000000000n);
  });
});

// ── readU128VarLen ──────────────────────────────────────────────────

describe('readU128VarLen', () => {
  it('uses same format as readU256VarLen', () => {
    const bytes = new Uint8Array([2, 0xe8, 0x03]);
    const [value256] = readU256VarLen(bytes, 0);
    const [value128] = readU128VarLen(bytes, 0);
    expect(value128).toBe(value256);
  });
});

// ── clValueToBigInt ─────────────────────────────────────────────────

describe('clValueToBigInt', () => {
  it('returns 0n for undefined', () => {
    expect(clValueToBigInt(undefined)).toBe(0n);
  });

  it('extracts ui64', () => {
    const cl = { ui64: { toString: () => '12345' } } as never;
    expect(clValueToBigInt(cl)).toBe(12345n);
  });

  it('extracts ui128', () => {
    const cl = { ui128: { toString: () => '999999999999' } } as never;
    expect(clValueToBigInt(cl)).toBe(999999999999n);
  });

  it('extracts ui256', () => {
    const cl = { ui256: { toString: () => '1000000000000000000' } } as never;
    expect(clValueToBigInt(cl)).toBe(1000000000000000000n);
  });

  it('extracts ui32', () => {
    const cl = { ui32: { toString: () => '42' } } as never;
    expect(clValueToBigInt(cl)).toBe(42n);
  });

  it('extracts ui8', () => {
    const cl = { ui8: { toString: () => '18' } } as never;
    expect(clValueToBigInt(cl)).toBe(18n);
  });

  it('returns 0n for CLValue with no numeric fields', () => {
    const cl = { stringVal: 'hello' } as never;
    expect(clValueToBigInt(cl)).toBe(0n);
  });
});

// ── clValueToString ─────────────────────────────────────────────────

describe('clValueToString', () => {
  it('returns empty string for undefined', () => {
    expect(clValueToString(undefined)).toBe('');
  });

  it('extracts stringVal', () => {
    const cl = { stringVal: { toString: () => 'BIG Token' } } as never;
    expect(clValueToString(cl)).toBe('BIG Token');
  });

  it('extracts key', () => {
    const cl = { key: { toString: () => 'hash-abc123' } } as never;
    expect(clValueToString(cl)).toBe('hash-abc123');
  });
});

// ── clValueToBool ───────────────────────────────────────────────────

describe('clValueToBool', () => {
  it('returns false for undefined', () => {
    expect(clValueToBool(undefined)).toBe(false);
  });

  it('returns true for bool=true', () => {
    const cl = { bool: { toString: () => 'true' } } as never;
    expect(clValueToBool(cl)).toBe(true);
  });

  it('returns false for bool=false', () => {
    const cl = { bool: { toString: () => 'false' } } as never;
    expect(clValueToBool(cl)).toBe(false);
  });

  it('returns false for non-bool CLValue', () => {
    const cl = { stringVal: 'yes' } as never;
    expect(clValueToBool(cl)).toBe(false);
  });
});
