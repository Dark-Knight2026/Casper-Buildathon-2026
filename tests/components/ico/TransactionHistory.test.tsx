import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionHistory, Transaction } from '@/pages/ico/components/shared/TransactionHistory';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'purchase',
    amount: 1500,
    currency: 'USDC',
    tokensReceived: 1000000,
    tokenSymbol: 'BIG',
    status: 'completed',
    timestamp: new Date('2025-01-20T10:30:00'),
    txHash: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    id: '2',
    type: 'purchase',
    amount: 100,
    currency: 'USDT',
    tokensReceived: 66666,
    tokenSymbol: 'BIG',
    status: 'pending',
    timestamp: new Date('2025-01-15T14:20:00'),
    txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
  },
  {
    id: '3',
    type: 'claim',
    amount: 500,
    currency: 'USDC',
    tokensReceived: 333333,
    tokenSymbol: 'BIG',
    status: 'failed',
    timestamp: new Date('2025-01-10T09:15:00'),
  },
];

describe('TransactionHistory', () => {
  describe('rendering', () => {
    it('should render the title', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    it('should render all transactions', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      // Tokens are displayed with + prefix
      expect(screen.getByText('+1,000,000 BIG')).toBeInTheDocument();
      expect(screen.getByText('+66,666 BIG')).toBeInTheDocument();
      expect(screen.getByText('+333,333 BIG')).toBeInTheDocument();
    });

    it('should show empty state when no transactions', () => {
      render(<TransactionHistory transactions={[]} />);

      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });
  });

  describe('transaction details', () => {
    it('should display transaction type', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getAllByText('purchase')).toHaveLength(2);
      expect(screen.getByText('claim')).toBeInTheDocument();
    });

    it('should display transaction amounts', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getByText('1,500 USDC')).toBeInTheDocument();
      expect(screen.getByText('100 USDT')).toBeInTheDocument();
      expect(screen.getByText('500 USDC')).toBeInTheDocument();
    });

    it('should display tokens received with + prefix', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getByText('+1,000,000 BIG')).toBeInTheDocument();
      expect(screen.getByText('+66,666 BIG')).toBeInTheDocument();
      expect(screen.getByText('+333,333 BIG')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should display Completed status', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should display Pending status', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display Failed status', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('transaction hash', () => {
    it('should display truncated tx hash when present', () => {
      render(<TransactionHistory transactions={mockTransactions} />);

      // First tx hash: 0x1234...5678
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
      // Second tx hash: 0xabcd...ef12
      expect(screen.getByText('0xabcd...ef12')).toBeInTheDocument();
    });

    it('should not display hash when not provided', () => {
      // Third transaction has no hash
      render(<TransactionHistory transactions={[mockTransactions[2]]} />);

      // Should not have any truncated hash format
      expect(screen.queryByText(/0x.*\.\.\./)).not.toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(
        <TransactionHistory transactions={[]} className="my-custom-class" />
      );

      expect(container.firstElementChild?.className).toContain('my-custom-class');
    });
  });
});
