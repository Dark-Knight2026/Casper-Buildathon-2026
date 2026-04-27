import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TokenomicsTab } from '@/pages/ico/components/states/TokenomicsTab';

// ── HTTP boundary mock ────────────────────────────────────────────────────────
// Only the HTTP client is mocked — not the hooks that call it.
// useTokenSupply and useReleaseSchedule run their real logic and hit this boundary.
const mockGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  backendClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

// ── UI mocks (browser APIs unavailable in jsdom) ──────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TOKEN_SUPPLY = { circulatingSupply: 1_000_000_000, totalSupply: 5_000_000_000 };
const MOCK_RELEASE_SCHEDULE = { data: [{ month: '2025-01', released: 100_000 }] };

const renderWithRouter = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TokenomicsTab', () => {
  beforeEach(() => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/v1/vesting/token-supply') return Promise.resolve(MOCK_TOKEN_SUPPLY);
      if (url === '/api/v1/vesting/release-schedule') return Promise.resolve(MOCK_RELEASE_SCHEDULE);
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
    it('should display Total Supply label', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Total Supply')).toBeInTheDocument();
    });

    it('should display Total Supply value from API', async () => {
      renderWithRouter(<TokenomicsTab />);

      await waitFor(() =>
        expect(screen.getByText(/5[,.\s]?000[,.\s]?000[,.\s]?000.*BIG/)).toBeInTheDocument()
      );
    });

    it('should display Circulating Supply label', () => {
      renderWithRouter(<TokenomicsTab />);

      expect(screen.getByText('Circulating Supply')).toBeInTheDocument();
    });

    it('should display Circulating Supply value from API', async () => {
      renderWithRouter(<TokenomicsTab />);

      await waitFor(() =>
        expect(screen.getByText(/1[,.\s]?000[,.\s]?000[,.\s]?000.*BIG/)).toBeInTheDocument()
      );
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
