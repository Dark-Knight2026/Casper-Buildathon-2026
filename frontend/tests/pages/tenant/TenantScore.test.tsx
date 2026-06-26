import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TenantScore from '@/pages/tenant/TenantScore';
import { setActiveScenario } from '@/data/tenantScore';

// useTenantScore reads from the module-level scenario selector — pin it so
// the page renders against a known seed instead of whatever the previous
// suite happened to leave behind.
beforeEach(() => {
  setActiveScenario('excellent');
});

describe('TenantScore page (smoke)', () => {
  it('renders the page heading and the score card together', () => {
    render(
      <MemoryRouter>
        <TenantScore />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /my tenant score/i }),
      'page <h1> must mount so the route has a stable landmark for AT users'
    ).toBeInTheDocument();

    // "How this is calculated" + "Recent activity" + "Tips to improve" cards
    // come from the page itself — pick one to confirm the page body rendered,
    // not just the header.
    expect(
      screen.getByText(/how this is calculated/i),
      'methodology card is part of the page shell — its absence means the body did not mount'
    ).toBeInTheDocument();
  });
});
