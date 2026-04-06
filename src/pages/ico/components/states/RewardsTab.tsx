import { memo, useState } from 'react';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useRewardsHistory } from '@/hooks/ico/useRewardsHistory';
import { useStakingInfo } from '@/hooks/ico/useStakingInfo';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import { Card } from '../shared/Card';
import { SubTitle } from '../shared/SubTitle';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Coins, Percent, Clock, ArrowRightLeft, Users, Timer, Trophy } from 'lucide-react';
import { PeriodSelector } from '../shared/PeriodSelector';
import { formatNumber } from '../../utils/formatters';

const rewardsChartConfig = {
  stakingPool: { label: 'Staking Reserve Pool', color: '#1F7A63' },
  txFees: { label: 'Transaction Fees', color: '#6BB5A0' },
};

const PERIOD_OPTIONS: { label: string; value: number }[] = [
  { label: '1m', value: 30 },
  { label: '2m', value: 60 },
  { label: '3m', value: 90 },
  { label: '6m', value: 180 },
  { label: '1y', value: 365 },
];


const REWARDS_LIST: { title: string; description: string; icon: typeof ArrowRightLeft; badge?: string }[] = [
  {
    title: 'Transaction Fee Distribution',
    description: '2% fee on all KeyChain ecosystem transactions, distributed via Dynamic Scaling Model based on staking participation tiers (up to 100% of fees at 80%+ staked)',
    icon: ArrowRightLeft,
  },
  {
    title: 'Staking Reserve Pool',
    description: '6% annual release from the 1B BIG reserve (~60M tokens/year), distributed pro rata to stakers for approximately 17 years',
    icon: Coins,
  },
  {
    title: 'Early Adopter Rewards',
    description: 'Pre-sale participants earn from LeaseFi transaction fees starting December 2026, forming the initial rewards foundation',
    icon: Timer,
    badge: 'Coming Soon',
  },
  {
    title: 'Realtor Performance Rewards',
    description: 'Agents earn BIG tokens based on the Agent Quality Index (AQI) rankings, with staking multipliers and priority placement for top performers',
    icon: Trophy,
    badge: 'Coming Soon',
  },
  {
    title: 'Referral & Community Rewards',
    description: 'Earn rewards for referrals, platform usage, and community engagement within the KeyChain ecosystem',
    icon: Users,
    badge: 'Coming Soon',
  },
];

export const RewardsTab = memo(function RewardsTab() {
  const { account } = useICOWallet();
  const accountHash = account?.publicKey ? deriveAccountHash(account.publicKey) : null;
  const [rewardsPeriod, setRewardsPeriod] = useState(90);
  const { data: rewardsHistory } = useRewardsHistory(accountHash, rewardsPeriod);
  const { data: stakingInfo } = useStakingInfo(accountHash);

  return (
    <div className="space-y-6">
      {/* Title */}
      <SubTitle>Staking</SubTitle>

      {/* Staking Info */}
      <Card className="p-5">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
            Staking
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-brand-accent)/0.2)] flex items-center justify-center">
                <Coins className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Staked Tokens</p>
                <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                  {stakingInfo?.stakedTokens ?? 0} BIG
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-state-active)/0.2)] flex items-center justify-center">
                <Percent className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Pending Rewards</p>
                <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                  {formatNumber(stakingInfo?.pendingRewards ?? 0)} BIG
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
          </div>
        </div>
      </Card>

      {/* Your Rewards Chart */}
      <Card className="p-5">
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
              Your Rewards
            </h3>
            <PeriodSelector options={PERIOD_OPTIONS} selected={rewardsPeriod} onChange={setRewardsPeriod} />
          </div>
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-4">
            Accumulated BIG tokens by reward source
          </p>
          <ChartContainer config={rewardsChartConfig} className="h-70 w-full aspect-auto md:aspect-video">
            <AreaChart
              data={rewardsHistory?.data ?? []}
              margin={{ top: 10, left: 20, right: 12, bottom: 20 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--ico-border-color))" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                label={{ value: 'Days', position: 'insideBottom', dy: 10, fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString()}
                label={{ value: 'Amount, BIG', angle: -90, position: 'insideLeft', dx: -5, fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                type="natural"
                dataKey="stakingPool"
                fill="var(--color-stakingPool)"
                fillOpacity={0.4}
                stroke="var(--color-stakingPool)"
                stackId="a"
              />
              <Area
                type="natural"
                dataKey="txFees"
                fill="var(--color-txFees)"
                fillOpacity={0.4}
                stroke="var(--color-txFees)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </div>
      </Card>

      {/* Rewards List */}
      <Card className="p-5">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
            Rewards
          </h3>
          <div className="space-y-4">
            {REWARDS_LIST.map((reward) => {
              const Icon = reward.icon;
              return (
                <div key={reward.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-brand-accent)/0.2)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[hsl(var(--ico-text-primary))]">
                        {reward.title}
                      </p>
                      {reward.badge && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 whitespace-nowrap text-[hsl(var(--ico-text-muted))]">
                          {reward.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
                      {reward.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
});

