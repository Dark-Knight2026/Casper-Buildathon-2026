import { useEffect } from 'react';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { cn } from '@/lib/utils';
import { ICO_CONFIG, getCurrencyRateUsd } from '@/constants/ico';
import { Card } from './Card';
import { MainButton } from './MainButton';
import { X } from 'lucide-react';
import type { PaymentCurrency } from '@/types/ico';
import type { PurchaseState } from '@/hooks/ico/usePurchaseToken';
import { getStepMessage } from '@/hooks/ico/usePurchaseToken';

interface PurchaseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currency: PaymentCurrency;
  tokenPrice: number;
  tokenSymbol: string;
  purchaseState: PurchaseState;
  csprPriceUsd?: number;
  csprPriceStale?: boolean;
}

export function PurchaseConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  currency,
  tokenPrice,
  tokenSymbol,
  purchaseState,
  csprPriceUsd,
  csprPriceStale,
}: PurchaseConfirmationModalProps) {
  // Calculate tokens to receive
  let currencyRate: number | null = null;
  let csprPriceError = false;
  try {
    currencyRate = getCurrencyRateUsd(currency, csprPriceUsd);
  } catch {
    csprPriceError = true;
  }
  const amountInUsd = currencyRate !== null ? amount * currencyRate : 0;
  const tokensToReceive = tokenPrice > 0 ? amountInUsd / tokenPrice : 0;

  // Escape key + scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !purchaseState.isProcessing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, purchaseState.isProcessing]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !purchaseState.isProcessing) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isProcessing = purchaseState.isProcessing;
  const stepMessage = getStepMessage(purchaseState.step);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <FocusScope loop trapped>
        <Card
          className={cn(
            'w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between w-full mb-6">
            <h2 id="purchase-modal-title" className="text-xl font-bold text-[hsl(var(--ico-text-primary))]">
              Confirm Purchase
            </h2>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="text-[hsl(var(--ico-text-secondary))] hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Purchase Details */}
          <div className="w-full space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-[hsl(var(--ico-border-color))]">
              <span className="text-sm text-[hsl(var(--ico-text-secondary))]">You Pay</span>
              <span className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                {amount.toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[hsl(var(--ico-border-color))]">
              <span className="text-sm text-[hsl(var(--ico-text-secondary))]">USD Value</span>
              <span className="text-lg font-medium text-[hsl(var(--ico-text-primary))]">
                ${amountInUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[hsl(var(--ico-border-color))]">
              <span className="text-sm text-[hsl(var(--ico-text-secondary))]">Token Price</span>
              <span className="text-lg font-medium text-[hsl(var(--ico-text-primary))]">
                ${tokenPrice.toFixed(4)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 bg-[hsl(var(--ico-bg-secondary))] rounded-md px-4">
              <span className="text-sm font-medium text-[hsl(var(--ico-text-highlight))]">You Receive</span>
              <span className="text-xl font-bold text-[hsl(var(--ico-text-highlight))]">
                {tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {isProcessing && (
            <div role="status" aria-live="polite" aria-atomic="true" className="w-full mb-6">
              <div className="flex items-center gap-3 p-4 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))]">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[hsl(var(--ico-brand-primary))] border-t-transparent" />
                <span className="text-sm text-[hsl(var(--ico-brand-primary))]">{stepMessage}</span>
              </div>
            </div>
          )}

          {/* Transaction Hash */}
          {purchaseState.purchaseTxHash && (
            <div className="w-full mb-6">
              <div className="p-4 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))]">
                <span className="text-xs text-[hsl(var(--ico-text-secondary))] block mb-1">
                  Transaction Hash
                </span>
                <a
                  href={`${ICO_CONFIG.CASPER.explorerUrl}/deploy/${purchaseState.purchaseTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-[hsl(var(--ico-brand-secondary))] hover:underline break-all"
                >
                  {purchaseState.purchaseTxHash.slice(0, 20)}...{purchaseState.purchaseTxHash.slice(-8)}
                </a>
              </div>
            </div>
          )}

          {/* Error Message */}
          {purchaseState.error && (
            <div className="w-full mb-6">
              <div className="p-4 rounded-lg bg-[hsl(var(--ico-error-bg))] border border-[hsl(var(--ico-error-border))]">
                <span className="text-sm text-[hsl(var(--ico-error-text))]">{purchaseState.error}</span>
              </div>
            </div>
          )}

          {/* CSPR Price Unavailable Warning */}
          {csprPriceError && (
            <div className="w-full mb-6">
              <div className="p-4 rounded-lg bg-[hsl(var(--ico-error-bg))] border border-[hsl(var(--ico-error-border))]">
                <span className="text-sm text-[hsl(var(--ico-error-text))]">
                  CSPR price unavailable — please try again later
                </span>
              </div>
            </div>
          )}

          {/* Stale Price Warning (display-only — does not block purchase) */}
          {!csprPriceError && csprPriceStale && currency === 'CSPR' && (
            <div className="w-full mb-6">
              <div className="p-3 rounded-lg bg-[hsl(var(--ico-warning-bg))] border border-[hsl(var(--ico-warning-border))]">
                <span className="text-xs text-[hsl(var(--ico-warning-text))]">
                  CSPR rate may be outdated. Final amount is determined on-chain.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex gap-3">
            {!isProcessing && purchaseState.step === 'idle' && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-[hsl(var(--ico-bg-secondary))] text-[hsl(var(--ico-text-secondary))] rounded-md border border-[hsl(var(--ico-brand-secondary))] hover:bg-[hsl(var(--ico-bg-primary))] transition-colors"
                >
                  Cancel
                </button>
                <MainButton
                  text="Confirm Purchase"
                  onClick={onConfirm}
                  disabled={csprPriceError}
                  className="flex-1"
                  autoFocus
                />
              </>
            )}

            {purchaseState.step === 'confirmed' && (
              <MainButton
                text="Done"
                onClick={onClose}
                className="w-full"
              />
            )}

            {purchaseState.step === 'failed' && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-[hsl(var(--ico-bg-secondary))] text-[hsl(var(--ico-text-secondary))] rounded-md border border-[hsl(var(--ico-brand-secondary))] hover:bg-[hsl(var(--ico-bg-primary))] transition-colors"
                >
                  Close
                </button>
                <MainButton
                  text="Try Again"
                  onClick={onConfirm}
                  className="flex-1"
                />
              </>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-[hsl(var(--ico-text-secondary))] text-center mt-4 opacity-70">
            By confirming, you agree to the token purchase terms. Transactions are final and cannot be reversed.
          </p>
        </Card>
      </FocusScope>
    </div>
  );
}

export default PurchaseConfirmationModal;
