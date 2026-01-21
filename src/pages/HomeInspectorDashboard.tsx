import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Calendar,
  Upload,
  Download,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Phone,
  Mail,
  Home,
  Zap,
  Droplets,
  Thermometer,
  Shield
} from 'lucide-react';

interface InspectionOrder {
  id: string;
  propertyAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  client: string;
  agent: string;
  phone: string;
  email: string;
  inspectionType: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'report_delivered';
  fee: number;
  specialRequests?: string;
}

interface InspectionIssue {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'safety';
  description: string;
  location: string;
  recommendedAction: string;
  photos: number;
  estimatedCost?: string;
}

export default function HomeInspectorDashboard() {
  const [activeTab, setActiveTab] = useState('inspections');
  
  const [inspectionOrders] = useState<InspectionOrder[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      scheduledDate: '2024-01-16',
      scheduledTime: '09:00',
      client: 'John Smith',
      agent: 'Sarah Johnson',
      phone: '(555) 123-4567',
      email: 'john.smith@email.com',
      inspectionType: 'Full Home Inspection',
      status: 'scheduled',
      fee: 450,
      specialRequests: 'Focus on HVAC system and electrical'
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      scheduledDate: '2024-01-15',
      scheduledTime: '14:00',
      client: 'Jane Doe',
      agent: 'Mike Davis',
      phone: '(555) 987-6543',
      email: 'jane.doe@email.com',
      inspectionType: 'Pre-Listing Inspection',
      status: 'in_progress',
      fee: 375
    }
  ]);

  const [currentIssues, setCurrentIssues] = useState<InspectionIssue[]>([
    {
      id: '1',
      category: 'Electrical',
      severity: 'high',
      description: 'Outdated electrical panel with federal pacific breakers',
      location: 'Main electrical panel - basement',
      recommendedAction: 'Replace electrical panel immediately',
      photos: 3,
      estimatedCost: '$2,500 - $4,000'
    },
    {
      id: '2',
      category: 'Plumbing',
      severity: 'medium',
      description: 'Minor leak detected under kitchen sink',
      location: 'Kitchen - under sink cabinet',
      recommendedAction: 'Tighten connections or replace supply lines',
      photos: 2,
      estimatedCost: '$150 - $300'
    },
    {
      id: '3',
      category: 'HVAC',
      severity: 'low',
      description: 'Air filter needs replacement',
      location: 'HVAC unit - utility room',
      recommendedAction: 'Replace air filter',
      photos: 1,
      estimatedCost: '$25 - $50'
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'safety': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'electrical': return <Zap className="h-4 w-4" />;
      case 'plumbing': return <Droplets className="h-4 w-4" />;
      case 'hvac': return <Thermometer className="h-4 w-4" />;
      case 'structural': return <Home className="h-4 w-4" />;
      case 'safety': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Home Inspector Dashboard</h1>
          <p className="text-gray-600">Manage inspections and generate comprehensive reports</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Photos
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Inspection
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
                <p className="text-sm font-medium text-gray-600">Today's Inspections</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inspectionOrders.filter(o => o.scheduledDate === '2024-01-16').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Search className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Inspections</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inspectionOrders.filter(o => o.status === 'in_progress').length}
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
                <p className="text-sm font-medium text-gray-600">Issues Found</p>
                <p className="text-2xl font-bold text-gray-900">{currentIssues.length}</p>
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
                  {inspectionOrders.filter(o => o.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inspections">Scheduled Inspections</TabsTrigger>
          <TabsTrigger value="current">Current Inspection</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="checklist">Inspection Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Inspections</CardTitle>
              <CardDescription>Manage your scheduled property inspections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspectionOrders.map((inspection) => (
                  <Card key={inspection.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{inspection.propertyAddress}</h3>
                            <Badge className={getStatusColor(inspection.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {inspection.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(inspection.scheduledDate).toLocaleDateString()} at {inspection.scheduledTime}
                            </div>
                            <div className="flex items-center">
                              <Home className="h-4 w-4 mr-2" />
                              {inspection.inspectionType}
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              {inspection.phone}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Client:</span> {inspection.client}</div>
                            <div><span className="font-medium">Agent:</span> {inspection.agent}</div>
                          </div>
                          
                          {inspection.specialRequests && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                              <span className="font-medium">Special Requests:</span> {inspection.specialRequests}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-lg font-bold text-green-600">
                            ${inspection.fee}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MapPin className="h-4 w-4 mr-1" />
                              Directions
                            </Button>
                            <Button size="sm">
                              <Search className="h-4 w-4 mr-1" />
                              Start Inspection
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

        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Inspection - 456 Oak Ave</CardTitle>
              <CardDescription>Document findings and issues in real-time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Issue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="hvac">HVAC</SelectItem>
                            <SelectItem value="structural">Structural</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
                            <SelectItem value="exterior">Exterior</SelectItem>
                            <SelectItem value="interior">Interior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">Severity</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="safety">Safety Concern</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="low">Low Priority</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" placeholder="e.g., Kitchen - under sink cabinet" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description"
                        placeholder="Detailed description of the issue..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recommendation">Recommended Action</Label>
                      <Textarea 
                        id="recommendation"
                        placeholder="Recommended repair or action..."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1">
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Add Issue
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Issues Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentIssues.map((issue) => (
                        <div key={issue.id} className={`p-3 border rounded-lg ${getSeverityColor(issue.severity)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(issue.category)}
                              <span className="font-medium">{issue.category}</span>
                              <Badge variant="outline" className="text-xs">
                                {issue.severity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Camera className="h-3 w-3" />
                              {issue.photos}
                            </div>
                          </div>
                          <p className="text-sm font-medium mb-1">{issue.description}</p>
                          <p className="text-xs text-gray-600 mb-1">Location: {issue.location}</p>
                          <p className="text-xs text-gray-600 mb-2">Action: {issue.recommendedAction}</p>
                          {issue.estimatedCost && (
                            <p className="text-xs font-medium text-green-600">
                              Estimated Cost: {issue.estimatedCost}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Save Progress
                </Button>
                <Button>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Inspection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Reports</CardTitle>
              <CardDescription>Generate and manage inspection reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generate Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="report-property">Property</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select completed inspection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="456-oak">456 Oak Ave, Norfolk, VA</SelectItem>
                          <SelectItem value="789-pine">789 Pine St, Chesapeake, VA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="report-type">Report Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Inspection Report</SelectItem>
                          <SelectItem value="summary">Summary Report</SelectItem>
                          <SelectItem value="repair">Repair List Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label>Include Sections</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="structural" defaultChecked />
                          <Label htmlFor="structural" className="text-sm">Structural</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="electrical-check" defaultChecked />
                          <Label htmlFor="electrical-check" className="text-sm">Electrical</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="plumbing-check" defaultChecked />
                          <Label htmlFor="plumbing-check" className="text-sm">Plumbing</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="hvac-check" defaultChecked />
                          <Label htmlFor="hvac-check" className="text-sm">HVAC</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="photos-check" defaultChecked />
                          <Label htmlFor="photos-check" className="text-sm">Photos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="recommendations" defaultChecked />
                          <Label htmlFor="recommendations" className="text-sm">Recommendations</Label>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">789 Pine St Report</p>
                          <p className="text-sm text-gray-600">Generated Jan 12, 2024</p>
                          <Badge className="bg-green-100 text-green-800 text-xs">Delivered</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">321 Elm Dr Report</p>
                          <p className="text-sm text-gray-600">Generated Jan 10, 2024</p>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Sent</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Checklist</CardTitle>
              <CardDescription>Comprehensive inspection checklist template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Exterior Inspection</h3>
                  <div className="space-y-2">
                    {[
                      'Roof condition and materials',
                      'Gutters and downspouts',
                      'Exterior walls and siding',
                      'Windows and doors',
                      'Foundation and grading',
                      'Driveway and walkways'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox id={`exterior-${index}`} />
                        <Label htmlFor={`exterior-${index}`} className="text-sm">{item}</Label>
                      </div>
                    ))}
                  </div>

                  <h3 className="font-semibold text-lg mt-6">Interior Inspection</h3>
                  <div className="space-y-2">
                    {[
                      'Walls, ceilings, and floors',
                      'Doors and windows operation',
                      'Stairways and railings',
                      'Smoke and carbon monoxide detectors',
                      'Attic access and insulation',
                      'Basement or crawl space'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox id={`interior-${index}`} />
                        <Label htmlFor={`interior-${index}`} className="text-sm">{item}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Systems Inspection</h3>
                  <div className="space-y-2">
                    {[
                      'Electrical panel and wiring',
                      'GFCI outlets and switches',
                      'Plumbing fixtures and pipes',
                      'Water pressure and drainage',
                      'HVAC system operation',
                      'Ductwork and vents',
                      'Water heater condition',
                      'Insulation and ventilation'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox id={`systems-${index}`} />
                        <Label htmlFor={`systems-${index}`} className="text-sm">{item}</Label>
                      </div>
                    ))}
                  </div>

                  <h3 className="font-semibold text-lg mt-6">Safety Items</h3>
                  <div className="space-y-2">
                    {[
                      'Smoke detector functionality',
                      'Carbon monoxide detectors',
                      'GFCI protection',
                      'Handrails and guardrails',
                      'Emergency exits',
                      'Fire extinguisher locations'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox id={`safety-${index}`} />
                        <Label htmlFor={`safety-${index}`} className="text-sm">{item}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <Button>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Checklist Progress
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Checklist
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}