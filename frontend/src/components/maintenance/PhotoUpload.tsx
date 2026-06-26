import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { maintenancePhotoService } from '@/services/maintenancePhotoService';
import type { MaintenancePhoto } from '@/types/maintenancePhoto';

interface PhotoUploadProps {
  requestId: string;
  onUploadComplete?: (photos: MaintenancePhoto[]) => void;
  maxFiles?: number;
}

export default function PhotoUpload({
  requestId,
  onUploadComplete,
  maxFiles = 10,
}: PhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previews, setPreviews] = useState<{ file: File; preview: string }[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate file count
    if (previews.length + acceptedFiles.length > maxFiles) {
      toast({
        title: 'Too Many Files',
        description: `You can only upload up to ${maxFiles} photos.`,
        variant: 'destructive',
      });
      return;
    }

    // Create previews
    const newPreviews = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [previews, maxFiles, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: maxFiles - previews.length,
    disabled: uploading,
  });

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].preview);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const handleUpload = async () => {
    if (previews.length === 0) {
      toast({
        title: 'No Photos Selected',
        description: 'Please select photos to upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const files = previews.map((p) => p.file);
      const uploadedPhotos: MaintenancePhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const photo = await maintenancePhotoService.uploadPhoto(files[i], requestId);
        uploadedPhotos.push(photo);
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      toast({
        title: 'Upload Successful',
        description: `${uploadedPhotos.length} photo(s) uploaded successfully.`,
      });

      // Clean up previews
      previews.forEach((p) => URL.revokeObjectURL(p.preview));
      setPreviews([]);

      if (onUploadComplete) {
        onUploadComplete(uploadedPhotos);
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload photos',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-12 w-12 text-gray-400" />
          {isDragActive ? (
            <p className="text-sm text-gray-600">Drop the photos here...</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Drag and drop photos here, or click to select
              </p>
              <p className="text-xs text-gray-500">
                Supports: JPG, PNG, WebP (max 10MB per file)
              </p>
              <p className="text-xs text-gray-500">
                Up to {maxFiles} photos
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removePreview(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-xs p-1 rounded truncate">
                  {preview.file.name}
                </div>
              </div>
            ))}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-gray-600">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                previews.forEach((p) => URL.revokeObjectURL(p.preview));
                setPreviews([]);
              }}
              disabled={uploading}
            >
              Clear All
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Upload {previews.length} Photo{previews.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}