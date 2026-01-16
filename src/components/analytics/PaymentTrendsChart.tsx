import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PaymentTrends } from '@/services/analyticsService';

interface PaymentTrendsChartProps {
  trends: PaymentTrends;
  loading?: boolean;
}

export default function PaymentTrendsChart({ trends, loading }: PaymentTrendsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Trends</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Trends</CardTitle>
        <CardDescription>Monthly payment patterns and rates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800 font-medium">On-Time Rate</p>
            <p className="text-2xl font-bold text-green-600">{trends.onTimeRate.toFixed(1)}%</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-800 font-medium">Late Rate</p>
            <p className="text-2xl font-bold text-orange-600">{trends.lateRate.toFixed(1)}%</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">Total Payments</p>
            <p className="text-2xl font-bold text-blue-600">{trends.totalPayments}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              name="Amount ($)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="onTime"
              stroke="#10b981"
              name="On-Time"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="late"
              stroke="#f59e0b"
              name="Late"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>

        {Object.keys(trends.paymentMethods).length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Payment Methods</h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(trends.paymentMethods).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm capitalize">{method}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}