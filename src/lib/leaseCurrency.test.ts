import { describe, expect, it } from 'vitest';

import {
  currencyOption,
  defaultCurrencySymbol,
  scaleToSmallestUnit,
} from './leaseCurrency';

describe('defaultCurrencySymbol', () => {
  it('maps USDC/USDT (and tUSD* forms) to the token; everything else to CSPR', () => {
    expect(defaultCurrencySymbol('USDC')).toBe('tUSDC');
    expect(defaultCurrencySymbol('tUSDT')).toBe('tUSDT');
    expect(defaultCurrencySymbol('CSPR')).toBe('CSPR');
    expect(defaultCurrencySymbol('cUSD')).toBe('CSPR');
    expect(defaultCurrencySymbol(null)).toBe('CSPR');
  });
});

describe('currencyOption', () => {
  it('CSPR is native with 9 decimals; tUSDC/tUSDT are 6 decimals', () => {
    expect(currencyOption('CSPR')).toMatchObject({
      address: null,
      decimals: 9,
    });
    expect(currencyOption('tUSDC').decimals).toBe(6);
    expect(currencyOption('tUSDT').decimals).toBe(6);
  });

  it('falls back to CSPR for an unknown symbol', () => {
    expect(currencyOption('nope').symbol).toBe('CSPR');
  });
});

describe('scaleToSmallestUnit', () => {
  it('scales integers and fractions exactly', () => {
    expect(scaleToSmallestUnit(2500, 6)).toBe('2500000000');
    expect(scaleToSmallestUnit(2500.5, 6)).toBe('2500500000');
    expect(scaleToSmallestUnit(1, 9)).toBe('1000000000');
    expect(scaleToSmallestUnit(0, 6)).toBe('0');
  });

  it('truncates fractions beyond the currency precision', () => {
    expect(scaleToSmallestUnit(1.1234567, 6)).toBe('1123456');
  });
});
