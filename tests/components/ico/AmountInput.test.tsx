import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AmountInput } from '@/pages/ico/components/shared/AmountInput';
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

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  currency: 'USDT' as PaymentCurrency,
  onCurrencyChange: vi.fn(),
};

describe('AmountInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering ---

  describe('rendering', () => {
    it('should render with default label and placeholder', () => {
      render(<AmountInput {...defaultProps} />);

      expect(screen.getByText('Amount to Buy')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('should render with custom label and placeholder', () => {
      render(
        <AmountInput
          {...defaultProps}
          label="Enter Amount"
          placeholder="100.00"
        />
      );

      expect(screen.getByText('Enter Amount')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('100.00')).toBeInTheDocument();
    });

    it('should render the currency selector', () => {
      render(<AmountInput {...defaultProps} />);

      expect(screen.getByTestId('currency-selector')).toBeInTheDocument();
    });

    it('should display the provided value', () => {
      render(<AmountInput {...defaultProps} value="500" />);

      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    });
  });

  // --- onChange callback ---

  describe('onChange callback', () => {
    it('should call onChange when user types a valid value', () => {
      const onChange = vi.fn();
      render(<AmountInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '50' },
      });

      expect(onChange).toHaveBeenCalledWith('50');
    });

    it('should call onChange when input is cleared', () => {
      const onChange = vi.fn();
      render(<AmountInput {...defaultProps} value="50" onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '' },
      });

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should NOT call onChange for negative values', () => {
      const onChange = vi.fn();
      render(<AmountInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '-5' },
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should NOT call onChange for NaN input', () => {
      const onChange = vi.fn();
      render(<AmountInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: 'abc' },
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should NOT call onChange when value is below minimum', () => {
      const onChange = vi.fn();
      render(<AmountInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '5' },
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should NOT call onChange when value exceeds maximum', () => {
      const onChange = vi.fn();
      render(<AmountInput {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '200000' },
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // --- Validation errors ---

  describe('validation', () => {
    it('should show error for negative numbers', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '-10' },
      });

      expect(
        screen.getByText('Amount must be a positive number')
      ).toBeInTheDocument();
    });

    it('should show error when amount is below minimum ($10)', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '5' },
      });

      expect(screen.getByText('Minimum amount is $10')).toBeInTheDocument();
    });

    it('should show error when amount exceeds maximum ($100,000)', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '200000' },
      });

      expect(
        screen.getByText('Maximum amount is $100,000')
      ).toBeInTheDocument();
    });

    it('should not show error for valid amount within range', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '500' },
      });

      expect(
        screen.queryByText(/Minimum amount|Maximum amount|positive number/)
      ).not.toBeInTheDocument();
    });

    it('should clear error when input is emptied', () => {
      // Start with a valid value so React's value tracker allows transitions
      function Wrapper() {
        const [val, setVal] = useState('50');
        return (
          <AmountInput
            {...defaultProps}
            value={val}
            onChange={setVal}
          />
        );
      }

      render(<Wrapper />);
      const input = screen.getByPlaceholderText('0.00');

      // Trigger an error (onChange is blocked, so controlled value stays '50')
      fireEvent.change(input, { target: { value: '5' } });
      expect(screen.getByText('Minimum amount is $10')).toBeInTheDocument();

      // Clear input (tracker sees '50' → '' which is different, so event fires)
      fireEvent.change(input, { target: { value: '' } });
      expect(
        screen.queryByText('Minimum amount is $10')
      ).not.toBeInTheDocument();
    });

    it('should clear error when value returns to valid range', () => {
      render(<AmountInput {...defaultProps} />);
      const input = screen.getByPlaceholderText('0.00');

      // Trigger error
      fireEvent.change(input, { target: { value: '5' } });
      expect(screen.getByText('Minimum amount is $10')).toBeInTheDocument();

      // Enter valid value
      fireEvent.change(input, { target: { value: '50' } });
      expect(
        screen.queryByText('Minimum amount is $10')
      ).not.toBeInTheDocument();
    });

    it('should accept the exact minimum value', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '10' },
      });

      expect(
        screen.queryByText(/Minimum amount|Maximum amount|positive number/)
      ).not.toBeInTheDocument();
    });

    it('should accept the exact maximum value', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '100000' },
      });

      expect(
        screen.queryByText(/Minimum amount|Maximum amount|positive number/)
      ).not.toBeInTheDocument();
    });

    it('should not show error for zero value', () => {
      render(<AmountInput {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '0' },
      });

      expect(
        screen.queryByText(/Minimum amount|Maximum amount|positive number/)
      ).not.toBeInTheDocument();
    });
  });

  // --- Balance display ---

  describe('balance display', () => {
    it('should not show balance by default', () => {
      render(<AmountInput {...defaultProps} />);

      expect(screen.queryByText(/Available:/)).not.toBeInTheDocument();
    });

    it('should show balance when showBalance is true', () => {
      render(
        <AmountInput
          {...defaultProps}
          showBalance={true}
          availableBalance={1500}
        />
      );

      const balanceText = screen.getByText(/Available:/);
      expect(balanceText).toBeInTheDocument();
      expect(balanceText.textContent).toContain('1,500');
      expect(balanceText.textContent).toContain('USDT');
    });

    it('should hide balance when there is a validation error', () => {
      render(
        <AmountInput
          {...defaultProps}
          showBalance={true}
          availableBalance={1500}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '5' },
      });

      // Error is shown
      expect(screen.getByText('Minimum amount is $10')).toBeInTheDocument();
      // Balance is hidden
      expect(screen.queryByText(/Available:/)).not.toBeInTheDocument();
    });

    it('should display balance with the selected currency', () => {
      render(
        <AmountInput
          {...defaultProps}
          currency="CSPR"
          showBalance={true}
          availableBalance={50000}
        />
      );

      const balanceText = screen.getByText(/Available:/);
      expect(balanceText.textContent).toContain('50,000');
      expect(balanceText.textContent).toContain('CSPR');
    });
  });

  // --- Disabled state ---

  describe('disabled state', () => {
    it('should disable the input when disabled prop is true', () => {
      render(<AmountInput {...defaultProps} disabled={true} />);

      expect(screen.getByPlaceholderText('0.00')).toBeDisabled();
    });

    it('should disable the currency selector when disabled', () => {
      render(<AmountInput {...defaultProps} disabled={true} />);

      expect(screen.getByTestId('currency-selector')).toBeDisabled();
    });

    it('should not disable by default', () => {
      render(<AmountInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('0.00')).not.toBeDisabled();
      expect(screen.getByTestId('currency-selector')).not.toBeDisabled();
    });
  });

  // --- Currency selector integration ---

  describe('currency selector', () => {
    it('should pass selected currency to CurrencySelector', () => {
      render(<AmountInput {...defaultProps} currency="USDC" />);

      expect(screen.getByTestId('currency-selector')).toHaveValue('USDC');
    });

    it('should call onCurrencyChange when currency is changed', () => {
      const onCurrencyChange = vi.fn();
      render(
        <AmountInput
          {...defaultProps}
          onCurrencyChange={onCurrencyChange}
        />
      );

      fireEvent.change(screen.getByTestId('currency-selector'), {
        target: { value: 'CSPR' },
      });

      expect(onCurrencyChange).toHaveBeenCalledWith('CSPR');
    });
  });

  // --- CSS error class ---

  describe('styling', () => {
    it('should apply error border class when validation fails', () => {
      render(<AmountInput {...defaultProps} />);
      const input = screen.getByPlaceholderText('0.00');

      fireEvent.change(input, { target: { value: '5' } });

      expect(input.className).toContain('border-red-500/70');
    });

    it('should apply normal border class when input is valid', () => {
      render(<AmountInput {...defaultProps} />);
      const input = screen.getByPlaceholderText('0.00');

      fireEvent.change(input, { target: { value: '500' } });

      expect(input.className).toContain('border-sky-800/50');
      expect(input.className).not.toContain('border-red-500/70');
    });
  });
});
