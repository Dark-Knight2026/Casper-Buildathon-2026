import { describe, it, expect } from 'vitest';
import { getCurrencyRateUsd } from '@/constants/ico';

describe('getCurrencyRateUsd', () => {
  describe('CSPR currency', () => {
    it('returns the provided CSPR price', () => {
      expect(getCurrencyRateUsd('CSPR', 0.0234)).toBe(0.0234);
    });

    it('handles very small CSPR prices', () => {
      expect(getCurrencyRateUsd('CSPR', 0.000001)).toBe(0.000001);
    });

    it('handles large CSPR prices', () => {
      expect(getCurrencyRateUsd('CSPR', 9999.99)).toBe(9999.99);
    });

    it('throws when csprPriceUsd is undefined', () => {
      expect(() => getCurrencyRateUsd('CSPR')).toThrow(
        'CSPR price unavailable',
      );
    });

    it('throws when csprPriceUsd is 0', () => {
      expect(() => getCurrencyRateUsd('CSPR', 0)).toThrow(
        'CSPR price unavailable',
      );
    });

    it('throws when csprPriceUsd is negative', () => {
      expect(() => getCurrencyRateUsd('CSPR', -1)).toThrow(
        'CSPR price unavailable',
      );
    });
  });

  describe('stablecoins and fiat', () => {
    it.each(['USDT', 'USDC', 'CARD'] as const)(
      'returns 1 for %s',
      (currency) => {
        expect(getCurrencyRateUsd(currency)).toBe(1);
      },
    );

    it('ignores csprPriceUsd param for non-CSPR currencies', () => {
      expect(getCurrencyRateUsd('USDT', 0.05)).toBe(1);
      expect(getCurrencyRateUsd('USDC', undefined)).toBe(1);
    });
  });
});
