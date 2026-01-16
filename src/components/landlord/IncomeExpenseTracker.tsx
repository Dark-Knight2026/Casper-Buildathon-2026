import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTaxPreparation } from '@/contexts/TaxPreparationContext';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { PropertyExpense } from '@/types/clientLandlord';
import { ScheduleECategory, SCHEDULE_E_CATEGORIES, ExpenseFilter, ExpenseCategorization } from '@/types/landlordTax';
import {
  Search,
  Filter,
  Download,
  Sparkles,
  Receipt,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IncomeExpenseTrackerProps {
  landlordId: string;
}

interface PropertyExpenseWithCategory extends PropertyExpense {
  taxCategory?: ScheduleECategory;
  hasReceipt?: boolean;
  propertyId?: string;
}

export default function IncomeExpenseTracker({ landlordId }: IncomeExpenseTrackerProps) {
  const { toast } = useToast();
  const {
    selectedTaxYear,
    filteredExpenses,
    expenseFilter,
    setExpenseFilter,
    categorizeExpense,
    bulkCategorizeExpenses,
    suggestCategory,
    taxYearSummary
  } = useTaxPreparation();
  
  const { properties } = useLandlordManagement();
  const landlordProperties = properties.filter(p => p.landlordId === landlordId);
  
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categorizingExpense, setCategorizingExpense] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ExpenseCategorization | null>(null);
  
  // Local filter state
  const [localFilter, setLocalFilter] = useState<ExpenseFilter>({
    taxYear: selectedTaxYear
  });

  // Update filter when tax year changes
  useEffect(() => {
    setLocalFilter(prev => ({ ...prev, taxYear: selectedTaxYear }));
    setExpenseFilter({ taxYear: selectedTaxYear });
  }, [selectedTaxYear, setExpenseFilter]);

  // Apply filters
  const applyFilters = () => {
    setExpenseFilter({ ...localFilter, searchQuery });
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    const defaultFilter = { taxYear: selectedTaxYear };
    setLocalFilter(defaultFilter);
    setSearchQuery('');
    setExpenseFilter(defaultFilter);
  };

  // Handle expense selection
  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const selectAllExpenses = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(e => e.id));
    }
  };

  // Handle categorization
  const handleCategorize = async (expenseId: string, category: ScheduleECategory) => {
    try {
      await categorizeExpense(expenseId, category);
      toast({
        title: 'Expense Categorized',
        description: `Expense has been categorized as ${SCHEDULE_E_CATEGORIES[category].name}`,
      });
      setCategorizingExpense(null);
      setAiSuggestion(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to categorize expense',
        variant: 'destructive',
      });
    }
  };

  // Handle bulk categorization
  const handleBulkCategorize = async (category: ScheduleECategory) => {
    if (selectedExpenses.length === 0) {
      toast({
        title: 'No Expenses Selected',
        description: 'Please select expenses to categorize',
        variant: 'destructive',
      });
      return;
    }

    try {
      await bulkCategorizeExpenses(selectedExpenses, category);
      toast({
        title: 'Expenses Categorized',
        description: `${selectedExpenses.length} expense(s) categorized as ${SCHEDULE_E_CATEGORIES[category].name}`,
      });
      setSelectedExpenses([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to categorize expenses',
        variant: 'destructive',
      });
    }
  };

  // Get AI suggestion for expense
  const handleGetAISuggestion = async (expense: PropertyExpense) => {
    setCategorizingExpense(expense.id);
    try {
      const suggestion = await suggestCategory(expense);
      setAiSuggestion(suggestion);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get AI suggestion',
        variant: 'destructive',
      });
    }
  };

  // Calculate category breakdown
  const categoryBreakdown = taxYearSummary?.expensesByCategory || [];
  const totalCategorized = categoryBreakdown.reduce((sum, cat) => sum + cat.amount, 0);

  // Get property name
  const getPropertyName = (propertyId: string) => {
    const property = landlordProperties.find(p => p.id === propertyId);
    return property ? property.details.address.street : 'Unknown Property';
  };

  // Get category badge color
  const getCategoryColor = (category?: ScheduleECategory) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    const colors: Record<string, string> = {
      'insurance': 'bg-blue-100 text-blue-800',
      'repairs': 'bg-orange-100 text-orange-800',
      'utilities': 'bg-green-100 text-green-800',
      'taxes': 'bg-red-100 text-red-800',
      'management-fees': 'bg-purple-100 text-purple-800',
      'mortgage-interest': 'bg-indigo-100 text-indigo-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Income & Expense Tracker</h2>
        <p className="text-gray-600 mt-1">
          Categorize your expenses for accurate tax reporting
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${(taxYearSummary?.totalExpenses || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categorized</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {categoryBreakdown.reduce((sum, cat) => sum + cat.transactionCount, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">of {filteredExpenses.length} expenses</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Needs Review</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {filteredExpenses.filter(e => !(e as PropertyExpenseWithCategory).taxCategory).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">uncategorized</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Button */}
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {Object.keys(expenseFilter).length > 1 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.keys(expenseFilter).length - 1}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Filter Expenses</DialogTitle>
                  <DialogDescription>
                    Apply filters to narrow down your expense list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Property Filter */}
                  <div>
                    <Label>Property</Label>
                    <Select
                      value={localFilter.propertyIds?.[0] || 'all'}
                      onValueChange={(value) =>
                        setLocalFilter({
                          ...localFilter,
                          propertyIds: value === 'all' ? undefined : [value]
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All properties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All properties</SelectItem>
                        {landlordProperties.map(property => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.details.address.street}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={localFilter.categories?.[0] || 'all'}
                      onValueChange={(value) =>
                        setLocalFilter({
                          ...localFilter,
                          categories: value === 'all' ? undefined : [value as ScheduleECategory]
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        {Object.entries(SCHEDULE_E_CATEGORIES).map(([key, cat]) => (
                          <SelectItem key={key} value={key}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Receipt Status */}
                  <div>
                    <Label>Receipt Status</Label>
                    <Select
                      value={
                        localFilter.hasReceipt === undefined
                          ? 'all'
                          : localFilter.hasReceipt
                          ? 'has-receipt'
                          : 'no-receipt'
                      }
                      onValueChange={(value) =>
                        setLocalFilter({
                          ...localFilter,
                          hasReceipt:
                            value === 'all' ? undefined : value === 'has-receipt'
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="has-receipt">Has receipt</SelectItem>
                        <SelectItem value="no-receipt">No receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                  <Button onClick={applyFilters}>Apply Filters</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk Actions */}
            {selectedExpenses.length > 0 && (
              <Select onValueChange={(value) => handleBulkCategorize(value as ScheduleECategory)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={`Categorize ${selectedExpenses.length} selected`} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCHEDULE_E_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expenses ({filteredExpenses.length})</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                    onCheckedChange={selectAllExpenses}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No expenses found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const expenseWithCategory = expense as PropertyExpenseWithCategory;
                  const taxCategory = expenseWithCategory.taxCategory;
                  const hasReceipt = expenseWithCategory.hasReceipt;
                  const propertyId = expenseWithCategory.propertyId || '';
                  
                  return (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedExpenses.includes(expense.id)}
                          onCheckedChange={() => toggleExpenseSelection(expense.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {expense.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {getPropertyName(propertyId)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {taxCategory ? (
                          <Badge className={getCategoryColor(taxCategory)}>
                            {SCHEDULE_E_CATEGORIES[taxCategory].name}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Uncategorized</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasReceipt ? (
                          <Receipt className="h-4 w-4 text-green-600" />
                        ) : (
                          <Receipt className="h-4 w-4 text-gray-300" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGetAISuggestion(expense)}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Suggest
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Suggestion Dialog */}
      <Dialog open={!!aiSuggestion} onOpenChange={() => setAiSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Category Suggestion</DialogTitle>
            <DialogDescription>
              Based on the expense description, we suggest the following category
            </DialogDescription>
          </DialogHeader>
          {aiSuggestion && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-blue-900">
                    {SCHEDULE_E_CATEGORIES[aiSuggestion.suggestedCategory].name}
                  </p>
                  <Badge className="bg-blue-600">
                    {Math.round(aiSuggestion.confidence * 100)}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-blue-800">{aiSuggestion.reasoning}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAiSuggestion(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (categorizingExpense) {
                      handleCategorize(categorizingExpense, aiSuggestion.suggestedCategory);
                    }
                  }}
                >
                  Apply Category
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryBreakdown
                .filter(cat => cat.amount > 0)
                .sort((a, b) => b.amount - a.amount)
                .map(cat => {
                  const percentage = totalCategorized > 0 ? (cat.amount / totalCategorized) * 100 : 0;
                  return (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {SCHEDULE_E_CATEGORIES[cat.category].name}
                        </span>
                        <span className="text-gray-600">
                          ${cat.amount.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}