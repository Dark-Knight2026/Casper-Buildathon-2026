import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletCard } from '@/pages/ico/components/shared/WalletCard';
import type { PaymentCurrency } from '@/types/ico';

// Mock CurrencySelector to avoid Radix UI Select complexity
vi.mock('@/pages/ico/components/shared/CurrencySelector', () => ({
  CurrencySelector: ({
    value,
    onValueChange,
    disabled,
  }: {
    value: PaymentCurrency;
    onValueChange: (v: PaymentCurrency) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="currency-selector"
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange(e.target.value as PaymentCurrency)}
    >
      <option value="USDT">USDT</option>
      <option value="USDC">USDC</option>
      <option value="CSPR">CSPR</option>
    </select>
  ),
}));

const connectedProps = {
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  balanceUSDT: 5000,
  balanceUSDC: 3000,
  balanceCSPR: 100000,
  tokenPrice: 0.001,
  tokenSymbol: 'BIG',
  onConnect: vi.fn(),
  onPurchase: vi.fn(),
};

const disconnectedProps = {
  tokenPrice: 0.001,
  tokenSymbol: 'BIG',
  onConnect: vi.fn(),
  onPurchase: vi.fn(),
};

describe('WalletCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Disconnected state ---

  describe('disconnected state', () => {
    it('should show "Wallet" label when not connected', () => {
      render(<WalletCard {...disconnectedProps} />);

      expect(screen.getByText('Wallet')).toBeInTheDocument();
      expect(screen.queryByText('Connected Wallet')).not.toBeInTheDocument();
    });

    it('should show "Connect Wallet" link button', () => {
      render(<WalletCard {...disconnectedProps} />);

      expect(screen.getByText('Connect Wallet', { selector: 'button' })).toBeInTheDocument();
    });

    it('should call onConnect when "Connect Wallet" is clicked', () => {
      const onConnect = vi.fn();
      render(<WalletCard {...disconnectedProps} onConnect={onConnect} />);

      fireEvent.click(screen.getByText('Connect Wallet', { selector: 'button' }));

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('should not show balances when disconnected', () => {
      render(<WalletCard {...disconnectedProps} />);

      expect(screen.queryByText('Your Balance')).not.toBeInTheDocument();
    });

    it('should disable the amount input when disconnected', () => {
      render(<WalletCard {...disconnectedProps} />);

      expect(screen.getByPlaceholderText('0.00')).toBeDisabled();
    });

    it('should show "Connect Wallet" as main button text', () => {
      render(<WalletCard {...disconnectedProps} />);

      // MainButton renders the text inside a span
      const mainButtons = screen.getAllByText('Connect Wallet');
      expect(mainButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Connected state ---

  describe('connected state', () => {
    it('should show "Connected Wallet" label', () => {
      render(<WalletCard {...connectedProps} />);

      expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
      expect(screen.queryByText(/^Wallet$/)).not.toBeInTheDocument();
    });

    it('should display truncated wallet address', () => {
      render(<WalletCard {...connectedProps} />);

      // 0x1234...5678
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });

    it('should truncate address to first 6 and last 4 characters', () => {
      render(
        <WalletCard
          {...connectedProps}
          walletAddress="0xABCDEF0123456789ABCDEF0123456789ABCDEF01"
        />
      );

      expect(screen.getByText('0xABCD...EF01')).toBeInTheDocument();
    });

    it('should not show "Connect Wallet" link when connected', () => {
      render(<WalletCard {...connectedProps} />);

      // The "Connect Wallet" button link should not exist;
      // only the MainButton may contain similar text
      expect(
        screen.queryByText('Connect Wallet', { selector: 'button.text-sky-400' })
      ).not.toBeInTheDocument();
    });

    it('should display all three balances', () => {
      render(<WalletCard {...connectedProps} />);

      expect(screen.getByText('Your Balance')).toBeInTheDocument();

      // Query within the balance section to avoid duplicates with AmountInput's "Available:" text
      const balanceSection = screen.getByText('Your Balance').closest('div')!;
      const balanceTexts = balanceSection.querySelectorAll('p');
      const balanceContents = Array.from(balanceTexts).map((p) => p.textContent);

      expect(balanceContents).toContainEqual(expect.stringContaining('5,000'));
      expect(balanceContents).toContainEqual(expect.stringContaining('USDT'));
      expect(balanceContents).toContainEqual(expect.stringContaining('3,000'));
      expect(balanceContents).toContainEqual(expect.stringContaining('USDC'));
      expect(balanceContents).toContainEqual(expect.stringContaining('100,000'));
      expect(balanceContents).toContainEqual(expect.stringContaining('CSPR'));
    });

    it('should enable the amount input when connected', () => {
      render(<WalletCard {...connectedProps} />);

      expect(screen.getByPlaceholderText('0.00')).not.toBeDisabled();
    });

    it('should show "Purchase BIG" as main button text', () => {
      render(<WalletCard {...connectedProps} />);

      expect(screen.getByText('Purchase BIG')).toBeInTheDocument();
    });
  });

  // --- Token calculation ---

  describe('token calculation', () => {
    it('should not show calculation block when amount is empty', () => {
      render(<WalletCard {...connectedProps} />);

      expect(screen.queryByText('You will receive')).not.toBeInTheDocument();
    });

    it('should show calculation when amount is entered', () => {
      render(<WalletCard {...connectedProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '100' },
      });

      expect(screen.getByText('You will receive')).toBeInTheDocument();
    });

    it('should calculate tokens correctly for USDT (rate 1:1)', () => {
      // tokenPrice = 0.001, amount = 100 USDT, currencyRate = 1
      // amountInUsd = 100, tokensToReceive = 100 / 0.001 = 100,000
      render(<WalletCard {...connectedProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '100' },
      });

      const receiveLabel = screen.getByText('You will receive');
      const receiveBlock = receiveLabel.closest('div')!;
      const receiveValue = receiveBlock.querySelector('span.text-lg');

      expect(receiveValue?.textContent).toContain('100,000');
      expect(receiveValue?.textContent).toContain('BIG');
    });

    it('should show exchange rate info', () => {
      render(<WalletCard {...connectedProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '50' },
      });

      expect(screen.getByText(/Rate:/)).toBeInTheDocument();
    });

    it('should not show calculation for zero amount', () => {
      render(<WalletCard {...connectedProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '0' },
      });

      expect(screen.queryByText('You will receive')).not.toBeInTheDocument();
    });

    it('should update calculation when currency changes', () => {
      // CSPR rate = 0.02, so 1000 CSPR = $20, tokens = 20/0.001 = 20,000
      render(<WalletCard {...connectedProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '1000' },
      });

      // Default currency is USDT (rate 1), tokens = 1,000,000
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument();

      // Switch to CSPR
      fireEvent.change(screen.getByTestId('currency-selector'), {
        target: { value: 'CSPR' },
      });

      // Now 1000 CSPR * 0.02 = $20, tokens = 20/0.001 = 20,000
      expect(screen.getByText(/20,000/)).toBeInTheDocument();
    });
  });

  // --- Default balances ---

  describe('default balance values', () => {
    it('should default balances to 0 when not provided', () => {
      render(
        <WalletCard
          walletAddress="0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333"
          tokenPrice={0.001}
          tokenSymbol="BIG"
        />
      );

      expect(screen.getByText(/^0 USDT$/)).toBeInTheDocument();
      expect(screen.getByText(/^0 USDC$/)).toBeInTheDocument();
      expect(screen.getByText(/^0 CSPR$/)).toBeInTheDocument();
    });
  });

  // --- Custom className ---

  describe('className prop', () => {
    it('should forward custom className', () => {
      const { container } = render(
        <WalletCard {...disconnectedProps} className="my-custom-class" />
      );

      expect(container.firstElementChild?.className).toContain('my-custom-class');
    });
  });
});
