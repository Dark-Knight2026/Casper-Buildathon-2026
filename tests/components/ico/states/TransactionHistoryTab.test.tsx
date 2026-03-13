import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// --- Mock useTokenTransactions BEFORE component import ---

const mockRefetch = vi.fn();
const mockUseTokenTransactions = vi.fn();

vi.mock('@/hooks/ico/useTokenTransactions', () => ({
  useTokenTransactions: (...args: unknown[]) => mockUseTokenTransactions(...args),
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

import { TransactionHistoryTab } from '@/pages/ico/components/states/TransactionHistoryTab';

const baseHookResult = {
  transactions: [],
  totalPages: 0,
  totalItems: 0,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

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
    vi.clearAllMocks();
    mockUseTokenTransactions.mockReturnValue(baseHookResult);
  });

  // --- Header ---

  describe('header', () => {
    it('should render Transaction History title', () => {
      render(<TransactionHistoryTab />);
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    it('should display total items count', () => {
      mockUseTokenTransactions.mockReturnValue({ ...baseHookResult, totalItems: 42 });
      render(<TransactionHistoryTab />);
      expect(screen.getByText('42 transactions')).toBeInTheDocument();
    });
  });

  // --- Loading state ---

  describe('loading state', () => {
    it('should render a spinning icon when isLoading is true', () => {
      mockUseTokenTransactions.mockReturnValue({ ...baseHookResult, isLoading: true });
      render(<TransactionHistoryTab />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render the table while loading', () => {
      mockUseTokenTransactions.mockReturnValue({ ...baseHookResult, isLoading: true });
      render(<TransactionHistoryTab />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  // --- Error state ---

  describe('error state', () => {
    it('should render error message when error is present', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...baseHookResult,
        error: new Error('API error'),
      });
      render(<TransactionHistoryTab />);

      expect(screen.getByText('Failed to load transactions')).toBeInTheDocument();
    });

    it('should render a "Try again" button in error state', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...baseHookResult,
        error: new Error('API error'),
      });
      render(<TransactionHistoryTab />);

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should call refetch when "Try again" is clicked', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...baseHookResult,
        error: new Error('API error'),
      });
      render(<TransactionHistoryTab />);

      fireEvent.click(screen.getByText('Try again'));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // --- Empty state ---

  describe('empty state', () => {
    it('should render "No transactions found" when actions is empty', () => {
      render(<TransactionHistoryTab />);
      expect(screen.getByText('No transactions found')).toBeInTheDocument();
    });

    it('should not render table headers in empty state', () => {
      render(<TransactionHistoryTab />);
      expect(screen.queryByText('Tx Hash')).not.toBeInTheDocument();
    });
  });

  // --- With data ---

  describe('with data', () => {
    beforeEach(() => {
      mockUseTokenTransactions.mockReturnValue({
        ...baseHookResult,
        transactions: [mockAction],
        totalPages: 1,
        totalItems: 1,
      });
    });

    it('should render table column headers', () => {
      render(<TransactionHistoryTab />);

      expect(screen.getByText('Tx Hash')).toBeInTheDocument();
      expect(screen.getByText('Block')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
    });

    it('should not render pagination when totalPages is 1', () => {
      render(<TransactionHistoryTab />);
      expect(screen.queryByTestId('table-pagination')).not.toBeInTheDocument();
    });

    it('should render pagination when totalPages > 1', () => {
      mockUseTokenTransactions.mockReturnValue({
        ...baseHookResult,
        transactions: [mockAction],
        totalPages: 3,
        totalItems: 30,
      });
      render(<TransactionHistoryTab />);
      expect(screen.getByTestId('table-pagination')).toBeInTheDocument();
    });
  });

  // --- Refresh button ---

  describe('refresh button', () => {
    it('should call refetch when refresh button is clicked', () => {
      render(<TransactionHistoryTab />);
      fireEvent.click(screen.getByTitle('Refresh'));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
