'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BudgetSummary } from '@/types/budget';

interface BudgetSummaryCardsProps {
  summary: BudgetSummary;
}

const BudgetSummaryCards: React.FC<BudgetSummaryCardsProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Income Card */}
      <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          <div className="p-2 bg-green-100 rounded-full group-hover:rotate-12 transition-transform duration-300">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(summary.total_income)}
            </div>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="font-medium">{summary.income_categories.length}</span> income sources
          </p>
        </CardContent>
      </Card>

      {/* Expenses Card */}
      <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          <div className="p-2 bg-red-100 rounded-full group-hover:rotate-12 transition-transform duration-300">
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(summary.total_expenses)}
            </div>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <span className="font-medium">{summary.expense_categories.length}</span> expense categories
          </p>
        </CardContent>
      </Card>

      {/* Net Balance Card */}
      <Card className={`relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 group ${
        summary.net_balance >= 0 ? 'border-green-200' : 'border-orange-200'
      }`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${
          summary.net_balance >= 0 ? 'from-green-500/20' : 'from-orange-500/20'
        } to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
          <div className={`p-2 ${
            summary.net_balance >= 0 ? 'bg-green-100' : 'bg-orange-100'
          } rounded-full group-hover:rotate-12 transition-transform duration-300`}>
            <DollarSign className={`h-5 w-5 ${
              summary.net_balance >= 0 ? 'text-green-600' : 'text-orange-600'
            }`} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className={`text-3xl font-bold ${
            summary.net_balance >= 0 ? 'text-green-600' : 'text-orange-600'
          }`}>
            {formatCurrency(Math.abs(summary.net_balance))}
          </div>
          <p className="text-sm text-muted-foreground">
            {summary.net_balance >= 0 ? '✓ Surplus' : '⚠ Deficit'}
          </p>
        </CardContent>
      </Card>

      {/* Savings Rate Card */}
      <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
          <div className="p-2 bg-blue-100 rounded-full group-hover:rotate-12 transition-transform duration-300">
            <PiggyBank className="h-5 w-5 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-bold text-blue-600">
            {summary.savings_rate.toFixed(1)}%
          </div>
          <p className="text-sm text-muted-foreground">
            Of total income
          </p>
          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(Math.max(summary.savings_rate, 0), 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetSummaryCards;