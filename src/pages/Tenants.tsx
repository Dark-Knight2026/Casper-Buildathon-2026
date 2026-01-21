import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  FileText, 
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import TenantDialog from '@/components/tenant/TenantDialog';

export default function Tenants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);

  const tenants = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 123-4567',
      unit: 'Apt 4B - Downtown Luxury',
      rentAmount: 1200,
      leaseStart: '2024-01-15',
      leaseEnd: '2024-12-15',
      paymentStatus: 'Paid',
      lastPayment: '2024-08-01',
      balance: 0,
      status: 'Active'
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike.chen@email.com',
      phone: '(555) 234-5678',
      unit: 'Unit 7A - Student Housing',
      rentAmount: 850,
      leaseStart: '2024-02-01',
      leaseEnd: '2025-01-31',
      paymentStatus: 'Due',
      lastPayment: '2024-07-01',
      balance: 850,
      status: 'Active'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      email: 'emily.r@email.com',
      phone: '(555) 345-6789',
      unit: 'Beach Villa #3',
      rentAmount: 2400,
      leaseStart: '2024-03-01',
      leaseEnd: '2024-09-01',
      paymentStatus: 'Paid',
      lastPayment: '2024-08-01',
      balance: 0,
      status: 'Active'
    },
    {
      id: 4,
      name: 'David Wilson',
      email: 'david.w@email.com',
      phone: '(555) 456-7890',
      unit: 'Office 12B - Commercial Plaza',
      rentAmount: 3200,
      leaseStart: '2023-12-01',
      leaseEnd: '2025-11-30',
      paymentStatus: 'Overdue',
      lastPayment: '2024-06-01',
      balance: 6400,
      status: 'Active'
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      email: 'lisa.t@email.com',
      phone: '(555) 567-8901',
      unit: 'Apt 2C - Downtown Luxury',
      rentAmount: 1100,
      leaseStart: '2024-06-01',
      leaseEnd: '2024-08-31',
      paymentStatus: 'Paid',
      lastPayment: '2024-08-01',
      balance: 0,
      status: 'Moving Out'
    }
  ];

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Due':
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
      case 'Due':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600 mt-2">Manage tenant relationships and lease agreements</p>
        </div>
        <Button onClick={() => setShowAddTenantDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Tenants</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTenants.filter(t => t.status === 'Active' || t.status === 'Moving Out').map((tenant) => (
              <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{tenant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        <CardDescription>{tenant.unit}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={tenant.status === 'Active' ? 'default' : 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Rent Amount</p>
                      <p className="font-medium text-green-600">${tenant.rentAmount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Balance</p>
                      <p className={`font-medium ${tenant.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${tenant.balance}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Lease End</p>
                      <p className="font-medium">{new Date(tenant.leaseEnd).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Payment</p>
                      <p className="font-medium">{new Date(tenant.lastPayment).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(tenant.paymentStatus)}
                      <span className="text-sm font-medium">Payment Status</span>
                    </div>
                    <Badge className={getPaymentStatusColor(tenant.paymentStatus)}>
                      {tenant.paymentStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{tenant.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{tenant.phone}</span>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-1" />
                      Lease
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <CreditCard className="h-4 w-4 mr-1" />
                      Payment
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>Review and process new tenant applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Alex Rivera', unit: 'Apt 5C - Downtown Luxury', income: 75000, score: 720 },
                  { name: 'Jordan Kim', unit: 'Office 8A - Commercial Plaza', income: 120000, score: 680 },
                  { name: 'Taylor Brown', unit: 'Beach Villa #2', income: 95000, score: 750 }
                ].map((application, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>{application.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{application.name}</h3>
                        <p className="text-sm text-gray-600">{application.unit}</p>
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          <span>Income: ${application.income.toLocaleString()}</span>
                          <span>Credit: {application.score}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">Review</Button>
                      <Button size="sm">Approve</Button>
                      <Button size="sm" variant="destructive">Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Tenant History</CardTitle>
              <CardDescription>Past tenants and lease records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Robert Davis', unit: 'Apt 3A - Downtown Luxury', period: '2023-2024', reason: 'Lease Expired' },
                  { name: 'Maria Garcia', unit: 'Office 5B - Commercial Plaza', period: '2022-2024', reason: 'Relocated' },
                  { name: 'James Wilson', unit: 'Beach Villa #1', period: '2023-2024', reason: 'Purchase Property' }
                ].map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>{record.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{record.name}</h3>
                        <p className="text-sm text-gray-600">{record.unit}</p>
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          <span>Period: {record.period}</span>
                          <span>Reason: {record.reason}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4 mr-1" />
                      Records
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Tenant Dialog */}
      <TenantDialog
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
        onSuccess={() => {
          // Refresh tenant list or show success message
        }}
      />
    </div>
  );
}