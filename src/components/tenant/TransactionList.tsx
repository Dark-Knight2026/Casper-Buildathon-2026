'use client';

import React from 'react';
import { BudgetTransaction, TimePeriod } from '@/types/budget';
import { filterTransactionsByPeriod, getCategoryLabel } from '@/lib/budgetCalculations';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TransactionListProps {
  transactions: BudgetTransaction[];
  period: TimePeriod;
  referenceDate: Date;
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  period,
  referenceDate,
  onDelete
}) => {
  const filteredTransactions = filterTransactionsByPeriod(transactions, period, referenceDate);
  
  const sortedTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (sortedTransactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
        <p className="text-muted-foreground mb-6">
          Start tracking your finances by adding your first transaction
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedTransactions.map((transaction, index) => (
        <div
          key={transaction.id}
          className="group relative flex items-center justify-between p-5 border-2 rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Left side - Icon and details */}
          <div className="flex items-center gap-4 flex-1">
            <div className={`p-3 rounded-full transition-transform duration-300 group-hover:scale-110 ${
              transaction.type === 'income' 
                ? 'bg-gradient-to-br from-green-100 to-green-50 text-green-600' 
                : 'bg-gradient-to-br from-red-100 to-red-50 text-red-600'
            }`}>
              {transaction.type === 'income' ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-base truncate">{transaction.description}</p>
                {transaction.recurring && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 px-2 py-0.5">
                    <Repeat className="h-3 w-3" />
                    {transaction.recurring_frequency}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium">{getCategoryLabel(transaction.category)}</span>
                <span className="text-xs">•</span>
                <span>{format(new Date(transaction.date), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Right side - Amount and delete button */}
          <div className="flex items-center gap-4">
            <span className={`text-xl font-bold ${
              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction.id)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;