/**
 * Financial Chart Widget
 * Displays financial overview chart
 */

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { paymentService } from '@/services/paymentService';
import { TrendingUp } from 'lucide-react';

interface MonthlyData {
  month: string;
  amount: number;
}

export function FinancialChartWidget() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', 'chart'],
    queryFn: () => paymentService.getAll({ limit: 100 }),
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No financial data</p>
      </div>
    );
  }

  // Aggregate payments by month
  const monthlyData = payments.reduce((acc: Record<string, MonthlyData>, payment) => {
    const month = new Date(payment.payment_date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    
    if (!acc[month]) {
      acc[month] = { month, amount: 0 };
    }
    
    acc[month].amount += payment.amount;
    return acc;
  }, {});

  const chartData = Object.values(monthlyData).slice(-6);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          formatter={(value: number) => `$${value.toLocaleString()}`}
        />
        <Bar dataKey="amount" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}