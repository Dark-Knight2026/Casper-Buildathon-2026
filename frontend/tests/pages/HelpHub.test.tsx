import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// LandingHeader pulls in useAuth; HelpHub itself does not — stub useAuth so
// the page-level smoke tests don't need a real AuthProvider in scope.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: null }),
}));

import HelpHub from '@/pages/HelpHub';

function renderHub() {
  return render(
    <MemoryRouter>
      <HelpHub />
    </MemoryRouter>
  );
}

describe('HelpHub', () => {
  it('renders the page heading', () => {
    renderHub();
    expect(
      screen.getByRole('heading', { name: /get started with leasefi/i, level: 1 }),
      'top-level H1 must announce the page purpose for screen readers'
    ).toBeInTheDocument();
  });

  describe('account cards', () => {
    it('landlord card deep-links to /auth/register?role=landlord', () => {
      renderHub();
      const link = screen.getByRole('link', { name: /create landlord account/i });
      expect(
        link,
        'landlord card must carry the deep-link Register reads to pre-select role'
      ).toHaveAttribute('href', '/auth/register?role=landlord');
    });

    it('tenant card deep-links to /auth/register?role=tenant', () => {
      renderHub();
      const link = screen.getByRole('link', { name: /create tenant account/i });
      expect(link, 'tenant card must carry the matching deep-link').toHaveAttribute(
        'href',
        '/auth/register?role=tenant'
      );
    });

    it('property manager card is rendered as disabled with a "Coming soon" badge', () => {
      renderHub();
      // Disabled card has no link/button role; locate via title text and assert state.
      expect(
        screen.getByText(/create property manager account/i).closest('[aria-disabled="true"]'),
        'property-manager flow is not ready and must not be clickable'
      ).not.toBeNull();
      expect(
        screen.getByText(/coming soon/i),
        'badge must signal the unreleased state of the property-manager flow'
      ).toBeInTheDocument();
    });
  });

  describe('action cards', () => {
    it('"List a property" links to /landlord/properties/create', () => {
      renderHub();
      expect(
        screen.getByRole('link', { name: /list a property/i }),
        'help-hub shortcut must take landlords straight to the create flow'
      ).toHaveAttribute('href', '/landlord/properties/create');
    });

    it('"Look for a property" links to /listings', () => {
      renderHub();
      expect(
        screen.getByRole('link', { name: /look for a property/i }),
        'browse shortcut must reach the public listings page'
      ).toHaveAttribute('href', '/listings');
    });
  });

  describe('FAQ', () => {
    it('renders FAQ questions as accordion triggers', () => {
      renderHub();
      // Sanity check: at least the first canonical question is present and
      // exposed via the accordion's button role.
      expect(
        screen.getByRole('button', { name: /do i need a crypto wallet/i }),
        'FAQ accordion must expose each question as a toggleable button'
      ).toBeInTheDocument();
    });
  });

  describe('support contact', () => {
    it('renders a mailto link using the configured support email (or fallback)', () => {
      renderHub();
      const link = screen.getByRole('link', { name: /support@/i });
      expect(
        link.getAttribute('href'),
        'support contact must be a mailto: so the default mail client opens'
      ).toMatch(/^mailto:.+@.+/);
    });
  });
});
