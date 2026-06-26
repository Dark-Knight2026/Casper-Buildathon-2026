import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Agent } from '@/types/agent';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Plus, 
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Award,
  Home,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface AgentDocument {
  id: string;
  name: string;
  type: 'license' | 'certification' | 'contract' | 'performance' | 'training' | 'compliance' | 'other';
  description: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'active' | 'expired' | 'pending' | 'archived';
  fileSize: string;
  uploadedBy: string;
  tags: string[];
}

interface AgentDocumentManagerProps {
  agent: Agent;
}

export default function AgentDocumentManager({ agent }: AgentDocumentManagerProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<AgentDocument[]>([
    {
      id: 'doc-1',
      name: 'Real Estate License',
      type: 'license',
      description: 'Virginia Real Estate License',
      uploadDate: '2023-01-15',
      expiryDate: '2025-01-15',
      status: 'active',
      fileSize: '2.4 MB',
      uploadedBy: 'Admin',
      tags: ['license', 'virginia', 'required']
    },
    {
      id: 'doc-2',
      name: 'CRS Certification',
      type: 'certification',
      description: 'Certified Residential Specialist',
      uploadDate: '2023-06-01',
      expiryDate: '2026-06-01',
      status: 'active',
      fileSize: '1.8 MB',
      uploadedBy: 'Sarah Johnson',
      tags: ['certification', 'crs', 'professional']
    },
    {
      id: 'doc-3',
      name: 'Employment Contract',
      type: 'contract',
      description: 'Agent Employment Agreement 2024',
      uploadDate: '2024-01-01',
      status: 'active',
      fileSize: '856 KB',
      uploadedBy: 'HR Department',
      tags: ['contract', 'employment', 'legal']
    }
  ]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'other' as AgentDocument['type'],
    description: '',
    expiryDate: '',
    tags: [] as string[],
    newTag: ''
  });

  const documentTypes = [
    { value: 'license', label: 'License', icon: Shield, color: 'text-blue-500' },
    { value: 'certification', label: 'Certification', icon: Award, color: 'text-green-500' },
    { value: 'contract', label: 'Contract', icon: FileText, color: 'text-purple-500' },
    { value: 'performance', label: 'Performance', icon: DollarSign, color: 'text-orange-500' },
    { value: 'training', label: 'Training', icon: User, color: 'text-indigo-500' },
    { value: 'compliance', label: 'Compliance', icon: CheckCircle, color: 'text-teal-500' },
    { value: 'other', label: 'Other', icon: FileText, color: 'text-gray-500' }
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: AgentDocument['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AgentDocument['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'archived': return <FileText className="h-4 w-4 text-gray-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDocumentIcon = (type: AgentDocument['type']) => {
    const docType = documentTypes.find(dt => dt.value === type);
    if (!docType) return FileText;
    return docType.icon;
  };

  const getDocumentColor = (type: AgentDocument['type']) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.color || 'text-gray-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const handleUploadDocument = async () => {
    if (!newDocument.name || !newDocument.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in document name and description.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const document: AgentDocument = {
        id: `doc-${Date.now()}`,
        name: newDocument.name,
        type: newDocument.type,
        description: newDocument.description,
        uploadDate: new Date().toISOString().split('T')[0],
        expiryDate: newDocument.expiryDate || undefined,
        status: 'active',
        fileSize: '1.2 MB', // Mock file size
        uploadedBy: 'Current User',
        tags: newDocument.tags
      };

      setDocuments([...documents, document]);
      
      toast({
        title: "Document Uploaded",
        description: `${newDocument.name} has been uploaded successfully.`,
      });

      setNewDocument({
        name: '',
        type: 'other',
        description: '',
        expiryDate: '',
        tags: [],
        newTag: ''
      });
      setShowUploadModal(false);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the document.",
        variant: "destructive"
      });
    }
  };

  const addTag = () => {
    if (newDocument.newTag && !newDocument.tags.includes(newDocument.newTag)) {
      setNewDocument({
        ...newDocument,
        tags: [...newDocument.tags, newDocument.newTag],
        newTag: ''
      });
    }
  };

  const removeTag = (tag: string) => {
    setNewDocument({
      ...newDocument,
      tags: newDocument.tags.filter(t => t !== tag)
    });
  };

  const expiringDocuments = documents.filter(doc => isExpiringSoon(doc.expiryDate));
  const expiredDocuments = documents.filter(doc => doc.status === 'expired');

  return (
    <div className="space-y-6">
      {/* Document Alerts */}
      {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
        <div className="space-y-2">
          {expiredDocuments.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="font-medium text-red-800">Expired Documents</h3>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {expiredDocuments.length} document(s) have expired and need immediate attention.
              </p>
            </div>
          )}
          
          {expiringDocuments.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="font-medium text-yellow-800">Expiring Soon</h3>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                {expiringDocuments.length} document(s) will expire within 30 days.
              </p>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Management - {agent.name}
            </CardTitle>
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="docName">Document Name</Label>
                      <Input
                        id="docName"
                        value={newDocument.name}
                        onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                        placeholder="Enter document name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="docType">Document Type</Label>
                      <Select 
                        value={newDocument.type} 
                        onValueChange={(value: AgentDocument['type']) => 
                          setNewDocument({ ...newDocument, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center">
                                <type.icon className={`h-4 w-4 mr-2 ${type.color}`} />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="docDescription">Description</Label>
                    <Textarea
                      id="docDescription"
                      value={newDocument.description}
                      onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                      placeholder="Enter document description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={newDocument.expiryDate}
                      onChange={(e) => setNewDocument({ ...newDocument, expiryDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newDocument.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button onClick={() => removeTag(tag)} className="ml-1">
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newDocument.newTag}
                        onChange={(e) => setNewDocument({ ...newDocument, newTag: e.target.value })}
                        placeholder="Add tag"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button type="button" onClick={addTag} disabled={!newDocument.newTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUploadDocument} disabled={isLoading}>
                      {isLoading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((document) => {
                const DocumentIcon = getDocumentIcon(document.type);
                return (
                  <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <DocumentIcon className={`h-8 w-8 ${getDocumentColor(document.type)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{document.name}</h3>
                          <Badge className={getStatusColor(document.status)}>
                            {getStatusIcon(document.status)}
                            <span className="ml-1">{document.status}</span>
                          </Badge>
                          {isExpiringSoon(document.expiryDate) && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{document.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Uploaded: {formatDate(document.uploadDate)}
                          </div>
                          {document.expiryDate && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires: {formatDate(document.expiryDate)}
                            </div>
                          )}
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {document.uploadedBy}
                          </div>
                          <span>{document.fileSize}</span>
                        </div>
                        {document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {document.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteDocument(document.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                    ? 'No documents match your filters'
                    : 'No documents uploaded yet'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your search criteria or filters'
                    : 'Upload the first document to get started'
                  }
                </p>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              </div>
            )}
          </div>

          {/* Document Summary */}
          {filteredDocuments.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Document Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {documentTypes.map((type) => {
                  const count = documents.filter(doc => doc.type === type.value).length;
                  if (count === 0) return null;
                  
                  return (
                    <div key={type.value} className="text-center p-3 bg-white rounded-lg border">
                      <type.icon className={`h-6 w-6 mx-auto mb-1 ${type.color}`} />
                      <div className="text-lg font-semibold">{count}</div>
                      <div className="text-xs text-gray-600">{type.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}