/**
 * Broker Documents Page
 * Shared document library for the brokerage
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
  Folder,
  File
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
  category: string;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

const CATEGORIES = ['Contracts', 'Forms', 'Marketing', 'Training', 'Legal', 'Other'];

export default function BrokerDocuments() {
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
      let query = supabase
        .from('broker_documents')
        .select('*')
        .eq('broker_id', userId)
        .order('uploaded_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const mappedDocuments: Document[] = (data || []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        category: doc.category,
        uploadedBy: doc.uploaded_by,
        uploadedAt: new Date(doc.uploaded_at),
        url: doc.url
      }));

      setDocuments(mappedDocuments);
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
  }, [userId, searchTerm, categoryFilter, toast]);

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />;
    if (type.includes('word') || type.includes('doc')) return <FileText className="h-5 w-5 text-blue-600" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileText className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const calculateStats = () => {
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
    const byCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = documents.filter((doc) => doc.category === cat).length;
      return acc;
    }, {} as Record<string, number>);

    return { totalDocuments: documents.length, totalSize, byCategory };
  };

  const stats = calculateStats();

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

  if (error && documents.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadDocuments}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
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
              Shared documents accessible to all team members
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
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(stats.totalSize)} total
              </p>
            </CardContent>
          </Card>

          {CATEGORIES.slice(0, 3).map((category) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{category}</CardTitle>
                <Folder className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byCategory[category] || 0}</div>
                <p className="text-xs text-gray-500 mt-1">documents</p>
              </CardContent>
            </Card>
          ))}
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
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  All
                </Button>
                {CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>All shared brokerage documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.length === 0 ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="mt-1">{getFileIcon(doc.type)}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {doc.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(doc.size)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Uploaded {doc.uploadedAt.toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}