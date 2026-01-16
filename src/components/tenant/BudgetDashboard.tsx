'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Calendar } from 'lucide-react';
import { BudgetTransaction, TimePeriod } from '@/types/budget';
import { calculateBudgetSummary } from '@/lib/budgetCalculations';
import { format } from 'date-fns';
import BudgetSummaryCards from './BudgetSummaryCards';
import BudgetChart from './BudgetChart';
import BudgetCategoryBreakdown from './BudgetCategoryBreakdown';
import TransactionList from './TransactionList';
import AddTransactionDialog from './AddTransactionDialog';

interface BudgetDashboardProps {
  tenantId: string;
}

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ tenantId }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [referenceDate, setReferenceDate] = useState(new Date());

  // Mock data - in production, this would come from Supabase
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([
    {
      id: '1',
      tenant_id: tenantId,
      type: 'income',
      category: 'salary',
      amount: 5000,
      description: 'Monthly salary',
      date: new Date().toISOString(),
      recurring: true,
      recurring_frequency: 'monthly',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      tenant_id: tenantId,
      type: 'expense',
      category: 'rent',
      amount: 1500,
      description: 'Monthly rent payment',
      date: new Date().toISOString(),
      recurring: true,
      recurring_frequency: 'monthly',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      tenant_id: tenantId,
      type: 'expense',
      category: 'utilities',
      amount: 200,
      description: 'Electric and water',
      date: new Date().toISOString(),
      recurring: true,
      recurring_frequency: 'monthly',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      tenant_id: tenantId,
      type: 'expense',
      category: 'groceries',
      amount: 400,
      description: 'Weekly groceries',
      date: new Date().toISOString(),
      recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  const summary = useMemo(() => {
    return calculateBudgetSummary(transactions, selectedPeriod, referenceDate);
  }, [transactions, selectedPeriod, referenceDate]);

  const handleAddTransaction = (transaction: Omit<BudgetTransaction, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    const newTransaction: BudgetTransaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9),
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setTransactions([...transactions, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-8 p-6 animate-in fade-in duration-500">
      {/* Header Section with Enhanced Styling */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Budget Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your income and expenses across different time periods
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Transaction
        </Button>
      </div>

      {/* Period Selector with Enhanced Design */}
      <Card className="border-2 shadow-md">
        <CardContent className="p-6">
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viewing Period</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(summary.start_date), 'MMM d, yyyy')} - {format(new Date(summary.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <TabsList className="grid w-full sm:w-auto grid-cols-3 h-11">
                <TabsTrigger value="monthly" className="text-sm font-medium">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly" className="text-sm font-medium">Quarterly</TabsTrigger>
                <TabsTrigger value="annual" className="text-sm font-medium">Annual</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={selectedPeriod} className="mt-8 space-y-8">
              {/* Summary Cards with Animation */}
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <BudgetSummaryCards summary={summary} />
              </div>

              {/* Charts Section with Staggered Animation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="animate-in slide-in-from-left duration-500 delay-100">
                  <BudgetChart summary={summary} />
                </div>
                <div className="animate-in slide-in-from-right duration-500 delay-200">
                  <BudgetCategoryBreakdown summary={summary} />
                </div>
              </div>

              {/* Transactions List with Animation */}
              <div className="animate-in slide-in-from-bottom duration-500 delay-300">
                <Card className="border-2 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-accent/50 to-accent/20">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-xl">Recent Transactions</CardTitle>
                        <CardDescription className="text-base">
                          View and manage your income and expenses
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <TransactionList 
                      transactions={transactions}
                      period={selectedPeriod}
                      referenceDate={referenceDate}
                      onDelete={handleDeleteTransaction}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddTransaction}
      />
    </div>
  );
};

export default BudgetDashboard;