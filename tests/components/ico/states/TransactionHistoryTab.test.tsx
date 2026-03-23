import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mock at the API layer so useTokenTransactions runs for real ---

vi.mock('@/lib/api-client', () => ({
  backendClient: {
    get: vi.fn(),
  },
}));

vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    CASPER: { explorerUrl: 'https://explorer.example.com' },
    TOKEN: { decimals: 18 },
    CONTRACTS: {
      tokenAddress: 'hash-abc',
      icoPackageHash: 'hash-ico',
      icoAddress: '',
      treasuryAddress: '',
      usdcAddress: '',
      usdtAddress: '',
    },
    CURRENCY_RATES: { CSPR: 0.05, USDT: 1, USDC: 1 },
  },
  getCurrencyRateUsd: (currency: string) => {
    const rates: Record<string, number> = { CSPR: 0.05, USDT: 1, USDC: 1 };
    return rates[currency] ?? 1;
  },
}));

vi.mock('@/pages/ico/components/shared/SubTitle', () => ({
  SubTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/pages/ico/components/shared/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className ?? ''}>
      {children}
    </div>
  ),
}));

vi.mock('@/pages/ico/components/shared/TablePagination', () => ({
  TablePagination: ({ totalPages }: { totalPages: number; currentPage: number; onPageChange: (p: number) => void }) =>
    totalPages > 1 ? <div data-testid="table-pagination" /> : null,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
}));

import { backendClient } from '@/lib/api-client';
import { TransactionHistoryTab } from '@/pages/ico/components/states/TransactionHistoryTab';

const mockGet = vi.mocked(backendClient.get);

const emptyResponse = { item_count: 0, page_count: 0, data: [] };

const mockAction = {
  deploy_hash: 'abc123def456abc123def456abc12345',
  block_height: 1_000_000,
  timestamp: new Date(Date.now() - 60_000).toISOString(),
  amount: '1000000000000000000',
  contract_package_hash: 'abc123',
  from_hash: 'from-abc',
  from_type: 0,
  to_hash: 'to-xyz',
  to_type: 0,
  ft_action_type_id: 2,
  transform_idx: 0,
};

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('TransactionHistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(emptyResponse);
  });

  // --- Header ---

  describe('header', () => {
    it('should render Transaction History title', () => {
      renderWithQuery(<TransactionHistoryTab />);
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    it('should display total items count', async () => {
      mockGet.mockResolvedValue({ item_count: 42, page_count: 5, data: [] });
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.getByText('42 transactions')).toBeInTheDocument());
    });
  });

  // --- Loading state ---

  describe('loading state', () => {
    it('should render a spinning icon while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {})); // never resolves
      renderWithQuery(<TransactionHistoryTab />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not render the table while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderWithQuery(<TransactionHistoryTab />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  // --- Error state ---

  describe('error state', () => {
    it('should render error message when request fails', async () => {
      mockGet.mockRejectedValue(new Error('API error'));
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() =>
        expect(screen.getByText('Failed to load transactions')).toBeInTheDocument(),
      );
    });

    it('should render a "Try again" button in error state', async () => {
      mockGet.mockRejectedValue(new Error('API error'));
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.getByText('Try again')).toBeInTheDocument());
    });

    it('should call the API again when "Try again" is clicked', async () => {
      mockGet.mockRejectedValue(new Error('API error'));
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.getByText('Try again')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Try again'));
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });
  });

  // --- Empty state ---

  describe('empty state', () => {
    it('should render "No transactions found" when data is empty', async () => {
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() =>
        expect(screen.getByText('No transactions found')).toBeInTheDocument(),
      );
    });

    it('should not render table headers in empty state', async () => {
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.queryByText('Tx Hash')).not.toBeInTheDocument());
    });
  });

  // --- With data ---

  describe('with data', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({ item_count: 1, page_count: 1, data: [mockAction] });
    });

    it('should render table column headers', async () => {
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.getByText('Tx Hash')).toBeInTheDocument());
      expect(screen.getByText('Block')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should not render pagination when totalPages is 1', async () => {
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.getByText('Tx Hash')).toBeInTheDocument());
      expect(screen.queryByTestId('table-pagination')).not.toBeInTheDocument();
    });

    it('should render pagination when totalPages > 1', async () => {
      mockGet.mockResolvedValue({ item_count: 30, page_count: 3, data: [mockAction] });
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(screen.getByTestId('table-pagination')).toBeInTheDocument());
    });
  });

  // --- Refresh button ---

  describe('refresh button', () => {
    it('should call the API again when refresh button is clicked', async () => {
      renderWithQuery(<TransactionHistoryTab />);
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByTitle('Refresh'));
      await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    });
  });
});
