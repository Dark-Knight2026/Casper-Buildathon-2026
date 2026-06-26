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
  equityPropertyId: '7',
  monthlyRentAmount: '2500',
  securityDepositAmount: '3000',
  startDateTime: '2026-07-01T00:00',
  endDateTime: '2026-07-31T00:00',
  invoiceValidityDays: '30',
};

describe('initialLeaseOnChainForm', () => {
  it('prefills human amounts and a blank tenant id', () => {
    const form = initialLeaseOnChainForm(makeLease());

    expect(form.tenantUserId).toBe('');
    expect(form.equityPropertyId).toBe('');
    // Rent and deposit are prefilled as their human tUSDC amounts.
    expect(form.monthlyRentAmount).toBe('2500');
    expect(form.securityDepositAmount).toBe('3000');
    expect(form.invoiceValidityDays).toBe('30');
  });

  it('prefills the tenant id from the lease’s on-chain user id', () => {
    const form = initialLeaseOnChainForm(
      makeLease({ tenantOnchainUserId: '42' })
    );
    expect(form.tenantUserId).toBe('42');
  });

  it('leaves the tenant id blank when not yet registered on-chain', () => {
    const form = initialLeaseOnChainForm(
      makeLease({ tenantOnchainUserId: null })
    );
    expect(form.tenantUserId).toBe('');
  });

  it('aligns the term to a whole 30-day multiple', () => {
    const form = initialLeaseOnChainForm(makeLease());
    const start = Date.parse(form.startDateTime);
    const end = Date.parse(form.endDateTime);

    // 30-day term → end is exactly one month after start.
    expect((end - start) / 1000).toBe(ONE_MONTH);
  });

  it('rounds a non-30-day term to the nearest whole month', () => {
    // ~76 days → rounds to 3 months.
    const form = initialLeaseOnChainForm(
      makeLease({ startDate: '2026-07-01', endDate: '2026-09-15' })
    );
    const span =
      (Date.parse(form.endDateTime) - Date.parse(form.startDateTime)) / 1000;

    expect(span % ONE_MONTH).toBe(0);
    expect(span / ONE_MONTH).toBe(3);
  });
});

describe('isLeaseOnChainFormValid', () => {
  it('accepts a fully numeric form', () => {
    expect(isLeaseOnChainFormValid(validForm)).toBe(true);
  });

  it('rejects a missing tenant id', () => {
    expect(isLeaseOnChainFormValid({ ...validForm, tenantUserId: '' })).toBe(
      false
    );
  });

  it('rejects a non-numeric amount', () => {
    expect(
      isLeaseOnChainFormValid({ ...validForm, monthlyRentAmount: '12a' })
    ).toBe(false);
  });

  it('always requires a numeric property id', () => {
    // The deployed contract binds every lease to a property → required.
    expect(
      isLeaseOnChainFormValid({ ...validForm, equityPropertyId: '' })
    ).toBe(false);
    expect(
      isLeaseOnChainFormValid({ ...validForm, equityPropertyId: '12a' })
    ).toBe(false);
    expect(
      isLeaseOnChainFormValid({ ...validForm, equityPropertyId: '9' })
    ).toBe(true);
  });
});
