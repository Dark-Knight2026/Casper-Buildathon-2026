import { describe, expect, it } from 'vitest';

import {
  initialLeaseOnChainForm,
  isLeaseOnChainFormValid,
  type LeaseOnChainFormState,
} from './LeaseOnChainForm';
import type { Lease } from '@/types/leaseContract';

const ONE_MONTH = 30 * 24 * 60 * 60;

/** Only the fields `initialLeaseOnChainForm` reads — cast to the full type. */
const makeLease = (over: Partial<Lease> = {}): Lease =>
  ({
    startDate: '2026-07-01',
    endDate: '2026-07-31', // exactly 30 days → 1 month
    currency: 'USDC',
    monthlyRent: 2500,
    securityDeposit: 3000,
    ...over,
  }) as Lease;

const validForm: LeaseOnChainFormState = {
  tenantUserId: '5',
  equityPropertyId: '',
  currencySymbol: 'tUSDC',
  monthlyRentAmount: '2500000000',
  securityDepositAmount: '3000000000',
  startUnixSeconds: '1782864000',
  endUnixSeconds: '1785456000',
  invoiceValidityDuration: '2592000',
};

describe('initialLeaseOnChainForm', () => {
  it('prefills currency, scaled amounts, and a blank tenant id', () => {
    const form = initialLeaseOnChainForm(makeLease());

    expect(form.tenantUserId).toBe('');
    expect(form.equityPropertyId).toBe('');
    // USDC maps to the tUSDC option (6 decimals).
    expect(form.currencySymbol).toBe('tUSDC');
    expect(form.monthlyRentAmount).toBe('2500000000'); // 2500 × 10^6
    expect(form.securityDepositAmount).toBe('3000000000'); // 3000 × 10^6
    expect(form.invoiceValidityDuration).toBe(String(ONE_MONTH));
  });

  it('uses UTC-midnight start and aligns end to a whole 30-day multiple', () => {
    const form = initialLeaseOnChainForm(makeLease());
    const start = Math.floor(Date.UTC(2026, 6, 1) / 1000);

    expect(form.startUnixSeconds).toBe(String(start));
    // 30-day term → exactly one month after start.
    expect(form.endUnixSeconds).toBe(String(start + ONE_MONTH));
  });

  it('rounds a non-30-day term to the nearest whole month', () => {
    // ~76 days → rounds to 3 months.
    const form = initialLeaseOnChainForm(
      makeLease({ startDate: '2026-07-01', endDate: '2026-09-15' })
    );
    const span = Number(form.endUnixSeconds) - Number(form.startUnixSeconds);

    expect(span % ONE_MONTH).toBe(0);
    expect(span / ONE_MONTH).toBe(3);
  });

  it('maps a null/CSPR currency to native CSPR (9 decimals)', () => {
    const form = initialLeaseOnChainForm(
      makeLease({ currency: null, monthlyRent: 100, securityDeposit: 0 })
    );

    expect(form.currencySymbol).toBe('CSPR');
    expect(form.monthlyRentAmount).toBe('100000000000'); // 100 × 10^9
    expect(form.securityDepositAmount).toBe('0');
  });
});

describe('isLeaseOnChainFormValid', () => {
  it('accepts a fully numeric form (no equity)', () => {
    expect(isLeaseOnChainFormValid(validForm, false)).toBe(true);
  });

  it('rejects a missing tenant id', () => {
    expect(
      isLeaseOnChainFormValid({ ...validForm, tenantUserId: '' }, false)
    ).toBe(false);
  });

  it('rejects a non-numeric amount', () => {
    expect(
      isLeaseOnChainFormValid({ ...validForm, monthlyRentAmount: '12a' }, false)
    ).toBe(false);
  });

  it('requires the equity id only when the lease has equity', () => {
    const noEquityId = { ...validForm, equityPropertyId: '' };
    // hasEquity=false → empty equity id is fine.
    expect(isLeaseOnChainFormValid(noEquityId, false)).toBe(true);
    // hasEquity=true → empty equity id fails…
    expect(isLeaseOnChainFormValid(noEquityId, true)).toBe(false);
    // …and a numeric one passes.
    expect(
      isLeaseOnChainFormValid({ ...validForm, equityPropertyId: '9' }, true)
    ).toBe(true);
  });
});
