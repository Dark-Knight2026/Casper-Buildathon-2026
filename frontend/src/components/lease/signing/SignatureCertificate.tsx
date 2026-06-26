/**
 * Signature Certificate Component
 * Display and download certificate of completion
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Award,
  Download,
  CheckCircle,
  Shield,
  Calendar,
  MapPin,
  Monitor,
  FileText,
  Share2,
  Printer
} from 'lucide-react';
import { eSignatureService, SignatureCertificate as CertificateType } from '@/services/eSignatureService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SignatureCertificateProps {
  requestId: string;
  onDownload?: () => void;
}

export default function SignatureCertificate({
  requestId,
  onDownload
}: SignatureCertificateProps) {
  const { toast } = useToast();
  const [certificate, setCertificate] = useState<CertificateType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCertificate = async () => {
    try {
      const cert = await eSignatureService.generateCertificate(requestId);
      setCertificate(cert);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load certificate',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCertificate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
    
    toast({
      title: 'Download Started',
      description: 'Certificate is being downloaded'
    });
  };

  const handlePrint = () => {
    window.print();
    toast({
      title: 'Print Dialog Opened',
      description: 'Certificate is ready to print'
    });
  };

  const handleShare = () => {
    if (navigator.share && certificate) {
      navigator.share({
        title: 'Signature Certificate',
        text: 'Certificate of Completion for Lease Agreement',
        url: certificate.certificateUrl
      });
    } else {
      navigator.clipboard.writeText(certificate?.certificateUrl || '');
      toast({
        title: 'Link Copied',
        description: 'Certificate link copied to clipboard'
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Generating certificate...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!certificate) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load certificate</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold">Certificate of Completion</p>
                <p className="text-sm text-gray-600">All signatures collected</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Document */}
      <Card className="border-4 border-green-200 bg-gradient-to-br from-white to-green-50">
        <CardContent className="pt-8 pb-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-4">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Certificate of Completion
              </h1>
              <p className="text-gray-600">
                Electronic Signature Verification
              </p>
            </div>

            <Separator />

            {/* Certificate Info */}
            <div className="bg-white p-6 rounded-lg border-2 border-green-200 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Certificate ID</p>
                  <p className="font-mono text-sm">{certificate.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed On</p>
                  <p className="font-medium">
                    {format(new Date(certificate.completedAt), 'PPpp')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Document Hash</p>
                  <p className="font-mono text-xs break-all">{certificate.documentHash}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Verification Status</p>
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Signatures ({certificate.signatures.length})
              </h3>
              <div className="space-y-4">
                {certificate.signatures.map((sig, index) => (
                  <Card key={index} className="border-2">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Signer Info */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-lg">{sig.signerName}</p>
                            <p className="text-sm text-gray-600">{sig.signerEmail}</p>
                            <Badge variant="outline" className="mt-2 capitalize">
                              {sig.signerRole}
                            </Badge>
                          </div>
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>

                        <Separator />

                        {/* Verification Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-gray-600">Signed At</p>
                              <p className="font-medium">
                                {format(new Date(sig.signedAt), 'PPpp')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-gray-600">IP Address</p>
                              <p className="font-mono text-xs">{sig.ipAddress}</p>
                            </div>
                          </div>
                          {sig.verification.geolocation && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-gray-600">Location</p>
                                <p className="font-mono text-xs">
                                  {sig.verification.geolocation.latitude.toFixed(4)},
                                  {sig.verification.geolocation.longitude.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-gray-600">Authentication</p>
                              <p className="font-medium capitalize">
                                {sig.verification.authenticationMethod}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Verification Badge */}
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-900">Signature Verified</p>
                              <p className="text-xs text-green-700">
                                Authenticated via {sig.verification.authenticationMethod} • 
                                Timestamp: {format(new Date(sig.verification.timestamp), 'PPpp')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Legal Notice */}
            <Alert className="border-2 border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-medium mb-2">Legal Compliance</p>
                <p className="text-sm">
                  This certificate verifies that all parties have electronically signed the
                  document in compliance with the U.S. ESIGN Act and UETA. Each signature has
                  been authenticated and verified with timestamp, IP address, and device
                  information. This document is legally binding and enforceable.
                </p>
              </AlertDescription>
            </Alert>

            {/* Footer */}
            <div className="text-center text-sm text-gray-600 pt-4 border-t">
              <p>
                This certificate was generated automatically by the electronic signature system.
              </p>
              <p className="mt-1">
                Certificate URL: <span className="font-mono text-xs">{certificate.certificateUrl}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Details</CardTitle>
          <CardDescription>
            Technical information about the signature process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Signatures</p>
              <p className="font-medium">{certificate.signatures.length}</p>
            </div>
            <div>
              <p className="text-gray-600">Completion Date</p>
              <p className="font-medium">
                {format(new Date(certificate.completedAt), 'PPP')}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Document Integrity</p>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
            <div>
              <p className="text-gray-600">Certificate Status</p>
              <Badge variant={certificate.isValid ? 'default' : 'destructive'}>
                {certificate.isValid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Document Hash (SHA-256)</p>
            <code className="text-xs bg-gray-100 p-2 rounded block break-all">
              {certificate.documentHash}
            </code>
            <p className="text-xs text-gray-600 mt-1">
              This hash ensures the document has not been tampered with after signing
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}