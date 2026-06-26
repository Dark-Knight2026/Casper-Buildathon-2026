/**
 * Signature Invitation Component
 * Manage and send signature invitations
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Send,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { SignatureRequest } from '@/services/eSignatureService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SignatureInvitationProps {
  signatureRequest: SignatureRequest;
  onSend: () => Promise<void>;
  isSending: boolean;
}

export default function SignatureInvitation({
  signatureRequest,
  onSend,
  isSending
}: SignatureInvitationProps) {
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const defaultMessage = `You have been invited to sign a lease agreement. Please review the document and provide your electronic signature.

This invitation will expire on ${format(new Date(signatureRequest.expiresAt), 'MMMM dd, yyyy')}.

If you have any questions, please contact us.`;

  const handleCopyLink = (signingUrl: string) => {
    navigator.clipboard.writeText(signingUrl);
    toast({
      title: 'Link Copied',
      description: 'Signing link has been copied to clipboard'
    });
  };

  const getEmailPreview = (signerName: string) => {
    return `
Hello ${signerName},

${customMessage || defaultMessage}

Best regards,
Property Management Team
    `.trim();
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Send Signature Invitations
          </CardTitle>
          <CardDescription>
            Review and send signature requests to all parties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Request Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Workflow Type</p>
                <p className="font-medium capitalize">{signatureRequest.workflowType}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Signers</p>
                <p className="font-medium">{signatureRequest.signers.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Expires On</p>
                <p className="font-medium">
                  {format(new Date(signatureRequest.expiresAt), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <Badge variant="outline" className="capitalize">
                  {signatureRequest.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Message (Optional)</Label>
            <Textarea
              id="customMessage"
              placeholder="Add a personal message to the invitation email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-600">
              This message will be included in the invitation email to all signers
            </p>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={previewMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {/* Email Preview */}
          {previewMode && (
            <Card className="border-2 border-gray-200">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base">Email Preview</CardTitle>
                <CardDescription>
                  This is how the invitation email will appear to signers
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subject</p>
                    <p className="font-medium">Signature Required: Lease Agreement</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Message</p>
                    <div className="bg-white p-4 rounded border">
                      <pre className="whitespace-pre-wrap text-sm font-sans">
                        {getEmailPreview('John Doe')}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Signers List */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>
            Invitations will be sent to the following signers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {signatureRequest.signers.map((signer, index) => (
              <Card key={signer.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{signer.name}</p>
                          <Badge variant="outline" className="capitalize">
                            {signer.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{signer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {signer.authenticationType} verification
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-gray-300" />
                  </div>

                  {/* Signing Link (for manual sharing) */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Signing Link</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(`${window.location.origin}/sign/${signatureRequest.id}/${signer.id}`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`${window.location.origin}/sign/${signatureRequest.id}/${signer.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Info */}
      {signatureRequest.workflowType === 'sequential' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sequential Signing:</strong> Signers will receive invitations one at a time
            in the order listed above. Each signer must complete their signature before the next
            invitation is sent.
          </AlertDescription>
        </Alert>
      )}

      {signatureRequest.workflowType === 'parallel' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Parallel Signing:</strong> All signers will receive invitations simultaneously
            and can sign in any order.
          </AlertDescription>
        </Alert>
      )}

      {/* Send Button */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg mb-1">Ready to Send?</p>
              <p className="text-sm text-gray-600">
                {signatureRequest.signers.length} invitation{signatureRequest.signers.length !== 1 ? 's' : ''} will be sent via email
              </p>
            </div>
            <Button
              onClick={onSend}
              disabled={isSending}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-5 w-5 mr-2" />
              {isSending ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Invitations expire on {format(new Date(signatureRequest.expiresAt), 'MMMM dd, yyyy')}</li>
            <li>Automatic reminders will be sent to pending signers</li>
            <li>You can track signature progress in real-time</li>
            <li>All signatures are verified and legally binding</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}