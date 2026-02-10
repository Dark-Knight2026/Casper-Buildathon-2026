import { memo } from 'react';
import { Card } from '../shared/Card';
import { SubTitle } from '../shared/SubTitle';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Coins, Percent, Clock, ArrowRightLeft, Users, Timer, Handshake } from 'lucide-react';

const MOCK_STAKING = {
  stakedTokens: '500,000',
  currentAPY: '12.5',
  nextRewards: '2d 14h 32m',
};

const MOCK_FEE_DATA = [
  { day: '1', swap: 10, transfer: 5, bridge: 2, lease: 8, liquidation: 1 },
  { day: '10', swap: 45, transfer: 20, bridge: 12, lease: 30, liquidation: 5 },
  { day: '20', swap: 90, transfer: 48, bridge: 25, lease: 65, liquidation: 12 },
  { day: '30', swap: 140, transfer: 75, bridge: 40, lease: 110, liquidation: 20 },
  { day: '45', swap: 200, transfer: 110, bridge: 58, lease: 160, liquidation: 32 },
  { day: '60', swap: 260, transfer: 150, bridge: 75, lease: 210, liquidation: 45 },
  { day: '75', swap: 320, transfer: 190, bridge: 90, lease: 260, liquidation: 60 },
  { day: '90', swap: 400, transfer: 240, bridge: 110, lease: 320, liquidation: 80 },
];

const FEE_LINES = [
  { key: 'swap', label: 'Swap', color: '#3b82f6' },
  { key: 'transfer', label: 'Transfer', color: '#8b5cf6' },
  { key: 'bridge', label: 'Bridge', color: '#06b6d4' },
  { key: 'lease', label: 'Lease', color: '#d4a847' },
  { key: 'liquidation', label: 'Liquidation', color: '#ef4444' },
] as const;

const feeChartConfig = Object.fromEntries(
  FEE_LINES.map(({ key, label, color }) => [key, { label, color }])
);

const REWARDS_LIST = [
  {
    title: 'Transaction Fee Rewards',
    description: 'Earn a share of 2% of LeaseFi transaction volume',
    icon: ArrowRightLeft,
  },
  {
    title: 'Referral Bonuses',
    description: 'Earn rewards for referring new users to the platform',
    icon: Users,
  },
  {
    title: 'Long-Term Holder Bonuses',
    description: 'Unlock additional rewards by holding BIG tokens long term',
    icon: Timer,
  },
  {
    title: 'Partner Rewards',
    description: 'Earn from bringing new partners or businesses to LeaseFi',
    icon: Handshake,
  },
];

export const RewardsTab = memo(function RewardsTab() {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-accent)/0.2)] flex items-center justify-center">
                <Coins className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Staked Tokens</p>
                <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                  {MOCK_STAKING.stakedTokens} BIG
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
                  {MOCK_STAKING.currentAPY}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-accent)/0.2)] flex items-center justify-center">
                <Clock className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Next Rewards</p>
                <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                  {MOCK_STAKING.nextRewards}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Fee Rewards Chart */}
      <Card className="p-5">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
            Transaction Fee Rewards
          </h3>
          {/* <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            {FEE_LINES.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-[hsl(var(--ico-text-secondary))]">{label}</span>
              </div>
            ))}
          </div> */}
          <ChartContainer config={feeChartConfig} className="h-62.5 w-full aspect-auto md:aspect-video">
            <AreaChart data={MOCK_FEE_DATA}>
              <defs>
                {FEE_LINES.map(({ key, color }) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="15%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                label={{
                  value: 'Days Since Launch',
                  position: 'insideBottom',
                  offset: -5,
                  fill: 'hsl(var(--ico-text-muted))',
                  fontSize: 12,
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {FEE_LINES.map(({ key, color }) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  fill={`url(#fill-${key})`}
                  strokeWidth={2}
                />
              ))}
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
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-accent)/0.2)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--ico-text-primary))]">
                      {reward.title}
                    </p>
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

export default RewardsTab;
