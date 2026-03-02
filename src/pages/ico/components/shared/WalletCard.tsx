import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getCurrencyRateUsd } from '@/constants/ico';
import { Card } from './Card';
import type { PaymentCurrency } from '@/types/ico';
import { MainButton } from './MainButton';
import { AmountInput } from './AmountInput';

interface WalletCardProps {
  walletAddress?: string;
  balanceUSDT?: number;
  balanceUSDC?: number;
  balanceCSPR?: number;
  balanceBIG?: number;
  balanceError?: string | null;
  balancesLoading?: boolean;
  tokenPrice: number;
  tokenSymbol: string;
  csprPriceUsd?: number;
  csprPriceStale?: boolean;
  onConnect?: () => void;
  onPurchase?: (amount: number, currency: PaymentCurrency) => void;
  className?: string;
}

export function WalletCard({
  walletAddress,
  balanceUSDT = 0,
  balanceUSDC = 0,
  balanceCSPR = 0,
  balanceBIG = 0,
  balanceError,
  balancesLoading,
  tokenPrice,
  tokenSymbol,
  csprPriceUsd,
  csprPriceStale,
  onConnect,
  onPurchase,
  className,
}: WalletCardProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<PaymentCurrency>('USDT');

  const isConnected = !!walletAddress;
  const balances: Record<PaymentCurrency, number> = {
    USDT: balanceUSDT,
    USDC: balanceUSDC,
    CSPR: balanceCSPR,
    CARD: 0,
  };
  const currentBalance = balances[currency];

  let currencyRate: number | null = null;
  let csprPriceError = false;
  try {
    currencyRate = getCurrencyRateUsd(currency, csprPriceUsd);
  } catch {
    csprPriceError = true;
  }

  const amountInUsd = useMemo(
    () => (amount && currencyRate !== null ? Number(amount) * currencyRate : 0),
    [amount, currencyRate]
  );
  const tokensToReceive = useMemo(
    () => amountInUsd / tokenPrice,
    [amountInUsd, tokenPrice]
  );

  // Balance validation
  const amountInCurrency = Number(amount) || 0;
  const insufficientBalance = isConnected && amountInCurrency > currentBalance;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handlePurchase = useCallback(() => {
    if (amount && onPurchase && !insufficientBalance) {
      onPurchase(Number(amount), currency);
    }
  }, [amount, onPurchase, insufficientBalance, currency]);

  return (
    <Card className={cn('p-6', className)}>
      {/* Wallet Connection */}
      <div className="flex justify-between items-center w-full mb-6">
        <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
          {isConnected ? 'Connected Wallet' : 'Wallet'}
        </span>
        {isConnected ? (
          <span className="font-mono text-sm text-[hsl(var(--ico-text-primary))] bg-[hsl(var(--ico-bg-secondary))] px-3 py-1 rounded-md border border-[hsl(var(--ico-border-color))]">
            {truncateAddress(walletAddress)}
          </span>
        ) : (
          <button
            onClick={onConnect}
            aria-label="Connect your crypto wallet"
            className="text-sm font-medium text-[hsl(var(--ico-brand-secondary))] hover:text-[hsl(var(--ico-brand-secondary-hover))] transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Balance */}
      {isConnected && (
        <div className="flex justify-between items-center w-full mb-6 pb-6 border-b border-[hsl(var(--ico-border-color))]">
          <span className="text-sm text-[hsl(var(--ico-text-secondary))]">Your Balance</span>
          {balancesLoading ? (
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">Loading...</span>
          ) : (
            <div className="text-right space-y-1">
              {balanceError && (
                <p className="text-xs text-red-400">{balanceError}</p>
              )}
              {balanceBIG > 0 && (
                <p className="text-sm font-bold text-[hsl(var(--ico-text-highlight))]">
                  {balanceBIG.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                </p>
              )}
              <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
                {balanceCSPR.toLocaleString(undefined, { maximumFractionDigits: 2 })} CSPR
              </p>
              <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
                {balanceUSDT.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
              </p>
              <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
                {balanceUSDC.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
              </p>
            </div>
          )}
        </div>
      )}

      {/* Amount Input */}
      <AmountInput
        value={amount}
        onChange={setAmount}
        currency={currency}
        onCurrencyChange={setCurrency}
        disabled={!isConnected}
        availableBalance={currentBalance}
        showBalance={isConnected}
        className="mb-4"
      />

      {/* CSPR Price Unavailable Warning */}
      {csprPriceError && currency === 'CSPR' && (
        <div className="w-full p-4 rounded-md bg-red-900/20 border border-red-800/30 mb-4">
          <p className="text-sm text-red-400">
            CSPR price unavailable — please try again later
          </p>
        </div>
      )}

      {/* Stale Price Warning (display-only — does not block purchase) */}
      {!csprPriceError && csprPriceStale && currency === 'CSPR' && (
        <div className="w-full p-3 rounded-md bg-yellow-900/20 border border-yellow-800/30 mb-4">
          <p className="text-xs text-yellow-400">
            CSPR rate may be outdated. Final amount is determined on-chain.
          </p>
        </div>
      )}

      {/* Token Calculation */}
      {amount && Number(amount) > 0 && !csprPriceError && (
        <div className="w-full p-4 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))] mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">You will receive (estimate)</span>
            <span className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
              ≈{tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--ico-text-highlight))] mt-1">
            Rate: 1 {tokenSymbol} = {(tokenPrice / currencyRate!).toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
          </p>
          {/* Floating-point note: these are UI estimates only. Final amounts are validated
              server-side using integer arithmetic in smallest units (motes/decimals).
              BigInt is unnecessary here — the backend is the source of truth. */}
          <p className="text-xs text-[hsl(var(--ico-text-secondary))] mt-1">
            Final amount confirmed at purchase
          </p>
        </div>
      )}

      {/* Insufficient Balance Warning */}
      {insufficientBalance && (
        <p className="text-xs text-red-400 mb-4">
          Insufficient {currency} balance. You have {currentBalance.toLocaleString()} {currency}.
        </p>
      )}

      {/* Purchase Button */}
      <MainButton
        text={isConnected ? `Purchase ${tokenSymbol}` : 'Connect Wallet'}
        onClick={isConnected ? handlePurchase : onConnect}
        disabled={isConnected && (insufficientBalance || !amount || csprPriceError)}
      />
    </Card>
  );
}

export default WalletCard;
