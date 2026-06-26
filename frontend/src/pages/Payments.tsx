import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DollarSign, 
  Search, 
  Download, 
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard
} from 'lucide-react';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');

  const payments = [
    {
      id: 1,
      tenantName: 'Sarah Johnson',
      property: 'Apt 4B - Downtown Luxury',
      amount: 1200,
      dueDate: '2024-08-01',
      paidDate: '2024-07-30',
      status: 'Paid',
      method: 'Bank Transfer',
      type: 'Rent'
    },
    {
      id: 2,
      tenantName: 'Mike Chen',
      property: 'Unit 7A - Student Housing',
      amount: 850,
      dueDate: '2024-08-01',
      paidDate: null,
      status: 'Overdue',
      method: null,
      type: 'Rent'
    },
    {
      id: 3,
      tenantName: 'Emily Rodriguez',
      property: 'Beach Villa #3',
      amount: 2400,
      dueDate: '2024-08-15',
      paidDate: '2024-08-14',
      status: 'Paid',
      method: 'Credit Card',
      type: 'Rent'
    }
  ];

  const filteredPayments = payments.filter(payment =>
    payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.property.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const totalCollected = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = payments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-2">Track rent payments and financial transactions</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalCollected.toLocaleString()}</div>
            <p className="text-xs text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Overdue amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">96.2%</div>
            <p className="text-xs text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days to Pay</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">2.1</div>
            <p className="text-xs text-gray-600">Days early</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="recent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recent">Recent Payments</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <Avatar>
                        <AvatarFallback>{payment.tenantName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{payment.tenantName}</CardTitle>
                        <CardDescription>{payment.property}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Amount</p>
                      <p className="font-medium text-green-600">${payment.amount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Due Date</p>
                      <p className="font-medium">{new Date(payment.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Paid Date</p>
                      <p className="font-medium">
                        {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'Not paid'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Method</p>
                      <p className="font-medium">{payment.method || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {payment.status !== 'Paid' && (
                      <Button size="sm" className="flex-1">
                        <CreditCard className="h-4 w-4 mr-1" />
                        Record Payment
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex-1">
                      Send Reminder
                    </Button>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Payments</CardTitle>
              <CardDescription>Payments that are past due and need attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.filter(p => p.status === 'Overdue').map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{payment.tenantName}</h3>
                        <p className="text-sm text-gray-600">{payment.property}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Amount: ${payment.amount}</span>
                          <span>Due: {new Date(payment.dueDate).toLocaleDateString()}</span>
                          <span className="text-red-600 font-medium">
                            {Math.floor((Date.now() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Send Notice
                      </Button>
                      <Button size="sm">
                        Record Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Payment Analytics</CardTitle>
              <CardDescription>Financial insights and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Payment analytics and charts would be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}