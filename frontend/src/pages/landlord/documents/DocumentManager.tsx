import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { FolderService } from '@/services/folderService';
import { documentStorageService } from '@/services/documentStorageService';
import type { DocumentFolder, Document, FolderTreeNode } from '@/types/document';
import {
  Folder,
  FolderOpen,
  File,
  Upload,
  Search,
  Star,
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  Download,
  Share2,
  Grid3x3,
  List,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export default function DocumentManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<DocumentFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load folder tree
      const tree = await FolderService.getFolderTree(user.id);
      setFolders(tree);

      // Load documents in current folder
      const { documents: docs } = await documentStorageService.searchDocuments(user.id, {
        folderId: currentFolderId,
      });
      setDocuments(docs);

      // Load breadcrumbs
      if (currentFolderId) {
        const path = await FolderService.getFolderPath(currentFolderId);
        setBreadcrumbs(path);
      } else {
        setBreadcrumbs([]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    try {
      await FolderService.createFolder({
        name: newFolderName,
        parentId: currentFolderId,
        landlordId: user.id,
      });

      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });

      setShowNewFolderDialog(false);
      setNewFolderName('');
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      await FolderService.deleteFolder(folderId, false);
      toast({
        title: 'Success',
        description: 'Folder deleted successfully',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    try {
      const file = files[0];
      await documentStorageService.uploadDocument(file, user.id, undefined, {
        folderId: currentFolderId,
      });

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStar = async (documentId: string, isStarred: boolean) => {
    try {
      await documentStorageService.toggleStar(documentId, !isStarred);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update star status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentStorageService.deleteDocumentById(documentId);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleSelectDocument = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;
    if (!confirm(`Delete ${selectedDocuments.size} documents?`)) return;

    try {
      await documentStorageService.bulkDelete(Array.from(selectedDocuments));
      toast({
        title: 'Success',
        description: `${selectedDocuments.size} documents deleted`,
      });
      setSelectedDocuments(new Set());
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete documents',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      const blob = await documentStorageService.bulkDownload(Array.from(selectedDocuments));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documents.zip';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Documents downloaded',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download documents',
        variant: 'destructive',
      });
    }
  };

  const toggleFolderExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolderTree = (nodes: FolderTreeNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-100 cursor-pointer rounded ${
            currentFolderId === node.id ? 'bg-gray-100' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {node.children.length > 0 && (
            <button onClick={() => toggleFolderExpanded(node.id)} className="p-0">
              {expandedFolders.has(node.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          <div
            className="flex items-center gap-2 flex-1"
            onClick={() => setCurrentFolderId(node.id)}
          >
            {expandedFolders.has(node.id) || currentFolderId === node.id ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-sm">{node.name}</span>
            <Badge variant="secondary" className="text-xs">
              {node.documentCount}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDeleteFolder(node.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {expandedFolders.has(node.id) && node.children.length > 0 && (
          <div>{renderFolderTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-gray-500">Please log in to manage documents</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex gap-6">
        {/* Sidebar - Folder Tree */}
        <Card className="w-64 h-[calc(100vh-8rem)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Folders</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewFolderDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto h-[calc(100%-5rem)]">
            <div
              className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-100 cursor-pointer rounded mb-2 ${
                !currentFolderId ? 'bg-gray-100' : ''
              }`}
              onClick={() => setCurrentFolderId(undefined)}
            >
              <Folder className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">All Documents</span>
            </div>
            {renderFolderTree(folders)}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Documents</h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <button
                    onClick={() => setCurrentFolderId(undefined)}
                    className="hover:text-gray-900"
                  >
                    All Documents
                  </button>
                  {breadcrumbs.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      <button
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="hover:text-gray-900"
                      >
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <label>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <Button
                  variant="outline"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <Grid3x3 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Search and Bulk Actions */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search documents..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {selectedDocuments.size > 0 && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {selectedDocuments.size} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <File className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No documents found</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4">
              {filteredDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedDocuments.has(doc.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectDocument(doc.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <File className="h-8 w-8 text-blue-500 mb-2" />
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(doc.id, doc.isStarred);
                          }}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              doc.isStarred ? 'fill-yellow-400 text-yellow-400' : ''
                            }`}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.size === filteredDocuments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocuments(new Set(filteredDocuments.map((d) => d.id)));
                            } else {
                              setSelectedDocuments(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Size</th>
                      <th className="text-left p-4">Modified</th>
                      <th className="text-left p-4 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.has(doc.id)}
                            onChange={() => handleSelectDocument(doc.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{doc.name}</span>
                            {doc.isStarred && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}