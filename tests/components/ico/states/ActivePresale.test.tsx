import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ActivePresale } from '@/pages/ico/components/states/ActivePresale';
import { ICO_CONFIG } from '@/constants/ico';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';

// Mock progress data for tests that need it
const mockProgress: ScheduleProgress = {
  priceUsd: 0.001,
  totalAllocation: 750000000,
  tokensSold: 100000000,
  tokensRemaining: 650000000,
  amountRaised: 100000,
  percentSold: 13.33,
};

// Mock usePurchaseFlow hook to avoid csprclick-ui dependency
vi.mock('@/hooks/ico/usePurchaseFlow', () => ({
  usePurchaseFlow: () => ({
    isConnected: false,
    account: null,
    connect: vi.fn(),
    balances: { cspr: 0, usdt: 0, usdc: 0, big: 0 },
    handlePurchase: vi.fn(),
    modalProps: null,
    toastProps: null,
  }),
}));

// Mock the child components to isolate testing
vi.mock('@/pages/ico/components/shared/CountdownTimer', () => ({
  CountdownTimer: ({ targetTimestamp }: { targetTimestamp: number }) => (
    <div data-testid="countdown-timer">Countdown: {targetTimestamp}</div>
  ),
  default: ({ targetTimestamp }: { targetTimestamp: number }) => (
    <div data-testid="countdown-timer">Countdown: {targetTimestamp}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/ProgressBar', () => ({
  ProgressBar: ({ label }: { label: string }) => (
    <div data-testid="progress-bar">{label}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/WalletCard', () => ({
  WalletCard: () => <div data-testid="wallet-card">Wallet Card</div>,
}));

vi.mock('@/pages/ico/components/shared/TransactionHistory', () => ({
  TransactionHistory: () => <div data-testid="transaction-history">Transaction History</div>,
  Transaction: {},
}));

vi.mock('@/pages/ico/components/shared/UserTokenBalance', () => ({
  UserTokenBalance: () => <div data-testid="user-token-balance">User Token Balance</div>,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ActivePresale', () => {
  const mockEndTimestamp = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days from now

  describe('rendering', () => {
    it('should render the component with title', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText(`${ICO_CONFIG.TOKEN.symbol} Token Presale`)).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Purchase BIG Tokens at Presale Rate')).toBeInTheDocument();
    });

    it('should render presale ends in label', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Presale ends in:')).toBeInTheDocument();
    });

    it('should render the countdown timer', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should render the progress bar when progress is provided', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} progress={mockProgress} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should not render progress bar when progress is not provided', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('should render the wallet card', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('wallet-card')).toBeInTheDocument();
    });

    it('should render the user token balance when progress is provided', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} progress={mockProgress} />);

      expect(screen.getByTestId('user-token-balance')).toBeInTheDocument();
    });

    it('should not render user token balance when progress is not provided', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.queryByTestId('user-token-balance')).not.toBeInTheDocument();
    });

    it('should render the transaction history', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });
  });

  describe('presale info display', () => {
    it('should display hard cap value', () => {
      renderWithRouter(<ActivePresale endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText(`Hard Cap: $${Number(ICO_CONFIG.PRE_SALE.hardCap).toLocaleString()}`)).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <ActivePresale endTimestamp={mockEndTimestamp} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
