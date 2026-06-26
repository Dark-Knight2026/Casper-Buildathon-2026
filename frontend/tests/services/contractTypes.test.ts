import { describe, it, expect } from 'vitest';
import {
  Currency,
  paymentCurrencyToContractCurrency,
} from '@/services/ico/contractTypes';

describe('paymentCurrencyToContractCurrency', () => {
  it('maps CSPR to Currency.CSPR (0)', () => {
    expect(paymentCurrencyToContractCurrency('CSPR')).toBe(Currency.CSPR);
    expect(paymentCurrencyToContractCurrency('CSPR')).toBe(0);
  });

  it('maps USDC to Currency.USDC (1)', () => {
    expect(paymentCurrencyToContractCurrency('USDC')).toBe(Currency.USDC);
    expect(paymentCurrencyToContractCurrency('USDC')).toBe(1);
  });

  it('maps USDT to Currency.USDT (2)', () => {
    expect(paymentCurrencyToContractCurrency('USDT')).toBe(Currency.USDT);
    expect(paymentCurrencyToContractCurrency('USDT')).toBe(2);
  });
});

describe('Currency enum', () => {
  it('has exactly 3 members', () => {
    const numericValues = Object.values(Currency).filter(v => typeof v === 'number');
    expect(numericValues).toHaveLength(3);
  });

  it('discriminants match contract schema', () => {
    expect(Currency.CSPR).toBe(0);
    expect(Currency.USDC).toBe(1);
    expect(Currency.USDT).toBe(2);
  });
});
