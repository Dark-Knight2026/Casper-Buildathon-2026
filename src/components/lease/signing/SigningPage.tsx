/**
 * Signing Page Component
 * Page where signers complete their electronic signature
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  Download,
  Clock
} from 'lucide-react';
import { eSignatureService, SignatureInvitation } from '@/services/eSignatureService';
import { SignaturePad } from './SignaturePad';
import { useToast } from '@/hooks/use-toast';

export default function SigningPage() {
  const { requestId, token } = useParams<{ requestId: string; token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<SignatureInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [isSigning, setIsSigning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const loadInvitation = async () => {
    try {
      // In production, validate token and fetch invitation from Supabase
      const invitations = JSON.parse(localStorage.getItem('signatureInvitations') || '{}');
      const foundInvitation = Object.values(invitations).find(
        (inv: SignatureInvitation) => 
          inv.signatureRequestId === requestId && inv.secureToken === token
      );

      if (!foundInvitation) {
        throw new Error('Invalid or expired invitation');
      }

      setInvitation(foundInvitation as SignatureInvitation);

      // Mark as opened
      if ((foundInvitation as SignatureInvitation).status === 'sent') {
        const inv = foundInvitation as SignatureInvitation;
        inv.status = 'opened';
        inv.openedAt = new Date();
        invitations[inv.id] = inv;
        localStorage.setItem('signatureInvitations', JSON.stringify(invitations));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load signing invitation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, token]);

  const handleSign = async () => {
    if (!invitation || !signatureData || !hasAgreed) {
      toast({
        title: 'Incomplete',
        description: 'Please provide your signature and agree to the terms',
        variant: 'destructive'
      });
      return;
    }

    setIsSigning(true);
    try {
      // Verify signature
      const verification = await eSignatureService.verifySignature(
        signatureData,
        invitation.signerId,
        requestId!
      );

      // Record signature
      await eSignatureService.recordSignature(
        requestId!,
        invitation.id,
        signatureData,
        verification
      );

      setIsComplete(true);

      toast({
        title: 'Signature Complete',
        description: 'Your signature has been recorded successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record signature',
        variant: 'destructive'
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleDecline = () => {
    if (invitation) {
      const invitations = JSON.parse(localStorage.getItem('signatureInvitations') || '{}');
      invitations[invitation.id].status = 'declined';
      localStorage.setItem('signatureInvitations', JSON.stringify(invitations));

      toast({
        title: 'Signature Declined',
        description: 'You have declined to sign this document'
      });

      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Loading document...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid or expired signing invitation. Please contact the sender.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-2 border-green-200">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Signature Complete!
            </h1>
            <p className="text-gray-600 mb-8">
              Thank you for signing the document. You will receive a confirmation email shortly.
            </p>
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 mb-8">
              <p className="text-sm text-green-900 mb-2">
                <strong>What happens next?</strong>
              </p>
              <ul className="text-sm text-green-800 space-y-1 text-left max-w-md mx-auto">
                <li>• You'll receive an email confirmation</li>
                <li>• Once all parties sign, you'll get the final document</li>
                <li>• A certificate of completion will be generated</li>
              </ul>
            </div>
            <Button onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Sign Lease Agreement
                </CardTitle>
                <CardDescription>
                  Please review and sign the document below
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                Secure Signing
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Signer Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Signing as</p>
                <p className="font-semibold text-lg">{invitation.signerName}</p>
                <p className="text-sm text-gray-600">{invitation.signerEmail}</p>
              </div>
              <Badge className="capitalize">{invitation.signerRole}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Document Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document to Sign</CardTitle>
            <CardDescription>
              Review the complete document before signing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-100 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Lease Agreement Document</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Document
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please review the entire document carefully before signing. Your signature
                indicates that you have read and agree to all terms and conditions.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Signature</CardTitle>
            <CardDescription>
              Draw your signature in the box below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignaturePad
              onSave={(data) => setSignatureData(data)}
              onClear={() => setSignatureData('')}
            />

            <Separator />

            {/* Agreement Checkbox */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agree"
                  checked={hasAgreed}
                  onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                  I have read and agree to the terms of this lease agreement. I understand
                  that my electronic signature is legally binding and has the same effect
                  as a handwritten signature.
                </Label>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Legal Notice:</strong> By signing this document electronically,
                  you agree that your electronic signature is the legal equivalent of your
                  handwritten signature on paper. This document is governed by the U.S.
                  Electronic Signatures in Global and National Commerce Act (ESIGN Act)
                  and the Uniform Electronic Transactions Act (UETA).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={isSigning}
              >
                Decline to Sign
              </Button>
              <Button
                onClick={handleSign}
                disabled={!signatureData || !hasAgreed || isSigning}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {isSigning ? 'Processing...' : 'Sign Document'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Secure Signing Process</p>
            <p className="text-sm">
              Your signature is protected with industry-standard encryption. We record
              your IP address, timestamp, and device information for verification purposes.
              All data is stored securely and complies with privacy regulations.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}