import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  TooltipProps
} from 'recharts';
import { Receipt, TrendingUp, TrendingDown, ArrowLeft, AlertCircle } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  trend: number;
  color: string;
  subcategories?: SubExpense[];
}

interface SubExpense {
  name: string;
  amount: number;
  description: string;
}

interface MonthlyExpense {
  month: string;
  maintenance: number;
  utilities: number;
  insurance: number;
  taxes: number;
  management: number;
  other: number;
}

// Mock data generator
const generateExpenseData = (): ExpenseCategory[] => {
  return [
    {
      name: 'Maintenance & Repairs',
      amount: 8500,
      percentage: 32,
      trend: 5.2,
      color: '#ef4444',
      subcategories: [
        { name: 'HVAC Repairs', amount: 3200, description: 'AC unit replacement at Sunset Apartments' },
        { name: 'Plumbing', amount: 2100, description: 'Pipe repairs and fixture replacements' },
        { name: 'Painting', amount: 1800, description: 'Interior painting for 3 units' },
        { name: 'Landscaping', amount: 1400, description: 'Monthly lawn care and tree trimming' }
      ]
    },
    {
      name: 'Utilities',
      amount: 6200,
      percentage: 23,
      trend: -2.1,
      color: '#f59e0b',
      subcategories: [
        { name: 'Electricity', amount: 2800, description: 'Common area and vacant unit power' },
        { name: 'Water & Sewer', amount: 2100, description: 'Water usage for all properties' },
        { name: 'Gas', amount: 900, description: 'Heating for common areas' },
        { name: 'Trash', amount: 400, description: 'Waste management services' }
      ]
    },
    {
      name: 'Property Insurance',
      amount: 5100,
      percentage: 19,
      trend: 3.5,
      color: '#3b82f6',
      subcategories: [
        { name: 'Building Insurance', amount: 3200, description: 'Property damage coverage' },
        { name: 'Liability Insurance', amount: 1400, description: 'General liability protection' },
        { name: 'Flood Insurance', amount: 500, description: 'Flood coverage for riverside property' }
      ]
    },
    {
      name: 'Property Taxes',
      amount: 4300,
      percentage: 16,
      trend: 1.8,
      color: '#8b5cf6',
      subcategories: [
        { name: 'County Taxes', amount: 2800, description: 'Annual property tax assessment' },
        { name: 'City Taxes', amount: 1200, description: 'Municipal property taxes' },
        { name: 'Special Assessments', amount: 300, description: 'Local improvement district fees' }
      ]
    },
    {
      name: 'Management Fees',
      amount: 2700,
      percentage: 10,
      trend: 0,
      color: '#10b981',
      subcategories: [
        { name: 'Property Management', amount: 2200, description: '10% of collected rent' },
        { name: 'Leasing Fees', amount: 500, description: 'New tenant placement fees' }
      ]
    }
  ];
};

const generateMonthlyExpenses = (): MonthlyExpense[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(month => ({
    month,
    maintenance: 7000 + Math.random() * 3000,
    utilities: 5500 + Math.random() * 1500,
    insurance: 5000 + Math.random() * 500,
    taxes: 4200 + Math.random() * 400,
    management: 2600 + Math.random() * 300,
    other: 1000 + Math.random() * 500
  }));
};

type ViewMode = 'overview' | 'category-detail' | 'trends';

