import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getCurrencyRateUsd, ICO_CONFIG } from '@/constants/ico';
import { Card } from './Card';
import type { PaymentCurrency } from '@/types/ico';
import { MainButton } from './MainButton';
import { AmountInput } from './AmountInput';
import { CurrencySelector } from './CurrencySelector';
import { InputModeToggle } from './InputModeToggle';
import type { InputMode } from './InputModeToggle';

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
  onConnect?: () => void;
  onPurchase?: (amount: number, currency: PaymentCurrency) => void;
  onBuyCspr?: () => void;
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
  onConnect,
  onPurchase,
  onBuyCspr,
  className,
}: WalletCardProps) {
  const [inputMode, setInputMode] = useState<InputMode>('spend');
  const [spendAmount, setSpendAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [currency, setCurrency] = useState<PaymentCurrency>('USDT');

  const isConnected = !!walletAddress;
  const balances: Record<PaymentCurrency, number> = {
    USDT: balanceUSDT,
    USDC: balanceUSDC,
    CSPR: balanceCSPR,
  };
  const currentBalance = balances[currency];
  const currencyRate = getCurrencyRateUsd(currency, csprPriceUsd);

  // spend mode: derive BIG tokens from currency amount
  const tokensToReceive = useMemo(
    () => (spendAmount && tokenPrice > 0 ? (Number(spendAmount) * currencyRate) / tokenPrice : 0),
    [spendAmount, currencyRate, tokenPrice]
  );

  // receive mode: derive currency amount from BIG token amount
  const currencyToSpend = useMemo(
    () => (receiveAmount && currencyRate > 0 ? (Number(receiveAmount) * tokenPrice) / currencyRate : 0),
    [receiveAmount, tokenPrice, currencyRate]
  );

  // amount that will be passed to onPurchase — always in selected currency
  const effectiveAmount = inputMode === 'spend' ? Number(spendAmount) : currencyToSpend;

  // Check if CSPR balance is too low for a minimum purchase ($1 equivalent)
  const csprBalanceUsd = balanceCSPR * (csprPriceUsd ?? 0);
  const lowCsprBalance = isConnected && csprBalanceUsd < ICO_CONFIG.PURCHASE_LIMITS.min;

  // Balance validation
  const insufficientBalance = isConnected && effectiveAmount > 0 && effectiveAmount > currentBalance;

  const hasValidInput = inputMode === 'spend' ? !!spendAmount && Number(spendAmount) > 0 : !!receiveAmount && Number(receiveAmount) > 0;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setSpendAmount('');
    setReceiveAmount('');
  };

  const handlePurchase = useCallback(() => {
    if (hasValidInput && onPurchase && !insufficientBalance) {
      onPurchase(effectiveAmount, currency);
    }
  }, [hasValidInput, onPurchase, insufficientBalance, effectiveAmount, currency]);

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
              {lowCsprBalance && onBuyCspr && (
                <button
                  type="button"
                  onClick={onBuyCspr}
                  className="text-xs text-[hsl(var(--ico-brand-secondary))] hover:text-[hsl(var(--ico-brand-secondary-hover))] transition-colors underline underline-offset-2 cursor-pointer"
                >
                  Buy CSPR with card
                </button>
              )}
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

      {/* Input Mode Toggle */}
      <InputModeToggle value={inputMode} onChange={handleModeChange} className="mb-4" />

      {/* Spend Mode: enter currency amount */}
      {inputMode === 'spend' && (
        <AmountInput
          value={spendAmount}
          onChange={setSpendAmount}
          currency={currency}
          onCurrencyChange={setCurrency}
          disabled={!isConnected}
          availableBalance={currentBalance}
          showBalance={isConnected}
          className="mb-4"
        />
      )}

      {/* Receive Mode: enter BIG token amount + currency selector */}
      {inputMode === 'receive' && (
        <div className="w-full mb-4">
          <label htmlFor="receive-amount-input" className="block text-sm text-[hsl(var(--ico-text-secondary))] mb-2">
            Amount to Receive
          </label>
          <div className="relative flex items-center">
            <input
              id="receive-amount-input"
              type="number"
              value={receiveAmount}
              onChange={(e) => setReceiveAmount(e.target.value)}
              min={0}
              placeholder="0.00"
              disabled={!isConnected}
              className={cn(
                'w-full px-4 py-3 pr-24 rounded-md border border-[hsl(var(--ico-border-color))]',
                'bg-[hsl(var(--ico-form-input-bg))] text-[hsl(var(--ico-text-primary))]',
                'focus:outline-none focus:ring-0 focus:border-[hsl(var(--ico-brand-primary))]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <span className="absolute right-4 text-sm font-medium text-[hsl(var(--ico-text-primary))] pointer-events-none">
              {tokenSymbol}
            </span>
          </div>

          {/* Pay with currency selector */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">Pay with</span>
            <CurrencySelector
              value={currency}
              onValueChange={setCurrency}
              disabled={!isConnected}
              align="right"
            />
          </div>

          {isConnected && (
            <p className="text-xs text-[hsl(var(--ico-text-secondary))] mt-1">
              Available: {currentBalance.toLocaleString()} {currency}
            </p>
          )}
        </div>
      )}

      {/* Calculation Block */}
      {hasValidInput && (
        <div className="w-full p-4 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))] mb-6">
          {inputMode === 'spend' ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[hsl(var(--ico-text-secondary))]">You will receive (estimate)</span>
                <span className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                  ≈{tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--ico-text-highlight))] mt-1">
                Rate: 1 {tokenSymbol} = {(tokenPrice / currencyRate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[hsl(var(--ico-text-secondary))]">You will pay (estimate)</span>
                <span className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                  ≈{currencyToSpend.toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--ico-text-highlight))] mt-1">
                Rate: 1 {tokenSymbol} = {(tokenPrice / currencyRate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
              </p>
            </>
          )}
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
        disabled={isConnected && (insufficientBalance || !hasValidInput)}
      />
    </Card>
  );
}

export default WalletCard;
