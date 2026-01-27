import { cn } from '@/lib/utils';
import { CurrencySelector, PaymentCurrency } from './CurrencySelector';

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
  return (
    <div className={cn('w-full', className)}>
      <label className="block text-sm text-[hsl(var(--ico-text-secondary))] mb-2">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 pr-36 rounded-xl border border-sky-800/50',
            'bg-black/50 text-[hsl(var(--ico-text-primary))]',
            'focus:outline-none focus:ring-0',
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
      {showBalance && (
        <p className="text-xs text-[hsl(var(--ico-text-secondary))] mt-1">
          Available: {availableBalance.toLocaleString()} {currency}
        </p>
      )}
    </div>
  );
}

export default AmountInput;
