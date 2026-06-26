import React from 'react';
import { TaxCard } from '@/components/tax/shared/TaxCard';
import { TaxMetric } from '@/components/tax/shared/TaxMetric';
import { Progress } from '@/components/ui/progress';
import { TaxSummary } from '@/services/taxService';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface TaxSummaryCardProps {
  summary: TaxSummary;
  isLoading?: boolean;
}

export const TaxSummaryCard: React.FC<TaxSummaryCardProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <TaxCard title="Tax Summary" isLoading={true}>
        <div className="space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
      </TaxCard>
    );
  }

  const taxableIncome = summary.totalIncome - summary.totalDeductions;
  const effectiveTaxRate = ((summary.estimatedTax / summary.totalIncome) * 100).toFixed(1);

  return (
    <TaxCard 
      title={`Tax Summary ${summary.taxYear}`}
      description={`Filing Status: ${summary.filingStatus}`}
      icon={<DollarSign className="h-5 w-5 text-green-600" />}
      lastUpdated={summary.lastUpdated}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <TaxMetric 
            label="Total Income" 
            value={summary.totalIncome} 
            isCurrency 
          />
          <TaxMetric 
            label="Total Deductions" 
            value={summary.totalDeductions} 
            isCurrency 
            trend="up"
            trendLabel="Deductible"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxable Income</span>
            <span className="font-semibold">${taxableIncome.toLocaleString()}</span>
          </div>
          <Progress value={(taxableIncome / summary.totalIncome) * 100} className="h-2" />
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
      </div>
    </TaxCard>
  );
};