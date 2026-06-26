import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/useAuth';
import { 
  Wrench, 
  Star, 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Calculator,
  Receipt,
  PieChart,
  Building,
  Plus
} from 'lucide-react';

interface ServiceJob {
  id: string;
  clientName: string;
  service: string;
  date: string;
  amount: number;
  status: 'completed' | 'in_progress' | 'scheduled';
  address: string;
  paymentMethod: string;
}

interface TaxRecord {
  id: string;
  year: number;
  quarter: number;
  totalIncome: number;
  taxableIncome: number;
  estimatedTax: number;
  paidTax: number;
  status: 'current' | 'overdue' | 'paid';
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  deductible: boolean;
}

const mockJobs: ServiceJob[] = [
  {
    id: '1',
    clientName: 'John Smith',
    service: 'HVAC Repair',
    date: '2024-01-15',
    amount: 450,
    status: 'completed',
    address: '123 Main St, Virginia Beach, VA',
    paymentMethod: 'card'
  },
  {
    id: '2',
    clientName: 'Sarah Johnson',
    service: 'Plumbing Installation',
    date: '2024-01-18',
    amount: 320,
    status: 'completed',
    address: '456 Oak Ave, Norfolk, VA',
    paymentMethod: 'check'
  },
  {
    id: '3',
    clientName: 'Mike Davis',
    service: 'Electrical Work',
    date: '2024-01-20',
    amount: 275,
    status: 'in_progress',
    address: '789 Pine St, Chesapeake, VA',
    paymentMethod: 'bank_transfer'
  }
];

const mockTaxRecords: TaxRecord[] = [
  {
    id: '1',
    year: 2024,
    quarter: 1,
    totalIncome: 12450,
    taxableIncome: 11205,
    estimatedTax: 1680,
    paidTax: 1680,
    status: 'paid'
  },
  {
    id: '2',
    year: 2024,
    quarter: 2,
    totalIncome: 15200,
    taxableIncome: 13680,
    estimatedTax: 2052,
    paidTax: 2052,
    status: 'paid'
  },
  {
    id: '3',
    year: 2024,
    quarter: 3,
    totalIncome: 18750,
    taxableIncome: 16875,
    estimatedTax: 2531,
    paidTax: 0,
    status: 'overdue'
  },
  {
    id: '4',
    year: 2024,
    quarter: 4,
    totalIncome: 8200,
    taxableIncome: 7380,
    estimatedTax: 1107,
    paidTax: 0,
    status: 'current'
  }
];

const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '2024-01-10',
    category: 'Tools & Equipment',
    description: 'Professional drill set',
    amount: 245,
    deductible: true
  },
  {
    id: '2',
    date: '2024-01-15',
    category: 'Vehicle',
    description: 'Gas for service calls',
    amount: 65,
    deductible: true
  },
  {
    id: '3',
    date: '2024-01-20',
    category: 'Supplies',
    description: 'Plumbing parts and materials',
    amount: 180,
    deductible: true
  },
  {
    id: '4',
    date: '2024-01-25',
    category: 'Insurance',
    description: 'Liability insurance premium',
    amount: 420,
    deductible: true
  }
];

