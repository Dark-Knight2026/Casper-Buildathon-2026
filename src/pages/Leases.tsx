import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  X
} from 'lucide-react';

export default function Leases() {
  const [searchTerm, setSearchTerm] = useState('');

  const leases = [
    {
      id: 1,
      tenantName: 'Sarah Johnson',
      property: 'Apt 4B - Downtown Luxury',
      rentAmount: 1200,
      startDate: '2024-01-15',
      endDate: '2024-12-15',
      status: 'Active',
      type: 'Long-term',
      securityDeposit: 1200,
      daysToExpiry: 128,
      autoRenew: true
    },
    {
      id: 2,
      tenantName: 'Mike Chen',
      property: 'Unit 7A - Student Housing',
      rentAmount: 850,
      startDate: '2024-02-01',
      endDate: '2025-01-31',
      status: 'Active',
      type: 'Long-term',
      securityDeposit: 850,
      daysToExpiry: 175,
      autoRenew: false
    },
    {
      id: 3,
      tenantName: 'Emily Rodriguez',
      property: 'Beach Villa #3',
      rentAmount: 2400,
      startDate: '2024-03-01',
      endDate: '2024-09-01',
      status: 'Expiring Soon',
      type: 'Short-term',
      securityDeposit: 2400,
      daysToExpiry: 18,
      autoRenew: false
    },
    {
      id: 4,
      tenantName: 'David Wilson',
      property: 'Office 12B - Commercial Plaza',
      rentAmount: 3200,
      startDate: '2023-12-01',
      endDate: '2025-11-30',
      status: 'Active',
      type: 'Long-term',
      securityDeposit: 6400,
      daysToExpiry: 460,
      autoRenew: true
    },
    {
      id: 5,
      tenantName: 'Lisa Thompson',
      property: 'Apt 2C - Downtown Luxury',
      rentAmount: 1100,
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      status: 'Terminating',
      type: 'Short-term',
      securityDeposit: 1100,
      daysToExpiry: -1,
      autoRenew: false
    }
  ];

  const filteredLeases = leases.filter(lease =>
    lease.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.property.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      case 'Terminating':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Expiring Soon':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'Expired':
        return <X className="h-4 w-4 text-red-500" />;
      case 'Terminating':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lease Agreements</h1>
          <p className="text-gray-600 mt-2">Manage tenant lease agreements and renewals</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Lease
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search lease agreements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Leases</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="space-y-4">
            {filteredLeases.filter(l => l.status === 'Active').map((lease) => (
              <Card key={lease.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <Avatar>
                        <AvatarFallback>{lease.tenantName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{lease.tenantName}</CardTitle>
                        <CardDescription>{lease.property}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(lease.status)}
                      <Badge className={getStatusColor(lease.status)}>
                        {lease.status}
                      </Badge>
                      {lease.autoRenew && (
                        <Badge variant="outline">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Auto-Renew
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Monthly Rent</p>
                      <p className="font-medium text-green-600">${lease.rentAmount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Lease Type</p>
                      <p className="font-medium">{lease.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-medium">{new Date(lease.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">End Date</p>
                      <p className="font-medium">{new Date(lease.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Security Deposit</p>
                      <p className="font-medium">${lease.securityDeposit}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Days to Expiry</p>
                      <p className={`font-medium ${lease.daysToExpiry < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                        {lease.daysToExpiry} days
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Auto Renewal</p>
                      <p className="font-medium">{lease.autoRenew ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Value</p>
                      <p className="font-medium">${(lease.rentAmount * 12).toLocaleString()}/year</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-1" />
                      View Lease
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Renew
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Modify
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle>Expiring Leases</CardTitle>
              <CardDescription>Leases that need attention for renewal or termination</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leases.filter(l => l.status === 'Expiring Soon' || l.daysToExpiry < 60).map((lease) => (
                  <div key={lease.id} className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <AlertCircle className="h-8 w-8 text-yellow-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{lease.tenantName}</h3>
                        <p className="text-sm text-gray-600">{lease.property}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Expires: {new Date(lease.endDate).toLocaleDateString()}</span>
                          <span>Rent: ${lease.rentAmount}/month</span>
                          <span className="text-yellow-600 font-medium">
                            {lease.daysToExpiry > 0 ? `${lease.daysToExpiry} days left` : 'Expired'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Contact Tenant
                      </Button>
                      <Button size="sm">
                        Start Renewal
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals">
          <Card>
            <CardHeader>
              <CardTitle>Renewal Pipeline</CardTitle>
              <CardDescription>Track lease renewals and negotiations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { tenant: 'Emily Rodriguez', property: 'Beach Villa #3', stage: 'Negotiating', newRent: 2500 },
                  { tenant: 'Mike Chen', property: 'Unit 7A', stage: 'Pending Signature', newRent: 900 },
                  { tenant: 'James Wilson', property: 'Office 5C', stage: 'Terms Agreed', newRent: 2800 }
                ].map((renewal, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <RefreshCw className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{renewal.tenant}</h3>
                        <p className="text-sm text-gray-600">{renewal.property}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Stage: {renewal.stage}</span>
                          <span>New Rent: ${renewal.newRent}/month</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Review Terms
                      </Button>
                      <Button size="sm">
                        Finalize
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Standard Residential Lease', type: 'Long-term', duration: '12 months' },
              { name: 'Short-term Rental Agreement', type: 'Short-term', duration: '1-6 months' },
              { name: 'Commercial Lease Template', type: 'Commercial', duration: '2-5 years' },
              { name: 'Student Housing Contract', type: 'Academic', duration: '9-12 months' }
            ].map((template, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.type} • {template.duration}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>Standardized lease template with all required clauses and terms.</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      Use Template
                    </Button>
                    <Button size="sm" variant="outline">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}