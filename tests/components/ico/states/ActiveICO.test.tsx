import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ActiveICO } from '@/pages/ico/components/states/ActiveICO';
import { ICO_CONFIG } from '@/constants/ico';

// Mock the child components to isolate testing
vi.mock('@/pages/ico/components/shared/CountdownTimer', () => ({
  CountdownTimer: ({ targetTimestamp }: { targetTimestamp: number }) => (
    <div data-testid="countdown-timer">Countdown: {targetTimestamp}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/ProgressBar', () => ({
  ProgressBar: ({ label }: { label: string }) => (
    <div data-testid="progress-bar">{label}</div>
  ),
}));

vi.mock('@/pages/ico/components/shared/WalletCard', () => ({
  WalletCard: () => <div data-testid="wallet-card">Wallet Card</div>,
}));

vi.mock('@/pages/ico/components/shared/TransactionHistory', () => ({
  TransactionHistory: () => <div data-testid="transaction-history">Transaction History</div>,
  Transaction: {},
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ActiveICO', () => {
  const mockEndTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

  describe('rendering', () => {
    it('should render the component with title', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText(`${ICO_CONFIG.TOKEN.symbol} Active ICO`)).toBeInTheDocument();
    });

    it('should render the live token price card', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Live Token Price')).toBeInTheDocument();
      expect(screen.getByText(`$${ICO_CONFIG.PUBLIC_ICO.price}`)).toBeInTheDocument();
    });

    it('should render the allocation remaining card', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Allocation Remaining')).toBeInTheDocument();
    });

    it('should render the time remaining section', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Time Remaining')).toBeInTheDocument();
      expect(screen.getByText('until ICO ends')).toBeInTheDocument();
    });

    it('should render the countdown timer', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('countdown-timer')).toBeInTheDocument();
    });

    it('should render the progress bar', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByText('ICO Progress')).toBeInTheDocument();
    });

    it('should render the trading restricted warning banner', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('Trading Restricted')).toBeInTheDocument();
      expect(screen.getByText(/Token sales are disabled during the Active ICO period/)).toBeInTheDocument();
    });

    it('should render the wallet card', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('wallet-card')).toBeInTheDocument();
    });

    it('should render the transaction history', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });

    it('should render the ICO end conditions info card', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText('ICO End Conditions')).toBeInTheDocument();
      expect(screen.getByText(/The ICO will end when the countdown timer reaches zero/)).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    it('should display token symbol correctly', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      expect(screen.getByText(`per ${ICO_CONFIG.TOKEN.symbol}`)).toBeInTheDocument();
    });

    it('should display allocation info', () => {
      renderWithRouter(<ActiveICO endTimestamp={mockEndTimestamp} />);

      // Allocation values shown in stats cards
      expect(screen.getByText(/of .+M BIG/)).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = renderWithRouter(
        <ActiveICO endTimestamp={mockEndTimestamp} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
