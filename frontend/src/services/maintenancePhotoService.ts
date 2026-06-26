import imageCompression from 'browser-image-compression';
import type { MaintenancePhoto, PhotoUploadOptions } from '@/types/maintenancePhoto';
import { DEFAULT_PHOTO_OPTIONS } from '@/types/maintenancePhoto';

class MaintenancePhotoService {
  /**
   * Compress an image file
   */
  async compressImage(file: File, options: PhotoUploadOptions = DEFAULT_PHOTO_OPTIONS): Promise<File> {
    try {
      const compressionOptions = {
        maxSizeMB: options.maxSizeMB || 2,
        maxWidthOrHeight: options.maxWidthOrHeight || 1920,
        useWebWorker: true,
        initialQuality: options.quality || 0.8,
      };

      const compressedFile = await imageCompression(file, compressionOptions);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Validate image file
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 10MB. Please upload a smaller image.',
      };
    }

    return { valid: true };
  }

  /**
   * Upload a single photo
   */
  async uploadPhoto(
    file: File,
    requestId: string,
    caption?: string
  ): Promise<MaintenancePhoto> {
    // Validate file
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Compress image
    const compressedFile = await this.compressImage(file);

    // In a real implementation, this would upload to Supabase Storage
    // For now, we'll create a mock response
    const mockPhoto: MaintenancePhoto = {
      id: Math.random().toString(36).substring(7),
      maintenance_request_id: requestId,
      uploaded_by: 'current-user-id',
      photo_url: URL.createObjectURL(compressedFile),
      file_name: compressedFile.name,
      file_size: compressedFile.size,
      mime_type: compressedFile.type,
      caption,
      created_at: new Date(),
      uploader: {
        name: 'Current User',
        role: 'tenant',
      },
    };

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return mockPhoto;
  }

  /**
   * Upload multiple photos
   */
  async uploadMultiplePhotos(
    files: File[],
    requestId: string
  ): Promise<MaintenancePhoto[]> {
    const uploadPromises = files.map((file) => this.uploadPhoto(file, requestId));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    // In a real implementation, this would delete from Supabase Storage
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * Get photos for a maintenance request
   */
  async getPhotos(requestId: string): Promise<MaintenancePhoto[]> {
    // In a real implementation, this would fetch from the database
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [];
  }

  /**
   * Update photo caption
   */
  async updateCaption(photoId: string, caption: string): Promise<void> {
    // In a real implementation, this would update the database
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

export const maintenancePhotoService = new MaintenancePhotoService();