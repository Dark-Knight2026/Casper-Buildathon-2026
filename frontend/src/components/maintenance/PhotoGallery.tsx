import { useState } from 'react';
import { Download, Trash2, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { maintenancePhotoService } from '@/services/maintenancePhotoService';
import type { MaintenancePhoto } from '@/types/maintenancePhoto';

interface PhotoGalleryProps {
  photos: MaintenancePhoto[];
  onPhotoDeleted?: (photoId: string) => void;
  canDelete?: boolean;
}

export default function PhotoGallery({
  photos,
  onPhotoDeleted,
  canDelete = false,
}: PhotoGalleryProps) {
  const { toast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState<MaintenancePhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    setDeletingId(photoId);
    try {
      await maintenancePhotoService.deletePhoto(photoId);
      toast({
        title: 'Photo Deleted',
        description: 'The photo has been deleted successfully.',
      });
      if (onPhotoDeleted) {
        onPhotoDeleted(photoId);
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete photo',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (photo: MaintenancePhoto) => {
    const link = document.createElement('a');
    link.href = photo.photo_url;
    link.download = photo.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-600">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <div
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || photo.file_name}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Photo Info */}
            <div className="mt-2">
              {photo.caption && (
                <p className="text-sm text-gray-700 truncate">{photo.caption}</p>
              )}
              <p className="text-xs text-gray-500">
                {new Date(photo.created_at).toLocaleDateString()}
              </p>
              {photo.uploader && (
                <p className="text-xs text-gray-500">
                  by {photo.uploader.name}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(photo);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                  disabled={deletingId === photo.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {selectedPhoto?.caption || selectedPhoto?.file_name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.caption || selectedPhoto.file_name}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <p>Uploaded: {new Date(selectedPhoto.created_at).toLocaleString()}</p>
                  {selectedPhoto.uploader && (
                    <p>By: {selectedPhoto.uploader.name}</p>
                  )}
                  <p>Size: {(selectedPhoto.file_size / 1024).toFixed(2)} KB</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedPhoto)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {canDelete && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleDelete(selectedPhoto.id);
                        setSelectedPhoto(null);
                      }}
                      disabled={deletingId === selectedPhoto.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}