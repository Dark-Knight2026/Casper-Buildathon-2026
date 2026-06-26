import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Share2,
  Lock,
  Calendar,
  DollarSign,
  Search,
  Filter,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface TaxDocument {
  id: string;
  name: string;
  type: 'form-1098' | 'closing-disclosure' | 'property-tax' | 'improvement-receipt' | 'insurance' | 'hoa' | 'other';
  category: string;
  taxYear: number;
  uploadDate: string;
  fileSize: string;
  propertyAddress?: string;
  amount?: number;
  deductible: boolean;
  verified: boolean;
  sharedWith: string[];
  url: string;
}

const mockTaxDocuments: TaxDocument[] = [
  {
    id: 'tax-doc-1',
    name: 'Form 1098 - Mortgage Interest Statement 2024.pdf',
    type: 'form-1098',
    category: 'Mortgage Interest',
    taxYear: 2024,
    uploadDate: '2024-01-15',
    fileSize: '245 KB',
    propertyAddress: '123 Main St, Los Angeles, CA',
    amount: 18500,
    deductible: true,
    verified: true,
    sharedWith: ['CPA - John Smith'],
    url: '#',
  },
  {
    id: 'tax-doc-2',
    name: 'Closing Disclosure - 123 Main St.pdf',
    type: 'closing-disclosure',
    category: 'Closing Costs',
    taxYear: 2024,
    uploadDate: '2024-03-20',
    fileSize: '890 KB',
    propertyAddress: '123 Main St, Los Angeles, CA',
    amount: 8500,
    deductible: true,
    verified: true,
    sharedWith: [],
    url: '#',
  },
  {
    id: 'tax-doc-3',
    name: 'Property Tax Statement Q4 2024.pdf',
    type: 'property-tax',
    category: 'Property Taxes',
    taxYear: 2024,
    uploadDate: '2024-11-01',
    fileSize: '156 KB',
    propertyAddress: '123 Main St, Los Angeles, CA',
    amount: 3200,
    deductible: true,
    verified: true,
    sharedWith: ['CPA - John Smith'],
    url: '#',
  },
  {
    id: 'tax-doc-4',
    name: 'Kitchen Renovation Receipt.pdf',
    type: 'improvement-receipt',
    category: 'Home Improvements',
    taxYear: 2024,
    uploadDate: '2024-08-15',
    fileSize: '234 KB',
    propertyAddress: '123 Main St, Los Angeles, CA',
    amount: 25000,
    deductible: false,
    verified: true,
    sharedWith: [],
    url: '#',
  },
  {
    id: 'tax-doc-5',
    name: 'Homeowners Insurance Policy 2024.pdf',
    type: 'insurance',
    category: 'Insurance',
    taxYear: 2024,
    uploadDate: '2024-01-05',
    fileSize: '567 KB',
    propertyAddress: '123 Main St, Los Angeles, CA',
    amount: 1800,
    deductible: false,
    verified: true,
    sharedWith: [],
    url: '#',
  },
  {
    id: 'tax-doc-6',
    name: 'HOA Fees Statement 2024.pdf',
    type: 'hoa',
    category: 'HOA Fees',
    taxYear: 2024,
    uploadDate: '2024-12-01',
    fileSize: '123 KB',
    propertyAddress: '123 Main St, Los Angeles, CA',
    amount: 2400,
    deductible: false,
    verified: true,
    sharedWith: [],
    url: '#',
  },
];

