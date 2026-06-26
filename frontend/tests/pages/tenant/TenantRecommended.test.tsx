import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// `getMyCurrentProperties` is module-level data — mocked at the top so each
// test can flip the implementation between the real demo seed (happy path)
// and an empty array (drives the `!firstCurrent` branch in TenantRecommended).
vi.mock('@/data/tenantLeases', async () => {
  const actual = await vi.importActual<typeof import('@/data/tenantLeases')>('@/data/tenantLeases');
  return { ...actual, getMyCurrentProperties: vi.fn(actual.getMyCurrentProperties) };
});

import TenantRecommended from '@/pages/tenant/TenantRecommended';
import { getMyCurrentProperties } from '@/data/tenantLeases';

const mockGetMyCurrentProperties = vi.mocked(getMyCurrentProperties);

afterEach(() => {
  // Default behaviour for the next test is the real implementation,
  // matching the demo tenant seed.
  mockGetMyCurrentProperties.mockReset();
});

describe('TenantRecommended page (smoke)', () => {
  it('renders the page heading for the demo tenant', async () => {
    const actual = await vi.importActual<typeof import('@/data/tenantLeases')>('@/data/tenantLeases');
    mockGetMyCurrentProperties.mockImplementation(actual.getMyCurrentProperties);

    render(
      <MemoryRouter>
        <TenantRecommended />
      </MemoryRouter>
    );

    // The demo tenant (`mock-tenant-1`) has an active lease in
    // tenantLeases mock data, so the page should take the happy-path branch
    // and render the heading rather than the "No active lease" empty state.
    expect(
      screen.getByRole('heading', { level: 1, name: /recommended for you/i }),
      'page <h1> must mount so the route has a stable landmark for AT users'
    ).toBeInTheDocument();
  });

  it('renders the EmptyState when the tenant has no active lease', () => {
    mockGetMyCurrentProperties.mockReturnValue([]);

    render(
      <MemoryRouter>
        <TenantRecommended />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /no active lease/i }),
      'tenants without an active lease must see the empty-state copy, not a half-rendered recommendations page'
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: /recommended for you/i }),
      'happy-path heading must NOT mount when the empty-state branch fires — they are mutually exclusive renders'
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /browse properties/i }),
      'empty state must surface a CTA so the tenant has somewhere to go'
    ).toBeInTheDocument();
  });
});
