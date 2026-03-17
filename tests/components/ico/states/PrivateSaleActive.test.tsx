import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PrivateSaleActive } from '@/pages/ico/components/states/PrivateSaleActive';
import { ICO_CONFIG } from '@/constants/ico';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';

// Mock progress data for tests that need it
const mockProgress: ScheduleProgress = {
  priceUsd: 0.001,
  totalAllocation: 750000000,
  tokensSold: 100000000,
  tokensRemaining: 650000000,
  amountRaised: 100000,
  hardCapUsd: 750000,
  percentSold: 13.33,
};

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  };
});

// Mock useICOProgress
vi.mock('@/hooks/ico/useICOProgress', () => ({
  useICOProgress: () => ({ data: undefined }),
}));

// Mock useICOBalance
vi.mock('@/hooks/ico/useICOBalance', () => ({
  useICOBalance: () => ({ data: undefined }),
}));

// Mock useUserTokenActions
vi.mock('@/hooks/ico/useUserTokenActions', () => ({
  useUserTokenActions: () => ({ transactions: [] }),
}));

// Mock deriveAccountHash
vi.mock('@/lib/blockchain/accountUtils', () => ({
  deriveAccountHash: () => null,
}));

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
    purchaseState: { step: 'idle', isProcessing: false, purchaseTxHash: null, tokensReceived: null, error: null },
    pendingPurchase: null,
    buyCspr: vi.fn(),
    showConfirmModal: false,
    showToast: false,
    handleCloseModal: vi.fn(),
    handleCloseToast: vi.fn(),
    csprPriceUsd: 0,
  }),
}));

// Mock useUserTokenActions to avoid QueryClientProvider dependency
vi.mock('@/hooks/ico/useUserTokenActions', () => ({
  useUserTokenActions: () => ({ transactions: [] }),
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
}));

vi.mock('@/pages/ico/components/shared/UserTokenBalance', () => ({
  UserTokenBalance: () => <div data-testid="user-token-balance">User Token Balance</div>,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('PrivateSaleActive', () => {
  let mockEndTimestamp: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    mockEndTimestamp = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days from fixed base
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the component with title', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('BIG Private Sale')).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Purchase BIG Tokens at Private Sale Rate')).toBeInTheDocument();
    });

    it('should render private sale ends in label', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Private Sale ends in:')).toBeInTheDocument();
    });

    it('should render the countdown timer', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should render the progress bar when progress is provided', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} progress={mockProgress} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should not render progress bar when progress is not provided', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('should render the wallet card', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('wallet-card')).toBeInTheDocument();
    });

    it('should not render user token balance when no completed purchases', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} progress={mockProgress} />);

      expect(screen.queryByTestId('user-token-balance')).not.toBeInTheDocument();
    });

    it('should render the transaction history', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });
  });

  describe('private sale info display', () => {
    it('should display hard cap value when progress is provided', () => {
      renderWithRouter(<PrivateSaleActive endTimestamp={mockEndTimestamp} progress={mockProgress} />);

      expect(screen.getByText(`Hard Cap: $${Math.round(mockProgress.hardCapUsd).toLocaleString()}`)).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <PrivateSaleActive endTimestamp={mockEndTimestamp} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
