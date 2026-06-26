import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Calendar,
  FileText,
  Camera,
  Download,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  Ruler,
  Map,
  Compass
} from 'lucide-react';

interface SurveyOrder {
  id: string;
  propertyAddress: string;
  orderDate: string;
  scheduledDate: string;
  client: string;
  surveyType: string;
  status: 'ordered' | 'scheduled' | 'in_progress' | 'completed' | 'delivered';
  fee: number;
  acreage: number;
}

export default function SurveyorDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  
  const [surveyOrders] = useState<SurveyOrder[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      orderDate: '2024-01-10',
      scheduledDate: '2024-01-18',
      client: 'John Smith',
      surveyType: 'Boundary Survey',
      status: 'scheduled',
      fee: 850,
      acreage: 0.75
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      orderDate: '2024-01-12',
      scheduledDate: '2024-01-16',
      client: 'Jane Doe',
      surveyType: 'ALTA Survey',
      status: 'in_progress',
      fee: 1250,
      acreage: 1.2
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'ordered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surveyor Dashboard</h1>
          <p className="text-gray-600">Manage boundary surveys and property mapping</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Survey
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Survey
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {surveyOrders.filter(o => !['completed', 'delivered'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Map className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Surveys This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {surveyOrders.filter(o => o.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Ruler className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Acreage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {surveyOrders.reduce((sum, order) => sum + order.acreage, 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Compass className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${surveyOrders.reduce((sum, order) => sum + order.fee, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Survey Orders</TabsTrigger>
          <TabsTrigger value="mapping">Boundary Maps</TabsTrigger>
          <TabsTrigger value="easements">Easements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Orders</CardTitle>
              <CardDescription>Manage your property survey assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {surveyOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{order.propertyAddress}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Scheduled: {new Date(order.scheduledDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Map className="h-4 w-4 mr-2" />
                              {order.surveyType}
                            </div>
                            <div className="flex items-center">
                              <Ruler className="h-4 w-4 mr-2" />
                              {order.acreage} acres
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium">Client:</span> {order.client}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-lg font-bold text-green-600">
                            ${order.fee}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MapPin className="h-4 w-4 mr-1" />
                              View Map
                            </Button>
                            <Button size="sm">
                              <Compass className="h-4 w-4 mr-1" />
                              Start Survey
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Boundary Maps & Overlays</CardTitle>
              <CardDescription>Create and manage property boundary maps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Map className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Boundary mapping tools and overlays</p>
                <Button className="mt-4">
                  <Camera className="h-4 w-4 mr-2" />
                  Create New Map
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="easements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Easement Overlays</CardTitle>
              <CardDescription>Manage utility and access easements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Easement documentation and overlays</p>
                <Button className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Easement
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey Reports</CardTitle>
              <CardDescription>Generate and manage survey reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Download className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Survey report generation and delivery</p>
                <Button className="mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}