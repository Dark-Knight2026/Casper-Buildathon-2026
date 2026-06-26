import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ScheduleECategory, SCHEDULE_E_CATEGORIES } from '@/types/landlordTax';

interface ExpenseBreakdownItem {
  category: ScheduleECategory;
  amount: number;
  percentage: number;
}

interface TaxCategoryBreakdownProps {
  data: ExpenseBreakdownItem[];
  year: number;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

export const TaxCategoryBreakdown: React.FC<TaxCategoryBreakdownProps> = ({ data, year }) => {
  const chartData = data.map(item => ({
    name: SCHEDULE_E_CATEGORIES[item.category]?.name || item.category,
    value: item.amount,
    category: item.category
  })).sort((a, b) => b.value - a.value);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>Distribution of expenses by tax category for {year}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend layout="vertical" align="right" verticalAlign="middle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};