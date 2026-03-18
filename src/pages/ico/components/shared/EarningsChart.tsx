import { useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from './Card';
import { useStakingEarnings } from '@/hooks/ico/useStakingEarnings';
import type { EarningsPeriod } from '@/types/ico';

const chartConfig = {
  earnings: {
    label: 'Earnings',
    color: '#1F7A63',
  },
};

const PERIODS: EarningsPeriod[] = ['1m', '3m', '6m', '1y', 'all'];

interface EarningsChartProps {
  accountHash: string | null | undefined;
  className?: string;
}

export function EarningsChart({ accountHash, className }: EarningsChartProps) {
  const [period, setPeriod] = useState<EarningsPeriod>('6m');
  const { data: stakingEarnings } = useStakingEarnings(accountHash, period);

  return (
    <Card className={className}>
      <div className="w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
            Earnings Overview
          </h3>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  period === p
                    ? 'bg-[hsl(var(--ico-brand-primary))] text-white'
                    : 'text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={stakingEarnings?.data ?? []} margin={{ left: 12, right: 12 }}>
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
  );
}

export default EarningsChart;
