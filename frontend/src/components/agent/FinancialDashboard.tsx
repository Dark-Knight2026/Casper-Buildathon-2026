import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calculator,
  Target,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  PieChart,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useFinancialDashboard } from '@/hooks/useFinancialDashboard';
import CommissionCalculator from './CommissionCalculator';
import CommissionTracker from './CommissionTracker';
import ExpenseManager from './ExpenseManager';
import TaxPlanner from './TaxPlanner';
import { format } from 'date-fns';

export default function FinancialDashboard() {
  const {
    commissions,
    expenses,
    summary,
    monthlyFinancials,
    taxEstimates,
    expensesByCategory,
    projections,
    goals,
    loading,
    error,
    refreshData
  } = useFinancialDashboard();

  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'expected':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid_out':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'expected':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Failed to load financial data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Dashboard</h2>
          <p className="text-gray-600">Commission tracking, expense management, and tax planning</p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">YTD Gross Commission</p>
                <p className="text-2xl font-bold">${summary?.ytd_gross_commission.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">YTD Net Income</p>
                <p className="text-2xl font-bold">${summary?.ytd_net_income.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">YTD Expenses</p>
                <p className="text-2xl font-bold">${summary?.ytd_expenses.toLocaleString()}</p>
              </div>
              <Receipt className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg per Deal</p>
                <p className="text-2xl font-bold">${summary?.avg_commission_per_deal.toLocaleString()}</p>
              </div>
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Annual Goals Progress */}
      {goals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              2024 Annual Goals Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Gross Commission</span>
                  <span className="text-sm text-gray-600">
                    ${goals.current_gross_commission.toLocaleString()} / ${goals.target_gross_commission.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full" 
                    style={{ width: `${(goals.current_gross_commission / goals.target_gross_commission) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((goals.current_gross_commission / goals.target_gross_commission) * 100).toFixed(1)}% complete
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Net Income</span>
                  <span className="text-sm text-gray-600">
                    ${goals.current_net_income.toLocaleString()} / ${goals.target_net_income.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full" 
                    style={{ width: `${(goals.current_net_income / goals.target_net_income) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((goals.current_net_income / goals.target_net_income) * 100).toFixed(1)}% complete
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Deals Closed</span>
                  <span className="text-sm text-gray-600">
                    {goals.current_deals} / {goals.target_deals}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-3 rounded-full" 
                    style={{ width: `${(goals.current_deals / goals.target_deals) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((goals.current_deals / goals.target_deals) * 100).toFixed(1)}% complete
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Commissions & Upcoming Tax */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commissions.slice(0, 5).map((commission) => (
                <div key={commission.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{commission.client_name}</h4>
                      <p className="text-sm text-gray-600">{commission.property_address}</p>
                    </div>
                    <Badge className={getStatusColor(commission.status)}>
                      {getStatusIcon(commission.status)}
                      <span className="ml-1">{commission.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Sale Price:</span>
                      <span className="font-medium ml-1">${commission.sale_price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Gross:</span>
                      <span className="font-medium ml-1">${commission.gross_commission.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Broker Split:</span>
                      <span className="font-medium ml-1">${commission.broker_split_amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">Net:</span>
                      <span className="font-bold text-green-600 ml-1">${commission.net_commission.toLocaleString()}</span>
                    </div>
                  </div>

                  {commission.expected_date && (
                    <p className="text-xs text-gray-500 mt-2">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Expected: {format(new Date(commission.expected_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            {taxEstimates.map((tax) => (
              <div key={`${tax.year}-${tax.quarter}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{tax.year} {tax.quarter}</h3>
                  <Badge variant="outline" className="text-orange-600">
                    Due: {format(new Date(tax.due_date), 'MMM d, yyyy')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gross Income</span>
                    <span className="font-medium">${tax.gross_income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deductible Expenses</span>
                    <span className="font-medium text-green-600">-${tax.deductible_expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-600 font-medium">Taxable Income</span>
                    <span className="font-semibold">${tax.taxable_income.toLocaleString()}</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Federal Tax</span>
                      <span>${tax.estimated_federal_tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">State Tax</span>
                      <span>${tax.estimated_state_tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Self-Employment Tax</span>
                      <span>${tax.estimated_self_employment_tax.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total Tax Due</span>
                    <span className="text-red-600">${tax.total_estimated_tax.toLocaleString()}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax Paid</span>
                      <span className="text-green-600">${tax.tax_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Remaining</span>
                      <span className="text-orange-600">${tax.tax_remaining.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full" 
                      style={{ width: `${(tax.tax_paid / tax.total_estimated_tax) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {((tax.tax_paid / tax.total_estimated_tax) * 100).toFixed(1)}% paid
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Monthly Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyFinancials.map((month) => (
              <div key={month.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{month.month} {month.year}</span>
                  <div className="flex space-x-4 text-gray-600">
                    <span>Net: ${month.net_income.toLocaleString()}</span>
                    <span>Deals: {month.deals_closed}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Gross Commission</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(month.gross_commission / 20000) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs font-medium mt-1">${month.gross_commission.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Net Commission</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(month.net_commission / 14000) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs font-medium mt-1">${month.net_commission.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Expenses</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${(month.expenses / 4000) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs font-medium mt-1">${month.expenses.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Expense Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expensesByCategory.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{category.category.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{category.transaction_count} transactions</span>
                    <span className="font-semibold">${category.total_amount.toLocaleString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.percentage_of_total.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full" 
                    style={{ width: `${category.percentage_of_total}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission Projections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Commission Projections (Next 5 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projections.map((projection) => (
              <div key={projection.month} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{projection.month}</h4>
                  <Badge 
                    variant="outline" 
                    className={
                      projection.confidence_level === 'high' ? 'bg-green-50 text-green-700' :
                      projection.confidence_level === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-700'
                    }
                  >
                    {projection.confidence_level} confidence
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Projected Gross:</span>
                    <p className="font-medium">${projection.projected_gross.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Projected Net:</span>
                    <p className="font-medium text-green-600">${projection.projected_net.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Pipeline Value:</span>
                    <p className="font-medium">${(projection.pipeline_value / 1000000).toFixed(2)}M</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Expected Deals:</span>
                    <p className="font-medium">{projection.expected_deals}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="commissions">
            <DollarSign className="h-4 w-4 mr-2" />
            Commissions
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="h-4 w-4 mr-2" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <TaxPlanner taxEstimates={taxEstimates} />
        </TabsContent>

        <TabsContent value="calculator" className="mt-6">
          <CommissionCalculator />
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <CommissionTracker commissions={commissions} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <ExpenseManager expenses={expenses} expensesByCategory={expensesByCategory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}