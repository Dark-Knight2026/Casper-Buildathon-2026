import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Document } from '@/types/agent';
import { 
  Shield, 
  FileText, 
  Upload, 
  Download, 
  Share2,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building,
  Award,
  Bell
} from 'lucide-react';

export default function ComplianceDocuments() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Mock compliance data
  const licenseInfo = {
    number: 'RE123456789',
    issueDate: new Date('2020-03-15'),
    expiryDate: new Date('2025-03-15'),
    status: 'active',
    state: 'California',
    brokerage: 'Premier Real Estate Group'
  };

  const documents: Document[] = [
    {
      id: '1',
      name: 'Real Estate License',
      type: 'other',
      url: '/documents/license.pdf',
      uploadDate: new Date('2024-01-15'),
      sharedWith: []
    },
    {
      id: '2',
      name: 'E&O Insurance Policy',
      type: 'other',
      url: '/documents/insurance.pdf',
      uploadDate: new Date('2024-02-01'),
      sharedWith: []
    },
    {
      id: '3',
      name: 'Purchase Agreement Template',
      type: 'contract',
      url: '/documents/purchase-agreement.pdf',
      uploadDate: new Date('2024-02-10'),
      sharedWith: ['client1', 'client2']
    },
    {
      id: '4',
      name: 'Property Disclosure Form',
      type: 'disclosure',
      url: '/documents/disclosure.pdf',
      uploadDate: new Date('2024-02-15'),
      sharedWith: ['client3']
    }
  ];

  const upcomingReminders = [
    {
      id: '1',
      title: 'License Renewal Due',
      description: 'Real estate license expires in 11 months',
      dueDate: new Date('2025-03-15'),
      priority: 'medium',
      type: 'license'
    },
    {
      id: '2',
      title: 'Insurance Policy Renewal',
      description: 'E&O insurance policy needs renewal',
      dueDate: new Date('2024-12-31'),
      priority: 'high',
      type: 'insurance'
    },
    {
      id: '3',
      title: 'Continuing Education Credits',
      description: '15 CE credits required by year end',
      dueDate: new Date('2024-12-31'),
      priority: 'medium',
      type: 'education'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'contract': return FileText;
      case 'disclosure': return Shield;
      case 'inspection': return CheckCircle;
      default: return FileText;
    }
  };

  const daysUntilExpiry = Math.ceil((licenseInfo.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance & Documentation</h2>
          <p className="text-gray-600">Manage licenses, documents, and compliance requirements</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="Enter document name" />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="disclosure">Disclosure</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Upload
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* License Information */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-blue-600" />
            <span>License & Brokerage Information</span>
            <Badge className={`${getStatusColor(licenseInfo.status)} border ml-2`}>
              {licenseInfo.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">License Number</p>
              <p className="font-semibold text-gray-900">{licenseInfo.number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">State</p>
              <p className="font-semibold text-gray-900">{licenseInfo.state}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Brokerage</p>
              <p className="font-semibold text-gray-900">{licenseInfo.brokerage}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expires</p>
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-gray-900">{licenseInfo.expiryDate.toLocaleDateString()}</p>
                {daysUntilExpiry < 365 && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    {daysUntilExpiry} days
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-orange-600" />
            <span>Upcoming Reminders</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    reminder.priority === 'high' ? 'bg-red-500' :
                    reminder.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <h4 className="font-semibold text-gray-900">{reminder.title}</h4>
                    <p className="text-sm text-gray-600">{reminder.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        Due: {reminder.dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getPriorityColor(reminder.priority)} border`}>
                    {reminder.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Set Reminder
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span>Document Library</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((document) => {
              const IconComponent = getDocumentIcon(document.type);
              return (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{document.name}</h4>
                      <p className="text-sm text-gray-600">
                        Uploaded: {document.uploadDate.toLocaleDateString()}
                      </p>
                      {document.sharedWith.length > 0 && (
                        <p className="text-xs text-blue-600">
                          Shared with {document.sharedWith.length} client{document.sharedWith.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Update License Info</h3>
            <p className="text-sm text-gray-600">Update license and brokerage details</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Document Templates</h3>
            <p className="text-sm text-gray-600">Access standard forms and contracts</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Bell className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Set Reminders</h3>
            <p className="text-sm text-gray-600">Configure compliance notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}