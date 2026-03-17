import { memo } from 'react';
import { Card } from '../shared/Card';
import { SubTitle } from '../shared/SubTitle';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { Coins, CircleDot } from 'lucide-react';

const TOTAL_SUPPLY = '5 000 000 000';
const CIRCULATING_SUPPLY = '1 000 000 000';

// Vesting schedule based on whitepaper section 4.4
// Liquidity (1B) immediate, Private Sale (1B) 6-mo cliff + 12-mo vest,
// Staking Pool (1B) 6%/yr release, Team (750M) + Advisors (250M) 12-mo cliff + 48-mo vest,
// Treasury (1B) reserved
const MOCK_VESTING_DATA = [
  { month: '0', released: 1_000_000_000 },    // Liquidity immediate
  { month: '6', released: 1_000_000_000 },     // Private Sale cliff starts
  { month: '12', released: 1_810_000_000 },    // Private Sale vesting + Staking 6% + Team/Advisors cliff
  { month: '18', released: 2_290_000_000 },
  { month: '24', released: 2_810_000_000 },
  { month: '30', released: 3_100_000_000 },
  { month: '36', released: 3_410_000_000 },
  { month: '48', released: 3_810_000_000 },
  { month: '60', released: 4_060_000_000 },    // Team/Advisors fully vested
];

// Whitepaper section 4.3 — Token Distribution
const ALLOCATION_DATA = [
  { name: 'Private Sale', value: 20, color: '#1F7A63', vesting: '6-month cliff, 12-month vest', circulating: false },
  { name: 'Staking Reserve Pool', value: 20, color: '#2E8B6F', vesting: 'Released at 6% annually', circulating: false },
  { name: 'Treasury / Reserve', value: 20, color: '#36A080', vesting: 'Future phased projects', circulating: false },
  { name: 'Liquidity', value: 20, color: '#4A9A85', vesting: 'Immediate for DEX/CEX', circulating: true },
  { name: 'Team & Founders', value: 15, color: '#5DAA95', vesting: '12-month cliff, 48-month vest', circulating: false },
  { name: 'Advisors / Partners', value: 5, color: '#70BAA5', vesting: '12-month cliff, 48-month vest', circulating: false },
];

const vestingChartConfig = {
  released: { label: 'Released Tokens', color: '#1F7A63' },  /* Primary green */
};

const allocationChartConfig = {
  value: { label: 'Allocation %', color: '#1F7A63' },
};

const VestingChart = memo(function VestingChart() {
  return (
    <ChartContainer
      config={vestingChartConfig}
      className="h-62.5 w-full aspect-auto md:aspect-video"
    >
      <AreaChart data={MOCK_VESTING_DATA} margin={{ left: 12, right: 12, top: 10, bottom: 20 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--ico-border-color))" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
          label={{ value: 'Months', position: 'insideBottom', dy: 10, fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1_000_000_000).toFixed(1)}B`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums text-white">
                  {Number(value).toLocaleString()} BIG
                </span>
              )}
            />
          }
        />
        <Area
          type="natural"
          dataKey="released"
          fill="var(--color-released)"
          fillOpacity={0.4}
          stroke="var(--color-released)"
        />
      </AreaChart>
    </ChartContainer>
  );
});

const AllocationChart = memo(function AllocationChart() {
  return (
    <ChartContainer
      config={allocationChartConfig}
      className="h-64 w-full"
    >
      <BarChart data={ALLOCATION_DATA} layout="vertical" margin={{ left: 0, right: 40 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--ico-border-color))" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'hsl(var(--ico-text-muted))', fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 25]}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fill: 'hsl(var(--ico-text-secondary))', fontSize: 12 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, _name, props) => {
                const entry = props.payload;
                return (
                  <span className="text-white">
                    {value}% — {entry.circulating ? 'Circulating' : 'Locked'}
                  </span>
                );
              }}
              hideLabel
            />
          }
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {ALLOCATION_DATA.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.circulating ? entry.color : `${entry.color}40`}
              stroke={entry.color}
              strokeWidth={1}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
});

export function TokenomicsTab() {
  return (
    <div className="space-y-6">
      <SubTitle>Tokenomics</SubTitle>

      {/* Supply Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="w-full flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-brand-accent)/0.2)] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Total Supply</p>
              <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                {TOTAL_SUPPLY} BIG
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="w-full flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--ico-success)/0.2)] flex items-center justify-center shrink-0">
              <CircleDot className="w-5 h-5 text-[hsl(var(--ico-brand-primary))]" />
            </div>
            <div>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Circulating Supply</p>
              <p className="text-lg font-semibold text-[hsl(var(--ico-text-primary))]">
                {CIRCULATING_SUPPLY} BIG
              </p>
            </div>
          </div>
        </Card>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {/* Vesting & Release Schedule */}
        <Card className="p-5">
          <div className="w-full h-full flex flex-col gap-4 justify-between">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
              Vesting & Release Schedule
            </h3>
            <VestingChart />
          </div>
        </Card>

        {/* Token Allocation */}
        <Card className="p-5">
          <div className="w-full flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-1">
              Token Allocation
            </h3>
            {/* Circulating vs Locked legend */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0 bg-[#1F7A63]" />
                <span className="text-xs text-[hsl(var(--ico-text-muted))]">Circulating</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded shrink-0 bg-[#1F7A6340]" style={{ border: '1px solid #1F7A63' }} />
                <span className="text-xs text-[hsl(var(--ico-text-muted))]">Locked</span>
              </div>
            </div>
            <AllocationChart />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default TokenomicsTab;
