import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TokenomicsTab } from '@/pages/ico/components/states/TokenomicsTab';

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
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('TokenomicsTab', () => {
  describe('rendering', () => {
    it('should render the Tokenomics title', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByTestId('subtitle')).toHaveTextContent('Tokenomics');
    });

    it('should render multiple cards', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
    });
  });

  describe('total supply', () => {
    it('should display Total Supply label', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Total Supply')).toBeInTheDocument();
    });

    it('should display total supply value', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('1,000,000,000 BIG')).toBeInTheDocument();
    });
  });

  describe('vesting & release schedule', () => {
    it('should render Vesting & Release Schedule section', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Vesting & Release Schedule')).toBeInTheDocument();
    });

    it('should render the area chart', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });

  describe('token allocation', () => {
    it('should render Token Allocation section', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Token Allocation')).toBeInTheDocument();
    });

    it('should render the pie chart', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should display Public Sale allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Public Sale')).toBeInTheDocument();
      // 20% appears for both Public Sale and Ecosystem & Rewards
      const twentyPercents = screen.getAllByText('20%');
      expect(twentyPercents.length).toBeGreaterThan(0);
    });

    it('should display Private Sale allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Private Sale')).toBeInTheDocument();
      // 15% appears for both Private Sale and Team & Advisors
      const fifteenPercents = screen.getAllByText('15%');
      expect(fifteenPercents.length).toBeGreaterThan(0);
    });

    it('should display Team & Advisors allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Team & Advisors')).toBeInTheDocument();
    });

    it('should display Ecosystem & Rewards allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Ecosystem & Rewards')).toBeInTheDocument();
    });

    it('should display Liquidity Pool allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Liquidity Pool')).toBeInTheDocument();
    });

    it('should display Reserve allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Reserve')).toBeInTheDocument();
    });

    it('should display Treasury allocation', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Treasury')).toBeInTheDocument();
    });
  });
});
