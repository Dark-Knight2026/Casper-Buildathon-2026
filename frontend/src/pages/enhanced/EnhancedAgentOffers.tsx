import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Clock, 
  DollarSign,
  Home,
  TrendingUp,
  Phone,
  Calendar
} from 'lucide-react';

export default function EnhancedAgentOffers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pipeline');

  const clientOffers = [
    {
      id: 1,
      client: 'John & Sarah Smith',
      property: '123 Oak Street, Norfolk',
      type: 'buyer',
      offerAmount: 850000,
      status: 'pending',
      submittedDate: '2024-01-10'
    },
    {
      id: 2,
      client: 'Robert Johnson',
      property: '456 Pine Avenue, Virginia Beach',
      type: 'seller',
      listPrice: 720000,
      status: 'active',
      listedDate: '2024-01-05'
    }
  ];

  const activeClients = [
    {
      id: 1,
      name: 'John & Sarah Smith',
      type: 'buyer',
      budget: '800K-900K',
      status: 'active',
      lastContact: '2024-01-10',
      stage: 'Making offers'
    },
    {
      id: 2,
      name: 'Robert Johnson',
      type: 'seller',
      property: '456 Pine Avenue',
      status: 'listed',
      lastContact: '2024-01-09',
      stage: 'Showing property'
    },
    {
      id: 3,
      name: 'Maria Garcia',
      type: 'buyer',
      budget: '600K-750K',
      status: 'searching',
      lastContact: '2024-01-08',
      stage: 'Property search'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Agent Features</h1>
          <p className="text-gray-600 mt-1">
            Advanced tools for real estate agents - client management, offer tracking, and performance analytics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pipeline">Deal Pipeline</TabsTrigger>
            <TabsTrigger value="clients">Client Management</TabsTrigger>
            <TabsTrigger value="offers">Offer Management</TabsTrigger>
            <TabsTrigger value="analytics">Performance</TabsTrigger>
            <TabsTrigger value="tools">Agent Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-blue-600">{activeClients.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Offers</p>
                      <p className="text-2xl font-bold text-green-600">{clientOffers.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-purple-600">$2.1M</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Closed Deals</p>
                      <p className="text-2xl font-bold text-orange-600">8</p>
                    </div>
                    <Home className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Client Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeClients.map((client) => (
                    <div key={client.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{client.name}</h4>
                          <p className="text-sm text-gray-600">
                            {client.type === 'buyer' ? `Budget: ${client.budget}` : `Property: ${client.property}`}
                          </p>
                        </div>
                        <Badge className={
                          client.status === 'active' ? 'bg-green-100 text-green-800' :
                          client.status === 'listed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {client.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Client Type</p>
                          <p className="font-medium capitalize">{client.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Current Stage</p>
                          <p className="font-medium">{client.stage}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button size="sm">
                          <Phone className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Client Management System</h3>
                <p className="text-gray-600">Comprehensive CRM for managing buyer and seller relationships</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Offer Management</h3>
                <p className="text-gray-600">Digital offer submission, tracking, and negotiation tools</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Analytics</h3>
                <p className="text-gray-600">Track your sales performance, commission, and market metrics</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Tools</h3>
                <p className="text-gray-600">Market analysis, comparative reports, and client presentation tools</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}