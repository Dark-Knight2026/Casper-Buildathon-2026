import { cn } from '@/lib/utils';
import { Card } from './Card';

interface ProgressBarProps {
  currentValue: number;
  maxValue: number;
  amountRaised: number;
  hardCap: number;
  tokenSymbol: string;
  initialPrice: number;
  className?: string;
}

export function ProgressBar({
  currentValue,
  maxValue,
  amountRaised,
  hardCap,
  tokenSymbol,
  initialPrice,
  className,
}: ProgressBarProps) {
  const percentage = (currentValue / maxValue) * 100;

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex justify-between items-center mb-3 w-full">
        <span className="text-sm font-medium text-[hsl(var(--ico-text-secondary))]">
          Progress: {percentage.toFixed(1)}% sold
        </span>
        <span className="text-sm font-medium text-[hsl(var(--ico-text-secondary))]">
          ${amountRaised.toLocaleString()} / ${hardCap.toLocaleString()}
        </span>
      </div>

      <div className="w-full h-4 bg-[hsl(var(--ico-progress-bg))] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-900 to-sky-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Info Columns */}
      <div className="flex items-center justify-center w-full mt-6 pt-6 border-t border-sky-800/50">
        <div className="flex-1 text-center">
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Funds Raised</p>
          <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
            ${amountRaised.toLocaleString()}
          </p>
        </div>

        <div className="w-px h-12 bg-sky-800/50" />

        <div className="flex-1 text-center">
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Initial Price</p>
          <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
            ${initialPrice} per {tokenSymbol}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default ProgressBar;
