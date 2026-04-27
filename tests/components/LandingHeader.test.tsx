import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingHeader from '@/components/LandingHeader';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn(() => ({ profile: null as { role?: string } | null }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
  describe('rendering', () => {
    it('renders without crashing', () => {
      renderHeader();
      expect(screen.getByText('LeaseFi')).toBeInTheDocument();
    });

    it('renders Sign In link', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders Get Started link', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
    });

    it('renders Properties nav button', () => {
      renderHeader();
      expect(screen.getByRole('button', { name: /properties/i })).toBeInTheDocument();
    });

    it('renders Token Sale nav link', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /token sale/i })).toBeInTheDocument();
    });
  });

  describe('logo link', () => {
    it('logo links to /', () => {
      renderHeader();
      const logo = screen.getByRole('link', { name: /leasefi/i });
      expect(logo).toHaveAttribute('href', '/');
    });
  });

  describe('nav links', () => {
    it('Properties navigates to /listings for non-tenant visitors', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: /properties/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/listings');
    });

    it('Properties navigates to /tenant/properties for tenant role', () => {
      mockUseAuth.mockReturnValue({ profile: { role: 'tenant' } });
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: /properties/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/tenant/properties');
    });

    it('Token Sale link points to /ico', () => {
      renderHeader();
      const link = screen.getByRole('link', { name: /token sale/i });
      expect(link).toHaveAttribute('href', '/ico');
    });
  });

  describe('auth links', () => {
    // Rendered as real <a href> so right-click "Open in new tab", middle-click,
    // and screen-reader "link" role all work — which onClick(navigate) would hide.
    it('Sign In link points to /auth/login', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login');
    });

    it('Get Started link points to /auth/register', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/auth/register');
    });
  });
});
