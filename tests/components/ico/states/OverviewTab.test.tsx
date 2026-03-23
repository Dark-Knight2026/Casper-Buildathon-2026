import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverviewTab } from '@/pages/ico/components/states/OverviewTab';

vi.mock('@/hooks/ico/useStakingPortfolio', () => ({
  useStakingPortfolio: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/ico/useStakingEarnings', () => ({
  useStakingEarnings: () => ({
    data: {
      earnings: [
        { date: '2024-01-01', amount: 10 },
        { date: '2024-01-02', amount: 20 },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/ico/useStakingInfo', () => ({
  useStakingInfo: () => ({ data: null, isLoading: false }),
}));

// Mock wallet and transaction hooks
vi.mock('@/hooks/ico/useICOWallet', () => ({
  useICOWallet: () => ({ account: null, isConnected: false }),
}));

vi.mock('@/hooks/ico/useUserTokenActions', () => ({
  useUserTokenActions: () => ({ transactions: [] }),
}));

vi.mock('@/hooks/ico/useAccountTransactions', () => ({
  useAccountTransactions: () => ({ transactions: [], totalPages: 0, totalItems: 0, isLoading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('@/lib/blockchain/accountUtils', () => ({
  deriveAccountHash: () => null,
}));

// Mock the child components
vi.mock('@/pages/ico/components/shared/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/TransactionHistory', () => ({
  TransactionHistory: () => <div data-testid="transaction-history">Transaction History</div>,
  ICOTransaction: {},
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}));

vi.mock('@/pages/ico/components/shared/EarningsChart', () => ({
  EarningsChart: ({ className }: { className?: string }) => (
    <div data-testid="chart-container" className={className}>
      <h3>Earnings Overview</h3>
    </div>
  ),
}));

vi.mock('@/hooks/ico/useICOWallet', () => ({
  useICOWallet: () => ({
    isConnected: false,
    account: null,
    isConnecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    error: null,
    clickRef: null,
  }),
}));

vi.mock('@/hooks/ico/useUserTokenActions', () => ({
  useUserTokenActions: () => ({
    transactions: [],
  }),
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('OverviewTab', () => {
  describe('rendering', () => {
    it('should render the component', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
    });
  });

  describe('dashboard cards', () => {
    it('should render BIG Balance card', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('BIG Balance')).toBeInTheDocument();
    });

    it('should render BIG Staked card', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('BIG Staked')).toBeInTheDocument();
    });

    it('should render Rewards Earned card', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Rewards Earned')).toBeInTheDocument();
    });

    it('should render BIG Value card', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('BIG Value')).toBeInTheDocument();
    });
  });

  describe('staking info', () => {
    it('should render Staking Info section', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Staking Info')).toBeInTheDocument();
    });

    it('should display Next Rewards', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Next Rewards')).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should display Current APY', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Current APY')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('earnings overview', () => {
    it('should render Earnings Overview section', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Earnings Overview')).toBeInTheDocument();
    });

    it('should render the chart container', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });

  describe('portfolio value', () => {
    it('should render Estimated Portfolio Value section', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Estimated Portfolio Value')).toBeInTheDocument();
    });

    it('should display portfolio value', () => {
      renderWithRouter(<OverviewTab />);

      // $0.00 when no portfolio data
      const values = screen.getAllByText('$0.00');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should display 24h change', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('0% (24h)')).toBeInTheDocument();
    });

    it('should display portfolio description', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Current USD value of your holdings')).toBeInTheDocument();
    });
  });

  describe('transaction history', () => {
    it('should render the transaction history', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });
  });
});
