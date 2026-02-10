import { cn } from '@/lib/utils';
import type { PaymentCurrency } from '@/types/ico';
import { ICO_CONFIG, PAYMENT_CURRENCY_INFO } from '@/constants/ico';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CURRENCY_OPTIONS = ICO_CONFIG.PAYMENT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_CURRENCY_INFO[method].name,
}));

interface CurrencySelectorProps {
  value: PaymentCurrency;
  onValueChange: (value: PaymentCurrency) => void;
  disabled?: boolean;
  className?: string;
}

export function CurrencySelector({
  value,
  onValueChange,
  disabled,
  className,
}: CurrencySelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onValueChange(val as PaymentCurrency)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'w-32 border-0',
          'bg-transparent text-[hsl(var(--ico-text-primary))]',
          'focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-0',
          'focus-visible:ring-0 focus-visible:bg-[hsl(var(--ico-bg-secondary))]',
          className
        )}
      >
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent className="bg-[hsl(var(--ico-bg-card))] border border-[hsl(var(--ico-border-color))] p-2">

          {CURRENCY_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-[hsl(var(--ico-text-primary))] rounded-none cursor-pointer data-highlighted:bg-[hsl(var(--ico-bg-secondary))]!"
            >
              {option.label}
            </SelectItem>
          ))}

      </SelectContent>
    </Select>
  );
}

export default CurrencySelector;
