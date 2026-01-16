import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface DataPoint {
  [key: string]: string | number;
}

interface BarConfig {
  dataKey: string;
  fill: string;
  name?: string;
}

interface BarChartComponentProps {
  data: DataPoint[];
  bars: BarConfig[];
  xAxisKey: string;
  title?: string;
  description?: string;
  isLoading?: boolean;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Reusable Bar Chart Component
 * 
 * @example
 * <BarChartComponent
 *   data={monthlyData}
 *   bars={[
 *     { dataKey: 'sales', fill: '#8884d8', name: 'Sales' },
 *     { dataKey: 'deals', fill: '#82ca9d', name: 'Deals' }
 *   ]}
 *   xAxisKey="month"
 *   title="Monthly Sales"
 *   stacked={false}
 * />
 */
export const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  bars,
  xAxisKey,
  title,
  description,
  isLoading = false,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
  action,
  className,
}) => {
  const isEmpty = !data || data.length === 0;

  return (
    <ChartContainer
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={isEmpty}
      height={height}
      action={action}
      className={className}
    >
      <BarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis 
          dataKey={xAxisKey} 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
        />
        {showLegend && <Legend />}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.fill}
            name={bar.name || bar.dataKey}
            stackId={stacked ? 'stack' : undefined}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
};