export function TaxDocumentVault() {
  const [documents, setDocuments] = useState<TaxDocument[]>(mockTaxDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDeductible, setFilterDeductible] = useState<string>('all');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TaxDocument | null>(null);

  const filteredDocuments = documents.filter((doc) => {
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterYear !== 'all' && doc.taxYear.toString() !== filterYear) return false;
    if (filterType !== 'all' && doc.type !== filterType) return false;
    if (filterDeductible === 'deductible' && !doc.deductible) return false;
    if (filterDeductible === 'non-deductible' && doc.deductible) return false;
    return true;
  });

  const handleDeleteDocument = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    }
  };

  const handleShareDocument = (doc: TaxDocument) => {
    setSelectedDoc(doc);
    setShowShareModal(true);
  };

  const totalDeductible = documents
    .filter((doc) => doc.deductible && doc.amount)
    .reduce((sum, doc) => sum + (doc.amount || 0), 0);

  const deductibleCount = documents.filter((doc) => doc.deductible).length;
  const verifiedCount = documents.filter((doc) => doc.verified).length;

  const getDocumentIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'form-1098': 'Form 1098',
      'closing-disclosure': 'Closing Disclosure',
      'property-tax': 'Property Tax',
      'improvement-receipt': 'Home Improvement',
      insurance: 'Insurance',
      hoa: 'HOA',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Tax Document Vault
              </CardTitle>
              <CardDescription>
                Securely store and manage all your tax-related documents
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Documents</p>
                    <p className="text-2xl font-bold text-blue-900">{documents.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Deductible Items</p>
                    <p className="text-2xl font-bold text-green-900">{deductibleCount}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${(totalDeductible / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">Verified</p>
                    <p className="text-2xl font-bold text-orange-900">{verifiedCount}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Upload Tax Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Document File</Label>
                  <div className="mt-2 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer">
                    <Upload className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Document Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form-1098">Form 1098 (Mortgage Interest)</SelectItem>
                        <SelectItem value="closing-disclosure">Closing Disclosure</SelectItem>
                        <SelectItem value="property-tax">Property Tax Statement</SelectItem>
                        <SelectItem value="improvement-receipt">Home Improvement Receipt</SelectItem>
                        <SelectItem value="insurance">Insurance Document</SelectItem>
                        <SelectItem value="hoa">HOA Statement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tax Year</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Amount (if applicable)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="number" placeholder="0.00" className="pl-10" />
                  </div>
                </div>

                <div>
                  <Label>Associated Property</Label>
                  <Input placeholder="e.g., 123 Main St, Los Angeles, CA" />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="deductible" className="w-4 h-4" />
                  <Label htmlFor="deductible" className="cursor-pointer">
                    This is a tax-deductible expense
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="pl-10"
              />
            </div>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="form-1098">Form 1098</SelectItem>
                <SelectItem value="closing-disclosure">Closing Disclosure</SelectItem>
                <SelectItem value="property-tax">Property Tax</SelectItem>
                <SelectItem value="improvement-receipt">Home Improvement</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="hoa">HOA</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDeductible} onValueChange={setFilterDeductible}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="deductible">Deductible Only</SelectItem>
                <SelectItem value="non-deductible">Non-Deductible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Documents List */}
          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No documents found</p>
                <p className="text-sm text-gray-500">
                  {searchQuery || filterYear !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Upload your first tax document to get started'}
                </p>
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getDocumentIcon(doc.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{doc.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(doc.type)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {doc.taxYear}
                              </Badge>
                              {doc.deductible && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  Deductible
                                </Badge>
                              )}
                              {doc.verified && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">{doc.fileSize}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm">
                          {doc.propertyAddress && (
                            <p className="text-gray-600">Property: {doc.propertyAddress}</p>
                          )}
                          {doc.amount && (
                            <p className="text-gray-600">
                              Amount: <span className="font-semibold">${doc.amount.toLocaleString()}</span>
                            </p>
                          )}
                          <p className="text-gray-500 text-xs">
                            Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                          </p>
                          {doc.sharedWith.length > 0 && (
                            <p className="text-gray-500 text-xs flex items-center gap-1">
                              <Share2 className="w-3 h-3" />
                              Shared with: {doc.sharedWith.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareDocument(doc)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Export Options */}
          <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Export Tax Documents</h3>
                  <p className="text-sm text-gray-600">
                    Download all documents or share with your tax professional
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export All (ZIP)
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share with CPA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="mt-4 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Your documents are secure</p>
                  <p className="text-xs text-gray-600">
                    All documents are encrypted and stored securely. Only you and people you
                    explicitly share with can access these files. We use bank-level encryption and
                    multi-factor authentication to protect your sensitive tax information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Share Modal */}
      {showShareModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Share Document</CardTitle>
              <CardDescription>Share "{selectedDoc.name}" with your tax professional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="cpa@example.com" />
              </div>
              <div>
                <Label>Access Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">View & Download</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message (optional)</Label>
                <Input placeholder="Add a message for the recipient" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Document
                </Button>
                <Button variant="outline" onClick={() => setShowShareModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}