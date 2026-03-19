import { cn } from '@/lib/utils';
import { Card } from './Card';

interface InfoColumn {
  label: string;
  value: string;
}

interface ProgressBarProps {
  /** Current progress value */
  currentValue: number;
  /** Maximum value (100% point) */
  maxValue: number;
  /** Label on the left side (e.g., "Progress", "Vesting Progress") */
  label?: string;
  /** Custom right-side label. If not provided, shows percentage */
  rightLabel?: string;
  /** Custom right-side element (e.g., CountdownTimer). Takes precedence over rightLabel */
  rightElement?: React.ReactNode;
  /** Whether to show percentage in left label (default: true) */
  showPercentage?: boolean;
  /** Info columns to display below the progress bar */
  infoColumns?: InfoColumn[];
  /** Height of the progress bar: 'sm' (8px), 'md' (12px), 'lg' (16px) */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to wrap in Card component (default: true) */
  withCard?: boolean;
  className?: string;
}

export function ProgressBar({
  currentValue,
  maxValue,
  label = 'Progress',
  rightLabel,
  rightElement,
  showPercentage = true,
  infoColumns,
  size = 'lg',
  withCard = true,
  className,
}: ProgressBarProps) {
  const percentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const content = (
    <>
      <div className="flex justify-between items-center mb-3 w-full">
        <span className="text-sm font-medium text-[hsl(var(--ico-text-secondary))]">
          {label}{showPercentage ? `: ${percentage.toFixed(1)}%` : ''}
        </span>
        {rightElement ? (
          rightElement
        ) : rightLabel ? (
          <span className="text-sm font-medium text-[hsl(var(--ico-text-secondary))]">
            {rightLabel}
          </span>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('w-full bg-[hsl(var(--ico-progress-bg))] rounded-full overflow-hidden', sizeClasses[size])}
      >
        <div
          className="h-full rounded-full transition-all duration-500 bg-[hsl(var(--ico-progress-fill))]!"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {infoColumns && infoColumns.length > 0 && (
        <div className="flex items-center justify-center w-full mt-6 pt-6 border-t border-[hsl(var(--ico-border-color))]">
          {infoColumns.map((column, index) => (
            <div key={column.label} className="contents">
              {index > 0 && <div className="w-px h-12 bg-[hsl(var(--ico-border-color))]" />}
              <div className="flex-1 text-center">
                <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">{column.label}</p>
                <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                  {column.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (withCard) {
    return <Card className={cn('p-6', className)}>{content}</Card>;
  }

  return <div className={cn('w-full', className)}>{content}</div>;
}

