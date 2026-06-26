/**
 * Enhanced File Upload Component
 * Provides validation, progress tracking, and error handling
 */

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateFile } from '@/lib/validation';

export interface FileUploadProps {
  label?: string;
  name: string;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  onFileSelect: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  error?: string;
  className?: string;
}

interface UploadedFile {
  file: File;
  progress: number;
  error?: string;
  uploaded: boolean;
}

export function FileUpload({
  label = 'Upload Files',
  name,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  disabled = false,
  required = false,
  onFileSelect,
  onFileRemove,
  error,
  className,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
      } else if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds ${formatFileSize(maxSize)}`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      const uploadedFiles: UploadedFile[] = validFiles.map((file) => ({
        file,
        progress: 0,
        uploaded: false,
      }));

      setFiles((prev) => (multiple ? [...prev, ...uploadedFiles] : uploadedFiles));
      onFileSelect(validFiles);

      // Simulate upload progress
      uploadedFiles.forEach((_, index) => {
        simulateUpload(files.length + index);
      });
    }

    if (errors.length > 0) {
      console.error('File validation errors:', errors);
    }
  };

  const simulateUpload = (index: number) => {
    const interval = setInterval(() => {
      setFiles((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index].progress = Math.min(updated[index].progress + 10, 100);
          if (updated[index].progress === 100) {
            updated[index].uploaded = true;
            clearInterval(interval);
          }
        }
        return updated;
      });
    }, 200);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (onFileRemove) {
      onFileRemove(index);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const inputId = `file-upload-${name}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('space-y-4', className)}>
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </Label>

      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-destructive'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? handleClick : undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files"
        aria-describedby={error ? errorId : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium mb-1">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-muted-foreground">
          {accept.split(',').join(', ')} up to {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          id={errorId}
          className="flex items-center gap-2 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2" role="list" aria-label="Uploaded files">
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg"
              role="listitem"
            >
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                
                {!uploadedFile.uploaded && (
                  <Progress value={uploadedFile.progress} className="h-1 mt-2" />
                )}
              </div>

              {uploadedFile.uploaded ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" aria-label="Upload complete" />
              ) : (
                <div className="text-xs text-muted-foreground flex-shrink-0">
                  {uploadedFile.progress}%
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(index)}
                disabled={disabled}
                aria-label={`Remove ${uploadedFile.file.name}`}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}