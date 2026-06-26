/**
 * Document Storage Service
 * Handles document upload, download, deletion, and management using Supabase Storage
 * Supports multiple storage buckets for different document types
 * Enhanced with version control, folders, bulk operations, and advanced search
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';
import type { 
  Document, 
  DocumentFilters, 
  BulkUploadProgress, 
  DocumentAnalytics,
  DocumentActivity 
} from '@/types/document';
import { DocumentVersionService } from './documentVersionService';
import JSZip from 'jszip';

type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

export interface DocumentMetadata {
  leaseId?: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: 'lease-agreement' | 'signature' | 'payment-receipt' | 'general';
  tags?: string[];
  description?: string;
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  path?: string;
  url?: string;
  error?: string;
}

export interface DocumentInfo {
  id: string;
  leaseId: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface ListDocumentsOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'file_name' | 'file_size';
  sortOrder?: 'asc' | 'desc';
}

// Supported file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv'
];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Storage bucket names
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'documents',
  LEASE_AGREEMENTS: 'lease-agreements',
  SIGNATURES: 'signatures'
} as const;

/**
 * Helper function to convert document row to DocumentInfo
 */
function mapDocumentRowToInfo(row: DocumentRow): DocumentInfo {
  return {
    id: row.id,
    leaseId: row.lease_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    uploadedBy: row.uploaded_by,
    uploadedAt: new Date(row.created_at),
    metadata: row.metadata as Record<string, unknown> | undefined
  };
}

