// Document Management Types

export interface DocumentFolder {
  id: string;
  name: string;
  parentId?: string;
  landlordId: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  children?: DocumentFolder[];
  documentCount?: number;
  totalSize?: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType?: string;
  uploadedBy: string;
  uploaderName?: string;
  changeDescription?: string;
  checksum?: string;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  content: string;
  variables: string[];
  landlordId?: string;
  isPublic: boolean;
  isSystem: boolean;
  thumbnailUrl?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWithUserId?: string;
  sharedWithUserName?: string;
  sharedByUserId: string;
  sharedByUserName?: string;
  permissionLevel: 'view' | 'download' | 'comment' | 'edit';
  shareLink?: string;
  passwordHash?: string;
  expiresAt?: string;
  viewCount: number;
  downloadCount: number;
  lastViewedAt?: string;
  lastDownloadedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  userId?: string;
  userName?: string;
  action: 'upload' | 'view' | 'download' | 'edit' | 'delete' | 'share' | 'move' | 'rename' | 'restore';
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  category: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploaderName?: string;
  folderId?: string;
  folderName?: string;
  currentVersion: number;
  tags: string[];
  isStarred: boolean;
  viewCount: number;
  downloadCount: number;
  lastViewedAt?: string;
  lastDownloadedAt?: string;
  description?: string;
  checksum?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFilters {
  search?: string;
  category?: string[];
  fileType?: string[];
  folderId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  sizeMin?: number;
  sizeMax?: number;
  uploadedBy?: string;
  isStarred?: boolean;
}

export interface DocumentAnalytics {
  totalDocuments: number;
  totalStorageUsed: number;
  documentsThisMonth: number;
  storageThisMonth: number;
  mostViewedDocuments: Array<{
    id: string;
    name: string;
    viewCount: number;
  }>;
  storageByCategory: Array<{
    category: string;
    size: number;
    count: number;
  }>;
  documentTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
  uploadsOverTime: Array<{
    date: string;
    count: number;
  }>;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    activityCount: number;
  }>;
  recentActivity: DocumentActivity[];
}

export interface BulkUploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

export interface ShareOptions {
  permissionLevel: 'view' | 'download' | 'comment' | 'edit';
  expiresAt?: string;
  password?: string;
  notifyByEmail?: boolean;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone';
  required: boolean;
  defaultValue?: string;
}

export interface GenerateDocumentRequest {
  templateId: string;
  variables: Record<string, string>;
  fileName: string;
  folderId?: string;
}

export interface FolderTreeNode {
  id: string;
  name: string;
  parentId?: string;
  children: FolderTreeNode[];
  documentCount: number;
  totalSize: number;
  isExpanded?: boolean;
}

export interface DocumentSearchResult {
  documents: Document[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: Array<{ value: string; count: number }>;
    fileTypes: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
  };
}