import { supabase } from '@/lib/supabase/client';
import type { DocumentShare, ShareOptions } from '@/types/document';
import { nanoid } from 'nanoid';

export class DocumentSharingService {
  /**
   * Share document with a specific user
   */
  static async shareWithUser(
    documentId: string,
    sharedWithUserId: string,
    sharedByUserId: string,
    options: ShareOptions
  ): Promise<DocumentShare> {
    const { data: share, error } = await supabase
      .from('document_shares')
      .insert({
        document_id: documentId,
        shared_with_user_id: sharedWithUserId,
        shared_by_user_id: sharedByUserId,
        permission_level: options.permissionLevel,
        expires_at: options.expiresAt,
        password_hash: options.password ? await this.hashPassword(options.password) : null,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send email notification if requested
    if (options.notifyByEmail) {
      // await this.sendShareNotification(sharedWithUserId, documentId);
    }

    return this.mapToShare(share);
  }

  /**
   * Create public share link
   */
  static async createShareLink(
    documentId: string,
    sharedByUserId: string,
    options: ShareOptions
  ): Promise<DocumentShare> {
    const shareLink = nanoid(16);

    const { data: share, error } = await supabase
      .from('document_shares')
      .insert({
        document_id: documentId,
        shared_by_user_id: sharedByUserId,
        permission_level: options.permissionLevel,
        share_link: shareLink,
        expires_at: options.expiresAt,
        password_hash: options.password ? await this.hashPassword(options.password) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToShare(share);
  }

  /**
   * Get all shares for a document
   */
  static async getSharesByDocument(documentId: string): Promise<DocumentShare[]> {
    interface ShareWithUsers {
      id: string;
      document_id: string;
      shared_with_user_id?: string;
      shared_by_user_id: string;
      permission_level: string;
      share_link?: string;
      password_hash?: string;
      expires_at?: string;
      view_count: number;
      download_count: number;
      last_viewed_at?: string;
      last_downloaded_at?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      shared_with_user?: {
        first_name: string;
        last_name: string;
      };
      shared_by_user?: {
        first_name: string;
        last_name: string;
      };
    }

    const { data, error } = await supabase
      .from('document_shares')
      .select(`
        *,
        shared_with_user:users!shared_with_user_id(
          first_name,
          last_name
        ),
        shared_by_user:users!shared_by_user_id(
          first_name,
          last_name
        )
      `)
      .eq('document_id', documentId)
      .eq('is_active', true);

    if (error) throw error;
    return (data as ShareWithUsers[]).map((share) => ({
      ...this.mapToShare(share),
      sharedWithUserName: share.shared_with_user
        ? `${share.shared_with_user.first_name} ${share.shared_with_user.last_name}`
        : undefined,
      sharedByUserName: share.shared_by_user
        ? `${share.shared_by_user.first_name} ${share.shared_by_user.last_name}`
        : 'Unknown User',
    }));
  }

  /**
   * Get share by link
   */
  static async getShareByLink(shareLink: string): Promise<DocumentShare | null> {
    const { data, error } = await supabase
      .from('document_shares')
      .select('*')
      .eq('share_link', shareLink)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return this.mapToShare(data);
  }

  /**
   * Verify share link password
   */
  static async verifySharePassword(shareLink: string, password: string): Promise<boolean> {
    const share = await this.getShareByLink(shareLink);
    if (!share || !share.passwordHash) return true;

    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === share.passwordHash;
  }

  /**
   * Track document view
   */
  static async trackView(shareId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_share_view', {
      share_id: shareId,
    });

    if (error) {
      // Fallback if function doesn't exist
      await supabase
        .from('document_shares')
        .update({
          view_count: supabase.raw('view_count + 1'),
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', shareId);
    }
  }

  /**
   * Track document download
   */
  static async trackDownload(shareId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_share_download', {
      share_id: shareId,
    });

    if (error) {
      // Fallback if function doesn't exist
      await supabase
        .from('document_shares')
        .update({
          download_count: supabase.raw('download_count + 1'),
          last_downloaded_at: new Date().toISOString(),
        })
        .eq('id', shareId);
    }
  }

  /**
   * Update share permissions
   */
  static async updateShare(
    id: string,
    data: Partial<{
      permissionLevel: 'view' | 'download' | 'comment' | 'edit';
      expiresAt?: string;
      isActive: boolean;
    }>
  ): Promise<DocumentShare> {
    const updateData: Record<string, unknown> = {};
    if (data.permissionLevel !== undefined) updateData.permission_level = data.permissionLevel;
    if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: share, error } = await supabase
      .from('document_shares')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToShare(share);
  }

  /**
   * Revoke share (deactivate)
   */
  static async revokeShare(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_shares')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Delete share permanently
   */
  static async deleteShare(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_shares')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get shares by user (documents shared with user)
   */
  static async getSharesByUser(userId: string): Promise<DocumentShare[]> {
    interface ShareWithDocument {
      id: string;
      document_id: string;
      shared_with_user_id?: string;
      shared_by_user_id: string;
      permission_level: string;
      share_link?: string;
      password_hash?: string;
      expires_at?: string;
      view_count: number;
      download_count: number;
      last_viewed_at?: string;
      last_downloaded_at?: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      documents?: {
        name: string;
      };
      shared_by_user?: {
        first_name: string;
        last_name: string;
      };
    }

    const { data, error } = await supabase
      .from('document_shares')
      .select(`
        *,
        documents(name),
        shared_by_user:users!shared_by_user_id(
          first_name,
          last_name
        )
      `)
      .eq('shared_with_user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return (data as ShareWithDocument[]).map((share) => ({
      ...this.mapToShare(share),
      sharedByUserName: share.shared_by_user
        ? `${share.shared_by_user.first_name} ${share.shared_by_user.last_name}`
        : 'Unknown User',
    }));
  }

  /**
   * Check if user has access to document
   */
  static async hasAccess(
    documentId: string,
    userId: string
  ): Promise<{
    hasAccess: boolean;
    permissionLevel?: 'view' | 'download' | 'comment' | 'edit';
  }> {
    // Check if user owns the document
    const { data: doc } = await supabase
      .from('documents')
      .select('uploaded_by')
      .eq('id', documentId)
      .single();

    if (doc && doc.uploaded_by === userId) {
      return { hasAccess: true, permissionLevel: 'edit' };
    }

    // Check if document is shared with user
    const { data: share } = await supabase
      .from('document_shares')
      .select('permission_level')
      .eq('document_id', documentId)
      .eq('shared_with_user_id', userId)
      .eq('is_active', true)
      .single();

    if (share) {
      return {
        hasAccess: true,
        permissionLevel: share.permission_level as 'view' | 'download' | 'comment' | 'edit',
      };
    }

    return { hasAccess: false };
  }

  /**
   * Get share analytics
   */
  static async getShareAnalytics(documentId: string): Promise<{
    totalShares: number;
    activeShares: number;
    totalViews: number;
    totalDownloads: number;
    mostRecentView?: string;
  }> {
    const shares = await this.getSharesByDocument(documentId);

    const totalViews = shares.reduce((sum, share) => sum + share.viewCount, 0);
    const totalDownloads = shares.reduce((sum, share) => sum + share.downloadCount, 0);

    const viewDates = shares
      .filter((s) => s.lastViewedAt)
      .map((s) => new Date(s.lastViewedAt!).getTime());

    const mostRecentView = viewDates.length > 0
      ? new Date(Math.max(...viewDates)).toISOString()
      : undefined;

    return {
      totalShares: shares.length,
      activeShares: shares.filter((s) => s.isActive).length,
      totalViews,
      totalDownloads,
      mostRecentView,
    };
  }

  /**
   * Cleanup expired shares
   */
  static async cleanupExpiredShares(): Promise<number> {
    const { data, error } = await supabase
      .from('document_shares')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * Hash password (simple implementation, use bcrypt in production)
   */
  private static async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or similar
    // This is a simple implementation for demonstration
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Map database record to DocumentShare type
   */
  private static mapToShare(data: Record<string, unknown>): DocumentShare {
    return {
      id: data.id as string,
      documentId: data.document_id as string,
      sharedWithUserId: data.shared_with_user_id as string | undefined,
      sharedByUserId: data.shared_by_user_id as string,
      permissionLevel: data.permission_level as 'view' | 'download' | 'comment' | 'edit',
      shareLink: data.share_link as string | undefined,
      passwordHash: data.password_hash as string | undefined,
      expiresAt: data.expires_at as string | undefined,
      viewCount: data.view_count as number,
      downloadCount: data.download_count as number,
      lastViewedAt: data.last_viewed_at as string | undefined,
      lastDownloadedAt: data.last_downloaded_at as string | undefined,
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}