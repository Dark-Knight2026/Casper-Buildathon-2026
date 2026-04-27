import { cn } from '@/lib/utils';
import { Card } from './Card';

interface UserTokenBalanceProps {
  tokensPurchased: number;
  tokenPrice: number;
  tokenSymbol: string;
  currentValue?: number;
  className?: string;
}

export function UserTokenBalance({
  tokensPurchased,
  tokenPrice,
  tokenSymbol,
  currentValue: currentValueProp,
  className,
}: UserTokenBalanceProps) {
  const safeTokensPurchased = tokensPurchased ?? 0;
  const currentValue = currentValueProp ?? safeTokensPurchased * tokenPrice;

  return (
    <Card className={cn('p-6 w-full', className)}>
      <div className="w-full z-10">
        <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
          Your {tokenSymbol} Balance
        </h3>
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
              Tokens Purchased
            </span>
            <span className="text-2xl font-bold text-[hsl(var(--ico-text-primary))]">
              {safeTokensPurchased.toLocaleString()} {tokenSymbol}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
              Current Value
            </span>
            <span className="text-2xl font-bold text-[hsl(var(--ico-brand-primary))]">
              ${currentValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

