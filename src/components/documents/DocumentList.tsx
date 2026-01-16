/**
 * DocumentList Component
 * Display document list with download, delete, and preview functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Trash2, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { documentStorageService, type DocumentInfo } from '@/services/documentStorageService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DocumentListProps {
  leaseId?: string;
  bucketName?: string;
  folder?: string;
  onDocumentClick?: (document: DocumentInfo) => void;
  className?: string;
  showActions?: boolean;
  allowDelete?: boolean;
}

export function DocumentList({
  leaseId,
  bucketName,
  folder,
  onDocumentClick,
  className,
  showActions = true,
  allowDelete = true
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (leaseId) {
        result = await documentStorageService.listDocumentsByLeaseId(leaseId, {
          sortBy: 'created_at',
          sortOrder: 'desc'
        });
      } else if (bucketName) {
        result = await documentStorageService.listDocuments(bucketName, folder, {
          sortBy: 'created_at',
          sortOrder: 'desc'
        });
      } else {
        setError('Either leaseId or bucketName must be provided');
        setLoading(false);
        return;
      }

      if (result.success && result.files) {
        setDocuments(result.files);
      } else {
        setError(result.error || 'Failed to load documents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [leaseId, bucketName, folder]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDownload = async (document: DocumentInfo) => {
    try {
      const metadata = document.metadata as Record<string, unknown>;
      const bucket = (metadata?.bucketName as string) || 'documents';
      
      const result = await documentStorageService.downloadDocument(bucket, document.filePath);

      if (result.success && result.data) {
        // Create download link
        const url = window.URL.createObjectURL(result.data);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.fileName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Download started',
          description: `Downloading ${document.fileName}`,
        });
      } else {
        toast({
          title: 'Download failed',
          description: result.error || 'Failed to download document',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (document: DocumentInfo) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      const result = await documentStorageService.deleteDocumentById(documentToDelete.id);

      if (result.success) {
        toast({
          title: 'Document deleted',
          description: `${documentToDelete.fileName} has been deleted`,
        });
        
        // Remove from list
        setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));
      } else {
        toast({
          title: 'Delete failed',
          description: result.error || 'Failed to delete document',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handlePreview = (document: DocumentInfo) => {
    if (document.url) {
      window.open(document.url, '_blank');
    } else {
      toast({
        title: 'Preview unavailable',
        description: 'Document URL not available',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType.includes('word')) {
      return '📝';
    } else {
      return '📎';
    }
  };

  const getCategoryBadge = (document: DocumentInfo) => {
    const metadata = document.metadata as Record<string, unknown>;
    const category = metadata?.category as string;

    if (!category) return null;

    const categoryColors: Record<string, string> = {
      'lease-agreement': 'bg-blue-100 text-blue-800',
      'signature': 'bg-purple-100 text-purple-800',
      'payment-receipt': 'bg-green-100 text-green-800',
      'general': 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={cn('text-xs', categoryColors[category] || categoryColors.general)}>
        {category.replace('-', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-500">No documents found</p>
      </Card>
    );
  }

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {documents.map((document) => (
          <Card
            key={document.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onDocumentClick?.(document)}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getFileIcon(document.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{document.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.fileSize)}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">
                        {formatDate(document.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  {getCategoryBadge(document)}
                </div>
                {showActions && (
                  <div className="flex items-center gap-2 mt-3">
                    {document.mimeType === 'application/pdf' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(document);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(document);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    {allowDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(document);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}