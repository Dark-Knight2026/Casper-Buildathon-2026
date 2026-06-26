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
  Scale,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  Gavel,
  Shield,
  Users,
  DollarSign
} from 'lucide-react';

interface SellerCase {
  id: string;
  propertyAddress: string;
  client: string;
  caseType: string;
  status: 'active' | 'disclosure_review' | 'negotiation' | 'completed' | 'closed';
  openDate: string;
  targetCloseDate: string;
  fee: number;
  liabilityIssues: string[];
}

export default function SellerAttorneyDashboard() {
  const [activeTab, setActiveTab] = useState('cases');
  
  const [sellerCases] = useState<SellerCase[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      client: 'Mary Johnson',
      caseType: 'Seller Representation',
      status: 'active',
      openDate: '2024-01-08',
      targetCloseDate: '2024-01-25',
      fee: 1500,
      liabilityIssues: ['Property Disclosure', 'Title Issues']
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      client: 'Robert Brown',
      caseType: 'Contract Addendum',
      status: 'negotiation',
      openDate: '2024-01-10',
      targetCloseDate: '2024-01-22',
      fee: 900,
      liabilityIssues: ['Repair Negotiations', 'Warranty Issues']
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'closed': return 'bg-green-100 text-green-800';
      case 'negotiation': return 'bg-blue-100 text-blue-800';
      case 'disclosure_review': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seller Attorney Dashboard</h1>
          <p className="text-gray-600">Manage seller representation and liability protection</p>
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
              <Scale className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Cases</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sellerCases.filter(c => !['completed', 'closed'].includes(c.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Gavel className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Negotiation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sellerCases.filter(c => c.status === 'negotiation').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Liability Issues</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sellerCases.reduce((count, case_) => count + case_.liabilityIssues.length, 0)}
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
                  ${sellerCases.reduce((sum, case_) => sum + case_.fee, 0).toLocaleString()}
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
          <TabsTrigger value="disclosures">Disclosures</TabsTrigger>
          <TabsTrigger value="liability">Liability Issues</TabsTrigger>
          <TabsTrigger value="addendums">Contract Addendums</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Seller Cases</CardTitle>
              <CardDescription>Manage your seller representation cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sellerCases.map((case_) => (
                  <Card key={case_.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{case_.propertyAddress}</h3>
                            <Badge className={getStatusColor(case_.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {case_.status.replace('_', ' ')}
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
                            <span className="font-medium text-sm">Liability Issues:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {case_.liabilityIssues.map((issue, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {issue}
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
                              <Scale className="h-4 w-4 mr-1" />
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

        <TabsContent value="disclosures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Disclosures</CardTitle>
              <CardDescription>Review and manage seller disclosure documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Property disclosure review and compliance</p>
                <Button className="mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Review Disclosures
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Liability Protection</CardTitle>
              <CardDescription>Manage seller liability issues and protection strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Liability assessment and protection planning</p>
                <Button className="mt-4">
                  <Shield className="h-4 w-4 mr-2" />
                  Assess Liability
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addendums" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Addendums</CardTitle>
              <CardDescription>Draft and negotiate contract addendums</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Gavel className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Contract addendum drafting and negotiation</p>
                <Button className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Draft Addendum
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}