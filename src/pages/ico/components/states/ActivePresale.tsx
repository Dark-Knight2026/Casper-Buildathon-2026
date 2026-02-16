import { cn } from '@/lib/utils';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';
import { ICO_CONFIG, MOCK_TRANSACTIONS } from '@/constants/ico';
import { Title } from '../shared/Title';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { TransactionHistory } from '../shared/TransactionHistory';
import CountdownTimer from '../shared/CountdownTimer';
import { UserTokenBalance } from '../shared/UserTokenBalance';
import { usePurchaseFlow } from '@/hooks/ico/usePurchaseFlow';
import { PurchaseConfirmationModal } from '../shared/PurchaseConfirmationModal';
import { TransactionStatusToast } from '../shared/TransactionStatusToast';

interface ActivePresaleProps {
  className?: string;
  endTimestamp: number;
  progress?: ScheduleProgress | null;
}

const MOCK_USER_BALANCE = {
  tokensPurchased: 1505000,  // 500,000 + 1,000,000 + 5,000
  totalSpentUSD: 1505,       // $500 + $1,000 + $5 (250 CSPR × $0.02)
};

export function PrivateSaleActive({ className, endTimestamp, progress }: ActivePresaleProps) {
  const tokenPrice = progress?.priceUsd ?? 0;

  const {
    isConnected,
    account,
    connect,
    balances,
    balanceError,
    balancesLoading,
    csprPriceUsd,
    handlePurchase,
    modalProps,
    toastProps,
  } = usePurchaseFlow({
    tokenPrice,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
  });

  console.log('Rendering ActivePresale with props:', {
    endTimestamp,
    progress,
    tokenPrice,
    isConnected,
    account,
    balances,
  });

  return (
    <div className={cn('max-w-5xl mx-auto', className)}>
      {/* Hero Section */}
      <div className="text-center mb-12">

        <Title className="mb-4">
          {ICO_CONFIG.TOKEN.symbol} Private Sale
        </Title>

        <p className="text-lg md:text-xl font-thin text-[hsl(var(--ico-text-secondary))] max-w-2xl mx-auto">
          Purchase BIG Tokens at Private Sale Rate
        </p>
      </div>
      <div className='mx-auto flex flex-col md:flex-row gap-4 items-start justify-center'>
        <div className='w-full flex flex-col gap-4'>
          <p className='text-[hsl(var(--ico-text-secondary))] pl-2'>Private Sale ends in:</p>
          <CountdownTimer variant='compact' targetTimestamp={endTimestamp} className="py-2" />

          {/* Progress Bar - show only when progress data exists */}
          {progress && (
            <ProgressBar
              currentValue={progress.tokensSold}
              maxValue={progress.totalAllocation}
              label="Progress"
              rightLabel={`$${Math.round(progress.amountRaised).toLocaleString()} / $${Math.round(progress.hardCapUsd).toLocaleString()}`}
              showPercentage={true}
              infoColumns={[
                { label: 'Funds Raised', value: `$${Math.round(progress.amountRaised).toLocaleString()}` },
                { label: 'Initial Price', value: `$${progress.priceUsd.toFixed(2)} per ${ICO_CONFIG.TOKEN.symbol}` },
              ]}
              className="w-full"
            />
          )}
          {progress && (
            <p className='text-[hsl(var(--ico-text-secondary))] pl-2'>Hard Cap: ${Math.round(progress.hardCapUsd).toLocaleString()}</p>
          )}
        </div>

        {/* Wallet Card */}
        <WalletCard
          walletAddress={isConnected ? account?.publicKey : undefined}
          balanceCSPR={balances.cspr}
          balanceUSDT={balances.usdt}
          balanceUSDC={balances.usdc}
          balanceBIG={balances.big}
          balanceError={balanceError}
          balancesLoading={balancesLoading}
          tokenPrice={progress?.priceUsd ?? 0}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          csprPriceUsd={csprPriceUsd}
          onConnect={connect}
          onPurchase={handlePurchase}
          className="w-full"
        />
      </div>

      {/* User Token Balance - show only when progress data exists */}
      {progress && (
        <UserTokenBalance
          tokensPurchased={MOCK_USER_BALANCE.tokensPurchased}
          totalSpentUSD={MOCK_USER_BALANCE.totalSpentUSD}
          tokenPrice={progress.priceUsd}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          className="mt-8"
        />
      )}

      {/* Transaction History */}
      <TransactionHistory
        transactions={MOCK_TRANSACTIONS}
        className="mt-8 max-w-5xl"
      />

      {/* Purchase Confirmation Modal */}
      {modalProps && (
        <PurchaseConfirmationModal {...modalProps} />
      )}

      {/* Transaction Status Toast */}
      {toastProps && (
        <TransactionStatusToast {...toastProps} />
      )}
    </div>
  );
}

export default PrivateSaleActive;
