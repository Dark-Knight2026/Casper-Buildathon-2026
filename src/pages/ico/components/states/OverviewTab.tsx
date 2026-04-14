import { memo, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../shared/Card';
import { TrendingUp, Clock, Percent, Wallet } from 'lucide-react';
import { TransactionHistory } from '../shared/TransactionHistory';
import { EarningsChart } from '../shared/EarningsChart';
import { VestingProgressBlock, type VestingEntry } from '../shared/VestingProgressBlock';
import { UnbondingStatusBlock } from '../shared/UnbondingStatusBlock';
import { TransactionStatusToast } from '../shared/TransactionStatusToast';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useTransactionHistory } from '@/hooks/ico/useTransactionHistory';
import { useStakingPortfolio } from '@/hooks/ico/useStakingPortfolio';
import { useStakingInfo } from '@/hooks/ico/useStakingInfo';
import { useVestingSchedules } from '@/hooks/ico/useVestingSchedules';
import { useUnbondingStatus } from '@/hooks/ico/useUnbondingStatus';
import { useICOProgress } from '@/hooks/ico/useICOProgress';
import { useICOActions } from '@/hooks/ico/useICOActions';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import { formatNumber, formatUSD } from '../../utils/formatters';
import { ICO_CONFIG } from '@/constants/ico';

const PAGE_SIZE = 8;

export const OverviewTab = memo(function OverviewTab() {
  const { account, clickRef } = useICOWallet();
  const accountHash = account?.publicKey ? deriveAccountHash(account.publicKey) : null;
  const [page, setPage] = useState(1);
  const { transactions, totalPages } = useTransactionHistory(accountHash, page, PAGE_SIZE);
  const { data: stakingPortfolio } = useStakingPortfolio(accountHash);
  const { data: stakingInfo } = useStakingInfo(accountHash);
  const { data: vestingSchedules } = useVestingSchedules(accountHash);
  const { data: icoProgress } = useICOProgress();
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

  const { data: unbondingData, isLoading: unbondingLoading } = useUnbondingStatus(accountHash ?? null);
  const dashboardCards = useMemo(() => [
    {
      label: 'BIG Balance',
      value: stakingPortfolio?.bigInWallet ?? 0,
      icon: Wallet,
      color: 'var(--ico-card-wallet)',
    },
    {
      label: 'BIG Staked',
      value: stakingPortfolio?.bigStaked ?? 0,
      icon: TrendingUp,
      color: 'var(--ico-card-staked)',
    },
    {
      label: 'Rewards Earned',
      value: stakingPortfolio?.rewardsEarned ?? 0,
      icon: TrendingUp,
      color: 'var(--ico-card-rewards)',
    },
  ], [stakingPortfolio]);

  return (
    <div className="space-y-4">
      {/* BIG Value */}
      <Card className="p-5">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
          <div className='flex flex-col md:flex-row gap-3 md:gap-6 md:items-center'>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'hsl(var(--ico-card-total) / 0.1)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: 'hsl(var(--ico-card-total))' }} />
            </div>
            <p className="text-sm md:text-xl text-[hsl(var(--ico-text-secondary))]">BIG Value</p>
          </div>

          <p className="text-xl font-bold text-[hsl(var(--ico-text-primary))]">
            {formatNumber(stakingPortfolio?.totalBig ?? 0)}
          </p>
          <p className="text-sm md:text-xl text-[hsl(var(--ico-text-muted))]">
            {formatUSD(stakingPortfolio?.estimatedUsdValue ?? 0)}
          </p>
        </div>
      </Card>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="w-full flex flex-col items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `hsl(${card.color} / 0.1)` }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: `hsl(${card.color})` }}
                  />
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">{card.label}</p>
                  <p className="text-xl font-bold text-[hsl(var(--ico-text-primary))]">
                    {formatNumber(card.value)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Second Row: Staking Info + Earnings Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Staking Info Card */}
        <Card className="p-5">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">Staking Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-brand-accent)/0.2)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Next Rewards</p>
                  <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                    —
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-state-active)/0.2)] flex items-center justify-center">
                  <Percent className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Current APY</p>
                  <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                    {formatNumber(stakingInfo?.currentApy ?? 0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <EarningsChart accountHash={accountHash} className="md:col-span-2" />
      </div>

      {/* Unbonding Status */}
      <UnbondingStatusBlock
        data={unbondingData}
        isLoading={unbondingLoading}
        tokenSymbol={ICO_CONFIG.TOKEN.symbol}
        onWithdraw={withdraw}
        withdrawStep={withdrawState.step}
      />

      {/* Vesting Progress */}
      {vestingEntries.length > 0 && (
        <Card className="p-5">
          <VestingProgressBlock
            vestingEntries={vestingEntries}
            tokenSymbol={ICO_CONFIG.TOKEN.symbol}
            onClaim={handleClaim}
            claimingId={claimingId}
            claimStep={claimState.step}
            hasActiveUnbonding={!!(unbondingData?.unbondingAmount && !unbondingData.isWithdrawable)}
            tokenPrice={icoProgress?.priceUsd}
          />
        </Card>
      )}

      {/* Third Row: Portfolio Value + Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estimated Portfolio Value */}
        <Card className="p-5">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">Estimated Portfolio Value</h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-[hsl(var(--ico-text-primary))]">
                {formatUSD(stakingPortfolio?.estimatedUsdValue ?? 0)}
              </p>
              {(() => {
                const change = stakingPortfolio?.change24hPercent ?? 0;
                return (
                  <p className={cn('text-sm', change >= 0 ? 'text-[hsl(var(--ico-state-active))]' : 'text-red-400')}>
                    {change >= 0 ? '+' : ''}{change}% (24h)
                  </p>
                );
              })()}
              <p className='text-[hsl(var(--ico-text-secondary))]'>Current USD value of your holdings</p>
            </div>
          </div>
        </Card>

        {/* Transactions Card */}
        <div className="md:col-span-2">
          <TransactionHistory
            transactions={transactions}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="p-5"
          />
        </div>
      </div>

      {/* Claim Transaction Toast */}
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
});

