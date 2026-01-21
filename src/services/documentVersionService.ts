import { supabase } from '@/lib/supabase/client';
import type { DocumentVersion } from '@/types/document';

export class DocumentVersionService {
  /**
   * Create a new version of a document
   */
  static async createVersion(data: {
    documentId: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType?: string;
    uploadedBy: string;
    changeDescription?: string;
    checksum?: string;
  }): Promise<DocumentVersion> {
    // Get current version number
    const { data: versions } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('document_id', data.documentId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    // Create new version
    const { data: version, error } = await supabase
      .from('document_versions')
      .insert({
        document_id: data.documentId,
        version_number: nextVersion,
        file_url: data.fileUrl,
        file_name: data.fileName,
        file_size: data.fileSize,
        file_type: data.fileType,
        uploaded_by: data.uploadedBy,
        change_description: data.changeDescription,
        checksum: data.checksum,
      })
      .select()
      .single();

    if (error) throw error;

    // Update document's current version
    await supabase
      .from('documents')
      .update({
        current_version: nextVersion,
        file_url: data.fileUrl,
        file_size: data.fileSize,
        checksum: data.checksum,
      })
      .eq('id', data.documentId);

    return this.mapToVersion(version);
  }

  /**
   * Get all versions of a document
   */
  static async getVersionsByDocument(documentId: string): Promise<DocumentVersion[]> {
    interface VersionWithUser {
      id: string;
      document_id: string;
      version_number: number;
      file_url: string;
      file_name: string;
      file_size: number;
      file_type?: string;
      uploaded_by: string;
      change_description?: string;
      checksum?: string;
      created_at: string;
      users?: {
        first_name: string;
        last_name: string;
      };
    }

    const { data, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        users(
          first_name,
          last_name
        )
      `)
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data as VersionWithUser[]).map((version) => ({
      ...this.mapToVersion(version),
      uploaderName: version.users
        ? `${version.users.first_name} ${version.users.last_name}`
        : 'Unknown User',
    }));
  }

  /**
   * Get specific version
   */
  static async getVersionById(id: string): Promise<DocumentVersion> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToVersion(data);
  }

  /**
   * Get version by document and version number
   */
  static async getVersionByNumber(
    documentId: string,
    versionNumber: number
  ): Promise<DocumentVersion> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('version_number', versionNumber)
      .single();

    if (error) throw error;
    return this.mapToVersion(data);
  }

  /**
   * Restore a previous version (make it the current version)
   */
  static async restoreVersion(documentId: string, versionNumber: number): Promise<void> {
    // Get the version to restore
    const version = await this.getVersionByNumber(documentId, versionNumber);

    // Create a new version with the restored content
    const { data: currentDoc } = await supabase
      .from('documents')
      .select('uploaded_by')
      .eq('id', documentId)
      .single();

    await this.createVersion({
      documentId,
      fileUrl: version.fileUrl,
      fileName: version.fileName,
      fileSize: version.fileSize,
      fileType: version.fileType,
      uploadedBy: currentDoc?.uploaded_by || version.uploadedBy,
      changeDescription: `Restored from version ${versionNumber}`,
      checksum: version.checksum,
    });
  }

  /**
   * Delete a specific version
   */
  static async deleteVersion(id: string): Promise<void> {
    // Get version info
    const version = await this.getVersionById(id);

    // Don't allow deleting the current version
    const { data: doc } = await supabase
      .from('documents')
      .select('current_version')
      .eq('id', version.documentId)
      .single();

    if (doc && doc.current_version === version.versionNumber) {
      throw new Error('Cannot delete the current version');
    }

    // Delete the version
    const { error } = await supabase
      .from('document_versions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // TODO: Delete the file from storage
  }

  /**
   * Delete old versions (keep only the last N versions)
   */
  static async pruneOldVersions(documentId: string, keepCount = 10): Promise<void> {
    const versions = await this.getVersionsByDocument(documentId);

    if (versions.length <= keepCount) {
      return; // Nothing to prune
    }

    // Get current version
    const { data: doc } = await supabase
      .from('documents')
      .select('current_version')
      .eq('id', documentId)
      .single();

    const currentVersion = doc?.current_version || 1;

    // Sort by version number and keep the most recent ones
    const sortedVersions = versions.sort((a, b) => b.versionNumber - a.versionNumber);
    const versionsToDelete = sortedVersions.slice(keepCount);

    // Delete old versions (except current)
    for (const version of versionsToDelete) {
      if (version.versionNumber !== currentVersion) {
        await this.deleteVersion(version.id);
      }
    }
  }

  /**
   * Compare two versions (basic comparison)
   */
  static async compareVersions(
    documentId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: DocumentVersion;
    version2: DocumentVersion;
    sizeDiff: number;
    timeDiff: number;
  }> {
    const v1 = await this.getVersionByNumber(documentId, version1);
    const v2 = await this.getVersionByNumber(documentId, version2);

    const sizeDiff = v2.fileSize - v1.fileSize;
    const timeDiff =
      new Date(v2.createdAt).getTime() - new Date(v1.createdAt).getTime();

    return {
      version1: v1,
      version2: v2,
      sizeDiff,
      timeDiff,
    };
  }

  /**
   * Get total storage used by all versions of a document
   */
  static async getTotalVersionStorage(documentId: string): Promise<number> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('file_size')
      .eq('document_id', documentId);

    if (error) throw error;

    return data.reduce((total, version) => total + (version.file_size || 0), 0);
  }

  /**
   * Map database record to DocumentVersion type
   */
  private static mapToVersion(data: Record<string, unknown>): DocumentVersion {
    return {
      id: data.id as string,
      documentId: data.document_id as string,
      versionNumber: data.version_number as number,
      fileUrl: data.file_url as string,
      fileName: data.file_name as string,
      fileSize: data.file_size as number,
      fileType: data.file_type as string | undefined,
      uploadedBy: data.uploaded_by as string,
      changeDescription: data.change_description as string | undefined,
      checksum: data.checksum as string | undefined,
      createdAt: data.created_at as string,
    };
  }
}