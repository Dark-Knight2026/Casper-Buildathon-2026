import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RewardsTab } from '@/pages/ico/components/states/RewardsTab';

vi.mock('@/hooks/ico/useRewardsHistory', () => ({
  useRewardsHistory: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/ico/useStakingInfo', () => ({
  useStakingInfo: () => ({ data: null, isLoading: false }),
}));

// Mock the child components
vi.mock('@/pages/ico/components/shared/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/SubTitle', () => ({
  SubTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="subtitle">{children}</h2>
  ),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartLegendContent: () => <div data-testid="chart-legend-content" />,
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

describe('RewardsTab', () => {
  describe('rendering', () => {
    it('should render the Staking title', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByTestId('subtitle')).toHaveTextContent('Staking');
    });

    it('should render multiple cards', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
    });
  });

  describe('staking info', () => {
    it('should render Staking section title', () => {
      renderWithRouter(<RewardsTab />);

      const stakingTitles = screen.getAllByText('Staking');
      expect(stakingTitles.length).toBeGreaterThan(0);
    });

    it('should display Staked Tokens', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Staked Tokens')).toBeInTheDocument();
      expect(screen.getByText('500,000 BIG')).toBeInTheDocument();
    });

    it('should display Current APY', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Current APY')).toBeInTheDocument();
      expect(screen.getByText('12.5%')).toBeInTheDocument();
    });

    it('should display Next Rewards', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Next Rewards')).toBeInTheDocument();
      expect(screen.getByText('2d 14h 32m')).toBeInTheDocument();
    });
  });

  describe('rewards chart', () => {
    it('should render Your Rewards section', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Your Rewards')).toBeInTheDocument();
    });

    it('should render the chart container', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('should render the area chart', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });

  describe('rewards list', () => {
    it('should render Rewards section title', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    it('should display Transaction Fee Distribution item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Transaction Fee Distribution')).toBeInTheDocument();
    });

    it('should display Staking Reserve Pool item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Staking Reserve Pool')).toBeInTheDocument();
    });

    it('should display Early Adopter Rewards item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Early Adopter Rewards')).toBeInTheDocument();
    });

    it('should display Realtor Performance Rewards item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Realtor Performance Rewards')).toBeInTheDocument();
    });

    it('should display Referral & Community Rewards item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Referral & Community Rewards')).toBeInTheDocument();
    });
  });
});
