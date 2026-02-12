import { memo } from 'react';
import { Card } from '../shared/Card';
import { SubTitle } from '../shared/SubTitle';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { Coins } from 'lucide-react';
import { MOCK_VESTING_SCHEDULE, MOCK_ALLOCATION_DATA } from '@/constants/icoMockData';

const TOTAL_SUPPLY = '1,000,000,000';

const vestingChartConfig = {
  released: { label: 'Released Tokens', color: '#3b82f6' },
};

const allocationChartConfig = Object.fromEntries(
  MOCK_ALLOCATION_DATA.map(({ name, color }) => [
    name.toLowerCase().replace(/\s+/g, '_'),
    { label: name, color },
  ])
);

const VestingChart = memo(function VestingChart() {
  return (
    <ChartContainer
      config={vestingChartConfig}
      className="h-62.5 w-full aspect-auto md:aspect-video"
    >
      <AreaChart data={MOCK_VESTING_SCHEDULE}>
        <defs>
          <linearGradient id="fill-released" x1="0" y1="0" x2="0" y2="1">
            <stop offset="15%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
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
          tickFormatter={(value) => `${(value / 1_000_000).toFixed(0)}M`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="text-white"
              formatter={(value) => `${Number(value).toLocaleString()} BIG`}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="released"
          stroke="#3b82f6"
          fill="url(#fill-released)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
});

const AllocationChart = memo(function AllocationChart() {
  return (
    <ChartContainer
      config={allocationChartConfig}
      className="h-64 w-64 shrink-0 aspect-square"
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="text-white"
              formatter={(value, name) => `${name} ${value}%`}
              hideLabel
            />
          }
        />
        <Pie
          data={MOCK_ALLOCATION_DATA}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          strokeWidth={2}
        >
          {MOCK_ALLOCATION_DATA.map((entry) => (
            <Cell
              key={entry.name}
              fill={`${entry.color}70`}
              stroke={entry.color}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
});

export function TokenomicsTab() {
  return (
    <div className="space-y-6">
      <SubTitle>Tokenomics</SubTitle>

      {/* Total Supply */}
      <Card className="p-5">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-accent)/0.2)] flex items-center justify-center">
              <Coins className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
                Total Supply
              </p>
              <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                {TOTAL_SUPPLY} BIG
              </p>
            </div>
          </div>
        </div>
      </Card>
      <div className='flex gap-4'>
        {/* Vesting & Release Schedule */}
        <Card className="p-5">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
              Vesting & Release Schedule
            </h3>
<VestingChart />
          </div>
        </Card>

        {/* Token Allocation */}
        <Card className="p-5">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
              Token Allocation
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <AllocationChart />

              <div className="flex flex-col gap-2 w-full">
                {MOCK_ALLOCATION_DATA.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-[hsl(var(--ico-text-secondary))]">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[hsl(var(--ico-text-primary))]">
                      {entry.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default TokenomicsTab;
