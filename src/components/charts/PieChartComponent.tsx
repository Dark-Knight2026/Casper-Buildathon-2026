import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ChartContainer';

interface DataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieChartComponentProps {
  data: DataPoint[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  height?: number;
  showLegend?: boolean;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  action?: React.ReactNode;
  className?: string;
}

const DEFAULT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#0088fe',
  '#00c49f',
  '#ffbb28',
  '#ff6b6b',
];

/**
 * Reusable Pie Chart Component
 * 
 * @example
 * <PieChartComponent
 *   data={[
 *     { name: 'Residential', value: 400 },
 *     { name: 'Commercial', value: 300 },
 *     { name: 'Industrial', value: 200 }
 *   ]}
 *   title="Property Distribution"
 *   innerRadius={60}
 * />
 */
export const PieChartComponent: React.FC<PieChartComponentProps> = ({
  data,
  title,
  description,
  isLoading = false,
  height = 300,
  showLegend = true,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  outerRadius = 80,
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
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        {showLegend && <Legend />}
      </PieChart>
    </ChartContainer>
  );
};