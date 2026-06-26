import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { FinancialReport } from '@/services/analyticsService';

interface FinancialSummaryCardProps {
  report: FinancialReport;
  loading?: boolean;
}

export default function FinancialSummaryCard({ report, loading }: FinancialSummaryCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProfit = report.netIncome >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>{report.period}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">${report.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Total Expenses</span>
            </div>
            <p className="text-2xl font-bold">${report.totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm font-medium">Net Income</span>
            </div>
            <p className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(report.netIncome).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Rent Collected</p>
            <p className="text-lg font-semibold">${report.rentCollected.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-lg font-semibold text-orange-600">
              ${report.outstandingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Collection Rate</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{report.collectionRate.toFixed(1)}%</span>
              {report.collectionRate < 90 && (
                <AlertCircle className="h-4 w-4 text-orange-600" />
              )}
            </div>
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${report.collectionRate >= 90 ? 'bg-green-600' : 'bg-orange-600'}`}
              style={{ width: `${report.collectionRate}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}