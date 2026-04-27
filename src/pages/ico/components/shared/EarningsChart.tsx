import { useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from './Card';
import { PeriodSelector } from './PeriodSelector';
import { useStakingEarnings } from '@/hooks/ico/useStakingEarnings';
import type { EarningsPeriod } from '@/types/ico';

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: '#1F7A63',
  },
};

const PERIOD_OPTIONS = [
  { label: '1m', value: '1m' as EarningsPeriod },
  { label: '3m', value: '3m' as EarningsPeriod },
  { label: '6m', value: '6m' as EarningsPeriod },
  { label: '1y', value: '1y' as EarningsPeriod },
  { label: 'all', value: 'all' as EarningsPeriod },
];

interface EarningsChartProps {
  accountHash: string | null | undefined;
  className?: string;
}

export function EarningsChart({ accountHash, className }: EarningsChartProps) {
  const [period, setPeriod] = useState<EarningsPeriod>('6m');
  const { data: stakingEarnings, isLoading, error } = useStakingEarnings(accountHash, period);

  const chartData = stakingEarnings?.data ?? [];

  return (
    <Card className={className}>
      <div className="w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
            Earnings Overview
          </h3>
          <PeriodSelector options={PERIOD_OPTIONS} selected={period} onChange={setPeriod} />
        </div>

        {isLoading && (
          <div className="h-[200px] w-full animate-pulse rounded-md bg-[hsl(var(--ico-bg-secondary))]" aria-label="Loading earnings chart" />
        )}

        {!isLoading && error && (
          <div className="h-[200px] w-full flex items-center justify-center text-sm text-[hsl(var(--ico-text-secondary))]" role="alert">
            Failed to load earnings data
          </div>
        )}

        {!isLoading && !error && chartData.length === 0 && (
          <div className="h-[200px] w-full flex items-center justify-center text-sm text-[hsl(var(--ico-text-secondary))]">
            No earnings data available
          </div>
        )}

        {!isLoading && !error && chartData.length > 0 && (
          <ChartContainer
            config={chartConfig}
            className="h-[200px] w-full"
            role="img"
            aria-label="Staking earnings overview chart"
          >
            <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
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
        )}
      </div>
    </Card>
  );
}

export default EarningsChart;
