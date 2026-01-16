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
  Gavel,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  Scale,
  Shield,
  Users,
  DollarSign
} from 'lucide-react';

interface LegalCase {
  id: string;
  propertyAddress: string;
  client: string;
  caseType: string;
  status: 'active' | 'review' | 'negotiation' | 'completed' | 'closed';
  openDate: string;
  targetCloseDate: string;
  fee: number;
  contingencies: string[];
}

export default function BuyerAttorneyDashboard() {
  const [activeTab, setActiveTab] = useState('cases');
  
  const [legalCases] = useState<LegalCase[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      client: 'John Smith',
      caseType: 'Purchase Agreement Review',
      status: 'active',
      openDate: '2024-01-10',
      targetCloseDate: '2024-01-25',
      fee: 1200,
      contingencies: ['Financing', 'Inspection', 'Appraisal']
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      client: 'Jane Doe',
      caseType: 'Contract Amendment',
      status: 'negotiation',
      openDate: '2024-01-12',
      targetCloseDate: '2024-01-22',
      fee: 800,
      contingencies: ['Repair Negotiations']
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'closed': return 'bg-green-100 text-green-800';
      case 'negotiation': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Buyer Attorney Dashboard</h1>
          <p className="text-gray-600">Manage buyer representation and contract reviews</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Gavel className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Cases</p>
                <p className="text-2xl font-bold text-gray-900">
                  {legalCases.filter(c => !['completed', 'closed'].includes(c.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Negotiation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {legalCases.filter(c => c.status === 'negotiation').length}
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
                <p className="text-sm font-medium text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {legalCases.filter(c => c.status === 'review').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${legalCases.reduce((sum, case_) => sum + case_.fee, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cases">Active Cases</TabsTrigger>
          <TabsTrigger value="contracts">Contract Review</TabsTrigger>
          <TabsTrigger value="contingencies">Contingencies</TabsTrigger>
          <TabsTrigger value="amendments">Amendments</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Legal Cases</CardTitle>
              <CardDescription>Manage your buyer representation cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {legalCases.map((case_) => (
                  <Card key={case_.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{case_.propertyAddress}</h3>
                            <Badge className={getStatusColor(case_.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {case_.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              Client: {case_.client}
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              {case_.caseType}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Close: {new Date(case_.targetCloseDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <span className="font-medium text-sm">Contingencies:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {case_.contingencies.map((contingency, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {contingency}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-lg font-bold text-green-600">
                            ${case_.fee}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              Documents
                            </Button>
                            <Button size="sm">
                              <Gavel className="h-4 w-4 mr-1" />
                              Review
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

        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Review</CardTitle>
              <CardDescription>Review and analyze purchase agreements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Scale className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Contract review and legal analysis tools</p>
                <Button className="mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Review Contract
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contingencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contingency Management</CardTitle>
              <CardDescription>Track and manage contract contingencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Contingency tracking and deadline management</p>
                <Button className="mt-4">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Manage Contingencies
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amendments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Amendments</CardTitle>
              <CardDescription>Draft and negotiate contract amendments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Amendment drafting and negotiation</p>
                <Button className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Draft Amendment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}