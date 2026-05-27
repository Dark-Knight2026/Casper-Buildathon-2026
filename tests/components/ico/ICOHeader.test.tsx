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

// ICOHeader uses useAuth() to compute role-aware back-link target
// and useToast() for the copy-address feedback toast.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: null, isAuthenticated: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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

    it('should display "Dashboard" subtitle', () => {
      render(<ICOHeader />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render logo image', () => {
      render(<ICOHeader />);

      const logo = screen.getByRole('button', { name: 'Return to dashboard overview' });
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
    it('should navigate to /big-token when logo is clicked', () => {
      render(<ICOHeader />);

      const logo = screen.getByRole('button', { name: 'Return to dashboard overview' });
      fireEvent.click(logo);

      expect(mockNavigate).toHaveBeenCalledWith('/big-token');
    });

    it('should have cursor-pointer on logo', () => {
      render(<ICOHeader />);

      const logo = screen.getByRole('button', { name: 'Return to dashboard overview' });
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
