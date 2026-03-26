import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetch = vi.fn();

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

import { TransactionHistoryTab } from '@/pages/ico/components/states/TransactionHistoryTab';

// --- Helpers ---

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function renderTab() {
  return render(<TransactionHistoryTab />, { wrapper: makeWrapper() });
}

function mockOkResponse(data: object[] = [], itemCount = data.length, pageCount = 1) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ item_count: itemCount, page_count: pageCount, data }),
  });
}

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

describe('TransactionHistoryTab', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Header ---

  describe('header', () => {
    it('should render Transaction History title', () => {
      mockOkResponse();
      renderTab();
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    it('should display total items count', async () => {
      mockOkResponse([], 42);
      renderTab();
      await waitFor(() => expect(screen.getByText('42 transactions')).toBeInTheDocument());
    });
  });

  // --- Loading state ---

  describe('loading state', () => {
    it('should render a spinning icon when isLoading is true', () => {
      // Never resolves — keeps the query in loading state
      mockFetch.mockReturnValueOnce(new Promise(() => {}));
      renderTab();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render the table while loading', () => {
      mockFetch.mockReturnValueOnce(new Promise(() => {}));
      renderTab();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  // --- Error state ---

  describe('error state', () => {
    it('should render error message when fetch returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      renderTab();
      await waitFor(() =>
        expect(screen.getByText('Failed to load transactions')).toBeInTheDocument()
      );
    });

    it('should render a "Try again" button in error state', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      renderTab();
      await waitFor(() => expect(screen.getByText('Try again')).toBeInTheDocument());
    });

    it('should trigger a new fetch when "Try again" is clicked', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      renderTab();
      await waitFor(() => expect(screen.getByText('Try again')).toBeInTheDocument());
      fireEvent.click(screen.getByText('Try again'));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });
  });

  // --- Empty state ---

  describe('empty state', () => {
    it('should render "No transactions found" when actions is empty', async () => {
      mockOkResponse([]);
      renderTab();
      await waitFor(() =>
        expect(screen.getByText('No transactions found')).toBeInTheDocument()
      );
    });

    it('should not render table headers in empty state', async () => {
      mockOkResponse([]);
      renderTab();
      await waitFor(() => expect(screen.getByText('No transactions found')).toBeInTheDocument());
      expect(screen.queryByText('Tx Hash')).not.toBeInTheDocument();
    });
  });

  // --- With data ---

  describe('with data', () => {
    it('should render table column headers', async () => {
      mockOkResponse([mockAction], 1, 1);
      renderTab();
      await waitFor(() => expect(screen.getByText('Tx Hash')).toBeInTheDocument());
      expect(screen.getByText('Block')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should not render pagination when totalPages is 1', async () => {
      mockOkResponse([mockAction], 1, 1);
      renderTab();
      await waitFor(() => expect(screen.getByText('Tx Hash')).toBeInTheDocument());
      expect(screen.queryByTestId('table-pagination')).not.toBeInTheDocument();
    });

    it('should render pagination when totalPages > 1', async () => {
      mockOkResponse([mockAction], 30, 3);
      renderTab();
      await waitFor(() => expect(screen.getByTestId('table-pagination')).toBeInTheDocument());
    });
  });

  // --- Refresh button ---

  describe('refresh button', () => {
    it('should trigger a new fetch when refresh button is clicked', async () => {
      mockOkResponse();
      mockOkResponse();
      renderTab();
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('button', { name: 'Refresh transactions' }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });
  });
});