export default function InteractiveExpenseChart() {
  const [expenseData] = useState<ExpenseCategory[]>(generateExpenseData());
  const [monthlyData] = useState<MonthlyExpense[]>(generateMonthlyExpenses());
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  const totalExpenses = expenseData.reduce((sum, cat) => sum + cat.amount, 0);

  const handleCategoryClick = (data: ExpenseCategory) => {
    if (data && data.name) {
      const category = expenseData.find(cat => cat.name === data.name);
      if (category) {
        setSelectedCategory(category);
        setViewMode('category-detail');
      }
    }
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedCategory(null);
  };

  const CustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ExpenseCategory;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold mb-2">{data.name}</p>
          <p className="text-sm">Amount: ${data.amount.toLocaleString()}</p>
          <p className="text-sm">Percentage: {data.percentage}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Click to view breakdown
          </p>
        </div>
      );
    }
    return null;
  };

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Expense Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
                onClick={handleCategoryClick}
                className="cursor-pointer"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold mb-4">Expense Categories</h3>
          {expenseData.map((category) => (
            <Card
              key={category.name}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedCategory(category);
                setViewMode('category-detail');
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <p className="font-semibold text-sm">{category.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {category.percentage}% of total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${category.amount.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {category.trend > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-red-600" />
                          <span className="text-red-600">+{category.trend}%</span>
                        </>
                      ) : category.trend < 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">{category.trend}%</span>
                        </>
                      ) : (
                        <span className="text-gray-600">No change</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setViewMode('trends')}>
          View Monthly Trends
        </Button>
      </div>
    </>
  );

  const renderCategoryDetail = () => {
    if (!selectedCategory) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBackToOverview}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div>
              <h3 className="text-lg font-semibold">{selectedCategory.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Detailed breakdown and subcategories
              </p>
            </div>
          </div>
          <Badge
            variant={selectedCategory.trend > 0 ? 'destructive' : 'default'}
            className="text-base px-4 py-2"
          >
            ${selectedCategory.amount.toLocaleString()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold">${selectedCategory.amount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">% of Total Expenses</p>
              <p className="text-2xl font-bold">{selectedCategory.percentage}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Trend vs Last Month</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {selectedCategory.trend > 0 ? '+' : ''}{selectedCategory.trend}%
                </p>
                {selectedCategory.trend > 0 ? (
                  <TrendingUp className="h-5 w-5 text-red-600" />
                ) : selectedCategory.trend < 0 ? (
                  <TrendingDown className="h-5 w-5 text-green-600" />
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedCategory.subcategories && (
          <>
            <h4 className="font-semibold">Subcategory Breakdown</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={selectedCategory.subcategories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill={selectedCategory.color} />
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {selectedCategory.subcategories.map((sub, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{sub.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{sub.description}</p>
                      </div>
                      <p className="font-bold text-lg">${sub.amount.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {selectedCategory.trend > 5 && (
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-100">
                    High Expense Alert
                  </p>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    This category has increased by {selectedCategory.trend}% compared to last month.
                    Consider reviewing these expenses for potential cost savings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTrends = () => {
    const trendData = monthlyData.map(month => ({
      ...month,
      total: month.maintenance + month.utilities + month.insurance + month.taxes + month.management + month.other
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBackToOverview}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div>
              <h3 className="text-lg font-semibold">Monthly Expense Trends</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                12-month expense history by category
              </p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="maintenance" stroke="#ef4444" strokeWidth={2} name="Maintenance" />
            <Line type="monotone" dataKey="utilities" stroke="#f59e0b" strokeWidth={2} name="Utilities" />
            <Line type="monotone" dataKey="insurance" stroke="#3b82f6" strokeWidth={2} name="Insurance" />
            <Line type="monotone" dataKey="taxes" stroke="#8b5cf6" strokeWidth={2} name="Taxes" />
            <Line type="monotone" dataKey="management" stroke="#10b981" strokeWidth={2} name="Management" />
            <Line type="monotone" dataKey="total" stroke="#000000" strokeWidth={3} name="Total" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="maintenance" stackId="a" fill="#ef4444" name="Maintenance" />
            <Bar dataKey="utilities" stackId="a" fill="#f59e0b" name="Utilities" />
            <Bar dataKey="insurance" stackId="a" fill="#3b82f6" name="Insurance" />
            <Bar dataKey="taxes" stackId="a" fill="#8b5cf6" name="Taxes" />
            <Bar dataKey="management" stackId="a" fill="#10b981" name="Management" />
            <Bar dataKey="other" stackId="a" fill="#6b7280" name="Other" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Analysis & Breakdown
            </CardTitle>
            <CardDescription>
              {viewMode === 'overview' && 'Interactive expense distribution. Click any category to drill down.'}
              {viewMode === 'category-detail' && `Detailed analysis of ${selectedCategory?.name}`}
              {viewMode === 'trends' && 'Historical expense trends across all categories'}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold">${totalExpenses.toLocaleString()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'category-detail' && renderCategoryDetail()}
        {viewMode === 'trends' && renderTrends()}
      </CardContent>
    </Card>
  );
}