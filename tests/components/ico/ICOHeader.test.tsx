import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ICOHeader } from '@/pages/ico/components/ICOHeader';
import { ICO_CONFIG } from '@/constants/ico';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useICOWallet hook to avoid csprclick-ui dependency
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
vi.mock('@/hooks/ico/useICOWallet', () => ({
  useICOWallet: () => ({
    isConnected: false,
    account: null,
    isConnecting: false,
    connect: mockConnect,
    disconnect: mockDisconnect,
    error: null,
    clickRef: null,
  }),
}));

describe('ICOHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render header element', () => {
      render(<ICOHeader />);

      expect(document.querySelector('header')).toBeInTheDocument();
    });

    it('should display token name', () => {
      render(<ICOHeader />);

      expect(screen.getByText(ICO_CONFIG.TOKEN.name)).toBeInTheDocument();
    });

    it('should display token symbol with "Token Sale"', () => {
      render(<ICOHeader />);

      expect(screen.getByText(`${ICO_CONFIG.TOKEN.symbol} Token Sale`)).toBeInTheDocument();
    });

    it('should render logo image', () => {
      render(<ICOHeader />);

      const logo = screen.getByRole('button', { name: 'Return to ICO overview' });
      const img = logo.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/BIGLogoWB.png');
    });
  });

  describe('connect wallet button', () => {
    it('should render Connect Wallet button', () => {
      render(<ICOHeader />);

      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('should be clickable', () => {
      render(<ICOHeader />);

      const button = screen.getByText('Connect Wallet');
      expect(button.closest('button')).not.toBeDisabled();
    });
  });

  describe('navigation', () => {
    it('should navigate to /ico when logo is clicked', () => {
      render(<ICOHeader />);

      const logo = screen.getByRole('button', { name: 'Return to ICO overview' });
      fireEvent.click(logo);

      expect(mockNavigate).toHaveBeenCalledWith('/ico');
    });

    it('should have cursor-pointer on logo', () => {
      render(<ICOHeader />);

      const logo = screen.getByRole('button', { name: 'Return to ICO overview' });
      expect(logo.className).toContain('cursor-pointer');
    });
  });

  describe('layout', () => {
    it('should have container class', () => {
      const { container } = render(<ICOHeader />);

      expect(container.querySelector('.container')).toBeInTheDocument();
    });

    it('should have flex layout', () => {
      const { container } = render(<ICOHeader />);

      expect(container.querySelector('.flex')).toBeInTheDocument();
    });
  });
});
