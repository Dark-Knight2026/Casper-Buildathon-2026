/**
 * Signature Workflow Manager
 * Orchestrates the entire signature workflow from creation to completion
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Send,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Eye
} from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { eSignatureService, SignatureRequest } from '@/services/eSignatureService';
import { useToast } from '@/hooks/use-toast';
import SignatureStatusTracker from './SignatureStatusTracker';
import SignatureInvitation from './SignatureInvitation';
import SignatureCertificate from './SignatureCertificate';

interface SignatureWorkflowManagerProps {
  lease: LeaseAgreement;
  documentUrl: string;
  onComplete?: (certificateId: string) => void;
}

export default function SignatureWorkflowManager({
  lease,
  documentUrl,
  onComplete
}: SignatureWorkflowManagerProps) {
  const { toast } = useToast();
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  useEffect(() => {
    // Check if signature request already exists for this lease
    checkExistingRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease.id]);

  const checkExistingRequest = async () => {
    // In production, fetch from Supabase
    const requests = JSON.parse(localStorage.getItem('signatureRequests') || '{}');
    const existingRequest = Object.values(requests).find(
      (req: SignatureRequest) => req.leaseId === lease.id
    );

    if (existingRequest) {
      setSignatureRequest(existingRequest as SignatureRequest);
      setActiveTab('status');
    }
  };

  const handleCreateRequest = async (workflowType: 'sequential' | 'parallel', expirationDays: number) => {
    setIsCreating(true);
    try {
      const request = await eSignatureService.createSignatureRequest(
        lease,
        documentUrl,
        workflowType,
        expirationDays
      );

      setSignatureRequest(request);
      
      toast({
        title: 'Signature Request Created',
        description: 'Ready to send invitations to signers'
      });

      setActiveTab('invitations');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create signature request',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!signatureRequest) return;

    setIsSending(true);
    try {
      await eSignatureService.sendSignatureInvitations(signatureRequest);

      // Update request status
      const requests = JSON.parse(localStorage.getItem('signatureRequests') || '{}');
      requests[signatureRequest.id].status = 'in-progress';
      localStorage.setItem('signatureRequests', JSON.stringify(requests));

      toast({
        title: 'Invitations Sent',
        description: `${signatureRequest.signers.length} signature invitations have been sent`
      });

      setActiveTab('status');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send invitations',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleViewCertificate = () => {
    setActiveTab('certificate');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Electronic Signature Workflow
              </CardTitle>
              <CardDescription>
                Manage signature requests and track completion status
              </CardDescription>
            </div>
            {signatureRequest && (
              <Badge
                variant={
                  signatureRequest.status === 'completed'
                    ? 'default'
                    : signatureRequest.status === 'in-progress'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {signatureRequest.status}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" disabled={!!signatureRequest}>
            <Users className="h-4 w-4 mr-2" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="invitations" disabled={!signatureRequest}>
            <Mail className="h-4 w-4 mr-2" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="status" disabled={!signatureRequest}>
            <Clock className="h-4 w-4 mr-2" />
            Status
          </TabsTrigger>
          <TabsTrigger value="certificate" disabled={signatureRequest?.status !== 'completed'}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Certificate
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure Signature Workflow</CardTitle>
              <CardDescription>
                Set up how signers will receive and complete the document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Preview */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">Lease Agreement</p>
                      <p className="text-sm text-gray-600">{lease.propertyId}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>

              {/* Signers List */}
              <div>
                <h3 className="font-semibold mb-3">Signers ({lease.tenantIds.length + 1 + (lease.agentId ? 1 : 0)})</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        L
                      </div>
                      <div>
                        <p className="font-medium">Landlord</p>
                        <p className="text-sm text-gray-600">{lease.landlordId}</p>
                      </div>
                    </div>
                    <Badge>Required</Badge>
                  </div>

                  {lease.tenantIds.map((tenantId, index) => (
                    <div key={tenantId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                          T{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Tenant {index + 1}</p>
                          <p className="text-sm text-gray-600">{tenantId}</p>
                        </div>
                      </div>
                      <Badge>Required</Badge>
                    </div>
                  ))}

                  {lease.agentId && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          A
                        </div>
                        <div>
                          <p className="font-medium">Agent</p>
                          <p className="text-sm text-gray-600">{lease.agentId}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Optional</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow Options */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleCreateRequest('sequential', 30)}
                  disabled={isCreating}
                  className="h-auto py-6 flex-col"
                >
                  <Users className="h-8 w-8 mb-2" />
                  <span className="font-semibold">Sequential Signing</span>
                  <span className="text-xs opacity-80">One signer at a time</span>
                </Button>

                <Button
                  onClick={() => handleCreateRequest('parallel', 30)}
                  disabled={isCreating}
                  variant="outline"
                  className="h-auto py-6 flex-col"
                >
                  <Users className="h-8 w-8 mb-2" />
                  <span className="font-semibold">Parallel Signing</span>
                  <span className="text-xs opacity-80">All signers simultaneously</span>
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Signature requests expire after 30 days. Automatic reminders will be sent to pending signers.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          {signatureRequest && (
            <SignatureInvitation
              signatureRequest={signatureRequest}
              onSend={handleSendInvitations}
              isSending={isSending}
            />
          )}
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status">
          {signatureRequest && (
            <SignatureStatusTracker
              requestId={signatureRequest.id}
              onComplete={handleViewCertificate}
            />
          )}
        </TabsContent>

        {/* Certificate Tab */}
        <TabsContent value="certificate">
          {signatureRequest && signatureRequest.status === 'completed' && (
            <SignatureCertificate
              requestId={signatureRequest.id}
              onDownload={() => {
                toast({
                  title: 'Certificate Downloaded',
                  description: 'The certificate has been downloaded'
                });
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}