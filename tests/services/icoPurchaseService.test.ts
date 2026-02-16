import { describe, it, expect, vi } from 'vitest';
import {
  toRawAmount,
  fromRawAmount,
  validatePurchase,
  calculateTokensReceived,
} from '@/services/ico/icoPurchaseService';

// Mock dependencies that icoPurchaseService imports
vi.mock('casper-js-sdk', () => ({
  Args: { fromMap: vi.fn() },
  CLValue: { newCLKey: vi.fn(), newCLUInt256: vi.fn(), newCLUint8: vi.fn() },
  Key: { newKey: vi.fn() },
  Deploy: {},
}));

vi.mock('@/services/ico/casperClient', () => ({
  createDeploy: vi.fn(),
  stripHashPrefix: vi.fn((s: string) => s),
  getCasperRpcClient: vi.fn(),
}));

vi.mock('@/services/ico/contractTypes', () => ({
  paymentCurrencyToContractCurrency: vi.fn(),
}));

vi.mock('@/services/ico/cep18Service', () => ({
  getAllowance: vi.fn(),
}));

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    TOKEN: { decimals: 18 },
    CONTRACTS: {
      icoAddress: 'hash-abc123',
      usdtAddress: 'hash-usdt',
      usdcAddress: 'hash-usdc',
      tokenAddress: 'hash-token',
    },
    CURRENCY_RATES: {
      USDT: 1,
      USDC: 1,
      CSPR: 0.02,
      CARD: 1,
    },
    PURCHASE_LIMITS: {
      min: 10,
      max: 100000,
    },
    CASPER: { networkName: 'casper-test' },
  },
}));

// ── toRawAmount ─────────────────────────────────────────────────────

describe('toRawAmount', () => {
  it('converts whole number with 18 decimals', () => {
    expect(toRawAmount('1', 18)).toBe(1_000_000_000_000_000_000n);
  });

  it('converts whole number with 6 decimals', () => {
    expect(toRawAmount('100', 6)).toBe(100_000_000n);
  });

  it('converts fractional amount', () => {
    expect(toRawAmount('1.5', 6)).toBe(1_500_000n);
  });

  it('truncates excess decimal places', () => {
    // 1.1234567 with 6 decimals → truncate to 1.123456
    expect(toRawAmount('1.1234567', 6)).toBe(1_123_456n);
  });

  it('pads short fraction', () => {
    expect(toRawAmount('1.1', 6)).toBe(1_100_000n);
  });

  it('handles zero', () => {
    expect(toRawAmount('0', 6)).toBe(0n);
  });

  it('handles large amounts', () => {
    expect(toRawAmount('1000000', 9)).toBe(1_000_000_000_000_000n);
  });
});

// ── fromRawAmount ───────────────────────────────────────────────────

describe('fromRawAmount', () => {
  it('converts raw to human-readable with 18 decimals', () => {
    expect(fromRawAmount(1_000_000_000_000_000_000n, 18)).toBe('1');
  });

  it('converts raw to human-readable with 6 decimals', () => {
    expect(fromRawAmount(1_500_000n, 6)).toBe('1.5');
  });

  it('removes trailing zeros', () => {
    expect(fromRawAmount(1_100_000n, 6)).toBe('1.1');
  });

  it('handles zero', () => {
    expect(fromRawAmount(0n, 18)).toBe('0');
  });

  it('handles fractional-only amounts', () => {
    // 500000 with 6 decimals = 0.5
    expect(fromRawAmount(500_000n, 6)).toBe('0.5');
  });

  it('handles large amounts', () => {
    expect(fromRawAmount(5_000_000_000_000_000_000_000_000_000n, 18)).toBe('5000000000');
  });
});

// ── toRawAmount + fromRawAmount roundtrip ───────────────────────────

describe('toRawAmount/fromRawAmount roundtrip', () => {
  it('roundtrips whole numbers', () => {
    const raw = toRawAmount('42', 18);
    expect(fromRawAmount(raw, 18)).toBe('42');
  });

  it('roundtrips fractional amounts', () => {
    const raw = toRawAmount('3.14', 6);
    expect(fromRawAmount(raw, 6)).toBe('3.14');
  });
});

// ── validatePurchase ────────────────────────────────────────────────

describe('validatePurchase', () => {
  it('accepts valid USDT purchase', () => {
    const result = validatePurchase('100', 'USDT', 1000);
    expect(result).toEqual({ valid: true });
  });

  it('rejects NaN amount', () => {
    const result = validatePurchase('abc', 'USDT', 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid amount');
  });

  it('rejects zero amount', () => {
    const result = validatePurchase('0', 'USDT', 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid amount');
  });

  it('rejects negative amount', () => {
    const result = validatePurchase('-50', 'USDT', 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid amount');
  });

  it('rejects below minimum ($10 USD)', () => {
    // 5 USDT = $5 < $10 min
    const result = validatePurchase('5', 'USDT', 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum');
  });

  it('rejects above maximum ($100,000 USD)', () => {
    const result = validatePurchase('200000', 'USDT', 500000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum');
  });

  it('rejects insufficient balance', () => {
    const result = validatePurchase('100', 'USDT', 50);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Insufficient balance');
  });

  it('applies CSPR exchange rate for min check', () => {
    // 100 CSPR * 0.02 = $2 < $10 min
    const result = validatePurchase('100', 'CSPR', 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum');
  });

  it('accepts valid CSPR purchase above minimum', () => {
    // 1000 CSPR * 0.02 = $20 > $10 min
    const result = validatePurchase('1000', 'CSPR', 10000);
    expect(result).toEqual({ valid: true });
  });

  it('accepts exact minimum amount', () => {
    // 10 USDT = $10 = exactly min
    const result = validatePurchase('10', 'USDT', 1000);
    expect(result).toEqual({ valid: true });
  });
});

// ── calculateTokensReceived ─────────────────────────────────────────

describe('calculateTokensReceived', () => {
  it('calculates tokens for USDT at $0.001/token', () => {
    // 100 USDT * $1 rate / $0.001 = 100,000 tokens
    const raw = calculateTokensReceived('100', 'USDT', 0.001);
    const tokens = fromRawAmount(raw, 18);
    expect(tokens).toBe('100000');
  });

  it('calculates tokens for CSPR', () => {
    // 1000 CSPR * $0.02 rate = $20 / $0.001 = 20,000 tokens
    const raw = calculateTokensReceived('1000', 'CSPR', 0.001);
    const tokens = fromRawAmount(raw, 18);
    expect(tokens).toBe('20000');
  });

  it('returns 0 for invalid amount', () => {
    expect(calculateTokensReceived('abc', 'USDT', 0.001)).toBe(0n);
  });

  it('returns 0 for negative amount', () => {
    expect(calculateTokensReceived('-10', 'USDT', 0.001)).toBe(0n);
  });

  it('returns 0 for zero amount', () => {
    expect(calculateTokensReceived('0', 'USDT', 0.001)).toBe(0n);
  });

  it('returns 0 for zero price', () => {
    expect(calculateTokensReceived('100', 'USDT', 0)).toBe(0n);
  });

  it('returns 0 for negative price', () => {
    expect(calculateTokensReceived('100', 'USDT', -1)).toBe(0n);
  });

  it('handles small fractional amounts', () => {
    // 0.5 USDT / $0.001 = 500 tokens
    const raw = calculateTokensReceived('0.5', 'USDT', 0.001);
    const tokens = fromRawAmount(raw, 18);
    expect(tokens).toBe('500');
  });
});
