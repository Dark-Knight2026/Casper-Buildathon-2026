import { describe, it, expect } from 'vitest';
import { getDashboardRoute } from '@/types/user';

describe('getDashboardRoute', () => {
  it('routes tenants to the tenant dashboard', () => {
    expect(getDashboardRoute('tenant')).toBe('/tenant/dashboard');
  });

  it('routes landlords to the landlord dashboard', () => {
    expect(getDashboardRoute('landlord')).toBe('/landlord/dashboard');
  });

  it('routes every other (post-MVP) role to the public root, not a ProtectedRoute (R4-02)', () => {
    // Only tenant and landlord have a dashboard in the MVP. Returning
    // '/landlord/dashboard' for these roles caused an infinite redirect loop:
    // ProtectedRoute (allowedRoles=['landlord']) denies them → calls
    // getDashboardRoute again → same path. '/' is public, so it terminates.
    expect(getDashboardRoute('agent')).toBe('/');
    expect(getDashboardRoute('admin')).toBe('/');
  });

  it('routes undefined (e.g. profile not yet hydrated) to the public root', () => {
    // The auth confirm pages call this with profile?.role, which can be
    // undefined for a frame — '/' is a safe, loop-free landing until the role
    // resolves and a real dashboard exists for it.
    expect(getDashboardRoute(undefined)).toBe('/');
  });
});
