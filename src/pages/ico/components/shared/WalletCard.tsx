import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ICO_CONFIG } from '@/constants/ico';
import { Card } from './Card';
import type { PaymentCurrency } from '@/types/ico';
import { MainButton } from './MainButton';
import { AmountInput } from './AmountInput';

interface WalletCardProps {
  walletAddress?: string;
  balanceUSDT?: number;
  balanceUSDC?: number;
  balanceCSPR?: number;
  tokenPrice: number;
  tokenSymbol: string;
  onConnect?: () => void;
  onPurchase?: (amount: number, currency: PaymentCurrency) => void;
  className?: string;
}

export function WalletCard({
  walletAddress,
  balanceUSDT = 0,
  balanceUSDC = 0,
  balanceCSPR = 0,
  tokenPrice,
  tokenSymbol,
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
  // TODO: [Next PR] Replace hardcoded CURRENCY_RATES with live rate from useCSPRPrice hook.
  // Currently uses a static CSPR rate — see src/hooks/useCSPRPrice.ts for the existing
  // real-time price fetching implementation that should be integrated here.
  const currencyRate = ICO_CONFIG.CURRENCY_RATES[currency];
  const amountInUsd = amount ? Number(amount) * currencyRate : 0;
  const tokensToReceive = amountInUsd / tokenPrice;

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handlePurchase = () => {
    if (amount && onPurchase) {
      onPurchase(Number(amount), currency);
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      {/* Wallet Connection */}
      <div className="flex justify-between items-center w-full mb-6">
        <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
          {isConnected ? 'Connected Wallet' : 'Wallet'}
        </span>
        {isConnected ? (
          <span className="font-mono text-sm text-[hsl(var(--ico-text-primary))] bg-sky-900/30 px-3 py-1 rounded-lg">
            {truncateAddress(walletAddress)}
          </span>
        ) : (
          <button
            onClick={onConnect}
            aria-label="Connect your crypto wallet"
            className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Balance */}
      {isConnected && (
        <div className="flex justify-between items-center w-full mb-6 pb-6 border-b border-sky-800/50">
          <span className="text-sm text-[hsl(var(--ico-text-secondary))]">Your Balance</span>
          <div className="text-right">
            <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
              {balanceUSDT.toLocaleString()} USDT
            </p>
            <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
              {balanceUSDC.toLocaleString()} USDC
            </p>
            <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
              {balanceCSPR.toLocaleString()} CSPR
            </p>
          </div>
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

      {/* Token Calculation */}
      {amount && Number(amount) > 0 && (
        <div className="w-full p-4 rounded-xl bg-sky-900/20 border border-sky-800/30 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[hsl(var(--ico-text-secondary))]">You will receive</span>
            <span className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
              {tokensToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
            </span>
          </div>
          <p className="text-xs text-sky-400 mt-1">
            Rate: 1 {tokenSymbol} = {(tokenPrice / currencyRate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
          </p>
        </div>
      )}

      {/* Purchase Button */}
      <MainButton
        text={isConnected ? `Purchase ${tokenSymbol}` : 'Connect Wallet'}
        onClick={isConnected ? handlePurchase : onConnect}
      />
    </Card>
  );
}

export default WalletCard;
