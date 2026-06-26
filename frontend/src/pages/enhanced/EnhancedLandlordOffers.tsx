import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, 
  FileText, 
  DollarSign, 
  Users, 
  Wrench,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function EnhancedLandlordOffers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('applications');

  const rentalApplications = [
    {
      id: 1,
      applicant: 'Sarah Johnson',
      property: 'Oak Street Apartments - Unit 4B',
      rentAmount: 1850,
      status: 'pending',
      submittedDate: '2024-01-10',
      creditScore: 785,
      income: 75000,
      employment: 'Software Engineer'
    },
    {
      id: 2,
      applicant: 'Mike Davis',
      property: 'Harbor View Condos - Unit 2A',
      rentAmount: 1650,
      status: 'approved',
      submittedDate: '2024-01-08',
      creditScore: 720,
      income: 68000,
      employment: 'Marketing Manager'
    }
  ];

  const properties = [
    {
      id: 1,
      name: 'Oak Street Apartments',
      units: 12,
      occupied: 10,
      vacant: 2,
      monthlyRevenue: 18000,
      applications: 5
    },
    {
      id: 2,
      name: 'Harbor View Condos',
      units: 8,
      occupied: 8,
      vacant: 0,
      monthlyRevenue: 16000,
      applications: 2
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Landlord Features</h1>
          <p className="text-gray-600 mt-1">
            Advanced property management - rental applications, tenant screening, and lease management
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="screening">Tenant Screening</TabsTrigger>
            <TabsTrigger value="leases">Lease Management</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="analytics">Property Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">New Applications</p>
                      <p className="text-2xl font-bold text-indigo-600">{rentalApplications.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {rentalApplications.filter(app => app.status === 'pending').length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-green-600">
                        {rentalApplications.filter(app => app.status === 'approved').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Vacant Units</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {properties.reduce((sum, prop) => sum + prop.vacant, 0)}
                      </p>
                    </div>
                    <Building2 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Rental Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rentalApplications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{application.applicant}</h4>
                          <p className="text-sm text-gray-600">
                            {application.property} • ${application.rentAmount}/month
                          </p>
                        </div>
                        <Badge className={
                          application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          application.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {application.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Credit Score</p>
                          <p className="font-medium text-lg text-green-600">{application.creditScore}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Annual Income</p>
                          <p className="font-medium">${application.income.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Employment</p>
                          <p className="font-medium">{application.employment}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Submitted</p>
                          <p className="font-medium">{application.submittedDate}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {application.status === 'pending' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200">Decline</Button>
                          </>
                        )}
                        <Button size="sm" variant="outline">View Full Application</Button>
                        <Button size="sm" variant="outline">Run Background Check</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="screening">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tenant Screening</h3>
                <p className="text-gray-600">Comprehensive background checks, credit reports, and reference verification</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leases">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Lease Management</h3>
                <p className="text-gray-600">Electronic lease agreements, digital signatures, and automated renewals</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardContent className="p-6 text-center">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Maintenance Management</h3>
                <p className="text-gray-600">Track maintenance requests, schedule repairs, and manage vendor relationships</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Property Analytics</h3>
                <p className="text-gray-600">Rental market analysis, occupancy rates, and revenue optimization</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}