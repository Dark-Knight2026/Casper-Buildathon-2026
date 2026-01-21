import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Wrench, 
  Search, 
  Plus, 
  Calendar,
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  User,
  Building2
} from 'lucide-react';

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState('');

  const maintenanceRequests = [
    {
      id: 1,
      title: 'Leaking Kitchen Faucet',
      tenant: 'Sarah Johnson',
      property: 'Apt 4B - Downtown Luxury',
      category: 'Plumbing',
      priority: 'Medium',
      status: 'In Progress',
      dateReported: '2024-08-10',
      scheduledDate: '2024-08-15',
      estimatedCost: 150,
      assignedTo: 'Mike\'s Plumbing',
      description: 'Kitchen faucet has been dripping continuously for 3 days'
    },
    {
      id: 2,
      title: 'AC Unit Not Cooling',
      tenant: 'Mike Chen',
      property: 'Unit 7A - Student Housing',
      category: 'HVAC',
      priority: 'High',
      status: 'Scheduled',
      dateReported: '2024-08-12',
      scheduledDate: '2024-08-14',
      estimatedCost: 350,
      assignedTo: 'Cool Air Services',
      description: 'Air conditioning unit not producing cold air, room temperature rising'
    }
  ];

  const filteredRequests = maintenanceRequests.filter(request =>
    request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.property.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'Open':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-2">Manage property maintenance requests and service providers</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search maintenance requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="providers">Service Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <Wrench className="h-5 w-5 text-blue-500 mt-1" />
                      <div>
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <CardDescription>{request.property}</CardDescription>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Tenant</p>
                      <p className="font-medium">{request.tenant}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Category</p>
                      <p className="font-medium">{request.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Estimated Cost</p>
                      <p className="font-medium text-green-600">${request.estimatedCost}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{request.description}</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      Update Status
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Assign Provider
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Maintenance</CardTitle>
              <CardDescription>Upcoming scheduled maintenance appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled maintenance at the moment</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Service Providers</CardTitle>
              <CardDescription>Manage your trusted service providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No service providers added yet</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}