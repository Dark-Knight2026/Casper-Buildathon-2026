import { supabase } from '@/lib/supabase/client';
import type { DocumentFolder, FolderTreeNode } from '@/types/document';

export class FolderService {
  /**
   * Create a new folder
   */
  static async createFolder(data: {
    name: string;
    parentId?: string;
    landlordId: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<DocumentFolder> {
    const { data: folder, error } = await supabase
      .from('document_folders')
      .insert({
        name: data.name,
        parent_id: data.parentId,
        landlord_id: data.landlordId,
        description: data.description,
        color: data.color || '#3B82F6',
        icon: data.icon || 'folder',
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToFolder(folder);
  }

  /**
   * Get all folders for a landlord
   */
  static async getFoldersByLandlord(landlordId: string): Promise<DocumentFolder[]> {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('name');

    if (error) throw error;
    return data.map(this.mapToFolder);
  }

  /**
   * Get folder by ID
   */
  static async getFolderById(id: string): Promise<DocumentFolder> {
    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToFolder(data);
  }

  /**
   * Get folder hierarchy as tree
   */
  static async getFolderTree(landlordId: string): Promise<FolderTreeNode[]> {
    const folders = await this.getFoldersByLandlord(landlordId);
    
    // Get document counts for each folder
    const { data: documentCounts } = await supabase
      .from('documents')
      .select('folder_id, file_size')
      .eq('uploaded_by', landlordId);

    const folderStats = new Map<string, { count: number; size: number }>();
    documentCounts?.forEach((doc) => {
      if (doc.folder_id) {
        const stats = folderStats.get(doc.folder_id) || { count: 0, size: 0 };
        stats.count++;
        stats.size += doc.file_size || 0;
        folderStats.set(doc.folder_id, stats);
      }
    });

    const buildTree = (parentId?: string): FolderTreeNode[] => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((folder) => {
          const stats = folderStats.get(folder.id) || { count: 0, size: 0 };
          return {
            id: folder.id,
            name: folder.name,
            parentId: folder.parentId,
            children: buildTree(folder.id),
            documentCount: stats.count,
            totalSize: stats.size,
            isExpanded: false,
          };
        });
    };

    return buildTree();
  }

  /**
   * Update folder
   */
  static async updateFolder(
    id: string,
    data: Partial<{
      name: string;
      parentId?: string;
      description?: string;
      color?: string;
      icon?: string;
    }>
  ): Promise<DocumentFolder> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parent_id = data.parentId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;

    const { data: folder, error } = await supabase
      .from('document_folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToFolder(folder);
  }

  /**
   * Delete folder (and optionally its contents)
   */
  static async deleteFolder(id: string, deleteContents = false): Promise<void> {
    if (deleteContents) {
      // Delete all documents in folder
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('folder_id', id);

      if (docError) throw docError;
    } else {
      // Move documents to root (no folder)
      const { error: moveError } = await supabase
        .from('documents')
        .update({ folder_id: null })
        .eq('folder_id', id);

      if (moveError) throw moveError;
    }

    // Delete the folder
    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Move folder to new parent
   */
  static async moveFolder(folderId: string, newParentId?: string): Promise<void> {
    // Check for circular reference
    if (newParentId) {
      const isCircular = await this.wouldCreateCircularReference(folderId, newParentId);
      if (isCircular) {
        throw new Error('Cannot move folder: would create circular reference');
      }
    }

    const { error } = await supabase
      .from('document_folders')
      .update({ parent_id: newParentId })
      .eq('id', folderId);

    if (error) throw error;
  }

  /**
   * Calculate total size of folder including subfolders
   */
  static async calculateFolderSize(folderId: string): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_folder_size', {
      folder_uuid: folderId,
    });

    if (error) throw error;
    return data || 0;
  }

  /**
   * Get breadcrumb path for folder
   */
  static async getFolderPath(folderId: string): Promise<DocumentFolder[]> {
    const path: DocumentFolder[] = [];
    let currentId: string | undefined = folderId;

    while (currentId) {
      const folder = await this.getFolderById(currentId);
      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  }

  /**
   * Check if moving folder would create circular reference
   */
  private static async wouldCreateCircularReference(
    folderId: string,
    newParentId: string
  ): Promise<boolean> {
    let currentId: string | undefined = newParentId;

    while (currentId) {
      if (currentId === folderId) {
        return true;
      }

      const { data } = await supabase
        .from('document_folders')
        .select('parent_id')
        .eq('id', currentId)
        .single();

      currentId = data?.parent_id;
    }

    return false;
  }

  /**
   * Map database record to DocumentFolder type
   */
  private static mapToFolder(data: Record<string, unknown>): DocumentFolder {
    return {
      id: data.id as string,
      name: data.name as string,
      parentId: data.parent_id as string | undefined,
      landlordId: data.landlord_id as string,
      description: data.description as string | undefined,
      color: data.color as string | undefined,
      icon: data.icon as string | undefined,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}