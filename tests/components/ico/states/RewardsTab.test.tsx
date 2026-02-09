import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RewardsTab } from '@/pages/ico/components/states/RewardsTab';

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
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
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

  describe('transaction fee rewards chart', () => {
    it('should render Transaction Fee Rewards section', () => {
      renderWithRouter(<RewardsTab />);

      // "Transaction Fee Rewards" appears multiple times
      const elements = screen.getAllByText('Transaction Fee Rewards');
      expect(elements.length).toBeGreaterThan(0);
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

    it('should display Transaction Fee Rewards item', () => {
      renderWithRouter(<RewardsTab />);

      // "Transaction Fee Rewards" appears multiple times (as section title and list item)
      const transactionFeeRewards = screen.getAllByText('Transaction Fee Rewards');
      expect(transactionFeeRewards.length).toBeGreaterThan(0);
      expect(screen.getByText('Earn a share of 2% of LeaseFi transaction volume')).toBeInTheDocument();
    });

    it('should display Referral Bonuses item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Referral Bonuses')).toBeInTheDocument();
      expect(screen.getByText('Earn rewards for referring new users to the platform')).toBeInTheDocument();
    });

    it('should display Long-Term Holder Bonuses item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Long-Term Holder Bonuses')).toBeInTheDocument();
      expect(screen.getByText('Unlock additional rewards by holding BIG tokens long term')).toBeInTheDocument();
    });

    it('should display Partner Rewards item', () => {
      renderWithRouter(<RewardsTab />);

      expect(screen.getByText('Partner Rewards')).toBeInTheDocument();
      expect(screen.getByText('Earn from bringing new partners or businesses to LeaseFi')).toBeInTheDocument();
    });
  });
});
