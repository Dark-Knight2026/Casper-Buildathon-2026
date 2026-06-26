'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetSummary } from '@/types/budget';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getCategoryLabel, getCategoryColor } from '@/lib/budgetCalculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BudgetCategoryBreakdownProps {
  summary: BudgetSummary;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    color: string;
    total: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const BudgetCategoryBreakdown: React.FC<BudgetCategoryBreakdownProps> = ({ summary }) => {
  const incomeData: ChartDataItem[] = summary.income_categories.map(cat => ({
    name: getCategoryLabel(cat.category),
    value: cat.actual_amount,
    color: getCategoryColor(cat.category)
  }));

  const expenseData: ChartDataItem[] = summary.expense_categories.map(cat => ({
    name: getCategoryLabel(cat.category),
    value: cat.actual_amount,
    color: getCategoryColor(cat.category)
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border-2 border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{payload[0].name}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-muted-foreground">
            {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-accent/30 to-transparent">
        <CardTitle className="text-xl">Category Breakdown</CardTitle>
        <CardDescription className="text-base">
          Distribution of income and expenses by category
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="expenses" className="text-sm font-medium">Expenses</TabsTrigger>
            <TabsTrigger value="income" className="text-sm font-medium">Income</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expenses" className="mt-6">
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {expenseData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">No expense data available</p>
                  <p className="text-sm">Add your first expense to see the breakdown</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="income" className="mt-6">
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {incomeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground">
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">No income data available</p>
                  <p className="text-sm">Add your first income to see the breakdown</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BudgetCategoryBreakdown;