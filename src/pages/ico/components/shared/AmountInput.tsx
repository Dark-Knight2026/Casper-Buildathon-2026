import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ICO_CONFIG } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';
import { CurrencySelector } from './CurrencySelector';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  currency: PaymentCurrency;
  onCurrencyChange: (currency: PaymentCurrency) => void;
  disabled?: boolean;
  availableBalance?: number;
  showBalance?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function AmountInput({
  value,
  onChange,
  currency,
  onCurrencyChange,
  disabled = false,
  availableBalance = 0,
  showBalance = false,
  label = 'Amount to Buy',
  placeholder = '0.00',
  className,
}: AmountInputProps) {
  const [error, setError] = useState<string | null>(null);
  const { min, max } = ICO_CONFIG.PURCHASE_LIMITS;

  const handleChange = (rawValue: string) => {
    if (rawValue === '') {
      setError(null);
      onChange(rawValue);
      return;
    }

    const num = parseFloat(rawValue);

    if (isNaN(num) || num < 0) {
      setError('Amount must be a positive number');
      onChange(rawValue);
      return;
    }

    if (num > 0 && num < min) {
      setError(`Minimum amount is $${min}`);
    } else if (num > max) {
      setError(`Maximum amount is $${max.toLocaleString()}`);
    } else {
      setError(null);
    }

    onChange(rawValue);
  };

  return (
    <div className={cn('w-full', className)}>
      <label htmlFor="amount-input" className="block text-sm text-[hsl(var(--ico-text-secondary))] mb-2">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id="amount-input"
          type="number"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          min={0}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={error ? 'amount-input-error' : undefined}
          aria-invalid={!!error}
          className={cn(
            'w-full px-4 py-3 pr-36 rounded-md border',
            error
              ? 'border-red-500/70'
              : 'border-[hsl(var(--ico-border-color))]',
            'bg-[hsl(var(--ico-form-input-bg))] text-[hsl(var(--ico-text-primary))]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ico-brand-primary))] focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <div className="absolute right-2">
          <CurrencySelector
            value={currency}
            onValueChange={onCurrencyChange}
            disabled={disabled}
          />
        </div>
      </div>
      {error && (
        <p id="amount-input-error" role="alert" className="text-xs text-red-400 mt-1">{error}</p>
      )}
      {!error && showBalance && (
        <p className="text-xs text-[hsl(var(--ico-text-secondary))] mt-1">
          Available: {availableBalance.toLocaleString()} {currency}
        </p>
      )}
    </div>
  );
}

export default AmountInput;
