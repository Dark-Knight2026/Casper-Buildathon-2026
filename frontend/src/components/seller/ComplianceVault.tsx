import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PropertyDocument } from '@/types/seller';
import { 
  Shield, 
  FileText, 
  Upload, 
  Download, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Calendar
} from 'lucide-react';

export default function ComplianceVault() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock documents data
  const documents: PropertyDocument[] = [
    {
      id: 'doc-1',
      type: 'title',
      name: 'Property Title Deed',
      url: '/docs/title-deed.pdf',
      uploadedAt: new Date('2024-08-15'),
    },
    {
      id: 'doc-2',
      type: 'disclosure',
      name: 'Seller Property Disclosure',
      url: '/docs/disclosure.pdf',
      uploadedAt: new Date('2024-08-20'),
    },
    {
      id: 'doc-3',
      type: 'inspection',
      name: 'Home Inspection Report',
      url: '/docs/inspection.pdf',
      uploadedAt: new Date('2024-08-25'),
      expiresAt: new Date('2025-08-25')
    },
    {
      id: 'doc-4',
      type: 'hoa',
      name: 'HOA Documents & CC&Rs',
      url: '/docs/hoa.pdf',
      uploadedAt: new Date('2024-08-10'),
    },
    {
      id: 'doc-5',
      type: 'other',
      name: 'Termite Inspection Certificate',
      url: '/docs/termite.pdf',
      uploadedAt: new Date('2024-08-30'),
      expiresAt: new Date('2025-02-28')
    }
  ];

  // Mock compliance reminders
  const complianceReminders = [
    {
      id: 'reminder-1',
      title: 'Property Disclosure Update Required',
      description: 'Annual property disclosure update is due within 30 days',
      dueDate: new Date('2024-10-01'),
      priority: 'high',
      category: 'disclosure'
    },
    {
      id: 'reminder-2',
      title: 'HOA Certificate Renewal',
      description: 'HOA good standing certificate expires soon',
      dueDate: new Date('2024-09-15'),
      priority: 'medium',
      category: 'hoa'
    },
    {
      id: 'reminder-3',
      title: 'Smoke Detector Inspection',
      description: 'Required before listing in this jurisdiction',
      dueDate: new Date('2024-09-10'),
      priority: 'high',
      category: 'inspection'
    }
  ];

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'title': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'disclosure': return 'bg-green-100 text-green-800 border-green-200';
      case 'inspection': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'hoa': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'deed': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
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

  const isDocumentExpiring = (doc: PropertyDocument) => {
    if (!doc.expiresAt) return false;
    const now = new Date();
    const daysUntilExpiry = Math.ceil((doc.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance & Documentation</h2>
          <p className="text-gray-600">Manage property documents and compliance requirements</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Property Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title/Deed</SelectItem>
                    <SelectItem value="disclosure">Property Disclosure</SelectItem>
                    <SelectItem value="inspection">Inspection Report</SelectItem>
                    <SelectItem value="hoa">HOA Documents</SelectItem>
                    <SelectItem value="deed">Property Deed</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="e.g., Property Disclosure Statement" />
              </div>

              <div className="space-y-2">
                <Label>Expiration Date (Optional)</Label>
                <Input type="date" />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600 mb-2">Drop files here or click to upload</p>
                <p className="text-sm text-gray-500">PDF, DOC, DOCX up to 10MB</p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Upload Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compliance Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
            Compliance Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complianceReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{reminder.title}</p>
                    <p className="text-sm text-gray-600">{reminder.description}</p>
                    <p className="text-xs text-gray-500">Due: {reminder.dueDate.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`${getPriorityColor(reminder.priority)} border text-xs`}>
                    {reminder.priority}
                  </Badge>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    Take Action
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="title">Title/Deed</SelectItem>
            <SelectItem value="disclosure">Disclosures</SelectItem>
            <SelectItem value="inspection">Inspections</SelectItem>
            <SelectItem value="hoa">HOA Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Vault */}
      <Card>
        <CardHeader>
          <CardTitle>Document Vault</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDocuments.map((doc) => {
              const isExpiring = isDocumentExpiring(doc);
              
              return (
                <div key={doc.id} className={`flex items-center justify-between p-4 rounded-lg border ${isExpiring ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{doc.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <Badge className={`${getDocumentTypeColor(doc.type)} border text-xs`}>
                          {doc.type}
                        </Badge>
                        <span>Uploaded {doc.uploadedAt.toLocaleDateString()}</span>
                        {doc.expiresAt && (
                          <span className={isExpiring ? 'text-yellow-600 font-medium' : ''}>
                            Expires {doc.expiresAt.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isExpiring && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expiring Soon
                      </Badge>
                    )}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Digital Signing */}
      <Card>
        <CardHeader>
          <CardTitle>Digital Signing & Escrow Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Pending Signatures</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-gray-900">Purchase Agreement</p>
                    <p className="text-sm text-gray-600">Buyer: John Smith</p>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Sign Now
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-gray-900">Disclosure Statement</p>
                    <p className="text-sm text-gray-600">Status: Completed</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Signed
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Escrow Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Earnest Money Deposit</span>
                  <Badge className="bg-green-100 text-green-800 text-xs">Received</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Title Search</span>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Appraisal</span>
                  <Badge className="bg-gray-100 text-gray-800 text-xs">Pending</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Listing Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { task: 'Property Disclosure Statement', completed: true },
              { task: 'Lead Paint Disclosure (if built before 1978)', completed: true },
              { task: 'HOA Documents and CC&Rs', completed: true },
              { task: 'Home Inspection Report', completed: false },
              { task: 'Termite/Pest Inspection', completed: false },
              { task: 'Smoke Detector Certificate', completed: false },
              { task: 'Natural Hazard Disclosure', completed: true }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-100' : 'bg-gray-200'}`}>
                    {item.completed ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-gray-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900">{item.task}</span>
                </div>
                {!item.completed && (
                  <Button variant="outline" size="sm">
                    Schedule
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}