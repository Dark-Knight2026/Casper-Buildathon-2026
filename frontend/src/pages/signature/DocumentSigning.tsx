import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import SignatureModal from '@/components/signature/SignatureModal';
import WorkflowStatus from '@/components/signature/WorkflowStatus';
import SignerList from '@/components/signature/SignerList';
import AuditTrail from '@/components/signature/AuditTrail';
import { signatureService } from '@/services/signatureService';
import { signatureWorkflowService } from '@/services/signatureWorkflowService';
import { signatureAuditService } from '@/services/signatureAuditService';
import { supabase } from '@/lib/supabase/client';

export default function DocumentSigning() {
  const { signatureId } = useParams<{ signatureId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [canSign, setCanSign] = useState(false);

  // Fetch signature details
  const { data: signature, isLoading: signatureLoading } = useQuery({
    queryKey: ['signature', signatureId],
    queryFn: () => signatureService.getSignature(signatureId!),
    enabled: !!signatureId,
  });

  // Fetch workflow
  const { data: workflow, refetch: refetchWorkflow } = useQuery({
    queryKey: ['workflow', signature?.document_id],
    queryFn: () => signatureWorkflowService.getWorkflowByDocument(signature!.document_id),
    enabled: !!signature?.document_id,
  });

  // Fetch audit trail
  const { data: auditTrail = [] } = useQuery({
    queryKey: ['audit-trail', workflow?.id],
    queryFn: () => signatureAuditService.getAuditTrail(workflow!.id),
    enabled: !!workflow?.id,
  });

  // Check if user can sign
  useEffect(() => {
    const checkCanSign = async () => {
      if (!workflow || !signature) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const canUserSign = await signatureWorkflowService.canUserSign(workflow.id, user.id);
      setCanSign(canUserSign);

      // Log viewed event
      if (canUserSign) {
        await signatureAuditService.logEvent({
          workflow_id: workflow.id,
          document_id: signature.document_id,
          signature_id: signature.id,
          event_type: 'viewed',
        });
      }
    };

    checkCanSign();
  }, [workflow, signature]);

  // Sign document mutation
  const signMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      if (!signature || !workflow) throw new Error('Missing signature or workflow');

      // Sign the document
      await signatureService.signDocument(signature.id, signatureData);

      // Log signed event
      await signatureAuditService.logEvent({
        workflow_id: workflow.id,
        document_id: signature.document_id,
        signature_id: signature.id,
        event_type: 'signed',
      });

      // Update workflow progress
      await signatureWorkflowService.updateWorkflowProgress(workflow.id);

      // Check if workflow is complete
      const updatedWorkflow = await signatureWorkflowService.getWorkflow(workflow.id);
      if (updatedWorkflow.status === 'completed') {
        await signatureAuditService.logEvent({
          workflow_id: workflow.id,
          document_id: signature.document_id,
          event_type: 'completed',
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Document Signed',
        description: 'Your signature has been successfully applied.',
      });
      refetchWorkflow();
      navigate('/landlord/leases'); // Redirect to leases page
    },
    onError: (error) => {
      toast({
        title: 'Signature Failed',
        description: error instanceof Error ? error.message : 'Failed to sign document',
        variant: 'destructive',
      });
    },
  });

  // Decline signature mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      if (!signature || !workflow) throw new Error('Missing signature or workflow');

      await signatureService.declineSignature(signature.id);

      // Log declined event
      await signatureAuditService.logEvent({
        workflow_id: workflow.id,
        document_id: signature.document_id,
        signature_id: signature.id,
        event_type: 'declined',
      });

      // Update workflow status
      await signatureWorkflowService.updateWorkflowStatus(workflow.id, 'declined');
    },
    onSuccess: () => {
      toast({
        title: 'Signature Declined',
        description: 'You have declined to sign this document.',
      });
      navigate('/landlord/leases');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to decline signature',
        variant: 'destructive',
      });
    },
  });

  const handleSign = () => {
    if (!agreedToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the terms before signing.',
        variant: 'destructive',
      });
      return;
    }
    setShowSignatureModal(true);
  };

  const handleSaveSignature = (signatureData: string) => {
    signMutation.mutate(signatureData);
  };

  const handleDecline = () => {
    if (confirm('Are you sure you want to decline signing this document?')) {
      declineMutation.mutate();
    }
  };

  const handleExportAudit = async () => {
    if (!workflow) return;
    try {
      const auditJson = await signatureAuditService.exportAuditTrail(workflow.id);
      const blob = new Blob([auditJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${workflow.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit trail',
        variant: 'destructive',
      });
    }
  };

  if (signatureLoading) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!signature) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="text-center">Signature not found</div>
      </div>
    );
  }

  const isAlreadySigned = signature.status === 'signed';
  const isDeclined = signature.status === 'declined';

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Sign Document</h1>
          <p className="text-gray-600 mt-2">
            Review and sign the document below
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Preview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {signature.document_type} Document
                    </h3>
                    <p className="text-sm text-gray-600">
                      Document ID: {signature.document_id.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Document content placeholder */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 min-h-96">
                  <p className="text-center text-gray-500">
                    Document preview would appear here
                  </p>
                  <p className="text-center text-sm text-gray-400 mt-2">
                    In production, this would show the actual PDF document
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Signing Actions */}
            {!isAlreadySigned && !isDeclined && canSign && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      I have read and agree to the terms of this document. I understand that
                      my electronic signature is legally binding and has the same effect as
                      a handwritten signature.
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSign}
                      disabled={!agreedToTerms || signMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Sign Document
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDecline}
                      disabled={declineMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAlreadySigned && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">
                        You have signed this document
                      </p>
                      <p className="text-sm text-green-700">
                        Your signature has been successfully applied
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isDeclined && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-6 w-6 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-900">
                        You have declined this document
                      </p>
                      <p className="text-sm text-red-700">
                        You chose not to sign this document
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!canSign && !isAlreadySigned && !isDeclined && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-900">
                        Waiting for other signers
                      </p>
                      <p className="text-sm text-yellow-700">
                        This document requires signatures in order. You'll be notified when
                        it's your turn to sign.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {workflow && (
              <>
                <WorkflowStatus workflow={workflow} />
                {workflow.signatures && (
                  <SignerList
                    signatures={workflow.signatures}
                    workflowType={workflow.workflow_type}
                  />
                )}
                <AuditTrail events={auditTrail} onExport={handleExportAudit} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {signature && (
        <SignatureModal
          open={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSaveSignature}
          signerName={signature.signer_name}
          documentTitle={`${signature.document_type} Document`}
        />
      )}
    </div>
  );
}