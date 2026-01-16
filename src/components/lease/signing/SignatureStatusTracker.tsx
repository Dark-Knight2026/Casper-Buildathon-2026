/**
 * Signature Status Tracker
 * Real-time tracking of signature progress and status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Eye,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { eSignatureService, SignatureInvitation, SignatureRequest } from '@/services/eSignatureService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SignatureStatusTrackerProps {
  requestId: string;
  onComplete?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function SignatureStatusTracker({
  requestId,
  onComplete,
  autoRefresh = true,
  refreshInterval = 30000
}: SignatureStatusTrackerProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    request: SignatureRequest;
    invitations: SignatureInvitation[];
    progress: {
      total: number;
      signed: number;
      pending: number;
      declined: number;
      percentage: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState<SignatureInvitation | null>(null);

  const loadStatus = async () => {
    try {
      const trackingData = await eSignatureService.trackSignatureStatus(requestId);
      setStatus(trackingData);

      // Check if completed
      if (trackingData.progress.percentage === 100 && onComplete) {
        onComplete();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load signature status',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    if (autoRefresh) {
      const interval = setInterval(loadStatus, refreshInterval);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, autoRefresh, refreshInterval]);

  const handleSendReminder = async (invitationId: string) => {
    try {
      await eSignatureService.sendReminder(invitationId);
      toast({
        title: 'Reminder Sent',
        description: 'A reminder email has been sent to the signer'
      });
      await loadStatus();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'opened':
        return <Eye className="h-5 w-5 text-blue-600" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-50 border-green-200';
      case 'declined':
        return 'bg-red-50 border-red-200';
      case 'opened':
        return 'bg-blue-50 border-blue-200';
      case 'expired':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Loading signature status...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load signature status</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Signature Progress</CardTitle>
          <CardDescription>
            Track the status of all signature requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-gray-600">
                {status.progress.signed} of {status.progress.total} signed
              </span>
            </div>
            <Progress value={status.progress.percentage} className="h-3" />
            <p className="text-sm text-gray-600">
              {status.progress.percentage.toFixed(0)}% Complete
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {status.progress.signed}
                  </div>
                  <div className="text-sm text-gray-600">Signed</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {status.progress.pending}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">
                    {status.progress.declined}
                  </div>
                  <div className="text-sm text-gray-600">Declined</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Workflow Type:</span>
              <Badge variant="outline" className="capitalize">
                {status.request.workflowType}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">
                {format(new Date(status.request.createdAt), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">
                {format(new Date(status.request.expiresAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signers List */}
      <Card>
        <CardHeader>
          <CardTitle>Signers</CardTitle>
          <CardDescription>
            Individual status for each signer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {status.invitations.map((invitation) => (
                <Card
                  key={invitation.id}
                  className={`border-2 ${getStatusColor(invitation.status)}`}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Signer Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(invitation.status)}
                          <div>
                            <p className="font-semibold">{invitation.signerName}</p>
                            <p className="text-sm text-gray-600">{invitation.signerEmail}</p>
                            <Badge variant="outline" className="mt-1 capitalize">
                              {invitation.signerRole}
                            </Badge>
                          </div>
                        </div>
                        <Badge
                          variant={
                            invitation.status === 'signed'
                              ? 'default'
                              : invitation.status === 'declined'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="capitalize"
                        >
                          {invitation.status}
                        </Badge>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>Sent: {format(new Date(invitation.sentAt), 'MMM dd, HH:mm')}</span>
                        </div>
                        {invitation.openedAt && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Eye className="h-4 w-4" />
                            <span>Opened: {format(new Date(invitation.openedAt), 'MMM dd, HH:mm')}</span>
                          </div>
                        )}
                        {invitation.signedAt && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Signed: {format(new Date(invitation.signedAt), 'MMM dd, HH:mm')}</span>
                          </div>
                        )}
                      </div>

                      {/* Reminders */}
                      {invitation.remindersSent > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{invitation.remindersSent}</span> reminder(s) sent
                          {invitation.lastReminderAt && (
                            <span className="ml-1">
                              (last: {format(new Date(invitation.lastReminderAt), 'MMM dd')})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {(invitation.status === 'sent' || invitation.status === 'opened') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReminder(invitation.id)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvitation(invitation)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Completion Alert */}
      {status.progress.percentage === 100 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>All signatures collected!</strong> The document is now fully executed.
            You can view and download the certificate of completion.
          </AlertDescription>
        </Alert>
      )}

      {/* Invitation Details Modal */}
      {selectedInvitation && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Signature Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInvitation(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Signer Name</p>
                <p className="font-medium">{selectedInvitation.signerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{selectedInvitation.signerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <Badge className="capitalize">{selectedInvitation.signerRole}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge
                  variant={selectedInvitation.status === 'signed' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {selectedInvitation.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Timeline</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Invitation sent: {format(new Date(selectedInvitation.sentAt), 'PPpp')}</span>
                </div>
                {selectedInvitation.openedAt && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    <span>Document opened: {format(new Date(selectedInvitation.openedAt), 'PPpp')}</span>
                  </div>
                )}
                {selectedInvitation.signedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Signed: {format(new Date(selectedInvitation.signedAt), 'PPpp')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Signing Link</p>
              <code className="text-xs break-all bg-white p-2 rounded border block">
                {selectedInvitation.signingUrl}
              </code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}