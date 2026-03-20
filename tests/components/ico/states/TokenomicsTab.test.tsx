import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenomicsTab } from '@/pages/ico/components/states/TokenomicsTab';

vi.mock('@/hooks/ico/useReleaseSchedule', () => ({
  useReleaseSchedule: () => ({ data: null, isLoading: false }),
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
}));

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
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

  describe('supply stats', () => {
    it('should display Total Supply', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Total Supply')).toBeInTheDocument();
      expect(screen.getByText('5 000 000 000 BIG')).toBeInTheDocument();
    });

    it('should display Circulating Supply', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Circulating Supply')).toBeInTheDocument();
      expect(screen.getByText('1 000 000 000 BIG')).toBeInTheDocument();
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

    it('should render the bar chart', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should display Circulating vs Locked legend', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Circulating')).toBeInTheDocument();
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('should render 6 allocation cells in bar chart', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getAllByTestId('cell')).toHaveLength(6);
    });
  });
});
