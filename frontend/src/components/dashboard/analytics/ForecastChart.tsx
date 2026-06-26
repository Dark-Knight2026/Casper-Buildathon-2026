import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { FinancialDataPoint } from '@/services/predictiveService';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface ForecastChartProps {
  data: FinancialDataPoint[];
  title?: string;
  description?: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ 
  data, 
  title = "Financial Forecast", 
  description = "Historical performance vs. AI-generated projections" 
}) => {
  // Find the index where projections start
  const projectionStartIndex = data.findIndex(d => d.isProjection);
  const projectionStartLabel = projectionStartIndex !== -1 ? data[projectionStartIndex].month : '';

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">Historical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-dashed border-indigo-500 rounded-full"></div>
              <span className="text-muted-foreground">Projected</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
              <XAxis 
                dataKey="month" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend />
              
              {/* Historical Lines */}
              <Line 
                type="monotone" 
                dataKey="revenue" 
                name="Revenue" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "#3b82f6" }}
                activeDot={{ r: 6 }}
                strokeDasharray={d => d.isProjection ? "5 5" : "0"}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                name="Expenses" 
                stroke="#ef4444" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "#ef4444" }}
                strokeDasharray={d => d.isProjection ? "5 5" : "0"}
              />

              {/* Visual separator for Today */}
              {projectionStartLabel && (
                <ReferenceLine 
                  x={projectionStartLabel} 
                  stroke="#6366f1" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: 'TODAY', 
                    position: 'top', 
                    fill: '#6366f1', 
                    fontSize: 10,
                    fontWeight: 'bold'
                  }} 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-md bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-indigo-600" />
          <p>
            <strong>AI Insight:</strong> Projected revenue shows a 12% increase in Q4 due to expected market adjustments, but expenses are predicted to rise by 8% due to seasonal maintenance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};