import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ICO_CONFIG } from '@/constants/ico';
import type { PurchaseStep } from '@/hooks/ico/usePurchaseToken';

interface TransactionStatusToastProps {
  isVisible: boolean;
  onClose: () => void;
  step: PurchaseStep;
  txHash: string | null;
  tokensReceived: string | null;
  error: string | null;
  tokenSymbol: string;
  autoCloseDelay?: number;
}

export function TransactionStatusToast({
  isVisible,
  onClose,
  step,
  txHash,
  tokensReceived,
  error,
  tokenSymbol,
  autoCloseDelay = 8000,
}: TransactionStatusToastProps) {
  // Auto-close on success after delay
  useEffect(() => {
    if (isVisible && step === 'confirmed') {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, step, onClose, autoCloseDelay]);

  if (!isVisible) return null;

  const isSuccess = step === 'confirmed';
  const isError = step === 'failed';

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 max-w-sm w-full',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
      )}
    >
      <div
        className={cn(
          'p-4 rounded-md border shadow-lg backdrop-blur-md',
          isSuccess && 'bg-green-900/90 border-green-700/50',
          isError && 'bg-red-900/90 border-red-700/50',
          !isSuccess && !isError && 'bg-[hsl(var(--ico-bg-card))] border-[hsl(var(--ico-border-color))]',
        )}
      >
        {/* Header with icon and close button */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {isSuccess && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
            {isError && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}

            {/* Title */}
            <div>
              <h4
                className={cn(
                  'font-semibold',
                  isSuccess && 'text-green-300',
                  isError && 'text-red-300',
                  !isSuccess && !isError && 'text-[hsl(var(--ico-brand-secondary))]',
                )}
              >
                {isSuccess && 'Purchase Successful!'}
                {isError && 'Purchase Failed'}
                {!isSuccess && !isError && 'Processing...'}
              </h4>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
            aria-label="Close notification"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="ml-11">
          {/* Success message with tokens */}
          {isSuccess && tokensReceived && (
            <p className="text-green-200 text-sm mb-2">
              You received{' '}
              <span className="font-bold">
                {tokensReceived} {tokenSymbol}
              </span>
            </p>
          )}

          {/* Error message */}
          {isError && error && (
            <p className="text-red-200 text-sm mb-2">{error}</p>
          )}

          {/* Transaction link */}
          {txHash && (
            <a
              href={`${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 text-xs font-mono hover:underline',
                isSuccess && 'text-green-400',
                isError && 'text-red-400',
                !isSuccess && !isError && 'text-[hsl(var(--ico-brand-secondary))]',
              )}
            >
              <span>
                {txHash.slice(0, 10)}...{txHash.slice(-6)}
              </span>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>

        {/* Progress bar for auto-close */}
        {isSuccess && (
          <div className="mt-3 h-1 bg-green-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 animate-shrink-width"
              style={{
                animationDuration: `${autoCloseDelay}ms`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

