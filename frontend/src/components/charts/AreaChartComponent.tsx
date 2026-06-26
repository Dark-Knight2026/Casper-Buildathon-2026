import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface DataPoint {
  [key: string]: string | number;
}

interface AreaConfig {
  dataKey: string;
  fill: string;
  stroke: string;
  name?: string;
}

interface AreaChartComponentProps {
  data: DataPoint[];
  areas: AreaConfig[];
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
 * Reusable Area Chart Component
 * 
 * @example
 * <AreaChartComponent
 *   data={monthlyData}
 *   areas={[
 *     { dataKey: 'revenue', fill: '#8884d8', stroke: '#8884d8', name: 'Revenue' },
 *     { dataKey: 'profit', fill: '#82ca9d', stroke: '#82ca9d', name: 'Profit' }
 *   ]}
 *   xAxisKey="month"
 *   title="Revenue Trends"
 *   stacked={true}
 * />
 */
export const AreaChartComponent: React.FC<AreaChartComponentProps> = ({
  data,
  areas,
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
      <AreaChart data={data}>
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
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            fill={area.fill}
            stroke={area.stroke}
            name={area.name || area.dataKey}
            stackId={stacked ? 'stack' : undefined}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
};