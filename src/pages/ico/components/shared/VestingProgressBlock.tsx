import { cn } from '@/lib/utils';
import { ProgressBar } from './ProgressBar';
import { CountdownTimer } from './CountdownTimer';
import { Lock, Calendar } from 'lucide-react';
import { formatNumber, formatUSD, formatDate } from '../../utils/formatters';

export interface VestingEntry {
  /** Unique identifier for the vesting entry */
  id: string;
  /** Amount of tokens locked */
  lockedAmount: number;
  /** Timestamp when tokens will be unlocked */
  unlockTimestamp: number;
  /** Purchase date timestamp */
  purchaseTimestamp: number;
  /** Optional: Amount already unlocked from this entry */
  unlockedAmount?: number;
}

interface VestingProgressBlockProps {
  /** Array of vesting entries (purchases) */
  vestingEntries: VestingEntry[];
  /** Token symbol for display */
  tokenSymbol?: string;
  /** Token price for USD calculation */
  tokenPrice?: number;
  className?: string;
}

export function VestingProgressBlock({
  vestingEntries,
  tokenSymbol = 'BIG',
  tokenPrice,
  className,
}: VestingProgressBlockProps) {
  const now = Date.now();

  // Sort entries by unlock date
  const sortedEntries = [...vestingEntries].sort(
    (a, b) => a.unlockTimestamp - b.unlockTimestamp
  );

  // Find the first upcoming unlock
  const upcomingUnlocks = sortedEntries.filter(
    (entry) => entry.unlockTimestamp > now
  );
  const nextUnlock = upcomingUnlocks[0];

  // Calculate progress for the next unlock
  const calculateProgress = () => {
    if (!nextUnlock) return 100;

    const vestingDuration = nextUnlock.unlockTimestamp - nextUnlock.purchaseTimestamp;
    const elapsed = now - nextUnlock.purchaseTimestamp;
    return Math.min((elapsed / vestingDuration) * 100, 100);
  };

  // Calculate total locked
  const totalLocked = sortedEntries.reduce(
    (sum, entry) => sum + entry.lockedAmount - (entry.unlockedAmount || 0),
    0
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar to next unlock */}
      {nextUnlock ? (
        <ProgressBar
          currentValue={calculateProgress()}
          maxValue={100}
          label="Next Unlock"
          withCard={false}
          rightElement={
            <CountdownTimer
              targetTimestamp={nextUnlock.unlockTimestamp}
              variant="minimal"
              className="text-sm text-[hsl(var(--ico-text-secondary))]"
              updateInterval={60000}
            />
          }
        />
      ) : (
        <div className="text-center py-4">
          <p className="text-[hsl(var(--ico-text-primary))] font-medium">
            All tokens have been unlocked
          </p>
        </div>
      )}

      {/* Locked entries list */}
      {upcomingUnlocks.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-medium text-[hsl(var(--ico-text-secondary))]">
              Locked Tokens ({upcomingUnlocks.length}{' '}
              {upcomingUnlocks.length === 1 ? 'entry' : 'entries'})
            </h4>
          </div>

          <div className="space-y-3">
            {upcomingUnlocks.map((entry, index) => {
              const remainingLocked =
                entry.lockedAmount - (entry.unlockedAmount || 0);
              const usdValue = tokenPrice
                ? remainingLocked * tokenPrice
                : undefined;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    'bg-[hsl(var(--ico-bg-secondary))]/50',
                    'border border-[hsl(var(--ico-border-color))]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                        index === 0
                          ? 'bg-[hsl(var(--ico-brand-primary))]/20 text-[hsl(var(--ico-brand-primary))]'
                          : 'bg-amber-500/10 text-amber-500'
                      )}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-[hsl(var(--ico-text-primary))]">
                        {formatNumber(remainingLocked)} {tokenSymbol}
                      </p>
                      {usdValue !== undefined && (
                        <p className="text-xs text-[hsl(var(--ico-text-muted))]">
                          ≈ {formatUSD(usdValue)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-[hsl(var(--ico-text-secondary))]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">
                        {formatDate(entry.unlockTimestamp)}
                      </span>
                    </div>
                    {index === 0 && (
                      <p className="text-xs text-[hsl(var(--ico-brand-primary))] mt-0.5">Next unlock</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total locked summary */}
          <div className="mt-4 pt-4 border-t border-[hsl(var(--ico-border-color))] flex items-center justify-between">
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
              Total Locked
            </span>
            <div className="text-right">
              <span className="font-bold text-[hsl(var(--ico-text-primary))]">
                {formatNumber(totalLocked)} {tokenSymbol}
              </span>
              {tokenPrice && (
                <span className="text-sm text-[hsl(var(--ico-text-muted))] ml-2">
                  ≈ {formatUSD(totalLocked * tokenPrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

