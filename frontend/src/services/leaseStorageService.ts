/**
 * Lease Storage Service
 * Handles secure document storage, version control, and audit trail
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// Types
export interface LeaseDocument {
  id: string;
  lease_id: string;
  document_type: DocumentType;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  version_number: number;
  is_current_version: boolean;
  parent_document_id?: string;
  status: DocumentStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
  is_signed: boolean;
  signed_at?: Date;
  signature_request_id?: string;
  checksum?: string;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by?: string;
  deleted_at?: Date;
  archived_at?: Date;
}

export type DocumentType =
  | 'lease_agreement'
  | 'amendment'
  | 'addendum'
  | 'signature_certificate'
  | 'attachment'
  | 'inspection_report'
  | 'maintenance_record'
  | 'payment_receipt'
  | 'notice'
  | 'other';

export type DocumentStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'signed'
  | 'archived'
  | 'deleted';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  checksum?: string;
  change_summary?: string;
  changes?: DocumentChange[];
  created_at: Date;
  created_by: string;
}

export interface DocumentChange {
  field: string;
  old_value: string;
  new_value: string;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  document_id: string;
  action: AuditAction;
  action_details?: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, unknown>;
  version_number?: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export type AuditAction =
  | 'upload'
  | 'download'
  | 'view'
  | 'edit'
  | 'delete'
  | 'share'
  | 'unshare'
  | 'sign'
  | 'approve'
  | 'reject'
  | 'archive'
  | 'restore'
  | 'version_create'
  | 'version_rollback';

export interface DocumentShare {
  id: string;
  document_id: string;
  share_token: string;
  share_url: string;
  permission: 'view' | 'download' | 'edit';
  password_hash?: string;
  requires_authentication: boolean;
  expires_at?: Date;
  max_downloads?: number;
  download_count: number;
  shared_with_email?: string;
  shared_with_user_id?: string;
  is_active: boolean;
  created_at: Date;
  created_by: string;
  last_accessed_at?: Date;
  access_count: number;
}

export interface UploadOptions {
  leaseId: string;
  documentType: DocumentType;
  title: string;
  description?: string;
  file: File;
  tags?: string[];
  metadata?: Record<string, unknown>;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  document: LeaseDocument;
  url: string;
}

export interface ShareOptions {
  documentId: string;
  permission: 'view' | 'download' | 'edit';
  expiresIn?: number;
  maxDownloads?: number;
  requiresAuth?: boolean;
  password?: string;
  recipientEmail?: string;
}

export interface BackupOptions {
  leaseIds?: string[];
  includeArchived?: boolean;
  backupName?: string;
}

export interface BackupResult {
  id: string;
  backup_name: string;
  backup_path: string;
  backup_size: number;
  document_count: number;
  created_at: Date;
}

class LeaseStorageService {
  private supabase: ReturnType<typeof createClient>;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload a document to Supabase Storage
   */
  async uploadDocument(options: UploadOptions): Promise<UploadResult> {
    const { leaseId, documentType, title, description, file, tags, metadata } = options;

    // Validate file
    this.validateFile(file);

    // Generate file path
    const userId = await this.getCurrentUserId();
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${userId}/${leaseId}/${documentType}/${fileName}`;

    // Calculate checksum
    const checksum = await this.calculateChecksum(file);

    // Upload to storage
    const bucket = this.getBucketForDocumentType(documentType);
    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create document record
    const { data: document, error: dbError } = await this.supabase
      .from('lease_documents')
      .insert({
        lease_id: leaseId,
        document_type: documentType,
        title,
        description,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        version_number: 1,
        is_current_version: true,
        status: 'draft',
        tags,
        metadata,
        checksum,
        created_by: userId
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage upload
      await this.supabase.storage.from(bucket).remove([filePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // Create audit log
    await this.createAuditLog(document.id, 'upload', `Uploaded ${file.name}`);

    // Get signed URL
    const { data: urlData } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600);

    return {
      document: this.mapDocument(document),
      url: urlData?.signedUrl || ''
    };
  }

  /**
   * Download a document
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    // Get document metadata
    const { data: document, error } = await this.supabase
      .from('lease_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      throw new Error('Document not found');
    }

    // Get file from storage
    const bucket = this.getBucketForDocumentType(document.document_type);
    const { data, error: downloadError } = await this.supabase.storage
      .from(bucket)
      .download(document.file_path);

    if (downloadError || !data) {
      throw new Error(`Download failed: ${downloadError?.message}`);
    }

    await this.createAuditLog(documentId, 'download', `Downloaded ${document.file_name}`);
    return data;
  }

  /**
   * Get signed URL for document
   */
  async getDocumentUrl(documentId: string, expiresIn: number = 3600): Promise<string> {
    const { data: document, error } = await this.supabase
      .from('lease_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      throw new Error('Document not found');
    }

    const bucket = this.getBucketForDocumentType(document.document_type);
    const { data: urlData, error: urlError } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(document.file_path, expiresIn);

    if (urlError || !urlData) {
      throw new Error('Failed to generate URL');
    }

    await this.createAuditLog(documentId, 'view', 'Generated signed URL');
    return urlData.signedUrl;
  }

  /**
   * Delete a document (soft delete)
   */
  async deleteDocument(documentId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    const { error } = await this.supabase
      .from('lease_documents')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        is_current_version: false
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    await this.createAuditLog(documentId, 'delete', 'Document deleted');
  }

  /**
   * Get all documents for a lease
   */
  async getLeaseDocuments(leaseId: string, includeDeleted: boolean = false): Promise<LeaseDocument[]> {
    let query = this.supabase
      .from('lease_documents')
      .select('*')
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: false });

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return (data || []).map(this.mapDocument);
  }

  // Helper methods
  private validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
  }

  private getBucketForDocumentType(type: DocumentType): string {
    switch (type) {
      case 'lease_agreement':
        return 'lease-documents';
      case 'amendment':
      case 'addendum':
        return 'lease-amendments';
      default:
        return 'lease-documents';
    }
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  private async createAuditLog(
    documentId: string,
    action: AuditAction,
    details?: string,
    versionNumber?: number
  ): Promise<void> {
    try {
      await this.supabase.rpc('create_audit_log_entry', {
        p_document_id: documentId,
        p_action: action,
        p_action_details: details,
        p_version_number: versionNumber
      });
    } catch (error) {
      logger.error('Failed to create audit log:', error);
    }
  }

  private async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private mapDocument(doc: Record<string, unknown>): LeaseDocument {
    return {
      id: doc.id as string,
      lease_id: doc.lease_id as string,
      document_type: doc.document_type as DocumentType,
      title: doc.title as string,
      description: doc.description as string | undefined,
      file_name: doc.file_name as string,
      file_path: doc.file_path as string,
      file_size: doc.file_size as number,
      mime_type: doc.mime_type as string,
      version_number: doc.version_number as number,
      is_current_version: doc.is_current_version as boolean,
      parent_document_id: doc.parent_document_id as string | undefined,
      status: doc.status as DocumentStatus,
      tags: doc.tags as string[] | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      is_signed: doc.is_signed as boolean,
      signed_at: doc.signed_at ? new Date(doc.signed_at as string) : undefined,
      signature_request_id: doc.signature_request_id as string | undefined,
      checksum: doc.checksum as string | undefined,
      created_at: new Date(doc.created_at as string),
      created_by: doc.created_by as string,
      updated_at: new Date(doc.updated_at as string),
      updated_by: doc.updated_by as string | undefined,
      deleted_at: doc.deleted_at ? new Date(doc.deleted_at as string) : undefined,
      archived_at: doc.archived_at ? new Date(doc.archived_at as string) : undefined
    };
  }
}

export const leaseStorageService = new LeaseStorageService();