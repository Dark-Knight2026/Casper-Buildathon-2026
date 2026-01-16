'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BudgetTransaction, TransactionType, TransactionCategory } from '@/types/budget';
import { getCategoryLabel } from '@/lib/budgetCalculations';
import { TrendingUp, TrendingDown, Calendar, Repeat } from 'lucide-react';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (transaction: Omit<BudgetTransaction, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => void;
}

type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual';

const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({
  open,
  onOpenChange,
  onAdd
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<TransactionCategory>('other_expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurring, setRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');

  const incomeCategories: TransactionCategory[] = ['salary', 'freelance', 'investment', 'other_income'];
  const expenseCategories: TransactionCategory[] = [
    'rent', 'utilities', 'groceries', 'transportation', 
    'entertainment', 'healthcare', 'insurance', 'other_expense'
  ];

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !category) {
      return;
    }

    const transaction: Omit<BudgetTransaction, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
      type,
      category,
      amount: parseFloat(amount),
      description,
      date: new Date(date).toISOString(),
      recurring,
      recurring_frequency: recurring ? recurringFrequency : undefined
    };

    onAdd(transaction);
    
    // Reset form
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setRecurring(false);
    onOpenChange(false);
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    // Reset category to first option of new type
    setCategory(newType === 'income' ? 'salary' : 'rent');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold">Add Transaction</DialogTitle>
          <DialogDescription className="text-base">
            Add a new income or expense transaction to your budget tracker
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Transaction Type Selector */}
          <div className="space-y-3">
            <Label htmlFor="type" className="text-sm font-semibold">Transaction Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="type" className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Income</span>
                  </div>
                </SelectItem>
                <SelectItem value="expense" className="text-base py-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span>Expense</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Selector */}
          <div className="space-y-3">
            <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as TransactionCategory)}>
              <SelectTrigger id="category" className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-base py-3">
                    {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="amount" className="text-sm font-semibold">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-3">
            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
            <Input
              id="description"
              placeholder="Enter transaction description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          {/* Date Input */}
          <div className="space-y-3">
            <Label htmlFor="date" className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors">
            <Label htmlFor="recurring" className="flex items-center gap-2 text-base font-semibold cursor-pointer">
              <Repeat className="h-4 w-4" />
              Recurring Transaction
            </Label>
            <Switch
              id="recurring"
              checked={recurring}
              onCheckedChange={setRecurring}
            />
          </div>

          {/* Frequency Selector (shown when recurring is enabled) */}
          {recurring && (
            <div className="space-y-3 animate-in slide-in-from-top duration-300">
              <Label htmlFor="frequency" className="text-sm font-semibold">Frequency</Label>
              <Select value={recurringFrequency} onValueChange={(value: string) => setRecurringFrequency(value as RecurringFrequency)}>
                <SelectTrigger id="frequency" className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly" className="text-base py-3">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-base py-3">Monthly</SelectItem>
                  <SelectItem value="quarterly" className="text-base py-3">Quarterly</SelectItem>
                  <SelectItem value="annual" className="text-base py-3">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11">
              Cancel
            </Button>
            <Button type="submit" className="h-11 px-6">
              Add Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;