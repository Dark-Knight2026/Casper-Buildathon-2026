import { describe, it, expect } from 'vitest';
import { getDashboardRoute } from '@/types/user';

describe('getDashboardRoute', () => {
  it('routes tenants to the tenant dashboard', () => {
    expect(getDashboardRoute('tenant')).toBe('/tenant/dashboard');
  });

  it('routes landlords to the landlord dashboard', () => {
    expect(getDashboardRoute('landlord')).toBe('/landlord/dashboard');
  });

  it('routes every other known role to the landlord dashboard (no role-specific dashboard yet)', () => {
    expect(getDashboardRoute('agent')).toBe('/landlord/dashboard');
    expect(getDashboardRoute('admin')).toBe('/landlord/dashboard');
  });

  it('routes undefined (e.g. profile not yet hydrated) to the landlord dashboard, never to "/"', () => {
    // The auth confirm pages call this with profile?.role, which can be
    // undefined for a frame — it must resolve to a real route, not the old
    // local helper's "/" that would land users on the marketing home.
    expect(getDashboardRoute(undefined)).toBe('/landlord/dashboard');
  });
});
