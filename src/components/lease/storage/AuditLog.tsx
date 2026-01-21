/**
 * Audit Log Component
 * Display document access and modification history
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Download,
  Eye,
  Edit,
  Trash2,
  Share2,
  Archive,
  RotateCcw,
  FileSignature,
  CheckCircle,
  XCircle,
  Upload,
  Search,
  Filter,
  User,
  Clock,
  Monitor,
  MapPin
} from 'lucide-react';
import { AuditLogEntry, AuditAction, leaseStorageService } from '@/services/leaseStorageService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AuditLogProps {
  documentId: string;
}

export default function AuditLog({ documentId }: AuditLogProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');
  const pageSize = 50;

  const loadAuditLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await leaseStorageService.getAuditTrail(
        documentId,
        pageSize,
        (page - 1) * pageSize
      );
      setEntries(result.entries);
      setTotal(result.total);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load audit log',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [documentId, page, pageSize, toast]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'download':
        return <Download className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'share':
        return <Share2 className="h-4 w-4" />;
      case 'unshare':
        return <XCircle className="h-4 w-4" />;
      case 'sign':
        return <FileSignature className="h-4 w-4" />;
      case 'approve':
        return <CheckCircle className="h-4 w-4" />;
      case 'reject':
        return <XCircle className="h-4 w-4" />;
      case 'archive':
        return <Archive className="h-4 w-4" />;
      case 'restore':
        return <RotateCcw className="h-4 w-4" />;
      case 'version_create':
      case 'version_rollback':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'upload':
      case 'approve':
      case 'sign':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'download':
      case 'view':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'edit':
      case 'version_create':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete':
      case 'reject':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'share':
      case 'unshare':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'archive':
      case 'restore':
      case 'version_rollback':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatAction = (action: AuditAction): string => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' ||
      entry.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.action_details?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || entry.action === filterAction;

    return matchesSearch && matchesAction;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit log...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>
                Complete history of all document activities
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {total} total events
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterAction} onValueChange={(value) => setFilterAction(value as AuditAction | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="share">Share</SelectItem>
                <SelectItem value="sign">Sign</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No audit entries found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        getActionColor(entry.action)
                      )}>
                        {getActionIcon(entry.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getActionColor(entry.action)}>
                                {formatAction(entry.action)}
                              </Badge>
                              {entry.version_number && (
                                <Badge variant="outline" className="text-xs">
                                  v{entry.version_number}
                                </Badge>
                              )}
                            </div>
                            {entry.action_details && (
                              <p className="text-sm text-gray-700">
                                {entry.action_details}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(entry.created_at), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(entry.created_at), 'HH:mm:ss')}
                            </div>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                          {entry.user_email && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{entry.user_email}</span>
                            </div>
                          )}
                          {entry.user_role && (
                            <Badge variant="outline" className="text-xs">
                              {entry.user_role}
                            </Badge>
                          )}
                          {entry.ip_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{entry.ip_address}</span>
                            </div>
                          )}
                          {entry.user_agent && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">
                                {entry.user_agent.split(' ')[0]}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Device Info */}
                        {entry.device_info && Object.keys(entry.device_info).length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            <details className="cursor-pointer">
                              <summary className="hover:text-gray-700">
                                Device Details
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                {JSON.stringify(entry.device_info, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Export audit log for compliance and reporting
            </p>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}