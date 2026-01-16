import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentViewer from './DocumentViewer';
import { TenantDocument } from '@/types/tenant';
import {
  FileText,
  Download,
  Eye,
  Upload,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  File,
  Image,
  FileVideo
} from 'lucide-react';

export default function DocumentLibrary() {
  const { documents, downloadDocument } = useTenantDashboard();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<TenantDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [signatureFilter, setSignatureFilter] = useState<string>('all');

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      lease: 'bg-blue-100 text-blue-800',
      insurance: 'bg-green-100 text-green-800',
      identification: 'bg-purple-100 text-purple-800',
      payment_receipt: 'bg-yellow-100 text-yellow-800',
      notice: 'bg-red-100 text-red-800',
      inspection: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const getSignatureStatusColor = (status?: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSignatureStatusIcon = (status?: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'declined':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    } else if (fileType.startsWith('video/')) {
      return <FileVideo className="h-5 w-5" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesSignature = signatureFilter === 'all' || 
                            (signatureFilter === 'requires_signature' && doc.requires_signature) ||
                            (signatureFilter === 'signed' && doc.signature_status === 'signed') ||
                            (signatureFilter === 'pending' && doc.signature_status === 'pending');
    
    return matchesSearch && matchesCategory && matchesSignature && !doc.is_archived;
  });

  // Group documents by category
  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, TenantDocument[]>);

  const categoryLabels: Record<string, string> = {
    lease: 'Lease Agreements',
    insurance: 'Insurance Documents',
    identification: 'Identification',
    payment_receipt: 'Payment Receipts',
    notice: 'Notices & Communications',
    inspection: 'Inspection Reports',
    other: 'Other Documents'
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Requires Signature</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.requires_signature && d.signature_status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Signed Documents</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.signature_status === 'signed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => {
                    if (!d.expiry_date) return false;
                    const daysUntilExpiry = Math.ceil((new Date(d.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="lease">Lease Agreements</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="identification">Identification</SelectItem>
                <SelectItem value="payment_receipt">Payment Receipts</SelectItem>
                <SelectItem value="notice">Notices</SelectItem>
                <SelectItem value="inspection">Inspection Reports</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={signatureFilter} onValueChange={setSignatureFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Signature Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="requires_signature">Requires Signature</SelectItem>
                <SelectItem value="pending">Pending Signature</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setShowUploadForm(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents by Category */}
      {Object.keys(documentsByCategory).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || categoryFilter !== 'all' || signatureFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started'}
            </p>
            <Button onClick={() => setShowUploadForm(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(documentsByCategory).map(([category, docs]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{categoryLabels[category] || category}</span>
                <Badge variant="outline">{docs.length} documents</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <Card key={doc.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            {getFileIcon(doc.file_type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold truncate">{doc.title}</h4>
                              <Badge className={getCategoryColor(doc.category)}>
                                {doc.category.replace('_', ' ')}
                              </Badge>
                              {doc.requires_signature && doc.signature_status && (
                                <Badge className={getSignatureStatusColor(doc.signature_status)}>
                                  <span className="flex items-center space-x-1">
                                    {getSignatureStatusIcon(doc.signature_status)}
                                    <span>{doc.signature_status}</span>
                                  </span>
                                </Badge>
                              )}
                            </div>

                            {doc.description && (
                              <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>Uploaded {formatDate(doc.created_at)}</span>
                              <span>By {doc.uploaded_by_name}</span>
                              {doc.expiry_date && (
                                <span className="text-orange-600">
                                  Expires {formatDate(doc.expiry_date)}
                                </span>
                              )}
                            </div>

                            {doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {doc.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex space-x-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <DocumentUploadForm
              onSuccess={() => setShowUploadForm(false)}
              onCancel={() => setShowUploadForm(false)}
            />
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <DocumentViewer
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}