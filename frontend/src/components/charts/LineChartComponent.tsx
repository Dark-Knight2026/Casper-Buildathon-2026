import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface DataPoint {
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  stroke: string;
  name?: string;
  strokeWidth?: number;
}

interface LineChartComponentProps {
  data: DataPoint[];
  lines: LineConfig[];
  xAxisKey: string;
  title?: string;
  description?: string;
  isLoading?: boolean;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Reusable Line Chart Component
 * 
 * @example
 * <LineChartComponent
 *   data={monthlyData}
 *   lines={[
 *     { dataKey: 'revenue', stroke: '#8884d8', name: 'Revenue' },
 *     { dataKey: 'expenses', stroke: '#82ca9d', name: 'Expenses' }
 *   ]}
 *   xAxisKey="month"
 *   title="Monthly Performance"
 *   description="Revenue vs Expenses"
 * />
 */
export const LineChartComponent: React.FC<LineChartComponentProps> = ({
  data,
  lines,
  xAxisKey,
  title,
  description,
  isLoading = false,
  height = 300,
  showGrid = true,
  showLegend = true,
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
      <LineChart data={data}>
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
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.stroke}
            name={line.name || line.dataKey}
            strokeWidth={line.strokeWidth || 2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
};