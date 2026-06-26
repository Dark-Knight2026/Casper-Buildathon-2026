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
  Stamp,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Download,
  Upload,
  Shield,
  DollarSign
} from 'lucide-react';

interface NotaryAppointment {
  id: string;
  clientName: string;
  documentType: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  fee: number;
  signers: number;
  propertyAddress?: string;
}

export default function NotaryDashboard() {
  const [activeTab, setActiveTab] = useState('appointments');
  
  const [notaryAppointments] = useState<NotaryAppointment[]>([
    {
      id: '1',
      clientName: 'John Smith',
      documentType: 'Loan Documents',
      scheduledDate: '2024-01-16',
      scheduledTime: '10:00',
      location: 'Client Home',
      status: 'scheduled',
      fee: 150,
      signers: 2,
      propertyAddress: '123 Main St, Virginia Beach, VA'
    },
    {
      id: '2',
      clientName: 'Jane Doe',
      documentType: 'Purchase Agreement',
      scheduledDate: '2024-01-15',
      scheduledTime: '14:00',
      location: 'Title Office',
      status: 'completed',
      fee: 100,
      signers: 2,
      propertyAddress: '456 Oak Ave, Norfolk, VA'
    },
    {
      id: '3',
      clientName: 'Bob Wilson',
      documentType: 'Power of Attorney',
      scheduledDate: '2024-01-17',
      scheduledTime: '11:00',
      location: 'Office Visit',
      status: 'scheduled',
      fee: 75,
      signers: 1
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentIcon = (docType: string) => {
    if (docType.includes('Loan')) return <DollarSign className="h-4 w-4" />;
    if (docType.includes('Purchase')) return <FileText className="h-4 w-4" />;
    return <Stamp className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notary Dashboard</h1>
          <p className="text-gray-600">Manage notarization appointments and document authentication</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Appointment
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
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
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notaryAppointments.filter(a => a.scheduledDate === '2024-01-16').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Stamp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Documents Notarized</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notaryAppointments.filter(a => a.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notaryAppointments.filter(a => a.status !== 'cancelled').length}
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
                  ${notaryAppointments.reduce((sum, apt) => sum + apt.fee, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="mobile">Mobile Notary</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notary Appointments</CardTitle>
              <CardDescription>Manage your notarization appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notaryAppointments.map((appointment) => (
                  <Card key={appointment.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {getDocumentIcon(appointment.documentType)}
                              <h3 className="font-semibold text-lg">{appointment.clientName}</h3>
                            </div>
                            <Badge className={getStatusColor(appointment.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {appointment.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(appointment.scheduledDate).toLocaleDateString()} at {appointment.scheduledTime}
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              {appointment.documentType}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {appointment.location}
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Signers:</span> {appointment.signers}
                            {appointment.propertyAddress && (
                              <span className="ml-4">
                                <span className="font-medium">Property:</span> {appointment.propertyAddress}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-lg font-bold text-green-600">
                            ${appointment.fee}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MapPin className="h-4 w-4 mr-1" />
                              Directions
                            </Button>
                            <Button size="sm">
                              <Stamp className="h-4 w-4 mr-1" />
                              Start Session
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

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Authentication</CardTitle>
              <CardDescription>Manage document notarization and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Document Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      'Loan Documents',
                      'Purchase Agreements',
                      'Power of Attorney',
                      'Affidavits',
                      'Deeds',
                      'Wills & Trusts'
                    ].map((docType, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{docType}</span>
                        </div>
                        <Badge variant="outline">
                          ${50 + index * 25}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Authentication Tools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start">
                      <Stamp className="h-4 w-4 mr-2" />
                      Digital Notary Seal
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      ID Verification
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Document Scanner
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Certificate Generator
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Notary Services</CardTitle>
              <CardDescription>Manage on-site notarization services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Service Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        'Virginia Beach',
                        'Norfolk',
                        'Chesapeake',
                        'Portsmouth',
                        'Suffolk'
                      ].map((area, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{area}</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Mobile Equipment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        'Portable Scanner',
                        'Digital Notary Seal',
                        'ID Verification Device',
                        'Mobile Printer',
                        'Signature Pad'
                      ].map((equipment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <span>{equipment}</span>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notary Records & Journal</CardTitle>
              <CardDescription>Maintain notarization records and compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Digital notary journal and record keeping</p>
                <Button className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Export Records
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}