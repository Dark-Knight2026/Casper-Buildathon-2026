import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingHeader from '@/components/LandingHeader';

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
