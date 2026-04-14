import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { rawTokenToNumber } from '@/lib/tokenAmount';
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
import { useUnbondingStatus } from '@/hooks/ico/useUnbondingStatus';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import { PurchaseConfirmationModal } from '../shared/PurchaseConfirmationModal';
import { TransactionStatusToast } from '../shared/TransactionStatusToast';
import { UserTokenBalance } from '../shared/UserTokenBalance';
import { TransactionHistory } from '../shared/TransactionHistory';
import { VestingProgressBlock, type VestingEntry } from '../shared/VestingProgressBlock';
import { UnbondingStatusBlock } from '../shared/UnbondingStatusBlock';
import { useICOActions } from '@/hooks/ico/useICOActions';

interface PrivateSaleActiveProps {
  className?: string;
  endTimestamp: number;
  progress?: ScheduleProgress | null;
}

function mapToScheduleProgress(p: IcoProgressResponse): ScheduleProgress {
  return {
    tokensSold:       rawTokenToNumber(p.tokensSold, 18),
    totalAllocation:  rawTokenToNumber(p.totalAllocation, 18),
    tokensRemaining:  rawTokenToNumber(p.tokensRemaining, 18),
    amountRaised:     p.amountRaised,
    hardCapUsd:       p.hardCapUsd,
    priceUsd:         p.priceUsd,
    percentSold:      p.percentSold,
  };
}

export function PrivateSaleActive({ className, endTimestamp, progress }: PrivateSaleActiveProps) {
  const queryClient = useQueryClient();

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
  const vestingEntries = useMemo<VestingEntry[]>(() => {
    if (!vestingSchedules?.data?.length) return [];
    return vestingSchedules.data.map((s) => ({
      id: s.id,
      lockedAmount: s.lockedAmount,
      purchaseTimestamp: s.purchaseTimestamp,
      unlockTimestamp: s.unlockTimestamp,
      unlockedAmount: s.unlockedAmount,
      vestingEndTimestamp: s.vestingEndTimestamp,
    }));
  }, [vestingSchedules]);

  const userBalance = useMemo(() => {
    if (icoBalance) {
      const tokensPurchased = rawTokenToNumber(icoBalance.tokensPurchased ?? '', 18);
      return {
        tokensPurchased,
        currentValue: icoBalance.currentValue ?? undefined,
      };
    }
    const tokensPurchased = transactions
      .filter((tx) => tx.type === 'purchase' && tx.direction !== 'out')
      .reduce((sum, tx) => sum + tx.tokensReceived, 0);
    return { tokensPurchased, currentValue: undefined };
  }, [icoBalance, transactions]);

  // ── Claim + Withdraw flows ──────────────────────────────────────────
  const {
    claimState,
    handleClaim,
    claimingId,
    claimToastVisible,
    setClaimToastVisible,
    withdrawState,
    withdraw,
    withdrawToastVisible,
    setWithdrawToastVisible,
  } = useICOActions(account?.publicKey ?? null, clickRef ?? null);

  const { data: unbondingData } = useUnbondingStatus(accountHash);

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
          tokenPrice={effectiveProgress.priceUsd}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          currentValue={userBalance.currentValue}
          className="mt-8"
        />
      )}

      {/* Unbonding Status */}
      <UnbondingStatusBlock
        accountHash={accountHash}
        tokenSymbol={ICO_CONFIG.TOKEN.symbol}
        onWithdraw={withdraw}
        withdrawStep={withdrawState.step}
        className="mt-8"
      />

      {/* Vesting Progress */}
      {vestingEntries.length > 0 && (
        <VestingProgressBlock
          vestingEntries={vestingEntries}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          tokenPrice={effectiveProgress?.priceUsd}
          onClaim={handleClaim}
          claimingId={claimingId}
          claimStep={claimState.step}
          hasActiveUnbonding={!!(unbondingData?.unbondingAmount && !unbondingData.isWithdrawable)}
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

      {/* Purchase Transaction Status Toast */}
      {toastProps && (
        <TransactionStatusToast {...toastProps} />
      )}

      {/* Claim Transaction Status Toast */}
      <TransactionStatusToast
        isVisible={claimToastVisible}
        onClose={() => setClaimToastVisible(false)}
        step={claimState.step}
        txHash={claimState.txHash}
        tokensReceived={null}
        error={claimState.error}
        tokenSymbol={ICO_CONFIG.TOKEN.symbol}
        successTitle="Claim Successful!"
        errorTitle="Claim Failed"
        pendingTitle="Claiming tokens..."
      />

      {/* Withdraw Transaction Toast */}
      <TransactionStatusToast
        isVisible={withdrawToastVisible}
        onClose={() => setWithdrawToastVisible(false)}
        step={withdrawState.step}
        txHash={withdrawState.txHash}
        tokensReceived={null}
        error={withdrawState.error}
        tokenSymbol={ICO_CONFIG.TOKEN.symbol}
        successTitle="Withdraw Successful!"
        errorTitle="Withdraw Failed"
        pendingTitle="Withdrawing tokens..."
      />
    </div>
  );
}

export default PrivateSaleActive;
