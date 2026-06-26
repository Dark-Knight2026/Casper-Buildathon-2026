import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Mock Data Types
interface Transaction {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'completed' | 'pending' | 'failed';
  property: string;
}

interface MonthlyData {
  name: string;
  income: number;
  expenses: number;
}

export const FinancialOverview: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock Transactions
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          date: new Date(),
          description: 'Rent Payment - Unit 4B',
          category: 'Rent',
          amount: 2400,
          type: 'income',
          status: 'completed',
          property: '123 Main St'
        },
        {
          id: 'tx-2',
          date: new Date(Date.now() - 86400000), // Yesterday
          description: 'Plumbing Repair',
          category: 'Maintenance',
          amount: 450,
          type: 'expense',
          status: 'completed',
          property: '456 Oak Ave'
        },
        {
          id: 'tx-3',
          date: new Date(Date.now() - 86400000 * 2),
          description: 'Rent Payment - Unit 2A',
          category: 'Rent',
          amount: 1800,
          type: 'income',
          status: 'completed',
          property: '789 Pine Ln'
        },
        {
          id: 'tx-4',
          date: new Date(Date.now() - 86400000 * 5),
          description: 'Property Insurance',
          category: 'Insurance',
          amount: 1200,
          type: 'expense',
          status: 'pending',
          property: '123 Main St'
        },
        {
          id: 'tx-5',
          date: new Date(Date.now() - 86400000 * 7),
          description: 'Rent Payment - Unit 101',
          category: 'Rent',
          amount: 2100,
          type: 'income',
          status: 'completed',
          property: '321 Elm St'
        }
      ];

      // Mock Chart Data (Last 6 months)
      const mockChartData: MonthlyData[] = [
        { name: 'Jul', income: 18500, expenses: 4200 },
        { name: 'Aug', income: 19200, expenses: 3800 },
        { name: 'Sep', income: 18900, expenses: 5100 },
        { name: 'Oct', income: 20100, expenses: 4500 },
        { name: 'Nov', income: 19800, expenses: 3900 },
        { name: 'Dec', income: 21500, expenses: 6200 },
      ];

      setTransactions(mockTransactions);
      setChartData(mockChartData);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Calculate Summary Metrics
  const currentMonthIncome = 21500;
  const currentMonthExpenses = 6200;
  const netIncome = currentMonthIncome - currentMonthExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground">
            Track your revenue, expenses, and overall financial health.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            This Month
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  ${currentMonthIncome.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +8.2% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  ${currentMonthExpenses.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  +12.5% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  ${netIncome.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                  +6.1% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart Section */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>
              Monthly financial performance for the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
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
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <CardDescription>
              Latest income and expense activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'income' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/20' 
                          : 'bg-red-100 text-red-600 dark:bg-red-900/20'
                      }`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(tx.date, 'MMM d')} • {tx.property}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-[10px] h-5 px-1 mt-1">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};