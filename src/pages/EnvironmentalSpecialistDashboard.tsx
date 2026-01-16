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
  Leaf,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Upload,
  Shield,
  Thermometer,
  Wind,
  Droplets
} from 'lucide-react';

interface EnvironmentalTest {
  id: string;
  propertyAddress: string;
  testType: string;
  scheduledDate: string;
  client: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'report_delivered';
  results: string;
  fee: number;
  hazardLevel: 'safe' | 'low' | 'moderate' | 'high';
}

export default function EnvironmentalSpecialistDashboard() {
  const [activeTab, setActiveTab] = useState('tests');
  
  const [environmentalTests] = useState<EnvironmentalTest[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      testType: 'Radon Testing',
      scheduledDate: '2024-01-16',
      client: 'John Smith',
      status: 'scheduled',
      results: '',
      fee: 175,
      hazardLevel: 'safe'
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      testType: 'Mold Assessment',
      scheduledDate: '2024-01-15',
      client: 'Jane Doe',
      status: 'completed',
      results: 'Elevated mold levels detected in basement',
      fee: 225,
      hazardLevel: 'moderate'
    },
    {
      id: '3',
      propertyAddress: '789 Pine St, Chesapeake, VA',
      testType: 'Asbestos Inspection',
      scheduledDate: '2024-01-14',
      client: 'Bob Wilson',
      status: 'completed',
      results: 'No asbestos materials detected',
      fee: 300,
      hazardLevel: 'safe'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'report_delivered': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHazardColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTestIcon = (testType: string) => {
    if (testType.includes('Radon')) return <Wind className="h-4 w-4" />;
    if (testType.includes('Mold')) return <Droplets className="h-4 w-4" />;
    if (testType.includes('Asbestos')) return <Shield className="h-4 w-4" />;
    return <Leaf className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Environmental Specialist Dashboard</h1>
          <p className="text-gray-600">Manage environmental testing and hazard assessments</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Report
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Test
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {environmentalTests.filter(t => t.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Safe Properties</p>
                <p className="text-2xl font-bold text-gray-900">
                  {environmentalTests.filter(t => t.hazardLevel === 'safe').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hazards Found</p>
                <p className="text-2xl font-bold text-gray-900">
                  {environmentalTests.filter(t => ['moderate', 'high'].includes(t.hazardLevel)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reports Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {environmentalTests.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests">Environmental Tests</TabsTrigger>
          <TabsTrigger value="radon">Radon Testing</TabsTrigger>
          <TabsTrigger value="mold">Mold Assessment</TabsTrigger>
          <TabsTrigger value="asbestos">Asbestos Inspection</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environmental Testing Schedule</CardTitle>
              <CardDescription>Manage your environmental assessments and testing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {environmentalTests.map((test) => (
                  <Card key={test.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {getTestIcon(test.testType)}
                              <h3 className="font-semibold text-lg">{test.propertyAddress}</h3>
                            </div>
                            <Badge className={getStatusColor(test.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {test.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={getHazardColor(test.hazardLevel)}>
                              {test.hazardLevel}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(test.scheduledDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Leaf className="h-4 w-4 mr-2" />
                              {test.testType}
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Fee: ${test.fee}
                            </div>
                          </div>
                          
                          <div className="text-sm mb-2">
                            <span className="font-medium">Client:</span> {test.client}
                          </div>
                          
                          {test.results && (
                            <div className="p-2 bg-gray-50 rounded text-sm">
                              <span className="font-medium">Results:</span> {test.results}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View Report
                          </Button>
                          <Button size="sm">
                            <Leaf className="h-4 w-4 mr-1" />
                            Start Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radon" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Radon Testing</CardTitle>
              <CardDescription>Radon gas detection and measurement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Wind className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Radon testing protocols and equipment</p>
                <Button className="mt-4">
                  <Thermometer className="h-4 w-4 mr-2" />
                  Start Radon Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mold" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mold Assessment</CardTitle>
              <CardDescription>Mold inspection and air quality testing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Droplets className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Mold detection and air quality assessment</p>
                <Button className="mt-4">
                  <Droplets className="h-4 w-4 mr-2" />
                  Start Mold Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asbestos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asbestos Inspection</CardTitle>
              <CardDescription>Asbestos material identification and testing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Asbestos material sampling and analysis</p>
                <Button className="mt-4">
                  <Shield className="h-4 w-4 mr-2" />
                  Start Asbestos Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}