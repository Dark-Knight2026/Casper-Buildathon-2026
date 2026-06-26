import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TaxCard } from '../shared/TaxCard';
import { taxService, NetIncomeTrendData } from '../../../services/taxService';
import { Skeleton } from '../../ui/skeleton';

export const NetIncomeTrendChart: React.FC = () => {
  const [data, setData] = useState<NetIncomeTrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await taxService.getNetIncomeTrend(new Date().getFullYear());
        setData(result);
      } catch (error) {
        console.error('Failed to fetch net income trend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <TaxCard title="Net Income Trend" description="Monthly income vs expenses">
        <div className="h-[300px] w-full flex flex-col gap-4 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </TaxCard>
    );
  }

  if (data.length === 0) {
    return (
      <TaxCard title="Net Income Trend" description="Monthly income vs expenses">
        <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
          No trend data available
        </div>
      </TaxCard>
    );
  }

  return (
    <TaxCard title="Net Income Trend" description="Monthly income vs expenses">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis 
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TaxCard>
  );
};