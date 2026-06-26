import { describe, it, expect } from 'vitest';
import { buildLeaseConsentMessage } from '@/lib/leaseConsent';

type ConsentInput = Parameters<typeof buildLeaseConsentMessage>[0];

const base: ConsentInput = {
  id: '11111111-1111-1111-1111-111111111111',
  landlordId: '22222222-2222-2222-2222-222222222222',
  tenantIds: ['33333333-3333-3333-3333-333333333333'],
  monthlyRent: 2500,
  securityDeposit: 5000,
  currency: 'cUSD',
  startDate: '2026-07-01',
  endDate: '2027-06-26',
};

const make = (overrides: Partial<ConsentInput> = {}): ConsentInput => ({
  ...base,
  ...overrides,
});

describe('buildLeaseConsentMessage', () => {
  it('produces the exact backend format with all fields', () => {
    expect(buildLeaseConsentMessage(base)).toBe(
      'LeaseConsent|lease=11111111-1111-1111-1111-111111111111|landlord=22222222-2222-2222-2222-222222222222|tenant=33333333-3333-3333-3333-333333333333|rent=2500|deposit=5000|currency=cUSD|start=2026-07-01|end=2027-06-26'
    );
  });

  it('renders whole-number amounts without a decimal point (Rust f64 Display)', () => {
    const msg = buildLeaseConsentMessage(
      make({ monthlyRent: 2500, securityDeposit: 0 })
    );
    expect(msg).toContain('|rent=2500|');
    expect(msg).toContain('|deposit=0|');
  });

  it('preserves fractional amounts', () => {
    const msg = buildLeaseConsentMessage(
      make({ monthlyRent: 2500.5, securityDeposit: 1234.56 })
    );
    expect(msg).toContain('|rent=2500.5|');
    expect(msg).toContain('|deposit=1234.56|');
  });

  it('uses the first tenant id', () => {
    const msg = buildLeaseConsentMessage(
      make({ tenantIds: ['tenant-a', 'tenant-b'] })
    );
    expect(msg).toContain('|tenant=tenant-a|');
  });

  it('emits an empty tenant when there are none', () => {
    const msg = buildLeaseConsentMessage(make({ tenantIds: [] }));
    expect(msg).toContain('|tenant=|rent=');
  });

  it('emits an empty currency when null', () => {
    const msg = buildLeaseConsentMessage(make({ currency: null }));
    expect(msg).toContain('|currency=|start=');
  });

  it('reduces a datetime start/end to a date', () => {
    const msg = buildLeaseConsentMessage(
      make({
        startDate: '2026-07-01T00:00:00Z',
        endDate: '2027-06-26T00:00:00Z',
      })
    );
    expect(msg).toContain('|start=2026-07-01|');
    expect(msg).toContain('|end=2027-06-26');
  });
});
