import { useMemo } from 'react';
import { Card } from '../shared/Card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis } from 'recharts';
import { TrendingUp, Clock, Percent, Wallet } from 'lucide-react';
import { TransactionHistory } from '../shared/TransactionHistory';
import { MOCK_TRANSACTIONS } from '@/constants/ico';
import { formatNumber, formatUSD } from '../../utils/formatters';

// Mock data
const MOCK_DASHBOARD = {
  bigInWallet: '66666',
  bigStaked: '500000',
  rewardsEarned: '5500',
  totalBig: '572166',
  estimatedUsdcValue: '858.25',
};

const MOCK_STAKING_INFO = {
  nextRewards: '2d 14h 32m',
  currentAPY: '12.5',
};

const MOCK_EARNINGS_DATA = [
  { month: 'Jan', earnings: 120 },
  { month: 'Feb', earnings: 250 },
  { month: 'Mar', earnings: 180 },
  { month: 'Apr', earnings: 420 },
  { month: 'May', earnings: 380 },
  { month: 'Jun', earnings: 550 },
];

const MOCK_PORTFOLIO = {
  estimatedValue: '858.25',
  change24h: '+2.4',
};

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: '#d4a847',
  },
};

export function OverviewTab() {
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
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-accent)/0.2)] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Next Rewards</p>
                  <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                    {MOCK_STAKING_INFO.nextRewards}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-success)/0.2)] flex items-center justify-center">
                  <Percent className="w-5 h-5 text-sky-500" />
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
              <AreaChart data={MOCK_EARNINGS_DATA}>
                <defs>
                  <linearGradient id="fillEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a847" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#d4a847" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#d4a847"
                  fill="url(#fillEarnings)"
                  strokeWidth={2}
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
              <p className="text-sm text-[hsl(var(--ico-success))]">
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
}

export default OverviewTab;
