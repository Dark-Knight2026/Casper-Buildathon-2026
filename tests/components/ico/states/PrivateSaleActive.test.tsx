import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { PrivateSaleActive } from '@/pages/ico/components/states/PrivateSaleActive';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';
import { usePurchaseFlow } from '@/hooks/ico/usePurchaseFlow';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import { useICOProgress } from '@/hooks/ico/useICOProgress';
import { useICOBalance } from '@/hooks/ico/useICOBalance';
import { useVestingSchedules } from '@/hooks/ico/useVestingSchedules';

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

// ── HTTP boundary mock ────────────────────────────────────────────────────────
// Mocking at the fetch client level keeps react-query and all hooks running
// their real logic. With accountHash=null all guarded queries are disabled
// (enabled: !!accountHash) so mockGet is a safety net only.
const mockGet = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

// useICOProgress, useICOBalance, useVestingSchedules — vi.fn() so withData
// tests can inject fixture data synchronously without async React Query fetches.
// This avoids interactions between vi.useFakeTimers() and waitFor().
vi.mock('@/hooks/ico/useICOProgress', () => ({
  useICOProgress: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/hooks/ico/useICOBalance', () => ({
  useICOBalance: vi.fn(() => ({ data: undefined })),
}));
vi.mock('@/hooks/ico/useVestingSchedules', () => ({
  useVestingSchedules: vi.fn(() => ({ data: undefined })),
}));

// Mock useUserTokenActions
vi.mock('@/hooks/ico/useUserTokenActions', () => ({
  useUserTokenActions: () => ({ transactions: [] }),
}));

// blockchain utils — vi.fn() so withData tests can inject a real accountHash
vi.mock('@/lib/blockchain/accountUtils', () => ({
  deriveAccountHash: vi.fn(() => null),
  stripAccountHashPrefix: (addr: string) => addr.replace(/^account-hash-/, ''),
}));

// usePurchaseFlow — vi.fn() so withData tests can simulate a connected wallet.
// Cannot use the real implementation: it depends on useClickRef() from
// @make-software/csprclick-ui which throws outside CsprClickProvider.
vi.mock('@/hooks/ico/usePurchaseFlow', () => ({
  usePurchaseFlow: vi.fn(),
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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

const disconnectedPurchaseFlow = {
  isConnected: false,
  account: null,
  connect: vi.fn(),
  clickRef: null as never,
  balances: { cspr: 0, usdt: 0, usdc: 0, big: 0 },
  balanceError: null,
  balancesLoading: false,
  csprPriceUsd: 0,
  csprPriceStale: false,
  handlePurchase: vi.fn(),
  modalProps: null,
  toastProps: null,
  buyCspr: vi.fn(),
};

describe('PrivateSaleActive', () => {
  let mockEndTimestamp: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    mockEndTimestamp = Date.now() + 14 * 24 * 60 * 60 * 1000;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response));
    // Defaults for vi.fn() mocks — overridden per-test in withData describe
    vi.mocked(usePurchaseFlow).mockReturnValue(disconnectedPurchaseFlow as never);
    vi.mocked(useICOProgress).mockReturnValue({ data: undefined } as never);
    vi.mocked(useICOBalance).mockReturnValue({ data: undefined } as never);
    vi.mocked(useVestingSchedules).mockReturnValue({ data: undefined } as never);
    vi.mocked(deriveAccountHash).mockReturnValue(null as never);
    mockGet.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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

  describe('with connected wallet and data', () => {
    const ACCOUNT_HASH = 'account-hash-deadbeef0011';
    const now = new Date('2025-06-01T12:00:00Z').getTime();
    const futureUnlock = now + 30 * 24 * 60 * 60 * 1000;
    const vestingEnd = now + 90 * 24 * 60 * 60 * 1000;

    beforeEach(() => {
      // Keep fake timers active (set to 2025-06-01 by outer beforeEach) so that
      // VestingProgressBlock treats futureUnlock (2025-07-01) as a future date.
      vi.mocked(usePurchaseFlow).mockReturnValue({
        isConnected: true,
        account: { publicKey: '02deadbeef0011' } as never,
        connect: vi.fn(),
        clickRef: null as never,
        balances: { cspr: 100, usdt: 500, usdc: 0, big: 0 },
        balanceError: null,
        balancesLoading: false,
        csprPriceUsd: 0.05,
        csprPriceStale: false,
        handlePurchase: vi.fn(),
        modalProps: null,
        toastProps: null,
        buyCspr: vi.fn(),
      } as never);

      vi.mocked(deriveAccountHash).mockReturnValue(ACCOUNT_HASH as never);

      vi.mocked(useICOProgress).mockReturnValue({
        data: {
          tokensSold: '100000000000000000000000000',
          totalAllocation: '750000000000000000000000000',
          tokensRemaining: '650000000000000000000000000',
          amountRaised: 100000,
          hardCapUsd: 750000,
          priceUsd: 0.001,
          percentSold: 13.33,
        },
      } as never);

      // Inject balance and vesting data synchronously so fake timers don't interfere
      vi.mocked(useICOBalance).mockReturnValue({
        data: {
          tokensPurchased: '10000000000000000000000',
          currentValue: 10,
        },
      } as never);

      vi.mocked(useVestingSchedules).mockReturnValue({
        data: {
          data: [{
            id: '1',
            lockedAmount: 10000,
            purchaseTimestamp: now - 10 * 24 * 60 * 60 * 1000,
            unlockTimestamp: futureUnlock,
            unlockedAmount: 0,
            vestingEndTimestamp: vestingEnd,
          }],
        },
      } as never);
    });

    it('shows UserTokenBalance when icoBalance has purchased tokens', () => {
      renderWithRouter(
        <PrivateSaleActive endTimestamp={mockEndTimestamp} />,
      );
      expect(screen.getByTestId('user-token-balance')).toBeInTheDocument();
    });

    it('shows VestingProgressBlock locked entry when vesting schedules exist', () => {
      renderWithRouter(
        <PrivateSaleActive endTimestamp={mockEndTimestamp} />,
      );
      expect(screen.getByText('Locked Tokens (1 entry)')).toBeInTheDocument();
    });

    it('shows progress bar from live ICO progress data', () => {
      renderWithRouter(
        <PrivateSaleActive endTimestamp={mockEndTimestamp} />,
      );
      expect(screen.getAllByTestId('progress-bar').length).toBeGreaterThan(0);
    });
  });
});