class DocumentStorageService {
  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported. Allowed types: PDF, DOCX, DOC, images, and text files.`
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique file path
   */
  private generateFilePath(fileName: string, folder?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (folder) {
      return `${folder}/${timestamp}_${randomString}_${sanitizedFileName}`;
    }
    return `${timestamp}_${randomString}_${sanitizedFileName}`;
  }

  /**
   * Ensure storage bucket exists
   */
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        logger.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: MAX_FILE_SIZE
        });

        if (createError) {
          logger.error(`Error creating bucket ${bucketName}:`, createError);
        }
      }
    } catch (error) {
      logger.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * Upload a document to Supabase Storage
   */
  async uploadDocument(
    file: File,
    bucketName: string,
    metadata: DocumentMetadata,
    folder?: string,
    options?: {
      category?: string;
      tags?: string[];
      description?: string;
      folderId?: string;
      createVersion?: boolean;
    }
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      await this.ensureBucketExists(bucketName);

      // Generate unique file path
      const filePath = this.generateFilePath(file.name, folder);

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        return {
          success: false,
          error: `Failed to upload file: ${uploadError.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      // Calculate checksum
      const checksum = await this.calculateChecksum(file);

      // Check if document with same name exists in same folder
      let documentId: string;
      if (options?.createVersion) {
        const { data: existingDocs } = await supabase
          .from('documents')
          .select('id')
          .eq('name', file.name)
          .eq('folder_id', options.folderId || null)
          .eq('uploaded_by', metadata.uploadedBy)
          .single();

        if (existingDocs) {
          // Create new version
          await DocumentVersionService.createVersion({
            documentId: existingDocs.id,
            fileUrl: urlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadedBy: metadata.uploadedBy,
            checksum,
          });
          documentId = existingDocs.id;
        } else {
          // Create new document
          documentId = await this.createDocumentRecord(
            file,
            uploadData.path,
            urlData.publicUrl,
            metadata.uploadedBy,
            checksum,
            options
          );
        }
      } else {
        // Create new document
        documentId = await this.createDocumentRecord(
          file,
          uploadData.path,
          urlData.publicUrl,
          metadata.uploadedBy,
          checksum,
          options
        );
      }

      // Log activity
      await this.logActivity(documentId, metadata.uploadedBy, 'upload', {
        fileName: file.name,
        fileSize: file.size,
      });

      return {
        success: true,
        documentId,
        path: uploadData.path,
        url: urlData.publicUrl
      };
    } catch (error) {
      logger.error('Error in uploadDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create document record in database
   */
  private async createDocumentRecord(
    file: File,
    filePath: string,
    fileUrl: string,
    uploadedBy: string,
    checksum: string,
    options?: {
      category?: string;
      tags?: string[];
      description?: string;
      folderId?: string;
    }
  ): Promise<string> {
    const { data: documentData, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        category: options?.category || 'general',
        file_url: fileUrl,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: uploadedBy,
        folder_id: options?.folderId,
        tags: options?.tags || [],
        description: options?.description,
        checksum,
        current_version: 1,
      })
      .select('id')
      .single();

    if (dbError) {
      throw new Error(`Failed to save document metadata: ${dbError.message}`);
    }

    // Create initial version
    await DocumentVersionService.createVersion({
      documentId: documentData.id,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy,
      checksum,
      changeDescription: 'Initial version',
    });

    return documentData.id;
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Bulk upload documents
   */
  async bulkUpload(
    files: File[],
    uploadedBy: string,
    folderId?: string,
    onProgress?: (progress: BulkUploadProgress[]) => void
  ): Promise<{ successful: string[]; failed: Array<{ fileName: string; error: string }> }> {
    const progress: BulkUploadProgress[] = files.map((file) => ({
      fileName: file.name,
      status: 'pending',
      progress: 0,
    }));

    const successful: string[] = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progress[i].status = 'uploading';
      onProgress?.(progress);

      try {
        const result = await this.uploadDocument(file, STORAGE_BUCKETS.DOCUMENTS, {
          uploadedBy,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }, undefined, { folderId });
        
        if (result.success && result.url) {
          progress[i].status = 'success';
          progress[i].progress = 100;
          successful.push(result.url);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        progress[i].status = 'error';
        progress[i].error = error instanceof Error ? error.message : 'Unknown error';
        failed.push({
          fileName: file.name,
          error: progress[i].error!,
        });
      }

      onProgress?.(progress);
    }

    return { successful, failed };
  }

  /**
   * Bulk download documents as ZIP
   */
  async bulkDownload(documentIds: string[]): Promise<Blob> {
    const zip = new JSZip();

    for (const documentId of documentIds) {
      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (doc) {
        const response = await fetch(doc.file_url);
        const blob = await response.blob();
        zip.file(doc.name, blob);
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Move documents to folder
   */
  async moveDocumentsToFolder(documentIds: string[], folderId?: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ folder_id: folderId })
      .in('id', documentIds);

    if (error) throw error;

    // Log activity for each document
    for (const documentId of documentIds) {
      await this.logActivity(documentId, 'system', 'move', { folderId });
    }
  }

  /**
   * Bulk delete documents
   */
  async bulkDelete(documentIds: string[]): Promise<void> {
    // Get document info
    const { data: docs } = await supabase
      .from('documents')
      .select('file_url')
      .in('id', documentIds);

    // Delete from database
    await supabase
      .from('documents')
      .delete()
      .in('id', documentIds);

    // TODO: Delete files from storage
    // This would require extracting the path from file_url
  }

  /**
   * Search documents with advanced filters
   */
  async searchDocuments(
    userId: string,
    filters: DocumentFilters
  ): Promise<{ documents: Document[]; total: number }> {
    let query = supabase
      .from('documents')
      .select('*, users!uploaded_by(first_name, last_name)', { count: 'exact' })
      .eq('uploaded_by', userId);

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters.fileType && filters.fileType.length > 0) {
      query = query.in('file_type', filters.fileType);
    }

    if (filters.folderId) {
      query = query.eq('folder_id', filters.folderId);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.sizeMin !== undefined) {
      query = query.gte('file_size', filters.sizeMin);
    }

    if (filters.sizeMax !== undefined) {
      query = query.lte('file_size', filters.sizeMax);
    }

    if (filters.isStarred !== undefined) {
      query = query.eq('is_starred', filters.isStarred);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    const documents: Document[] = (data || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      fileUrl: doc.file_url,
      fileSize: doc.file_size,
      fileType: doc.file_type,
      uploadedBy: doc.uploaded_by,
      folderId: doc.folder_id,
      currentVersion: doc.current_version || 1,
      tags: doc.tags || [],
      isStarred: doc.is_starred || false,
      viewCount: doc.view_count || 0,
      downloadCount: doc.download_count || 0,
      lastViewedAt: doc.last_viewed_at,
      lastDownloadedAt: doc.last_downloaded_at,
      description: doc.description,
      checksum: doc.checksum,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return { documents, total: count || 0 };
  }

  /**
   * Toggle star status
   */
  async toggleStar(documentId: string, isStarred: boolean): Promise<void> {
    await supabase
      .from('documents')
      .update({ is_starred: isStarred })
      .eq('id', documentId);
  }

  /**
   * Update document tags
   */
  async updateTags(documentId: string, tags: string[]): Promise<void> {
    await supabase
      .from('documents')
      .update({ tags })
      .eq('id', documentId);
  }

  /**
   * Get document analytics
   */
  async getAnalytics(userId: string): Promise<DocumentAnalytics> {
    // Total documents
    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', userId);

    // Total storage used
    const { data: storageData } = await supabase
      .from('documents')
      .select('file_size')
      .eq('uploaded_by', userId);

    const totalStorageUsed = storageData?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;

    // Documents this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: documentsThisMonth } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', userId)
      .gte('created_at', startOfMonth.toISOString());

    // Storage this month
    const { data: storageThisMonthData } = await supabase
      .from('documents')
      .select('file_size')
      .eq('uploaded_by', userId)
      .gte('created_at', startOfMonth.toISOString());

    const storageThisMonth = storageThisMonthData?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0;

    // Most viewed documents
    const { data: mostViewed } = await supabase
      .from('documents')
      .select('id, name, view_count')
      .eq('uploaded_by', userId)
      .order('view_count', { ascending: false })
      .limit(5);

    // Storage by category
    const { data: categoryData } = await supabase.rpc('get_storage_by_category', {
      landlord_uuid: userId,
    });

    // Recent activity
    const { data: activityData } = await supabase
      .from('document_activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      totalDocuments: totalDocuments || 0,
      totalStorageUsed,
      documentsThisMonth: documentsThisMonth || 0,
      storageThisMonth,
      mostViewedDocuments: mostViewed?.map((doc) => ({
        id: doc.id,
        name: doc.name,
        viewCount: doc.view_count || 0,
      })) || [],
      storageByCategory: categoryData || [],
      documentTypeDistribution: [],
      uploadsOverTime: [],
      mostActiveUsers: [],
      recentActivity: activityData?.map((activity) => ({
        id: activity.id,
        documentId: activity.document_id,
        userId: activity.user_id,
        action: activity.action as DocumentActivity['action'],
        details: activity.details as Record<string, unknown>,
        ipAddress: activity.ip_address,
        userAgent: activity.user_agent,
        createdAt: activity.created_at,
      })) || [],
    };
  }

  /**
   * Log document activity
   */
  private async logActivity(
    documentId: string,
    userId: string,
    action: DocumentActivity['action'],
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await supabase.from('document_activity_log').insert({
      document_id: documentId,
      user_id: userId,
      action,
      details,
    });
  }

  /**
   * Track document view
   */
  async trackView(documentId: string, userId: string): Promise<void> {
    // Use RPC function to increment counter
    await supabase.rpc('increment_view_count', { document_id: documentId });

    await supabase
      .from('documents')
      .update({
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    await this.logActivity(documentId, userId, 'view');
  }

  /**
   * Track document download
   */
  async trackDownload(documentId: string, userId: string): Promise<void> {
    // Use RPC function to increment counter
    await supabase.rpc('increment_download_count', { document_id: documentId });

    await supabase
      .from('documents')
      .update({
        last_downloaded_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    await this.logActivity(documentId, userId, 'download');
  }

  // ===== Legacy methods (kept for backward compatibility) =====

  /**
   * Download a document from Supabase Storage
   */
  async downloadDocument(
    bucketName: string,
    path: string
  ): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(path);

      if (error) {
        logger.error('Error downloading document:', error);
        return {
          success: false,
          error: `Failed to download document: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      logger.error('Error in downloadDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a document from Supabase Storage and database
   */
  async deleteDocument(
    bucketName: string,
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (storageError) {
        logger.error('Error deleting from storage:', storageError);
        return {
          success: false,
          error: `Failed to delete from storage: ${storageError.message}`
        };
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('file_path', path);

      if (dbError) {
        logger.error('Error deleting from database:', dbError);
        return {
          success: true,
          error: `File deleted but metadata removal failed: ${dbError.message}`
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in deleteDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete document by ID
   */
  async deleteDocumentById(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !doc) {
        return {
          success: false,
          error: 'Document not found'
        };
      }

      const metadata = doc.metadata as Record<string, unknown>;
      const bucketName = (metadata?.bucketName as string) || STORAGE_BUCKETS.DOCUMENTS;

      return await this.deleteDocument(bucketName, doc.file_path);
    } catch (error) {
      logger.error('Error in deleteDocumentById:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * List documents in a bucket
   */
  async listDocuments(
    bucketName: string,
    folder?: string,
    options?: ListDocumentsOptions
  ): Promise<{ success: boolean; files?: DocumentInfo[]; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folder, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
          sortBy: { column: options?.sortBy || 'created_at', order: options?.sortOrder || 'desc' }
        });

      if (error) {
        logger.error('Error listing documents:', error);
        return {
          success: false,
          error: `Failed to list documents: ${error.message}`
        };
      }

      const filePaths = data.map(file => 
        folder ? `${folder}/${file.name}` : file.name
      );

      const { data: documents, error: dbError } = await supabase
        .from('documents')
        .select('*')
        .in('file_path', filePaths);

      if (dbError) {
        logger.error('Error fetching document metadata:', dbError);
      }

      const files: DocumentInfo[] = (documents || []).map(mapDocumentRowToInfo);

      return {
        success: true,
        files
      };
    } catch (error) {
      logger.error('Error in listDocuments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * List documents by lease ID
   */
  async listDocumentsByLeaseId(
    leaseId: string,
    options?: ListDocumentsOptions
  ): Promise<{ success: boolean; files?: DocumentInfo[]; error?: string }> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('lease_id', leaseId);

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      if (options?.sortBy) {
        query = query.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error listing documents by lease:', error);
        return {
          success: false,
          error: `Failed to list documents: ${error.message}`
        };
      }

      const files: DocumentInfo[] = (data || []).map(mapDocumentRowToInfo);

      // Get public URLs for each file
      for (const file of files) {
        const metadata = file.metadata as Record<string, unknown>;
        const bucketName = (metadata?.bucketName as string) || STORAGE_BUCKETS.DOCUMENTS;
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.filePath);
        file.url = urlData.publicUrl;
      }

      return {
        success: true,
        files
      };
    } catch (error) {
      logger.error('Error in listDocumentsByLeaseId:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a signed URL for temporary access to a document
   */
  async getDocumentUrl(
    bucketName: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) {
        logger.error('Error creating signed URL:', error);
        return {
          success: false,
          error: `Failed to create signed URL: ${error.message}`
        };
      }

      return {
        success: true,
        url: data.signedUrl
      };
    } catch (error) {
      logger.error('Error in getDocumentUrl:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get public URL for a document
   */
  getPublicUrl(bucketName: string, path: string): string {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Update document metadata in database
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Partial<DocumentMetadata>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: DocumentUpdate = {
        ...(metadata.fileName && { file_name: metadata.fileName }),
        ...(metadata.fileSize && { file_size: metadata.fileSize }),
        ...(metadata.mimeType && { mime_type: metadata.mimeType }),
        metadata: metadata as unknown as Database['public']['Tables']['documents']['Update']['metadata']
      };

      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId);

      if (error) {
        logger.error('Error updating document metadata:', error);
        return {
          success: false,
          error: `Failed to update metadata: ${error.message}`
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in updateDocumentMetadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<{ success: boolean; document?: DocumentInfo; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Document not found'
          };
        }
        logger.error('Error fetching document:', error);
        return {
          success: false,
          error: `Failed to fetch document: ${error.message}`
        };
      }

      const document = mapDocumentRowToInfo(data);

      // Get public URL
      const metadata = document.metadata as Record<string, unknown>;
      const bucketName = (metadata?.bucketName as string) || STORAGE_BUCKETS.DOCUMENTS;
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(document.filePath);
      document.url = urlData.publicUrl;

      return {
        success: true,
        document
      };
    } catch (error) {
      logger.error('Error in getDocumentById:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Move document to different bucket
   */
  async moveDocument(
    sourceBucket: string,
    sourcePath: string,
    destinationBucket: string,
    destinationPath?: string
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      // Download from source
      const downloadResult = await this.downloadDocument(sourceBucket, sourcePath);
      if (!downloadResult.success || !downloadResult.data) {
        return {
          success: false,
          error: downloadResult.error || 'Failed to download source document'
        };
      }

      const destPath = destinationPath || sourcePath;

      // Upload to destination
      const { error: uploadError } = await supabase.storage
        .from(destinationBucket)
        .upload(destPath, downloadResult.data, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        logger.error('Error uploading to destination:', uploadError);
        return {
          success: false,
          error: `Failed to upload to destination: ${uploadError.message}`
        };
      }

      // Update database record
      const { error: dbError } = await supabase
        .from('documents')
        .update({
          file_path: destPath,
          metadata: { bucketName: destinationBucket } as unknown as Database['public']['Tables']['documents']['Update']['metadata']
        })
        .eq('file_path', sourcePath);

      if (dbError) {
        logger.error('Error updating database:', dbError);
      }

      // Delete from source
      await this.deleteDocument(sourceBucket, sourcePath);

      return {
        success: true,
        newPath: destPath
      };
    } catch (error) {
      logger.error('Error in moveDocument:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const documentStorageService = new DocumentStorageService();