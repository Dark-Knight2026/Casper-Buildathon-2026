'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetSummary } from '@/types/budget';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface BudgetChartProps {
  summary: BudgetSummary;
}

const BudgetChart: React.FC<BudgetChartProps> = ({ summary }) => {
  const data = [
    {
      name: 'Income',
      amount: summary.total_income,
      fill: '#10b981'
    },
    {
      name: 'Expenses',
      amount: summary.total_expenses,
      fill: '#ef4444'
    },
    {
      name: 'Net Balance',
      amount: Math.abs(summary.net_balance),
      fill: summary.net_balance >= 0 ? '#3b82f6' : '#f59e0b'
    }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-accent/30 to-transparent">
        <CardTitle className="text-xl">Financial Overview</CardTitle>
        <CardDescription className="text-base">
          Income vs Expenses comparison for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6b7280', fontSize: 14, fontWeight: 500 }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar dataKey="amount" radius={[12, 12, 0, 0]} animationDuration={1000}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? 'url(#incomeGradient)' : index === 1 ? 'url(#expenseGradient)' : 'url(#balanceGradient)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BudgetChart;