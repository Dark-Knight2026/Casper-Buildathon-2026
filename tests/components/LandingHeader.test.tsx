import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';

import { LandingHeader } from '@/components/LandingHeader';

const mockUseAuth = vi.fn(() => ({ profile: null as { role?: string } | null }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ profile: null });
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <LandingHeader />
    </MemoryRouter>
  );
}

describe('LandingHeader', () => {
  describe('rendering (guest)', () => {
    it('renders the brand', () => {
      renderHeader();
      expect(
        screen.getByText('LeaseFi'),
        'brand text "LeaseFi" should be visible'
      ).toBeInTheDocument();
    });

    it('renders Sign In link', () => {
      renderHeader();
      expect(
        screen.getByRole('link', { name: /sign in/i }),
        'guest header should expose the Sign In CTA'
      ).toBeInTheDocument();
    });

    it('renders Get Started link', () => {
      renderHeader();
      expect(
        screen.getByRole('link', { name: /get started/i }),
        'guest header should expose the Get Started CTA'
      ).toBeInTheDocument();
    });

    it('renders Properties nav link', () => {
      renderHeader();
      expect(
        screen.getByRole('link', { name: /properties/i }),
        'Properties nav link should be rendered'
      ).toBeInTheDocument();
    });

    it('renders BIG Token nav link', () => {
      renderHeader();
      expect(
        screen.getByRole('link', { name: /big token/i }),
        'BIG Token nav link should be rendered'
      ).toBeInTheDocument();
    });
  });

  describe('logo link', () => {
    it('logo links to /', () => {
      renderHeader();
      const logo = screen.getByRole('link', { name: /leasefi/i });
      expect(logo, 'brand logo should link to root "/"').toHaveAttribute('href', '/');
    });
  });

  describe('a11y landmarks', () => {
    it('exposes the nav as "Main navigation" landmark', () => {
      renderHeader();
      expect(
        screen.getByRole('navigation', { name: /main navigation/i }),
        '<nav> should expose aria-label="Main navigation" so multiple nav landmarks stay distinguishable'
      ).toBeInTheDocument();
    });
  });

  describe('nav links', () => {
    it('Properties link points to /properties', () => {
      renderHeader();
      const link = screen.getByRole('link', { name: /properties/i });
      expect(link, 'Properties nav should link to /properties').toHaveAttribute(
        'href',
        '/properties'
      );
    });

    it('BIG Token link points to /big-token', () => {
      renderHeader();
      const link = screen.getByRole('link', { name: /big token/i });
      expect(link, 'BIG Token nav should link to /big-token').toHaveAttribute('href', '/big-token');
    });

    it('Help link points to /help', () => {
      renderHeader();
      const link = screen.getByRole('link', { name: /^help$/i });
      expect(
        link,
        'Help nav should link to /help so the public header can reach the onboarding hub'
      ).toHaveAttribute('href', '/help');
    });
  });

  describe('auth links (guest)', () => {
    // Rendered as real <a href> so right-click "Open in new tab", middle-click,
    // and screen-reader "link" role all work — which onClick(navigate) would hide.
    it('Sign In link points to /auth/login', () => {
      renderHeader();
      expect(
        screen.getByRole('link', { name: /sign in/i }),
        'Sign In CTA should link to /auth/login'
      ).toHaveAttribute('href', '/auth/login');
    });

    it('Get Started link points to /auth/register', () => {
      renderHeader();
      expect(
        screen.getByRole('link', { name: /get started/i }),
        'Get Started CTA should link to /auth/register'
      ).toHaveAttribute('href', '/auth/register');
    });
  });

  describe('authenticated user', () => {
    it('shows Dashboard link routed to /tenant/dashboard for tenant role', () => {
      mockUseAuth.mockReturnValue({ profile: { role: 'tenant' } });
      renderHeader();
      const dashboard = screen.getByRole('link', { name: /dashboard/i });
      expect(
        dashboard,
        'tenant Dashboard link should target /tenant/dashboard'
      ).toHaveAttribute('href', '/tenant/dashboard');
    });

    it('shows Dashboard link routed to /landlord/dashboard for landlord role', () => {
      mockUseAuth.mockReturnValue({ profile: { role: 'landlord' } });
      renderHeader();
      const dashboard = screen.getByRole('link', { name: /dashboard/i });
      expect(
        dashboard,
        'landlord Dashboard link should target /landlord/dashboard'
      ).toHaveAttribute('href', '/landlord/dashboard');
    });

    it('hides Sign In / Get Started CTAs when authenticated', () => {
      mockUseAuth.mockReturnValue({ profile: { role: 'tenant' } });
      renderHeader();
      expect(
        screen.queryByRole('link', { name: /sign in/i }),
        'Sign In CTA must not render for authenticated users'
      ).toBeNull();
      expect(
        screen.queryByRole('link', { name: /get started/i }),
        'Get Started CTA must not render for authenticated users'
      ).toBeNull();
    });
  });
});
