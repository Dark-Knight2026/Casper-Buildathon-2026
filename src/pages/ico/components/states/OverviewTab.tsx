import { memo, useMemo } from 'react';
import { Card } from '../shared/Card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Clock, Percent, Wallet } from 'lucide-react';
import { TransactionHistory } from '../shared/TransactionHistory';
import { MOCK_TRANSACTIONS } from '@/constants/ico';
import { MOCK_DASHBOARD, MOCK_STAKING_INFO, MOCK_EARNINGS_DATA, MOCK_PORTFOLIO } from '@/constants/icoMockData';
import { formatNumber, formatUSD } from '../../utils/formatters';

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: '#1F7A63',  /* Primary green */
  },
};

export const OverviewTab = memo(function OverviewTab() {
  const dashboardCards = useMemo(() => [
    {
      label: 'BIG Balance',
      value: MOCK_DASHBOARD.bigInWallet,
      usdValue: '100.00',
      icon: Wallet,
      color: 'var(--ico-card-wallet)',
    },
    {
      label: 'BIG Staked',
      value: MOCK_DASHBOARD.bigStaked,
      usdValue: '750.00',
      icon: TrendingUp,
      color: 'var(--ico-card-staked)',
    },
    {
      label: 'Rewards Earned',
      value: MOCK_DASHBOARD.rewardsEarned,
      usdValue: '8.25',
      icon: TrendingUp,
      color: 'var(--ico-card-rewards)',
    },
    {
      label: 'BIG Value',
      value: MOCK_DASHBOARD.totalBig,
      usdValue: MOCK_DASHBOARD.estimatedUsdcValue,
      icon: TrendingUp,
      color: 'var(--ico-card-total)',
    },
  ], []);
  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-[hsl(var(--ico-text-muted))]">
                    {formatUSD(card.usdValue)}
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
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
              Staking Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-brand-accent)/0.2)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Next Rewards</p>
                  <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                    {MOCK_STAKING_INFO.nextRewards}
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
                    {MOCK_STAKING_INFO.currentAPY}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Earnings Overview Chart */}
        <Card className="p-5 md:col-span-2">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
              Earnings Overview
            </h3>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={MOCK_EARNINGS_DATA} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--ico-border-color))" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  type="natural"
                  dataKey="earnings"
                  fill="var(--color-earnings)"
                  fillOpacity={0.4}
                  stroke="var(--color-earnings)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </Card>
      </div>

      {/* Third Row: Portfolio Value + Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estimated Portfolio Value */}
        <Card className="p-5">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
              Estimated Portfolio Value
            </h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-[hsl(var(--ico-text-primary))]">
                {formatUSD(MOCK_PORTFOLIO.estimatedValue)}
              </p>
              <p className="text-sm text-[hsl(var(--ico-state-active))]">
                {MOCK_PORTFOLIO.change24h}% (24h)
              </p>
              <p className='text-[hsl(var(--ico-text-secondary))]'>Current USD value of your holdings</p>
            </div>
          </div>
        </Card>

        {/* Transactions Card */}
        <TransactionHistory transactions={MOCK_TRANSACTIONS} className="md:col-span-2 p-5" />
      </div>
    </div>
  );
});

