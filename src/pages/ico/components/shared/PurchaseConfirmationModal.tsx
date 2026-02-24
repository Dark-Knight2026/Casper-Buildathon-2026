import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ICO_CONFIG, getCurrencyRateUsd } from '@/constants/ico';
import { Card } from './Card';
import { MainButton } from './MainButton';
import { X } from 'lucide-react';
import type { PaymentCurrency } from '@/types/ico';
import type { PurchaseState } from '@/hooks/ico/usePurchaseToken';
import { getStepMessage } from '@/hooks/ico/usePurchaseToken';

// Selector for all interactive elements that can receive keyboard focus
const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
}

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
}: PurchaseConfirmationModalProps) {
  // Ref for the dialog container — used for focus trap and focus-on-open
  const modalRef = useRef<HTMLDivElement>(null);
  // Tracks which element had focus before the modal opened, to restore it on close
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Calculate tokens to receive
  const currencyRate = getCurrencyRateUsd(currency, csprPriceUsd);
  const amountInUsd = amount * currencyRate;
  const tokensToReceive = tokenPrice > 0 ? amountInUsd / tokenPrice : 0;

  // Focus management: move focus into modal on open; restore it on close
  useEffect(() => {
    if (isOpen) {
      // Save the element that triggered the modal so we can return focus to it
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Move focus to the first focusable element inside the dialog
      const focusable = getFocusableElements(modalRef.current);
      focusable[0]?.focus();
    } else {
      // Return focus to the triggering element when the modal closes
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key + focus trap (Tab / Shift+Tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !purchaseState.isProcessing) {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab on first element → wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab on last element → wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Dialog container — role="dialog" scopes the focus trap and announces to screen readers */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-modal-title"
        className="w-full max-w-md"
      >
        <Card className={cn('p-6 animate-in fade-in zoom-in-95 duration-200')}>
          {/* Header */}
          <div className="flex items-center justify-between w-full mb-6">
            <h2
              id="purchase-modal-title"
              className="text-xl font-bold text-[hsl(var(--ico-text-primary))]"
            >
              Confirm Purchase
            </h2>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Purchase Details */}
          <div className="w-full space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-[hsl(var(--ico-border-color))]">
              <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
                You Pay
              </span>
              <span className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                {amount.toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[hsl(var(--ico-border-color))]">
              <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
                USD Value
              </span>
              <span className="text-lg font-medium text-[hsl(var(--ico-text-primary))]">
                ${amountInUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[hsl(var(--ico-border-color))]">
              <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
                Token Price
              </span>
              <span className="text-lg font-medium text-[hsl(var(--ico-text-primary))]">
                ${tokenPrice.toFixed(4)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 bg-[hsl(var(--ico-bg-secondary))] rounded-md px-4">
              <span className="text-sm font-medium text-[hsl(var(--ico-text-highlight))]">
                You Receive
              </span>
              <span className="text-xl font-bold text-[hsl(var(--ico-text-highlight))]">
                {tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {isProcessing && (
            <div className="w-full mb-6">
              <div className="flex items-center gap-3 p-4 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))]">
                <div className="animate-spin rounded-full h-5 min-w-5 border-2 border-[hsl(var(--ico-brand-primary))] border-t-transparent" />
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
              <div className="p-4 rounded-lg bg-red-900/20 border border-red-800/30">
                <span className="text-sm text-red-400">{purchaseState.error}</span>
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
                  text="Confirm"
                  onClick={onConfirm}
                  className="flex-1"
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
      </div>
    </div>
  );
}

export default PurchaseConfirmationModal;
