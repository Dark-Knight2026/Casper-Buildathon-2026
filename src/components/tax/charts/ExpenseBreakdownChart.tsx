import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TaxCard } from '../shared/TaxCard';
import { taxService, ExpenseBreakdownData } from '../../../services/taxService';
import { Skeleton } from '../../ui/skeleton';

export const ExpenseBreakdownChart: React.FC = () => {
  const [data, setData] = useState<ExpenseBreakdownData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await taxService.getExpenseBreakdown('year');
        setData(result);
      } catch (error) {
        console.error('Failed to fetch expense breakdown:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <TaxCard title="Expense Breakdown" description="Distribution of tax-deductible expenses">
        <div className="h-[300px] w-full flex items-center justify-center">
          <Skeleton className="h-[250px] w-[250px] rounded-full" />
        </div>
      </TaxCard>
    );
  }

  if (data.length === 0) {
    return (
      <TaxCard title="Expense Breakdown" description="Distribution of tax-deductible expenses">
        <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
          No expense data available
        </div>
      </TaxCard>
    );
  }

  return (
    <TaxCard title="Expense Breakdown" description="Distribution of tax-deductible expenses">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="amount"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </TaxCard>
  );
};