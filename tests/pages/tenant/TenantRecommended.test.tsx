import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TenantRecommended from '@/pages/tenant/TenantRecommended';

describe('TenantRecommended page (smoke)', () => {
  it('renders the page heading for the demo tenant', () => {
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
});
