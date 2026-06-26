import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TaxSummary } from '@/services/taxService';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Loader2 } from 'lucide-react';

interface TaxSummaryCardProps {
  summary: TaxSummary | null;
  isLoading?: boolean;
  role?: string;
}

export const TaxSummaryCard: React.FC<TaxSummaryCardProps> = ({ summary, isLoading, role = 'User' }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
          <CardDescription>Loading tax data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Summary</CardTitle>
          <CardDescription>No tax data available for this year.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8 text-muted-foreground">
            No data found
          </div>
        </CardContent>
      </Card>
    );
  }

  const taxableIncome = Math.max(0, summary.totalIncome - summary.totalDeductions);
  const effectiveTaxRate = summary.totalIncome > 0 
    ? ((summary.estimatedTax / summary.totalIncome) * 100).toFixed(1) 
    : '0.0';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              {role} Tax Summary {summary.taxYear}
            </CardTitle>
            <CardDescription>Filing Status: {summary.filingStatus}</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Updated {new Date(summary.lastUpdated).toLocaleDateString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold">${summary.totalIncome.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Deductions</p>
            <p className="text-2xl font-bold text-green-600">${summary.totalDeductions.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxable Income</span>
            <span className="font-semibold">${taxableIncome.toLocaleString()}</span>
          </div>
          <Progress value={summary.totalIncome > 0 ? (taxableIncome / summary.totalIncome) * 100 : 0} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Estimated Tax</p>
            <p className="text-xl font-bold text-red-600">${summary.estimatedTax.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Effective Rate: {effectiveTaxRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {summary.estimatedRefund > 0 ? 'Expected Refund' : 'Amount Due'}
            </p>
            <p className={`text-xl font-bold flex items-center gap-1 ${summary.estimatedRefund > 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {summary.estimatedRefund > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              ${Math.abs(summary.estimatedRefund).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};