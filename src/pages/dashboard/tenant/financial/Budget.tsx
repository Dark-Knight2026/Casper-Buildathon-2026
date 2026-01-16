import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { EnhancedStatCard } from '@/components/dashboard/shared/EnhancedStatCard';
import { EnhancedChartContainer } from '@/components/dashboard/shared/EnhancedChartContainer';
import {
  PieChart as PieChartIcon,
  Plus,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Wallet,
  CreditCard,
  Home,
  Utensils,
  Car,
  ShoppingBag,
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

// Mock data - replace with actual API calls
const mockBudgetSummary = {
  totalBudget: 5000,
  totalSpent: 3750,
  remaining: 1250,
  percentageUsed: 75,
  daysRemaining: 15,
  healthScore: 72,
  projectedSpending: 4800
};

const mockCategories = [
  { id: '1', name: 'Rent', icon: Home, budgeted: 2400, spent: 2400, color: '#FF4405', type: 'fixed' },
  { id: '2', name: 'Utilities', icon: Zap, budgeted: 200, spent: 185, color: '#00C39B', type: 'fixed' },
  { id: '3', name: 'Groceries', icon: ShoppingBag, budgeted: 600, spent: 520, color: '#FFB800', type: 'variable' },
  { id: '4', name: 'Dining Out', icon: Utensils, budgeted: 400, spent: 380, color: '#8B5CF6', type: 'variable' },
  { id: '5', name: 'Transportation', icon: Car, budgeted: 300, spent: 265, color: '#3B82F6', type: 'variable' },
  { id: '6', name: 'Entertainment', icon: CreditCard, budgeted: 200, spent: 0, color: '#EC4899', type: 'variable' },
];

const mockExpenses = [
  { id: '1', date: '2024-12-08', category: 'Groceries', description: 'Weekly grocery shopping', amount: 125, merchant: 'Whole Foods' },
  { id: '2', date: '2024-12-07', category: 'Dining Out', description: 'Dinner with friends', amount: 85, merchant: 'Italian Restaurant' },
  { id: '3', date: '2024-12-06', category: 'Transportation', description: 'Gas station', amount: 45, merchant: 'Shell' },
  { id: '4', date: '2024-12-05', category: 'Utilities', description: 'Electric bill', amount: 95, merchant: 'Power Company' },
  { id: '5', date: '2024-12-04', category: 'Groceries', description: 'Quick grocery run', amount: 42, merchant: 'Trader Joes' },
];

const mockInsights = [
  { 
    id: '1', 
    type: 'savings_opportunity', 
    title: 'Reduce Dining Out Spending', 
    description: 'You\'re on track to exceed your dining budget by $80 this month. Consider cooking at home more often.',
    priority: 'medium',
    potentialSavings: 80
  },
  { 
    id: '2', 
    type: 'spending_pattern', 
    title: 'Transportation Costs Decreasing', 
    description: 'Great job! Your transportation expenses are 12% lower than last month.',
    priority: 'low',
    potentialSavings: 35
  },
  { 
    id: '3', 
    type: 'budget_optimization', 
    title: 'Entertainment Budget Unused', 
    description: 'You haven\'t used your entertainment budget this month. Consider reallocating to other categories.',
    priority: 'low',
    potentialSavings: 0
  },
];

const spendingTrendData = [
  { month: 'Jul', spent: 3200, budget: 5000 },
  { month: 'Aug', spent: 3600, budget: 5000 },
  { month: 'Sep', spent: 3400, budget: 5000 },
  { month: 'Oct', spent: 3800, budget: 5000 },
  { month: 'Nov', spent: 3500, budget: 5000 },
  { month: 'Dec', spent: 3750, budget: 5000 },
];

export default function Budget() {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(mockBudgetSummary);
  const [categories, setCategories] = useState(mockCategories);
  const [expenses, setExpenses] = useState(mockExpenses);
  const [insights, setInsights] = useState(mockInsights);

  const getCategoryStatus = (budgeted: number, spent: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage >= 100) return 'over';
    if (percentage >= 80) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over': return 'text-error-600';
      case 'warning': return 'text-warning-600';
      case 'good': return 'text-success-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-error-100 text-error-700 border-error-200';
      case 'medium': return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'low': return 'bg-success-100 text-success-700 border-success-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const pieChartData = categories.map(cat => ({
    name: cat.name,
    value: cat.spent,
    color: cat.color
  }));

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Budget Management</h1>
            <p className="text-gray-500 mt-2 text-lg">
              Track your expenses, manage your budget, and achieve your financial goals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            label="Total Budget"
            value={`$${summary.totalBudget.toLocaleString()}`}
            icon={Wallet}
            colorScheme="primary"
            trend={{ value: 0, direction: 'up', label: 'Monthly budget' }}
          />

          <EnhancedStatCard
            label="Total Spent"
            value={`$${summary.totalSpent.toLocaleString()}`}
            icon={DollarSign}
            colorScheme="secondary"
            trend={{ value: summary.percentageUsed, direction: 'up', label: 'of budget used' }}
          />

          <EnhancedStatCard
            label="Remaining"
            value={`$${summary.remaining.toLocaleString()}`}
            icon={Target}
            colorScheme="success"
            trend={{ value: summary.daysRemaining, direction: 'down', label: 'days left' }}
          />

          <EnhancedStatCard
            label="Health Score"
            value={summary.healthScore}
            icon={TrendingUp}
            colorScheme="accent"
            trend={{ value: 5, direction: 'up', label: 'vs last month' }}
          />
        </div>

        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Budget Overview</CardTitle>
                <p className="text-sm text-gray-500 mt-1">December 2024 • {summary.daysRemaining} days remaining</p>
              </div>
              <Badge variant="outline" className={summary.healthScore >= 70 ? 'bg-success-50 text-success-700 border-success-200' : 'bg-warning-50 text-warning-700 border-warning-200'}>
                {summary.healthScore >= 70 ? 'On Track' : 'Needs Attention'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Budget Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{summary.percentageUsed}%</span>
                </div>
                <Progress value={summary.percentageUsed} className="h-3" />
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>${summary.totalSpent.toLocaleString()} spent</span>
                  <span>${summary.remaining.toLocaleString()} remaining</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Projected Spending</p>
                  <p className="text-2xl font-bold text-gray-900">${summary.projectedSpending.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">By month end</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Daily Average</p>
                  <p className="text-2xl font-bold text-gray-900">${Math.round(summary.totalSpent / 15)}</p>
                  <p className="text-xs text-gray-500 mt-1">Per day</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Projected Surplus</p>
                  <p className="text-2xl font-bold text-success-600">${summary.totalBudget - summary.projectedSpending}</p>
                  <p className="text-xs text-gray-500 mt-1">If on track</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <EnhancedChartContainer
            title="Spending by Category"
            description="Distribution of your expenses across categories"
          >
            <div className="flex items-center justify-center h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </EnhancedChartContainer>

          {/* Spending Trend */}
          <EnhancedChartContainer
            title="Spending Trend"
            description="Your spending pattern over the last 6 months"
            exportable
          >
            <AreaChart data={spendingTrendData}>
              <defs>
                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="spent" 
                stroke="var(--primary-500)" 
                fillOpacity={1} 
                fill="url(#colorSpent)" 
              />
              <Line 
                type="monotone" 
                dataKey="budget" 
                stroke="#9CA3AF" 
                strokeDasharray="5 5" 
                dot={false}
              />
            </AreaChart>
          </EnhancedChartContainer>
        </div>

        {/* Category Details */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Track spending across all budget categories</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category) => {
                const percentage = (category.spent / category.budgeted) * 100;
                const status = getCategoryStatus(category.budgeted, category.spent);
                const Icon = category.icon;
                
                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${category.color}20` }}>
                          <Icon className="h-5 w-5" style={{ color: category.color }} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{category.name}</h4>
                          <p className="text-xs text-gray-500 capitalize">{category.type} expense</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">${category.spent.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">of ${category.budgeted.toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <Progress value={Math.min(percentage, 100)} className="h-2" style={{ backgroundColor: `${category.color}20` }} />
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${getStatusColor(status)}`}>
                          {percentage.toFixed(0)}% used
                        </span>
                        <span className="text-xs text-gray-500">
                          ${(category.budgeted - category.spent).toLocaleString()} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Recent Expenses</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Your latest transactions</p>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                          <span className="text-xs text-gray-500">{expense.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${expense.amount}</p>
                      <p className="text-xs text-gray-500">{expense.merchant}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Insights */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Budget Insights</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Personalized recommendations</p>
              </div>
              <AlertCircle className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                          <Badge className={getPriorityColor(insight.priority)} variant="outline">
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{insight.description}</p>
                      </div>
                    </div>
                    {insight.potentialSavings > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <TrendingUp className="h-4 w-4 text-success-600" />
                        <span className="text-xs font-medium text-success-600">
                          Potential savings: ${insight.potentialSavings}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}