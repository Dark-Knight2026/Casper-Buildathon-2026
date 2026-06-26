import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, CheckCircle2 } from 'lucide-react';
import type { ExpenseRecord, ExpenseByCategory } from '@/types/financial';
import { format } from 'date-fns';

interface ExpenseManagerProps {
  expenses: ExpenseRecord[];
  expensesByCategory: ExpenseByCategory[];
}

export default function ExpenseManager({ expenses, expensesByCategory }: ExpenseManagerProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      marketing: 'bg-purple-100 text-purple-800',
      office: 'bg-blue-100 text-blue-800',
      travel: 'bg-green-100 text-green-800',
      professional_development: 'bg-orange-100 text-orange-800',
      technology: 'bg-cyan-100 text-cyan-800',
      insurance: 'bg-red-100 text-red-800',
      licensing: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const deductibleExpenses = expenses.filter(e => e.is_tax_deductible).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Expense Manager</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-orange-600">${totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{expenses.length} transactions</p>
              </div>
              <Receipt className="h-12 w-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tax Deductible</p>
                <p className="text-2xl font-bold text-green-600">${deductibleExpenses.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((deductibleExpenses / totalExpenses) * 100).toFixed(1)}% of total
                </p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expensesByCategory.map((category) => (
              <div key={category.category} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(category.category)}>
                      {category.category.replace('_', ' ')}
                    </Badge>
                    {category.is_tax_deductible && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${category.total_amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{category.transaction_count} transactions</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full" 
                    style={{ width: `${category.percentage_of_total}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{category.percentage_of_total.toFixed(1)}% of total expenses</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{expense.description}</h4>
                    {expense.vendor && (
                      <p className="text-sm text-gray-600">{expense.vendor}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${expense.amount.toLocaleString()}</p>
                    {expense.is_tax_deductible && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 text-xs mt-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Tax Deductible
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={getCategoryColor(expense.category)}>
                    {expense.category.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(new Date(expense.date), 'MMM d, yyyy')}
                  </span>
                </div>

                {expense.notes && (
                  <p className="text-xs text-gray-600 mt-2 italic">{expense.notes}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}