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
  Bug,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Camera,
  MapPin,
  Phone,
  Mail,
  Download,
  Upload,
  Shield
} from 'lucide-react';

interface PestInspection {
  id: string;
  propertyAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  client: string;
  agent: string;
  inspectionType: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'report_delivered';
  fee: number;
  findings: PestFinding[];
}

interface PestFinding {
  id: string;
  pestType: string;
  severity: 'low' | 'medium' | 'high' | 'severe';
  location: string;
  description: string;
  treatment: string;
  photos: number;
  active: boolean;
}

export default function PestInspectorDashboard() {
  const [activeTab, setActiveTab] = useState('inspections');
  
  const [inspections] = useState<PestInspection[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      scheduledDate: '2024-01-16',
      scheduledTime: '10:00',
      client: 'John Smith',
      agent: 'Sarah Johnson',
      inspectionType: 'Termite Inspection',
      status: 'scheduled',
      fee: 125,
      findings: []
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      scheduledDate: '2024-01-15',
      scheduledTime: '14:00',
      client: 'Jane Doe',
      agent: 'Mike Davis',
      inspectionType: 'Full Pest Inspection',
      status: 'completed',
      fee: 175,
      findings: [
        {
          id: '1',
          pestType: 'Subterranean Termites',
          severity: 'high',
          location: 'Foundation - Southwest corner',
          description: 'Active termite colony with mud tubes visible',
          treatment: 'Liquid termiticide treatment required',
          photos: 4,
          active: true
        },
        {
          id: '2',
          pestType: 'Carpenter Ants',
          severity: 'medium',
          location: 'Kitchen - window frame',
          description: 'Carpenter ant activity in moisture-damaged wood',
          treatment: 'Moisture control and targeted treatment',
          photos: 2,
          active: true
        }
      ]
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
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPestIcon = (pestType: string) => {
    return <Bug className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pest Inspector Dashboard</h1>
          <p className="text-gray-600">Manage pest inspections and clearance certificates</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Report
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
                  {inspections.filter(i => i.scheduledDate === '2024-01-16').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bug className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Infestations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inspections.reduce((count, inspection) => 
                    count + inspection.findings.filter(f => f.active && ['high', 'severe'].includes(f.severity)).length, 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clear Properties</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inspections.filter(i => i.status === 'completed' && i.findings.length === 0).length}
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
                  {inspections.filter(i => i.status === 'completed').length}
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
          <TabsTrigger value="findings">Pest Findings</TabsTrigger>
          <TabsTrigger value="reports">Reports & Certificates</TabsTrigger>
          <TabsTrigger value="treatments">Treatment Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Pest Inspections</CardTitle>
              <CardDescription>Manage your scheduled property inspections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspections.map((inspection) => (
                  <Card key={inspection.id} className="border-l-4 border-l-orange-500">
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
                              <Bug className="h-4 w-4 mr-2" />
                              {inspection.inspectionType}
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2" />
                              Fee: ${inspection.fee}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Client:</span> {inspection.client}</div>
                            <div><span className="font-medium">Agent:</span> {inspection.agent}</div>
                          </div>
                          
                          {inspection.findings.length > 0 && (
                            <div className="mt-2 p-2 bg-orange-50 rounded text-sm">
                              <span className="font-medium">Findings:</span> {inspection.findings.length} issues found
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MapPin className="h-4 w-4 mr-1" />
                              Directions
                            </Button>
                            <Button size="sm">
                              <Bug className="h-4 w-4 mr-1" />
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

        <TabsContent value="findings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pest Findings & Issues</CardTitle>
              <CardDescription>Document and track pest activity and infestations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspections.flatMap(inspection => 
                  inspection.findings.map(finding => (
                    <Card key={finding.id} className={`border-l-4 ${getSeverityColor(finding.severity)}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {getPestIcon(finding.pestType)}
                                <h3 className="font-semibold text-lg">{finding.pestType}</h3>
                              </div>
                              <Badge className={getSeverityColor(finding.severity)}>
                                {finding.severity} severity
                              </Badge>
                              {finding.active && (
                                <Badge variant="destructive">Active</Badge>
                              )}
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 mb-3">
                              <div><span className="font-medium">Location:</span> {finding.location}</div>
                              <div><span className="font-medium">Description:</span> {finding.description}</div>
                              <div><span className="font-medium">Recommended Treatment:</span> {finding.treatment}</div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {finding.photos} photos
                              </div>
                              <div>Property: {inspections.find(i => i.findings.some(f => f.id === finding.id))?.propertyAddress.split(',')[0]}</div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Camera className="h-4 w-4 mr-1" />
                              View Photos
                            </Button>
                            <Button size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Treatment Plan
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Reports & Clearance Certificates</CardTitle>
              <CardDescription>Generate and manage pest inspection reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generate Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="report-inspection">Inspection</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select completed inspection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">456 Oak Ave - Full Pest Inspection</SelectItem>
                          <SelectItem value="3">789 Pine St - Termite Inspection</SelectItem>
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
                          <SelectItem value="clearance">Clearance Certificate</SelectItem>
                          <SelectItem value="treatment">Treatment Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="findings-summary">Findings Summary</Label>
                      <Textarea 
                        id="findings-summary"
                        placeholder="Summary of inspection findings..."
                        rows={3}
                      />
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
                          <p className="font-medium">Clearance Certificate - 789 Pine St</p>
                          <p className="text-sm text-gray-600">No pest activity found</p>
                          <Badge className="bg-green-100 text-green-800 text-xs mt-1">Clear</Badge>
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
                          <p className="font-medium">Treatment Report - 456 Oak Ave</p>
                          <p className="text-sm text-gray-600">Termite activity found</p>
                          <Badge className="bg-red-100 text-red-800 text-xs mt-1">Treatment Required</Badge>
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

        <TabsContent value="treatments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Treatment Plans & Follow-up</CardTitle>
              <CardDescription>Manage pest treatment recommendations and scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Create Treatment Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="treatment-property">Property</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">456 Oak Ave - Active Termites</SelectItem>
                          <SelectItem value="4">321 Elm Dr - Carpenter Ants</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pest-type">Pest Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pest type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="termites">Subterranean Termites</SelectItem>
                          <SelectItem value="drywood">Drywood Termites</SelectItem>
                          <SelectItem value="ants">Carpenter Ants</SelectItem>
                          <SelectItem value="beetles">Wood Boring Beetles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="treatment-method">Treatment Method</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="liquid">Liquid Termiticide</SelectItem>
                          <SelectItem value="bait">Bait Station System</SelectItem>
                          <SelectItem value="fumigation">Tent Fumigation</SelectItem>
                          <SelectItem value="spot">Spot Treatment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="treatment-notes">Treatment Notes</Label>
                      <Textarea 
                        id="treatment-notes"
                        placeholder="Treatment details and recommendations..."
                        rows={3}
                      />
                    </div>
                    <Button className="w-full">
                      <Bug className="h-4 w-4 mr-2" />
                      Create Treatment Plan
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Treatment Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">Termite Treatment - 456 Oak Ave</p>
                            <p className="text-sm text-gray-600">Liquid termiticide application</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">Scheduled</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Date: January 20, 2024</div>
                          <div>Contractor: ABC Pest Control</div>
                          <div>Follow-up: 30 days</div>
                        </div>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">Ant Treatment - 321 Elm Dr</p>
                            <p className="text-sm text-gray-600">Moisture control & targeted treatment</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Date: January 18, 2024</div>
                          <div>Contractor: XYZ Exterminators</div>
                          <div>Follow-up: 14 days</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}