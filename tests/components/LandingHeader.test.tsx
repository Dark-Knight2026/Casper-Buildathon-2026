import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingHeader from '@/components/LandingHeader';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderHeader() {
  return render(
    <MemoryRouter>
      <LandingHeader />
    </MemoryRouter>
  );
}

describe('LandingHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      renderHeader();
      expect(screen.getByText('LeaseFi')).toBeInTheDocument();
    });

    it('renders Sign In button', () => {
      renderHeader();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders Get Started button', () => {
      renderHeader();
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    });

    it('renders Properties nav link', () => {
      renderHeader();
      expect(screen.getByRole('link', { name: /properties/i })).toBeInTheDocument();
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
    it('Properties link points to /listings', () => {
      renderHeader();
      const link = screen.getByRole('link', { name: /properties/i });
      expect(link).toHaveAttribute('href', '/listings');
    });

    it('Token Sale link points to /ico', () => {
      renderHeader();
      const link = screen.getByRole('link', { name: /token sale/i });
      expect(link).toHaveAttribute('href', '/ico');
    });
  });

  describe('auth navigation', () => {
    it('Sign In navigates to /auth/login', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });

    it('Get Started navigates to /auth/register', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: /get started/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/auth/register');
    });
  });
});
