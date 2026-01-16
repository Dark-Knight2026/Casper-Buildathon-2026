/**
 * Lease Detail Modal
 * Comprehensive view of lease details with tabs
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Download,
  Edit,
  RefreshCw,
  XCircle,
  Send,
  Calendar,
  DollarSign,
  User,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  MessageSquare,
  FileSignature,
  Upload,
  FolderOpen
} from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { leaseStorageService, LeaseDocument } from '@/services/leaseStorageService';

// Import storage components
import DocumentUploader from '@/components/lease/storage/DocumentUploader';
import DocumentList from '@/components/lease/storage/DocumentList';
import VersionHistory from '@/components/lease/storage/VersionHistory';
import AuditLog from '@/components/lease/storage/AuditLog';
import ShareDialog from '@/components/lease/storage/ShareDialog';

interface LeaseDetailModalProps {
  lease: LeaseAgreement | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onTerminate: () => void;
  onDownload: () => void;
  onSendForSignature: () => void;
}

export default function LeaseDetailModal({
  lease,
  open,
  onClose,
  onEdit,
  onRenew,
  onTerminate,
  onDownload,
  onSendForSignature
}: LeaseDetailModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('');

  const loadDocuments = useCallback(async () => {
    if (!lease) return;
    
    setIsLoadingDocuments(true);
    try {
      const docs = await leaseStorageService.getLeaseDocuments(lease.id);
      setDocuments(docs);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [lease, toast]);

  useEffect(() => {
    if (open && lease && activeTab === 'documents') {
      loadDocuments();
    }
  }, [open, lease, activeTab, loadDocuments]);

  const handleViewDocument = async (documentId: string) => {
    try {
      const url = await leaseStorageService.getDocumentUrl(documentId);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to view document',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const blob = await leaseStorageService.downloadDocument(documentId);
      const doc = documents.find(d => d.id === documentId);
      if (doc) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Success',
          description: 'Document downloaded successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      });
    }
  };

  const handleShareDocument = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      setSelectedDocumentId(documentId);
      setSelectedDocumentTitle(doc.title);
      setShowShareDialog(true);
    }
  };

  const handleArchiveDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to archive this document?')) return;

    try {
      await leaseStorageService.archiveDocument(documentId, 'User requested archive');
      toast({
        title: 'Success',
        description: 'Document archived successfully'
      });
      await loadDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to archive document',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;

    try {
      await leaseStorageService.deleteDocument(documentId);
      toast({
        title: 'Success',
        description: 'Document deleted successfully'
      });
      await loadDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      });
    }
  };

  const handleViewVersions = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setShowVersionHistory(true);
  };

  const handleUploadComplete = async () => {
    setShowUploader(false);
    await loadDocuments();
  };

  if (!lease) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending-signatures':
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split(/[-_]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getDaysUntilExpiration = () => {
    const today = new Date();
    const end = new Date(lease.endDate);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysUntil = getDaysUntilExpiration();

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Lease Agreement Details
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {lease.propertyId} • {lease.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </DialogDescription>
              </div>
              <Badge className={getStatusColor(lease.status)}>
                {formatStatus(lease.status)}
              </Badge>
            </div>
          </DialogHeader>

          <Separator />

          {/* Action Buttons */}
          <div className="px-6 py-3 bg-gray-50 flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onRenew}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Renew
            </Button>
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {lease.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={onSendForSignature}>
                <Send className="h-4 w-4 mr-2" />
                Send for Signature
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onTerminate}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Terminate
            </Button>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="clauses">Clauses</TabsTrigger>
                <TabsTrigger value="signatures">Signatures</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[500px] px-6 py-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                {/* Property Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Property ID</p>
                        <p className="font-medium">{lease.propertyId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Lease Type</p>
                        <p className="font-medium capitalize">
                          {lease.type.split('-').join(' ')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parties */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Parties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Landlord</p>
                      <p className="font-medium">{lease.landlordId}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Tenants ({lease.tenantIds.length})</p>
                      <div className="space-y-2">
                        {lease.tenantIds.map((tenantId, index) => (
                          <div key={tenantId} className="flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            <span>{tenantId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lease.agentId && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Agent</p>
                          <p className="font-medium">{lease.agentId}</p>
                          {lease.agentCommission && (
                            <p className="text-sm text-gray-600 mt-1">
                              Commission: ${lease.agentCommission.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Lease Term */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Lease Term
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Start Date</p>
                        <p className="font-medium">
                          {format(new Date(lease.startDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">End Date</p>
                        <p className="font-medium">
                          {format(new Date(lease.endDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {lease.status === 'active' && daysUntil > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {daysUntil} days remaining
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Financial Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
                        <p className="text-2xl font-bold text-green-700">
                          ${lease.monthlyRent.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600 mb-1">Security Deposit</p>
                        <p className="text-2xl font-bold text-blue-700">
                          ${lease.securityDeposit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {lease.lateFee && (
                      <div>
                        <p className="text-sm text-gray-600">Late Fee</p>
                        <p className="font-medium">${lease.lateFee.toLocaleString()}</p>
                      </div>
                    )}

                    {lease.petDeposit && (
                      <div>
                        <p className="text-sm text-gray-600">Pet Deposit</p>
                        <p className="font-medium">${lease.petDeposit.toLocaleString()}</p>
                      </div>
                    )}

                    {lease.utilities && lease.utilities.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Utilities</p>
                          <div className="space-y-2">
                            {lease.utilities.map((utility, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="capitalize">{utility.utilityType}</span>
                                <Badge variant="outline" className="capitalize">
                                  {utility.responsibleParty}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Rent</span>
                        <span className="font-medium">${lease.monthlyRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Security Deposit</span>
                        <span className="font-medium">${lease.securityDeposit.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Move-in Cost</span>
                        <span>${(lease.monthlyRent + lease.securityDeposit).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Clauses Tab */}
              <TabsContent value="clauses" className="space-y-4 mt-0">
                {lease.clauses && lease.clauses.length > 0 ? (
                  lease.clauses.map((clause, index) => (
                    <Card key={clause.id}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          {clause.title}
                        </CardTitle>
                        <CardDescription className="capitalize">
                          {clause.category.split('-').join(' ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {clause.content}
                        </p>
                        {clause.isMandatory && (
                          <Badge className="mt-2 bg-red-100 text-red-800">
                            Mandatory
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No clauses defined</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Signatures Tab */}
              <TabsContent value="signatures" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSignature className="h-5 w-5" />
                      Signature Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lease.signatureProgress && (
                      <>
                        {/* Landlord */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              lease.signatureProgress.landlord.signed ? 'bg-green-100' : 'bg-gray-200'
                            }`}>
                              {lease.signatureProgress.landlord.signed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">Landlord</p>
                              {lease.signatureProgress.landlord.timestamp && (
                                <p className="text-xs text-gray-600">
                                  Signed {format(new Date(lease.signatureProgress.landlord.timestamp), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={lease.signatureProgress.landlord.signed ? 'default' : 'outline'}>
                            {lease.signatureProgress.landlord.signed ? 'Signed' : 'Pending'}
                          </Badge>
                        </div>

                        {/* Tenant */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              lease.signatureProgress.tenant.signed ? 'bg-green-100' : 'bg-gray-200'
                            }`}>
                              {lease.signatureProgress.tenant.signed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">Tenant</p>
                              {lease.signatureProgress.tenant.timestamp && (
                                <p className="text-xs text-gray-600">
                                  Signed {format(new Date(lease.signatureProgress.tenant.timestamp), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={lease.signatureProgress.tenant.signed ? 'default' : 'outline'}>
                            {lease.signatureProgress.tenant.signed ? 'Signed' : 'Pending'}
                          </Badge>
                        </div>

                        {/* Agent (if applicable) */}
                        {lease.agentId && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                lease.signatureProgress.agent.signed ? 'bg-green-100' : 'bg-gray-200'
                              }`}>
                                {lease.signatureProgress.agent.signed ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Clock className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">Agent</p>
                                {lease.signatureProgress.agent.timestamp && (
                                  <p className="text-xs text-gray-600">
                                    Signed {format(new Date(lease.signatureProgress.agent.timestamp), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={lease.signatureProgress.agent.signed ? 'default' : 'outline'}>
                              {lease.signatureProgress.agent.signed ? 'Signed' : 'Pending'}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-0">
                {!showUploader && !showAuditLog ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FolderOpen className="h-5 w-5" />
                          Lease Documents
                        </h3>
                        <p className="text-sm text-gray-600">
                          {documents.length} document{documents.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAuditLog(true)}
                        >
                          View Audit Log
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowUploader(true)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
                      </div>
                    </div>

                    <DocumentList
                      documents={documents}
                      onView={handleViewDocument}
                      onDownload={handleDownloadDocument}
                      onShare={handleShareDocument}
                      onArchive={handleArchiveDocument}
                      onDelete={handleDeleteDocument}
                      onViewVersions={handleViewVersions}
                      isLoading={isLoadingDocuments}
                    />
                  </>
                ) : showUploader ? (
                  <DocumentUploader
                    leaseId={lease.id}
                    onUploadComplete={handleUploadComplete}
                    onClose={() => setShowUploader(false)}
                  />
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAuditLog(false)}
                      className="mb-4"
                    >
                      ← Back to Documents
                    </Button>
                    <AuditLog documentId={selectedDocumentId || documents[0]?.id || ''} />
                  </>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Version History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lease.versionHistory && lease.versionHistory.length > 0 ? (
                      <div className="space-y-3">
                        {lease.versionHistory.map((version) => (
                          <div key={version.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-blue-700">
                                v{version.versionNumber}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium">{version.createdByName}</p>
                                <p className="text-xs text-gray-600">
                                  {format(new Date(version.createdAt), 'MMM d, yyyy HH:mm')}
                                </p>
                              </div>
                              {version.changes && version.changes.length > 0 && (
                                <ul className="text-sm text-gray-600 list-disc list-inside">
                                  {version.changes.map((change, idx) => (
                                    <li key={idx}>{change}</li>
                                  ))}
                                </ul>
                              )}
                              {version.isCurrent && (
                                <Badge className="mt-2" variant="outline">
                                  Current Version
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No version history available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Comments */}
                {lease.comments && lease.comments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comments ({lease.comments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {lease.comments.map((comment) => (
                          <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{comment.userName}</p>
                              <p className="text-xs text-gray-600">
                                {format(new Date(comment.createdAt), 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                            {comment.isResolved && (
                              <Badge className="mt-2 bg-green-100 text-green-800">
                                Resolved
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      <VersionHistory
        documentId={selectedDocumentId}
        open={showVersionHistory}
        onClose={() => {
          setShowVersionHistory(false);
          setSelectedDocumentId('');
        }}
        onRollback={async () => {
          await loadDocuments();
        }}
      />

      {/* Share Dialog */}
      <ShareDialog
        documentId={selectedDocumentId}
        documentTitle={selectedDocumentTitle}
        open={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setSelectedDocumentId('');
          setSelectedDocumentTitle('');
        }}
        onShareCreated={() => {
          // Optionally refresh or show success
        }}
      />
    </>
  );
}