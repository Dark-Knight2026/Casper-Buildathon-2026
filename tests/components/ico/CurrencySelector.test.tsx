import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencySelector } from '@/pages/ico/components/shared/CurrencySelector';
import type { PaymentCurrency } from '@/types/ico';

// Polyfill Pointer Capture APIs missing in happy-dom (required by Radix UI)
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

const defaultProps = {
  value: 'USDT' as PaymentCurrency,
  onValueChange: vi.fn(),
};

describe('CurrencySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering ---

  describe('rendering', () => {
    it('should render the trigger button', () => {
      render(<CurrencySelector {...defaultProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display the selected value text', () => {
      render(<CurrencySelector {...defaultProps} value="USDT" />);

      expect(screen.getByText('USDT')).toBeInTheDocument();
    });

    it('should display USDC when selected', () => {
      render(<CurrencySelector {...defaultProps} value="USDC" />);

      expect(screen.getByText('USDC')).toBeInTheDocument();
    });

    it('should display CSPR (Casper) label when CSPR is selected', () => {
      render(<CurrencySelector {...defaultProps} value="CSPR" />);

      expect(screen.getByText('CSPR (Casper)')).toBeInTheDocument();
    });
  });

  // --- Disabled state ---

  describe('disabled state', () => {
    it('should disable the trigger when disabled is true', () => {
      render(<CurrencySelector {...defaultProps} disabled={true} />);

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should not be disabled by default', () => {
      render(<CurrencySelector {...defaultProps} />);

      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} disabled={true} />);

      await user.click(screen.getByRole('combobox'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // --- className prop ---

  describe('className prop', () => {
    it('should forward custom className to the trigger', () => {
      render(
        <CurrencySelector {...defaultProps} className="custom-test-class" />
      );

      expect(screen.getByRole('combobox').className).toContain(
        'custom-test-class'
      );
    });
  });

  // --- Dropdown interaction ---

  describe('dropdown interaction', () => {
    it('should open dropdown and show all currency options on click', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      const labels = options.map((opt) => opt.textContent);

      expect(labels).toContain('USDT');
      expect(labels).toContain('USDC');
      expect(labels).toContain('CSPR (Casper)');
    });

    it('should render exactly 3 currency options', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));

      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should call onValueChange when a different option is selected', async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CurrencySelector {...defaultProps} onValueChange={onValueChange} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'USDC' }));

      expect(onValueChange).toHaveBeenCalledWith('USDC');
    });

    it('should call onValueChange with CSPR when CSPR option is selected', async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(
        <CurrencySelector {...defaultProps} onValueChange={onValueChange} />
      );

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'CSPR (Casper)' }));

      expect(onValueChange).toHaveBeenCalledWith('CSPR');
    });

    it('should close dropdown after selecting an option', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(screen.getByRole('option', { name: 'USDC' }));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
