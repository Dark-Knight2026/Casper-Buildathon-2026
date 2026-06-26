/**
 * Agent Documents Page
 * Document management and file storage
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  category: string;
  url: string;
}

export default function AgentDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadDocuments = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Mock data for demonstration
      const mockDocs: Document[] = [
        {
          id: '1',
          name: 'Purchase Agreement Template.pdf',
          type: 'PDF',
          size: 245000,
          uploadedAt: new Date('2024-01-15'),
          category: 'Contracts',
          url: '#'
        },
        {
          id: '2',
          name: 'Property Disclosure Form.docx',
          type: 'DOCX',
          size: 128000,
          uploadedAt: new Date('2024-01-14'),
          category: 'Forms',
          url: '#'
        },
        {
          id: '3',
          name: 'Marketing Materials Q1.zip',
          type: 'ZIP',
          size: 5240000,
          uploadedAt: new Date('2024-01-10'),
          category: 'Marketing',
          url: '#'
        }
      ];

      setDocuments(mockDocs);
    } catch (err) {
      console.error('Error loading documents:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadDocuments();
    }
  }, [userId, loadDocuments]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF':
        return '📄';
      case 'DOCX':
      case 'DOC':
        return '📝';
      case 'XLSX':
      case 'XLS':
        return '📊';
      case 'ZIP':
        return '📦';
      case 'JPG':
      case 'PNG':
        return '🖼️';
      default:
        return '📁';
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
            <p className="text-gray-500 mt-1">
              Manage contracts, forms, and marketing materials
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadDocuments} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
              <p className="text-xs text-gray-500 mt-1">All files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contracts</CardTitle>
              <Badge variant="outline">Legal</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter((d) => d.category === 'Contracts').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Active contracts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forms</CardTitle>
              <Badge variant="outline">Templates</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter((d) => d.category === 'Forms').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <FolderOpen className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(documents.reduce((sum, d) => sum + d.size, 0))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total size</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={categoryFilter === 'Contracts' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('Contracts')}
                >
                  Contracts
                </Button>
                <Button
                  variant={categoryFilter === 'Forms' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('Forms')}
                >
                  Forms
                </Button>
                <Button
                  variant={categoryFilter === 'Marketing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('Marketing')}
                >
                  Marketing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>All your files in one place</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || categoryFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Upload your first document to get started'}
                  </p>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{getFileIcon(doc.type)}</span>
                      <div>
                        <h4 className="font-medium">{doc.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <Badge variant="outline">{doc.category}</Badge>
                          <span>{formatFileSize(doc.size)}</span>
                          <span>{doc.uploadedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}