export default function ServiceProfessionalDashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [jobs] = useState<ServiceJob[]>(mockJobs);
  const [taxRecords] = useState<TaxRecord[]>(mockTaxRecords);
  const [expenses] = useState<Expense[]>(mockExpenses);

  const currentYear = new Date().getFullYear();
  const yearToDate = jobs
    .filter(job => job.status === 'completed' && new Date(job.date).getFullYear() === currentYear)
    .reduce((sum, job) => sum + job.amount, 0);

  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const averageJobValue = completedJobs > 0 ? yearToDate / completedJobs : 0;

  const deductibleExpenses = expenses
    .filter(expense => expense.deductible)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'current': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Wrench className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Professional Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name || 'Professional'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Year to Date</p>
                  <p className="text-2xl font-bold text-gray-900">${yearToDate.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{completedJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Job Value</p>
                  <p className="text-2xl font-bold text-gray-900">${averageJobValue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">4.8</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>Manage your service appointments and track completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">{job.clientName}</h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{job.service}</p>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(job.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {job.address}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">${job.amount}</p>
                        <p className="text-sm text-gray-500">{job.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar</CardTitle>
                  <CardDescription>View and manage your service schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your scheduled service calls</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress').map((job) => (
                      <div key={job.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">{job.clientName}</p>
                          <p className="text-sm text-gray-600">{job.service}</p>
                          <p className="text-sm text-gray-500">{new Date(job.date).toLocaleDateString()}</p>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>See what your customers are saying about your service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">John Smith</p>
                      <p className="text-sm text-gray-600">"Excellent HVAC repair service! Very professional and efficient."</p>
                      <p className="text-xs text-gray-500 mt-1">January 15, 2024</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Sarah Johnson</p>
                      <p className="text-sm text-gray-600">"Great plumbing work! Clean installation and fair pricing."</p>
                      <p className="text-xs text-gray-500 mt-1">January 18, 2024</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Track your income and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Monthly Revenue</span>
                      <span className="text-lg font-bold">${(yearToDate / 12).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Jobs This Month</span>
                      <span className="text-lg font-bold">{Math.ceil(completedJobs / 12)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Customer Rating</span>
                      <span className="text-lg font-bold">4.8/5.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Breakdown</CardTitle>
                  <CardDescription>Distribution of your service types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">HVAC Services</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div className="w-3/5 h-2 bg-blue-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">60%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plumbing</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div className="w-1/3 h-2 bg-green-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">30%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Electrical</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div className="w-1/5 h-2 bg-purple-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">10%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Professional Profile</CardTitle>
                <CardDescription>Manage your service professional information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={user?.name || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" defaultValue="(757) 555-0123" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license">License Number</Label>
                      <Input id="license" defaultValue="SP123456789" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="services">Services Offered</Label>
                    <Textarea 
                      id="services" 
                      defaultValue="HVAC repair and maintenance, Plumbing installation and repair, Electrical work and troubleshooting"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service-area">Service Area</Label>
                    <Input id="service-area" defaultValue="Virginia Beach, Norfolk, Chesapeake" />
                  </div>

                  <Button>Save Profile</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounting">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Calculator className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">YTD Income</p>
                        <p className="text-2xl font-bold text-gray-900">${yearToDate.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <Receipt className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Deductible Expenses</p>
                        <p className="text-2xl font-bold text-gray-900">${deductibleExpenses.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <PieChart className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Net Income</p>
                        <p className="text-2xl font-bold text-gray-900">${(yearToDate - deductibleExpenses).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Est. Tax Owed</p>
                        <p className="text-2xl font-bold text-gray-900">${Math.round((yearToDate - deductibleExpenses) * 0.15).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Quarterly Tax Records
                    </CardTitle>
                    <CardDescription>Track your quarterly estimated tax payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {taxRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold">Q{record.quarter} {record.year}</h3>
                              <Badge className={getStatusColor(record.status)}>
                                {record.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">Income: ${record.totalIncome.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Taxable: ${record.taxableIncome.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">${record.estimatedTax}</p>
                            <p className="text-sm text-gray-500">Paid: ${record.paidTax}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download Tax Summary
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Receipt className="h-5 w-5 mr-2" />
                      Business Expenses
                    </CardTitle>
                    <CardDescription>Track deductible business expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{expense.category}</p>
                            <p className="text-sm text-gray-600">{expense.description}</p>
                            <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${expense.amount}</p>
                            {expense.deductible && (
                              <Badge variant="outline" className="text-xs">Deductible</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export Expenses
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    1099 Tax Information & Compliance
                  </CardTitle>
                  <CardDescription>Important information for tax compliance and 1099 reporting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Tax Compliance Checklist</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm">Track all business income</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm">Maintain expense records</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm">File quarterly estimated taxes</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm">Keep receipts for deductions</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">1099-NEC Information</h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>Current Year Total:</strong> ${yearToDate.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-600">
                          Clients who pay you $600+ annually will receive a 1099-NEC form. 
                          Keep accurate records of all payments received.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Key Tax Dates</h4>
                        <div className="text-sm space-y-1">
                          <p>• Q1 Estimated Tax: April 15</p>
                          <p>• Q2 Estimated Tax: June 15</p>
                          <p>• Q3 Estimated Tax: September 15</p>
                          <p>• Q4 Estimated Tax: January 15</p>
                          <p>• Annual Tax Return: April 15</p>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate 1099 Summary
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}