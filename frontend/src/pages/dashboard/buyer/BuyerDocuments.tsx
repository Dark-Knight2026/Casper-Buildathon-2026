/**
 * Buyer Documents Page
 * Document management for buyers (pre-approval letters, contracts, etc.)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  File,
  CheckCircle,
  Clock
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

interface BuyerDocument {
  id: string;
  name: string;
  type: string;
  category: 'pre_approval' | 'offer' | 'contract' | 'inspection' | 'closing' | 'other';
  size: number;
  uploadedAt: Date;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
}

const CATEGORIES = [
  { value: 'pre_approval', label: 'Pre-Approval' },
  { value: 'offer', label: 'Offers' },
  { value: 'contract', label: 'Contracts' },
  { value: 'inspection', label: 'Inspections' },
  { value: 'closing', label: 'Closing' },
  { value: 'other', label: 'Other' }
];

export default function BuyerDocuments() {
  const [documents, setDocuments] = useState<BuyerDocument[]>([]);
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
        .from('buyer_documents')
        .select('*')
        .eq('buyer_id', userId)
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

      const mappedDocuments: BuyerDocument[] = (data || []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        category: doc.category,
        size: doc.size,
        uploadedAt: new Date(doc.uploaded_at),
        url: doc.url,
        status: doc.status || 'pending'
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
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />;
    if (type.includes('word') || type.includes('doc'))
      return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const calculateStats = () => {
    const byCategory = CATEGORIES.reduce(
      (acc, cat) => {
        acc[cat.value] = documents.filter((doc) => doc.category === cat.value).length;
        return acc;
      },
      {} as Record<string, number>
    );

    const byStatus = {
      pending: documents.filter((doc) => doc.status === 'pending').length,
      approved: documents.filter((doc) => doc.status === 'approved').length,
      rejected: documents.filter((doc) => doc.status === 'rejected').length
    };

    return { byCategory, byStatus };
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

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
            <p className="text-gray-500 mt-1">Manage your home buying documents</p>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pre-Approval</CardTitle>
              <File className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byCategory.pre_approval || 0}</div>
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
                    key={category.value}
                    variant={categoryFilter === category.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(category.value)}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Your uploaded documents and files</CardDescription>
          </CardHeader>
          <CardContent>
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
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>{getFileIcon(doc.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{doc.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIES.find((c) => c.value === doc.category)?.label}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatFileSize(doc.size)}</span>
                        <span className="text-xs text-gray-500">
                          {doc.uploadedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(doc.status)} flex items-center gap-1`}>
                        {getStatusIcon(doc.status)}
                        {doc.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}