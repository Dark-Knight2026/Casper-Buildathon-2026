/**
 * Version History Component
 * Display document versions with comparison and rollback
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  History,
  Download,
  RotateCcw,
  CheckCircle,
  Clock,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';
import { DocumentVersion, leaseStorageService } from '@/services/leaseStorageService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface VersionHistoryProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
  onRollback?: (versionNumber: number) => void;
}

export default function VersionHistory({
  documentId,
  open,
  onClose,
  onRollback
}: VersionHistoryProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await leaseStorageService.getDocumentVersions(documentId);
      setVersions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [documentId, toast]);

  useEffect(() => {
    if (open && documentId) {
      loadVersions();
    }
  }, [open, documentId, loadVersions]);

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to rollback to version ${versionNumber}? This will create a new version.`)) {
      return;
    }

    setIsRollingBack(true);
    try {
      await leaseStorageService.rollbackVersion(documentId, versionNumber);
      toast({
        title: 'Success',
        description: `Rolled back to version ${versionNumber}`
      });
      
      if (onRollback) {
        onRollback(versionNumber);
      }
      
      await loadVersions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to rollback version',
        variant: 'destructive'
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const currentVersion = versions.length > 0 ? versions[0] : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            View all versions of this document and rollback if needed
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No version history available</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {versions.map((version, index) => {
                const isCurrentVersion = index === 0;
                const changes = version.changes || [];

                return (
                  <Card 
                    key={version.id}
                    className={isCurrentVersion ? 'border-2 border-blue-500' : ''}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Version Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold text-blue-700">
                                v{version.version_number}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">
                                  Version {version.version_number}
                                </h3>
                                {isCurrentVersion && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{version.created_by}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  <span>{formatFileSize(version.file_size)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {!isCurrentVersion && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRollback(version.version_number)}
                                disabled={isRollingBack}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Rollback
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Change Summary */}
                        {version.change_summary && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Change Summary
                            </p>
                            <p className="text-sm text-gray-600">
                              {version.change_summary}
                            </p>
                          </div>
                        )}

                        {/* Detailed Changes */}
                        {changes.length > 0 && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-3">
                                Changes Made
                              </p>
                              <div className="space-y-2">
                                {changes.map((change, idx) => (
                                  <div key={idx} className="bg-white border rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          {change.field}
                                        </p>
                                        <div className="mt-2 space-y-1">
                                          {change.old_value && (
                                            <div className="flex items-start gap-2">
                                              <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                                                Old:
                                              </span>
                                              <span className="text-sm text-gray-600 line-through">
                                                {change.old_value}
                                              </span>
                                            </div>
                                          )}
                                          <div className="flex items-start gap-2">
                                            <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                                              New:
                                            </span>
                                            <span className="text-sm text-green-700 font-medium">
                                              {change.new_value}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Checksum */}
                        {version.checksum && (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Checksum:</span>{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded">
                              {version.checksum.substring(0, 16)}...
                            </code>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Summary */}
        {!isLoading && versions.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total Versions: {versions.length}</span>
              {currentVersion && (
                <span>
                  Current: v{currentVersion.version_number} ({formatFileSize(currentVersion.file_size)})
                </span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}