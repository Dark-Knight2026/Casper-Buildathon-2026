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
  Folder,
  Search,
  Download,
  Trash2,
  Eye,
  Plus,
  FolderPlus,
  File,
  Calendar,
  User,
  Tag,
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  propertyId?: string;
  propertyAddress?: string;
  tags: string[];
  url: string;
}

interface FolderItem {
  id: string;
  name: string;
  documentCount: number;
  color: string;
}

const mockFolders: FolderItem[] = [
  { id: 'folder-1', name: 'Pre-Approval Letters', documentCount: 3, color: 'blue' },
  { id: 'folder-2', name: 'Inspection Reports', documentCount: 5, color: 'green' },
  { id: 'folder-3', name: 'Contracts & Agreements', documentCount: 8, color: 'purple' },
  { id: 'folder-4', name: 'Property Disclosures', documentCount: 4, color: 'orange' },
  { id: 'folder-5', name: 'Insurance Documents', documentCount: 2, color: 'red' },
  { id: 'folder-6', name: 'Closing Documents', documentCount: 6, color: 'indigo' },
];

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Pre-Approval Letter - Bank of America.pdf',
    type: 'pdf',
    category: 'Pre-Approval Letters',
    size: '245 KB',
    uploadedAt: '2024-01-20',
    uploadedBy: 'John Smith',
    tags: ['pre-approval', 'financing'],
    url: '#',
  },
  {
    id: 'doc-2',
    name: 'Home Inspection Report - 123 Main St.pdf',
    type: 'pdf',
    category: 'Inspection Reports',
    size: '1.2 MB',
    uploadedAt: '2024-01-18',
    uploadedBy: 'Jane Doe',
    propertyId: 'prop-001',
    propertyAddress: '123 Main St, Downtown',
    tags: ['inspection', 'property-001'],
    url: '#',
  },
  {
    id: 'doc-3',
    name: 'Purchase Agreement - Oceanfront Villa.pdf',
    type: 'pdf',
    category: 'Contracts & Agreements',
    size: '890 KB',
    uploadedAt: '2024-01-15',
    uploadedBy: 'John Smith',
    propertyId: 'prop-002',
    propertyAddress: '456 Beach Blvd, Marina',
    tags: ['contract', 'offer', 'property-002'],
    url: '#',
  },
  {
    id: 'doc-4',
    name: 'Property Disclosure Statement.pdf',
    type: 'pdf',
    category: 'Property Disclosures',
    size: '567 KB',
    uploadedAt: '2024-01-14',
    uploadedBy: 'Agent Name',
    propertyId: 'prop-002',
    propertyAddress: '456 Beach Blvd, Marina',
    tags: ['disclosure', 'property-002'],
    url: '#',
  },
  {
    id: 'doc-5',
    name: 'Homeowners Insurance Quote.pdf',
    type: 'pdf',
    category: 'Insurance Documents',
    size: '123 KB',
    uploadedAt: '2024-01-12',
    uploadedBy: 'Insurance Agent',
    tags: ['insurance', 'quote'],
    url: '#',
  },
  {
    id: 'doc-6',
    name: 'Closing Disclosure.pdf',
    type: 'pdf',
    category: 'Closing Documents',
    size: '678 KB',
    uploadedAt: '2024-01-10',
    uploadedBy: 'Title Company',
    propertyId: 'prop-002',
    propertyAddress: '456 Beach Blvd, Marina',
    tags: ['closing', 'final', 'property-002'],
    url: '#',
  },
  {
    id: 'doc-7',
    name: 'Appraisal Report - 123 Main St.pdf',
    type: 'pdf',
    category: 'Inspection Reports',
    size: '1.5 MB',
    uploadedAt: '2024-01-08',
    uploadedBy: 'Appraiser',
    propertyId: 'prop-001',
    propertyAddress: '123 Main St, Downtown',
    tags: ['appraisal', 'valuation', 'property-001'],
    url: '#',
  },
  {
    id: 'doc-8',
    name: 'Title Insurance Policy.pdf',
    type: 'pdf',
    category: 'Closing Documents',
    size: '456 KB',
    uploadedAt: '2024-01-05',
    uploadedBy: 'Title Company',
    tags: ['title', 'insurance'],
    url: '#',
  },
];

export function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [folders] = useState<FolderItem[]>(mockFolders);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const filteredDocuments = documents
    .filter((doc) => {
      if (selectedFolder && doc.category !== selectedFolder) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.name.toLowerCase().includes(query) ||
          doc.category.toLowerCase().includes(query) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          doc.propertyAddress?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return parseFloat(b.size) - parseFloat(a.size);
      }
    });

  const handleDeleteDocument = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    }
  };

  const getFileIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => {
    const size = parseFloat(doc.size);
    return sum + (doc.size.includes('MB') ? size * 1024 : size);
  }, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Manager
              </CardTitle>
              <CardDescription>
                Organize and manage all your property-related documents
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
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Documents</p>
                    <p className="text-2xl font-bold text-blue-900">{totalDocuments}</p>
                  </div>
                  <File className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Total Folders</p>
                    <p className="text-2xl font-bold text-green-900">{folders.length}</p>
                  </div>
                  <Folder className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Storage Used</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {(totalSize / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Upload New Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Document File</Label>
                  <div className="mt-2 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer">
                    <Upload className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                  </div>
                </div>

                <div>
                  <Label>Document Name</Label>
                  <Input placeholder="e.g., Pre-Approval Letter" />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.name}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input placeholder="e.g., pre-approval, financing, important" />
                </div>

                <div>
                  <Label>Associated Property (optional)</Label>
                  <Input placeholder="e.g., 123 Main St, Downtown" />
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

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by name, category, tags, or property..."
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: "date" | "name" | "size") => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="size">Sort by Size</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </div>

          {/* Folders */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Folders
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Button
                variant={selectedFolder === null ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedFolder === null ? 'bg-blue-600' : ''
                }`}
                onClick={() => setSelectedFolder(null)}
              >
                <Folder className="w-8 h-8" />
                <div className="text-center">
                  <p className="text-sm font-semibold">All Documents</p>
                  <p className="text-xs opacity-70">{totalDocuments} files</p>
                </div>
              </Button>
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant={selectedFolder === folder.name ? 'default' : 'outline'}
                  className={`h-auto p-4 flex flex-col items-center gap-2 ${
                    selectedFolder === folder.name ? `bg-${folder.color}-600` : ''
                  }`}
                  onClick={() => setSelectedFolder(folder.name)}
                >
                  <Folder className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-sm font-semibold line-clamp-2">{folder.name}</p>
                    <p className="text-xs opacity-70">{folder.documentCount} files</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Documents List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {selectedFolder || 'All Documents'} ({filteredDocuments.length})
            </h3>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No documents found</p>
                <p className="text-sm text-gray-500">
                  {searchQuery
                    ? 'Try adjusting your search criteria'
                    : 'Upload your first document to get started'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <Card
                    key={doc.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getFileIcon(doc.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{doc.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {doc.category}
                                </Badge>
                                <span className="text-xs text-gray-500">{doc.size}</span>
                                {doc.propertyAddress && (
                                  <Badge variant="outline" className="text-xs">
                                    {doc.propertyAddress}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{doc.uploadedBy}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
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
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}