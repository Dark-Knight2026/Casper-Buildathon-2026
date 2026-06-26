import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Award,
  Target,
  PieChart,
  BarChart3,
  Download,
  Share2
} from 'lucide-react';

interface PaymentHistory {
  month: string;
  amount: number;
  status: 'on_time' | 'early' | 'late';
  discount_earned: number;
}

interface PaymentInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
}

export default function PaymentAnalytics() {
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

  const paymentHistory: PaymentHistory[] = [
    { month: 'Jan 2024', amount: 2200, status: 'early', discount_earned: 44 },
    { month: 'Dec 2023', amount: 2200, status: 'on_time', discount_earned: 0 },
    { month: 'Nov 2023', amount: 2200, status: 'early', discount_earned: 44 },
    { month: 'Oct 2023', amount: 2200, status: 'early', discount_earned: 44 },
    { month: 'Sep 2023', amount: 2200, status: 'on_time', discount_earned: 0 },
    { month: 'Aug 2023', amount: 2200, status: 'early', discount_earned: 44 }
  ];

  const insights: PaymentInsight[] = [
    {
      type: 'success',
      title: 'Excellent Payment Record',
      description: 'You\'ve paid on time or early for 6 consecutive months!',
      action: 'View Rewards'
    },
    {
      type: 'info',
      title: 'Savings Opportunity',
      description: 'Pay 7 days early next month to save an additional $44',
      action: 'Set Reminder'
    },
    {
      type: 'warning',
      title: 'Budget Variance',
      description: 'Your utility costs increased by 15% this month',
      action: 'Review Budget'
    }
  ];

  const stats = {
    total_paid: paymentHistory.reduce((sum, p) => sum + p.amount, 0),
    total_saved: paymentHistory.reduce((sum, p) => sum + p.discount_earned, 0),
    on_time_rate: (paymentHistory.filter(p => p.status !== 'late').length / paymentHistory.length) * 100,
    early_payment_rate: (paymentHistory.filter(p => p.status === 'early').length / paymentHistory.length) * 100,
    avg_payment_day: 28,
    streak: 6
  };

  const exportData = () => {
    const csv = [
      ['Month', 'Amount', 'Status', 'Discount Earned'],
      ...paymentHistory.map(p => [p.month, p.amount, p.status, p.discount_earned])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment-history.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Paid</p>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">${stats.total_paid.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Last 6 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Saved</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">${stats.total_saved}</p>
            <p className="text-xs text-gray-600 mt-1">From early payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">On-Time Rate</p>
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{stats.on_time_rate.toFixed(0)}%</p>
            <p className="text-xs text-gray-600 mt-1">Perfect record!</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Current Streak</p>
              <Award className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold">{stats.streak} months</p>
            <p className="text-xs text-gray-600 mt-1">Keep it up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Payment Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, index) => (
            <Card
              key={index}
              className={`border-l-4 ${
                insight.type === 'success'
                  ? 'border-l-green-500 bg-green-50'
                  : insight.type === 'warning'
                  ? 'border-l-yellow-500 bg-yellow-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-700">{insight.description}</p>
                  </div>
                  {insight.action && (
                    <Button size="sm" variant="outline">
                      {insight.action}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Payment History
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "3m" | "6m" | "1y" | "all")}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="3m">3 Months</TabsTrigger>
              <TabsTrigger value="6m">6 Months</TabsTrigger>
              <TabsTrigger value="1y">1 Year</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>

            <TabsContent value={timeRange} className="space-y-4">
              {/* Visual Chart Placeholder */}
              <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <PieChart className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">Payment Trend Chart</p>
                  <p className="text-sm text-gray-500">Visual representation of payment history</p>
                </div>
              </div>

              {/* Detailed History Table */}
              <div className="space-y-2">
                <h4 className="font-semibold mb-3">Detailed Payment Records</h4>
                {paymentHistory.map((payment, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{payment.month}</p>
                            <p className="text-sm text-gray-600">
                              ${payment.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {payment.discount_earned > 0 && (
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Saved</p>
                              <p className="font-semibold text-green-600">
                                ${payment.discount_earned}
                              </p>
                            </div>
                          )}
                          <Badge
                            className={
                              payment.status === 'early'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'on_time'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {payment.status === 'early' && <TrendingUp className="h-3 w-3 mr-1" />}
                            {payment.status === 'late' && <TrendingDown className="h-3 w-3 mr-1" />}
                            {payment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Early Payments</span>
                <span className="text-sm font-semibold">{stats.early_payment_rate.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${stats.early_payment_rate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">On-Time Payments</span>
                <span className="text-sm font-semibold">{(100 - stats.early_payment_rate).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${100 - stats.early_payment_rate}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Average Payment Day</p>
              <p className="text-2xl font-bold">
                {stats.avg_payment_day}th
                <span className="text-sm font-normal text-gray-600 ml-2">of the month</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Savings Potential</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Projected Annual Savings</p>
              <p className="text-3xl font-bold text-green-600">
                ${(stats.total_saved * 2).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                If you maintain current early payment rate
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm">Current monthly savings</span>
                <span className="font-semibold text-green-600">
                  ${(stats.total_saved / 6).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm">Potential if always early</span>
                <span className="font-semibold text-blue-600">$44.00</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm">Additional savings possible</span>
                <span className="font-semibold text-purple-600">
                  ${(44 - stats.total_saved / 6).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}