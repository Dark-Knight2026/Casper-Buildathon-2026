import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { OverviewTab } from '@/pages/ico/components/states/OverviewTab';

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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
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
      expect(screen.getByText('2d 14h 32m')).toBeInTheDocument();
    });

    it('should display Current APY', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('Current APY')).toBeInTheDocument();
      expect(screen.getByText('12.5%')).toBeInTheDocument();
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

      // $858.25 appears multiple times (portfolio value and BIG Value card)
      const values = screen.getAllByText('$858.25');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should display 24h change', () => {
      renderWithRouter(<OverviewTab />);

      expect(screen.getByText('+2.4% (24h)')).toBeInTheDocument();
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
