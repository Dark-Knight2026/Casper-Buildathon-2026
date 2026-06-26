/**
 * Maintenance Photo Type Definitions
 */

export interface MaintenancePhoto {
  id: string;
  maintenance_request_id: string;
  uploaded_by: string;
  photo_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  caption?: string;
  created_at: Date;
  uploader?: {
    name: string;
    role: string;
  };
}

export interface PhotoUploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

export const DEFAULT_PHOTO_OPTIONS: PhotoUploadOptions = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  quality: 0.8,
};