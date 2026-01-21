import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { EnhancedStatCard } from '@/components/dashboard/shared/EnhancedStatCard';
import { EnhancedChartContainer } from '@/components/dashboard/shared/EnhancedChartContainer';
import {
  Receipt,
  FileText,
  Calculator,
  Calendar,
  TrendingUp,
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// Mock data - replace with actual API calls
const mockTaxSummary = {
  totalRentPaid: 28800,
  documentCount: 12,
  deductionCount: 5,
  potentialSavings: 2400,
  taxYear: 2024
};

const mockPaymentHistory = [
  { id: '1', month: 'Jan 2024', amount: 2400, date: '2024-01-01', status: 'Paid', confirmationNumber: 'PAY-001' },
  { id: '2', month: 'Feb 2024', amount: 2400, date: '2024-02-01', status: 'Paid', confirmationNumber: 'PAY-002' },
  { id: '3', month: 'Mar 2024', amount: 2400, date: '2024-03-01', status: 'Paid', confirmationNumber: 'PAY-003' },
  { id: '4', month: 'Apr 2024', amount: 2400, date: '2024-04-01', status: 'Paid', confirmationNumber: 'PAY-004' },
  { id: '5', month: 'May 2024', amount: 2400, date: '2024-05-01', status: 'Paid', confirmationNumber: 'PAY-005' },
  { id: '6', month: 'Jun 2024', amount: 2400, date: '2024-06-01', status: 'Paid', confirmationNumber: 'PAY-006' },
];

const mockDocuments = [
  { id: '1', name: 'Lease Agreement 2024.pdf', type: 'Lease', uploadDate: '2024-01-15', size: '2.4 MB', category: 'rental' },
  { id: '2', name: 'Rent Receipt Jan.pdf', type: 'Receipt', uploadDate: '2024-01-05', size: '156 KB', category: 'income' },
  { id: '3', name: 'Rent Receipt Feb.pdf', type: 'Receipt', uploadDate: '2024-02-05', size: '158 KB', category: 'income' },
  { id: '4', name: 'Moving Expenses.pdf', type: 'Expense', uploadDate: '2024-01-20', size: '890 KB', category: 'expenses' },
];

const mockDeductions = [
  { id: '1', category: 'Home Office', description: 'Dedicated workspace for remote work', amount: 1200, date: '2024-01-15', status: 'eligible' },
  { id: '2', category: 'Moving Expenses', description: 'Job-related relocation costs', amount: 3500, date: '2024-01-20', status: 'eligible' },
  { id: '3', category: 'Business Expenses', description: 'Work-related supplies and equipment', amount: 800, date: '2024-03-10', status: 'maybe' },
];

const mockTaxCalendar = [
  { id: '1', title: 'Q1 Estimated Tax Due', date: '2024-04-15', type: 'deadline', importance: 'high' },
  { id: '2', title: 'Q2 Estimated Tax Due', date: '2024-06-15', type: 'deadline', importance: 'high' },
  { id: '3', title: 'Tax Document Review', date: '2024-03-01', type: 'reminder', importance: 'medium' },
  { id: '4', title: 'Deduction Deadline', date: '2024-12-31', type: 'deadline', importance: 'high' },
];

export default function TaxCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(mockTaxSummary);
  const [payments, setPayments] = useState(mockPaymentHistory);
  const [documents, setDocuments] = useState(mockDocuments);
  const [deductions, setDeductions] = useState(mockDeductions);
  const [calendarEvents, setCalendarEvents] = useState(mockTaxCalendar);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eligible': return 'bg-success-100 text-success-700 border-success-200';
      case 'maybe': return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'not_eligible': return 'bg-error-100 text-error-700 border-error-200';
      case 'Paid': return 'bg-success-100 text-success-700 border-success-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-error-100 text-error-700 border-error-200';
      case 'medium': return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'low': return 'bg-success-100 text-success-700 border-success-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const chartData = payments.map(p => ({
    month: p.month.split(' ')[0],
    amount: p.amount
  }));

  return (
    <ErrorBoundary>
      <div className="space-y-6" data-tour="tax-center">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tax Center</h1>
            <p className="text-gray-500 mt-2 text-lg">
              Manage your rental tax documents, track deductions, and maximize savings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            label="Total Rent Paid (2024)"
            value={`$${summary.totalRentPaid.toLocaleString()}`}
            icon={Receipt}
            colorScheme="primary"
            trend={{ value: 0, direction: 'up', label: 'Year to date' }}
            sparklineData={[2400, 2400, 2400, 2400, 2400, 2400]}
          />

          <EnhancedStatCard
            label="Tax Documents"
            value={summary.documentCount}
            icon={FileText}
            colorScheme="secondary"
            trend={{ value: 3, direction: 'up', label: 'Added this month' }}
          />

          <EnhancedStatCard
            label="Tracked Deductions"
            value={summary.deductionCount}
            icon={Calculator}
            colorScheme="accent"
            trend={{ value: 1, direction: 'up', label: 'New deduction' }}
          />

          <EnhancedStatCard
            label="Potential Savings"
            value={`$${summary.potentialSavings.toLocaleString()}`}
            icon={TrendingUp}
            colorScheme="success"
            trend={{ value: 15, direction: 'up', label: 'vs last year' }}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment History Chart */}
              <EnhancedChartContainer
                title="Rent Payment History"
                description="Your rental payments for tax year 2024"
                exportable
              >
                <BarChart data={chartData}>
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
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="var(--primary-500)" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </EnhancedChartContainer>

              {/* Tax Calculator Quick Access */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary-600" />
                    Tax Savings Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Estimate your potential tax savings based on your rental situation and eligible deductions.
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Annual Rent</span>
                      <span className="text-sm font-bold text-gray-900">${summary.totalRentPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Total Deductions</span>
                      <span className="text-sm font-bold text-gray-900">$5,500</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg border border-success-200">
                      <span className="text-sm font-medium text-success-700">Estimated Savings</span>
                      <span className="text-sm font-bold text-success-700">${summary.potentialSavings.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Detailed Estimate
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">Recent Documents</CardTitle>
                  <FileText className="h-5 w-5 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.uploadDate} • {doc.size}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {doc.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="link" className="w-full mt-3" onClick={() => setActiveTab('documents')}>
                    View All Documents →
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">Upcoming Tax Dates</CardTitle>
                  <Calendar className="h-5 w-5 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {calendarEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="h-2 w-2 mt-2 rounded-full bg-error-500" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                            <Badge className={getImportanceColor(event.importance)} variant="outline">
                              {event.importance}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="link" className="w-full mt-3" onClick={() => setActiveTab('calendar')}>
                    View Full Calendar →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Complete record of your rental payments</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Month</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Confirmation</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900">{payment.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.month}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">${payment.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusColor(payment.status)} variant="outline">
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{payment.confirmationNumber}</td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tax Documents</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Manage and organize your tax-related documents</p>
                  </div>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-12 w-12 rounded-lg bg-primary-50 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary-600" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {doc.category}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{doc.name}</h4>
                      <p className="text-xs text-gray-500 mb-3">{doc.uploadDate} • {doc.size}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deductions Tab */}
          <TabsContent value="deductions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tax Deductions Tracker</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Track eligible deductions to maximize your tax savings</p>
                    </div>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Deduction
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deductions.map((deduction) => (
                      <div key={deduction.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{deduction.category}</h4>
                              <Badge className={getStatusColor(deduction.status)} variant="outline">
                                {deduction.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{deduction.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Date: {deduction.date}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">${deduction.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-1">Potential savings</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">View Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Deduction Tips */}
              <Card className="bg-primary-50 border-primary-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary-900">
                    <AlertCircle className="w-5 h-5" />
                    Deduction Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-primary-900 text-sm">Home Office Deduction</p>
                      <p className="text-sm text-primary-700">If you work from home, you may be eligible to deduct a portion of your rent.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-primary-900 text-sm">Moving Expenses</p>
                      <p className="text-sm text-primary-700">Job-related moving expenses may be tax-deductible in certain situations.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-primary-900 text-sm">Keep Records</p>
                      <p className="text-sm text-primary-700">Maintain detailed records and receipts to support your deduction claims.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tax Calendar</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Important tax dates and deadlines for 2024</p>
                  </div>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export to Calendar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {calendarEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-lg bg-error-50 flex flex-col items-center justify-center">
                          <span className="text-xs font-semibold text-error-600">{event.date.split('-')[1]}</span>
                          <span className="text-lg font-bold text-error-600">{event.date.split('-')[2]}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          <Badge className={getImportanceColor(event.importance)} variant="outline">
                            {event.importance}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.date}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Set Reminder
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}