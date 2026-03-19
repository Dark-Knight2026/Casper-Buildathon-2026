import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';
import type { IcoProgressResponse } from '@/types/ico';
import { ICO_CONFIG } from '@/constants/ico';
import { Title } from '../shared/Title';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { CountdownTimer } from '../shared/CountdownTimer';
import { usePurchaseFlow } from '@/hooks/ico/usePurchaseFlow';
import { useICOProgress } from '@/hooks/ico/useICOProgress';
import { useTransactionHistory } from '@/hooks/ico/useTransactionHistory';
import { useICOBalance } from '@/hooks/ico/useICOBalance';
import { useVestingSchedules } from '@/hooks/ico/useVestingSchedules';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import { PurchaseConfirmationModal } from '../shared/PurchaseConfirmationModal';
import { TransactionStatusToast } from '../shared/TransactionStatusToast';
import { UserTokenBalance } from '../shared/UserTokenBalance';
import { TransactionHistory } from '../shared/TransactionHistory';
import { VestingProgressBlock, type VestingEntry } from '../shared/VestingProgressBlock';
import { useClaimTokens } from '@/hooks/ico/useClaimTokens';
import { useToast } from '@/hooks/use-toast';

interface PrivateSaleActiveProps {
  className?: string;
  endTimestamp: number;
  progress?: ScheduleProgress | null;
}

const WEI = BigInt('1000000000000000000'); // 10^18

function mapToScheduleProgress(p: IcoProgressResponse): ScheduleProgress {
  return {
    tokensSold:       Number(BigInt(p.tokensSold)       / WEI),
    totalAllocation:  Number(BigInt(p.totalAllocation)  / WEI),
    tokensRemaining:  Number(BigInt(p.tokensRemaining)  / WEI),
    amountRaised:     p.amountRaised,
    hardCapUsd:       p.hardCapUsd,
    priceUsd:         p.priceUsd,
    percentSold:      p.percentSold,
  };
}

export function PrivateSaleActive({ className, endTimestamp, progress }: PrivateSaleActiveProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── ICO progress ────────────────────────────────────────────────────
  const { data: icoProgress } = useICOProgress();

  const effectiveProgress = useMemo<ScheduleProgress | null>(() => {
    if (icoProgress) return mapToScheduleProgress(icoProgress);
    return progress ?? null;
  }, [icoProgress, progress]);

  const tokenPrice = effectiveProgress?.priceUsd ?? 0;

  // ── Purchase flow ───────────────────────────────────────────────────
  const onPurchaseSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ico-progress'] });
  }, [queryClient]);

  const {
    isConnected,
    account,
    connect,
    clickRef,
    balances,
    balanceError,
    balancesLoading,
    csprPriceUsd,
    csprPriceStale,
    handlePurchase,
    modalProps,
    toastProps,
    buyCspr,
  } = usePurchaseFlow({
    tokenPrice,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    onPurchaseSuccess,
  });

  const accountHash = account?.publicKey ? deriveAccountHash(account.publicKey) : null;

  // ── User data ───────────────────────────────────────────────────────
  const [txPage, setTxPage] = useState(1);
  const { transactions, totalPages } = useTransactionHistory(accountHash, txPage);
  const { data: icoBalance } = useICOBalance(accountHash);
  const { data: vestingSchedules } = useVestingSchedules(accountHash);
  console.log('vestingSchedules:', vestingSchedules);
  const vestingEntries = useMemo<VestingEntry[]>(() => {
    if (!vestingSchedules?.data?.length) return [];
    return vestingSchedules.data.map((s) => ({
      id: s.id,
      lockedAmount: s.lockedAmount,
      purchaseTimestamp: s.purchaseTimestamp,
      unlockTimestamp: s.unlockTimestamp,
      unlockedAmount: s.unlockedAmount,
    }));
  }, [vestingSchedules]);

  const userBalance = useMemo(() => {
    if (icoBalance) {
      const tokensPurchased = Number(BigInt(icoBalance.tokensPurchased)) / 1e18;
      return {
        tokensPurchased,
        totalSpentUSD: icoBalance.totalSpentUsd ?? 0,
        currentValue: icoBalance.currentValue ?? undefined,
      };
    }
    const tokensPurchased = transactions.reduce((sum, tx) => sum + tx.tokensReceived, 0);
    return { tokensPurchased, totalSpentUSD: tokensPurchased * tokenPrice, currentValue: undefined };
  }, [icoBalance, transactions, tokenPrice]);

  // ── Claim flow ──────────────────────────────────────────────────────
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { state: claimState, claim } = useClaimTokens(
    account?.publicKey ?? null,
    clickRef ?? null,
    {
      onSuccess: () => {
        setClaimingId(null);
        queryClient.invalidateQueries({ queryKey: ['vesting-schedules'] });
      },
      onError: (error) => {
        console.error('[useClaimTokens] claim failed:', error);
        toast({ title: 'Claim failed', description: error, variant: 'destructive' });
      },
    },
  );

  const handleClaim = useCallback(
    (vestingId: bigint) => {
      setClaimingId(vestingId.toString());
      claim(vestingId);
    },
    [claim],
  );

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

          {effectiveProgress && (
            <>
              <ProgressBar
                currentValue={effectiveProgress.tokensSold}
                maxValue={effectiveProgress.totalAllocation}
                label="Progress"
                rightLabel={`$${Math.round(effectiveProgress.amountRaised).toLocaleString()} / $${Math.round(effectiveProgress.hardCapUsd).toLocaleString()}`}
                showPercentage={true}
                infoColumns={[
                  { label: 'Funds Raised', value: `$${Math.round(effectiveProgress.amountRaised).toLocaleString()}` },
                  { label: 'Initial Price', value: `$${effectiveProgress.priceUsd.toFixed(2)} per ${ICO_CONFIG.TOKEN.symbol}` },
                ]}
                className="w-full"
              />
              <p className='text-[hsl(var(--ico-text-secondary))] pl-2'>
                Hard Cap: ${Math.round(effectiveProgress.hardCapUsd).toLocaleString()}
              </p>
            </>
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
          tokenPrice={effectiveProgress?.priceUsd ?? 0}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          csprPriceUsd={csprPriceUsd}
          csprPriceStale={csprPriceStale}
          onConnect={connect}
          onPurchase={handlePurchase}
          onBuyCspr={buyCspr}
          className="w-full"
        />
      </div>

      {/* User Token Balance - show when there are completed purchases */}
      {effectiveProgress && userBalance.tokensPurchased > 0 && (
        <UserTokenBalance
          tokensPurchased={userBalance.tokensPurchased}
          totalSpentUSD={userBalance.totalSpentUSD}
          tokenPrice={effectiveProgress.priceUsd}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          currentValue={userBalance.currentValue}
          className="mt-8"
        />
      )}

      {/* Vesting Progress */}
      {vestingEntries.length > 0 && (
        <VestingProgressBlock
          vestingEntries={vestingEntries}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          tokenPrice={effectiveProgress?.priceUsd}
          onClaim={handleClaim}
          claimingId={claimingId}
          claimStep={claimState.step}
          className="mt-8"
        />
      )}

      {/* Transaction History */}
      <TransactionHistory
        transactions={transactions}
        currentPage={txPage}
        totalPages={totalPages}
        onPageChange={setTxPage}
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
