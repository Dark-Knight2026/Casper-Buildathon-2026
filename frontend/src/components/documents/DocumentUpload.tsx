/**
 * DocumentUpload Component
 * Drag-and-drop file upload with progress indicator and validation
 */

import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { documentStorageService, STORAGE_BUCKETS, type DocumentMetadata } from '@/services/documentStorageService';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  leaseId?: string;
  bucketName?: string;
  category?: 'lease-agreement' | 'signature' | 'payment-receipt' | 'general';
  uploadedBy: string;
  onUploadComplete?: (documentId: string, url: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  maxFiles?: number;
  folder?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  documentId?: string;
  url?: string;
}

export function DocumentUpload({
  leaseId,
  bucketName = STORAGE_BUCKETS.DOCUMENTS,
  category = 'general',
  uploadedBy,
  onUploadComplete,
  onUploadError,
  className,
  maxFiles = 5,
  folder
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = useCallback((files: File[]): { valid: boolean; error?: string } => {
    if (files.length + uploadingFiles.length > maxFiles) {
      return {
        valid: false,
        error: `Maximum ${maxFiles} files allowed. Currently uploading ${uploadingFiles.length} file(s).`
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];

    for (const file of files) {
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File "${file.name}" exceeds maximum size of 10MB`
        };
      }

      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type "${file.type}" is not supported. Allowed types: PDF, DOCX, DOC, images, and text files.`
        };
      }
    }

    return { valid: true };
  }, [uploadingFiles.length, maxFiles]);

  const uploadFile = useCallback(async (file: File) => {
    // Add to uploading files
    setUploadingFiles(prev => [
      ...prev,
      {
        file,
        progress: 0,
        status: 'uploading'
      }
    ]);

    try {
      // Simulate progress (since Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.file === file && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      const metadata: DocumentMetadata = {
        leaseId,
        uploadedBy,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category,
        tags: [],
        description: ''
      };

      const result = await documentStorageService.uploadDocument(
        file,
        bucketName,
        metadata,
        folder
      );

      clearInterval(progressInterval);

      if (result.success && result.documentId && result.url) {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.file === file
              ? {
                  ...f,
                  progress: 100,
                  status: 'success',
                  documentId: result.documentId,
                  url: result.url
                }
              : f
          )
        );

        onUploadComplete?.(result.documentId, result.url);

        // Remove from list after 3 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.file !== file));
        }, 3000);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file === file
            ? {
                ...f,
                progress: 0,
                status: 'error',
                error: errorMessage
              }
            : f
        )
      );

      onUploadError?.(errorMessage);
    }
  }, [leaseId, uploadedBy, category, bucketName, folder, onUploadComplete, onUploadError]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    const validation = validateFiles(fileArray);
    if (!validation.valid) {
      setError(validation.error || 'Invalid files');
      return;
    }

    // Upload files sequentially
    for (const file of fileArray) {
      await uploadFile(file);
    }
  }, [validateFiles, uploadFile]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300',
          'hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports: PDF, DOCX, DOC, images, and text files (Max 10MB per file)
            </p>
            <p className="text-xs text-gray-500">
              Maximum {maxFiles} files at a time
            </p>
          </div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            onChange={handleFileInput}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Select Files
          </Button>
        </div>
      </Card>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {uploadingFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadingFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {uploadingFile.status === 'uploading' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadingFile.file)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>
                  {uploadingFile.status === 'uploading' && (
                    <Progress value={uploadingFile.progress} className="h-1" />
                  )}
                  {uploadingFile.status === 'error' && (
                    <p className="text-xs text-red-500 mt-1">
                      {uploadingFile.error}
                    </p>
                  )}
                  {uploadingFile.status === 'success' && (
                    <p className="text-xs text-green-500 mt-1">
                      Upload complete
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}