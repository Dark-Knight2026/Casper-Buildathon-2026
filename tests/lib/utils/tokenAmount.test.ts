import { describe, it, expect } from 'vitest';
import { rawTokenToNumber } from '@/lib/tokenAmount';

describe('rawTokenToNumber', () => {
  describe('typical 18-decimal conversions', () => {
    it('converts exactly 1 token', () => {
      expect(rawTokenToNumber('1000000000000000000', 18)).toBe(1);
    });

    it('converts a fractional token amount', () => {
      expect(rawTokenToNumber('1500000000000000000', 18)).toBe(1.5);
    });

    it('converts 10 tokens', () => {
      expect(rawTokenToNumber('10000000000000000000', 18)).toBe(10);
    });
  });

  describe('custom decimals', () => {
    it('converts with 3 decimals', () => {
      expect(rawTokenToNumber('1000', 3)).toBe(1);
    });

    it('converts with 0 decimals', () => {
      expect(rawTokenToNumber('42', 0)).toBe(42);
    });
  });

  describe('zero amount', () => {
    it('returns 0 for raw "0"', () => {
      expect(rawTokenToNumber('0', 18)).toBe(0);
    });

    it('returns 0 for raw "0" with 0 decimals', () => {
      expect(rawTokenToNumber('0', 0)).toBe(0);
    });
  });

  describe('invalid / non-numeric input', () => {
    it('returns 0 for a non-numeric string', () => {
      expect(rawTokenToNumber('not-a-number', 18)).toBe(0);
    });

    it('returns 0 for an empty string', () => {
      expect(rawTokenToNumber('', 18)).toBe(0);
    });

    it('returns 0 for a decimal string (BigInt cannot parse floats)', () => {
      expect(rawTokenToNumber('1.5', 18)).toBe(0);
    });

  });

  describe('large amounts with raw string exceeding Number.MAX_SAFE_INTEGER', () => {
    it('returns a finite number for a very large raw value', () => {
      // 1e18 tokens with 18 decimals — raw has 37 digits
      const result = rawTokenToNumber('1000000000000000000000000000000000000', 18);
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThan(0);
    });

    it('gives the exact integer token count when the quotient is within MAX_SAFE_INTEGER', () => {
      // 9_000_000_000_000_001 tokens at 18 decimals: raw = 9000000000000001 * 10^18 (34 digits).
      // The full 34-digit raw string cannot be represented exactly as a Number — it loses the
      // trailing 18 significant digits before division. BigInt integer division runs first,
      // so the quotient 9000000000000001n is extracted exactly; converting that smaller BigInt
      // to Number is lossless because 9000000000000001 < Number.MAX_SAFE_INTEGER.
      expect(rawTokenToNumber('9000000000000001000000000000000000', 18)).toBe(9000000000000001);
    });
  });
});
