/**
 * Document Uploader Component
 * Drag-and-drop file upload with progress tracking
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  FileType
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { leaseStorageService, DocumentType, UploadOptions } from '@/services/leaseStorageService';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  leaseId: string;
  onUploadComplete?: (documentId: string) => void;
  onClose?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  documentId?: string;
}

export default function DocumentUploader({
  leaseId,
  onUploadComplete,
  onClose
}: DocumentUploaderProps) {
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>('lease_agreement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const uploadFile = useCallback(async (file: File, fileIndex: number) => {
    try {
      const options: UploadOptions = {
        leaseId,
        documentType,
        title: title || file.name,
        description: description || undefined,
        file,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        onProgress: (progress) => {
          setUploadingFiles(prev => {
            const updated = [...prev];
            if (updated[fileIndex]) {
              updated[fileIndex].progress = progress;
            }
            return updated;
          });
        }
      };

      const result = await leaseStorageService.uploadDocument(options);

      setUploadingFiles(prev => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'success';
          updated[fileIndex].progress = 100;
          updated[fileIndex].documentId = result.document.id;
        }
        return updated;
      });

      toast({
        title: 'Upload Successful',
        description: `${file.name} has been uploaded successfully`
      });

      if (onUploadComplete) {
        onUploadComplete(result.document.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadingFiles(prev => {
        const updated = [...prev];
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'error';
          updated[fileIndex].error = errorMessage;
        }
        return updated;
      });

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [leaseId, documentType, title, description, tags, onUploadComplete, toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    acceptedFiles.forEach((file, index) => {
      uploadFile(file, newFiles.length + index);
    });
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <FileType className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const allUploadsComplete = uploadingFiles.length > 0 && 
    uploadingFiles.every(f => f.status === 'success' || f.status === 'error');

  return (
    <div className="space-y-6">
      {/* Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
          <CardDescription>
            Provide details about the document you're uploading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
              <SelectTrigger id="documentType">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                <SelectItem value="amendment">Amendment</SelectItem>
                <SelectItem value="addendum">Addendum</SelectItem>
                <SelectItem value="signature_certificate">Signature Certificate</SelectItem>
                <SelectItem value="attachment">Attachment</SelectItem>
                <SelectItem value="inspection_report">Inspection Report</SelectItem>
                <SelectItem value="maintenance_record">Maintenance Record</SelectItem>
                <SelectItem value="payment_receipt">Payment Receipt</SelectItem>
                <SelectItem value="notice">Notice</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to use filename"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this document"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g., important, signed, final)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dropzone */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
              uploadingFiles.length > 0 && "mb-6"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOCX, DOC, JPG, PNG, GIF, WEBP (Max 50MB)
                </p>
              </>
            )}
          </div>

          {/* Uploading Files List */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-3">
              {uploadingFiles.map((uploadFile, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(uploadFile.file.type)}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {uploadFile.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(uploadFile.file.size)}
                            </p>
                          </div>

                          {/* Status Icon */}
                          <div className="flex items-center gap-2 ml-4">
                            {uploadFile.status === 'uploading' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Uploading
                              </Badge>
                            )}
                            {uploadFile.status === 'success' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {uploadFile.status === 'error' && (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {uploadFile.status === 'uploading' && (
                          <div className="space-y-1">
                            <Progress value={uploadFile.progress} className="h-2" />
                            <p className="text-xs text-gray-500 text-right">
                              {uploadFile.progress}%
                            </p>
                          </div>
                        )}

                        {/* Success Message */}
                        {uploadFile.status === 'success' && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Upload complete</span>
                          </div>
                        )}

                        {/* Error Message */}
                        {uploadFile.status === 'error' && (
                          <div className="flex items-start gap-2 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{uploadFile.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        {allUploadsComplete && (
          <Button onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}