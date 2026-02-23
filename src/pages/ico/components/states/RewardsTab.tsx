import { memo } from 'react';
import { Card } from '../shared/Card';
import { SubTitle } from '../shared/SubTitle';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Coins, Percent, Clock, ArrowRightLeft, Users, Timer, Handshake } from 'lucide-react';
import { MOCK_STAKING, MOCK_FEE_DATA } from '@/constants/icoMockData';

const FEE_LINES = [
  { key: 'swap', label: 'Swap', color: '#1F7A63' },           /* Primary green */
  { key: 'transfer', label: 'Transfer', color: '#2E8B6F' },   /* Green accent */
  { key: 'lease', label: 'Lease', color: '#36A080' },         /* Green light */
  { key: 'bridge', label: 'Bridge', color: '#4A9A85' },       /* Green medium */
  { key: 'liquidation', label: 'Liquidation', color: '#6BB5A0' }, /* Green lightest */
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
                <Coins className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
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
                <Percent className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
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
                <Clock className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
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
            <AreaChart
              data={MOCK_FEE_DATA}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--ico-border-color))" />
              <XAxis
                dataKey="day"
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
              {FEE_LINES.map(({ key }) => (
                <Area
                  key={key}
                  type="natural"
                  dataKey={key}
                  fill={`var(--color-${key})`}
                  fillOpacity={0.4}
                  stroke={`var(--color-${key})`}
                  stackId="a"
                />
              ))}
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
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-accent)/0.2)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
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
