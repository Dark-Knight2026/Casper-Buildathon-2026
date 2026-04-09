/**
 * UnbondingStatusBlock
 *
 * Shows tokens currently in the unbonding window after an unstake.
 * - While waiting: displays amount + countdown timer
 * - When ready: shows Withdraw button to call withdraw_unbonded()
 */

import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Clock, Wallet, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { MainButton } from './MainButton';
import { formatNumber, formatUSD, formatDateTime } from '../../utils/formatters';
import { useUnbondingStatus } from '@/hooks/ico/useUnbondingStatus';
import type { WithdrawStep } from '@/hooks/ico/useWithdrawUnbonded';

interface UnbondingStatusBlockProps {
  accountHash: string | null | undefined;
  tokenSymbol?: string;
  tokenPrice?: number;
  className?: string;
  onWithdraw?: () => void;
  withdrawStep?: WithdrawStep;
}

export function UnbondingStatusBlock({
  accountHash,
  tokenSymbol = 'BIG',
  tokenPrice,
  className,
  onWithdraw,
  withdrawStep,
}: UnbondingStatusBlockProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useUnbondingStatus(accountHash);

  const isReady = data?.isWithdrawable ?? false;

  if (isLoading || !data || data.unbondingAmount === 0) return null;

  const usdValue = tokenPrice ? data.unbondingAmount * tokenPrice : undefined;

  const isProcessing = withdrawStep === 'signing' || withdrawStep === 'pending';
  const isConfirmed = withdrawStep === 'confirmed';

  const getButtonText = () => {
    switch (withdrawStep) {
      case 'signing':   return 'Sign in wallet…';
      case 'pending':   return 'Confirming…';
      case 'confirmed': return 'Withdrawn!';
      default:          return 'Withdraw';
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 w-full',
        isReady
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-amber-500/5 border-amber-500/30',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Clock
          className={cn(
            'w-4 h-4',
            isReady ? 'text-emerald-500' : 'text-amber-500',
          )}
        />
        <h4 className="text-sm font-medium text-[hsl(var(--ico-text-secondary))]">
          {isReady ? 'Unbonding Complete — Ready to Withdraw' : 'Unbonding in Progress'}
        </h4>
      </div>

      {/* Amount row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center',
              isReady ? 'bg-emerald-500/15' : 'bg-amber-500/10',
            )}
          >
            <Wallet
              className={cn(
                'w-4 h-4',
                isReady ? 'text-emerald-500' : 'text-amber-400',
              )}
            />
          </div>
          <div>
            <p className="font-medium text-[hsl(var(--ico-text-primary))]">
              {formatNumber(data.unbondingAmount)} {tokenSymbol}
            </p>
            {usdValue !== undefined && (
              <p className="text-xs text-[hsl(var(--ico-text-muted))]">
                ≈ {formatUSD(usdValue)}
              </p>
            )}
          </div>
        </div>

        {/* Right side: countdown or withdraw button */}
        {isReady ? (
          <MainButton
            text={getButtonText()}
            loading={isProcessing}
            disabled={isProcessing || isConfirmed}
            onClick={onWithdraw}
            className="text-sm px-4 py-2"
          />
        ) : (
          <div className="text-right">
            <p className="text-xs text-[hsl(var(--ico-text-muted))] mb-1">
              Available in
            </p>
            <CountdownTimer
              targetTimestamp={data.unbondingEndsAt}
              variant="minimal"
              className="text-sm font-semibold text-amber-400"
              updateInterval={1000}
              onExpire={() => queryClient.invalidateQueries({ queryKey: ['unbonding-status'] })}
            />
          </div>
        )}
      </div>

      {/* Explanatory note */}
      {!isReady && (
        <p className="mt-3 text-xs text-[hsl(var(--ico-text-muted))] leading-relaxed">
          Your tokens are unbonding. Once the period ends, click{' '}
          <span className="text-[hsl(var(--ico-text-secondary))]">Withdraw</span>{' '}
          to transfer them to your wallet.
        </p>
      )}

      {/* History */}
      {data.history.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3 space-y-2">
          <p className="text-xs text-[hsl(var(--ico-text-muted))] mb-2">History</p>
          {data.history.map((entry) => {
            const isWithdraw = entry.eventType === 'withdraw';
            return (
              <div
                key={entry.transactionHash}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isWithdraw ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <ArrowDownCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium capitalize',
                      isWithdraw ? 'text-emerald-400' : 'text-amber-400',
                    )}
                  >
                    {entry.eventType}
                  </span>
                  <span className="text-xs text-[hsl(var(--ico-text-muted))] truncate">
                    {formatDateTime(new Date(entry.timestamp))}
                  </span>
                </div>
                <span className="text-xs font-medium text-[hsl(var(--ico-text-primary))] shrink-0">
                  {formatNumber(entry.amount)} {tokenSymbol}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
