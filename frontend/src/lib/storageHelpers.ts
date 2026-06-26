/**
 * Supabase Storage Helper Functions
 * Utilities for managing file uploads to Supabase Storage
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from '@/utils/logger';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase not configured',
    };
  }

  try {
    // Simulate progress for user feedback
    if (onProgress) {
      onProgress({ loaded: 0, total: file.size, percentage: 0 });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    logger.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple files with progress tracking
 */
export async function uploadMultipleFiles(
  bucket: string,
  files: File[],
  pathPrefix: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const result = await uploadFile(
      bucket,
      fileName,
      file,
      onProgress ? (progress) => onProgress(i, progress) : undefined
    );

    results.push(result);
  }

  return results;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase not configured',
    };
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(
  bucket: string,
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase not configured',
    };
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete multiple files error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get signed URL for private files
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    logger.error('Signed URL error:', error);
    return null;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(
  bucket: string,
  path: string = ''
): Promise<{ name: string; id: string; updated_at: string }[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).list(path);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('List files error:', error);
    return [];
  }
}

/**
 * Compress image before upload (client-side)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
    };

    reader.onerror = () => reject(new Error('File read failed'));
  });
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // Default 10MB

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`,
    };
  }

  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Generate thumbnail URL
 */
export function getThumbnailUrl(
  bucket: string,
  path: string,
  width: number = 300,
  height: number = 300
): string | null {
  // Supabase doesn't have built-in image transformation yet
  // Return original URL for now
  // In production, you might use Cloudinary, Imgix, or similar service
  return getPublicUrl(bucket, path);
}

/**
 * Batch upload with retry logic
 */
export async function batchUploadWithRetry(
  bucket: string,
  files: File[],
  pathPrefix: string,
  maxRetries: number = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  let completed = 0;

  for (const file of files) {
    let attempts = 0;
    let result: UploadResult | null = null;

    while (attempts < maxRetries && !result?.success) {
      attempts++;
      const fileExt = file.name.split('.').pop();
      const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      result = await uploadFile(bucket, fileName, file);

      if (!result.success && attempts < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    results.push(result || { success: false, error: 'Max retries exceeded' });
    completed++;

    if (onProgress) {
      onProgress(completed, files.length);
    }
  }

  return results;
}