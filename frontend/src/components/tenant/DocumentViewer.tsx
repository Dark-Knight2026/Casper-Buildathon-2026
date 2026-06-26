import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import { TenantDocument } from '@/types/tenant';
import {
  X,
  Download,
  FileText,
  Calendar,
  User,
  Tag,
  CheckCircle,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentViewerProps {
  document: TenantDocument;
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const { signDocument, downloadDocument } = useTenantDashboard();
  const { toast } = useToast();
  const [isSigning, setIsSigning] = useState(false);
  const [showSignatureBox, setShowSignatureBox] = useState(false);
  const [signatureText, setSignatureText] = useState('');

  const handleSign = async () => {
    if (!signatureText.trim()) {
      toast({
        title: 'Signature Required',
        description: 'Please enter your name to sign the document',
        variant: 'destructive'
      });
      return;
    }

    setIsSigning(true);
    try {
      await signDocument(document.id);
      toast({
        title: 'Document Signed',
        description: 'The document has been signed successfully'
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Signing Failed',
        description: 'Failed to sign document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSigning(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      lease: 'bg-blue-100 text-blue-800',
      insurance: 'bg-green-100 text-green-800',
      identification: 'bg-purple-100 text-purple-800',
      payment_receipt: 'bg-yellow-100 text-yellow-800',
      notice: 'bg-red-100 text-red-800',
      inspection: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const needsSignature = document.requires_signature && document.signature_status === 'pending';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-2xl font-bold">{document.title}</h2>
            <Badge className={getCategoryColor(document.category)}>
              {document.category.replace('_', ' ')}
            </Badge>
            {document.signature_status && (
              <Badge
                className={
                  document.signature_status === 'signed'
                    ? 'bg-green-100 text-green-800'
                    : document.signature_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {document.signature_status === 'signed' && <CheckCircle className="h-3 w-3 mr-1" />}
                {document.signature_status}
              </Badge>
            )}
          </div>
          {document.description && (
            <p className="text-gray-600">{document.description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Document Info */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">File Size</p>
            <p className="font-medium">{formatFileSize(document.file_size)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Uploaded</p>
            <p className="font-medium">{formatDate(document.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Uploaded By</p>
            <p className="font-medium flex items-center">
              <User className="h-3 w-3 mr-1" />
              {document.uploaded_by_name}
            </p>
          </div>
          {document.expiry_date && (
            <div>
              <p className="text-gray-600 mb-1">Expires</p>
              <p className="font-medium flex items-center text-orange-600">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(document.expiry_date)}
              </p>
            </div>
          )}
        </div>

        {document.tags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2 flex items-center">
              <Tag className="h-3 w-3 mr-1" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {document.signed_date && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Signed on {formatDate(document.signed_date)}
              {document.signed_by && ` by ${document.signed_by}`}
            </p>
          </div>
        )}
      </div>

      {/* Document Preview */}
      <div className="flex-1 overflow-auto p-6 bg-gray-100">
        {document.file_type === 'application/pdf' ? (
          <div className="bg-white rounded-lg shadow-lg h-full">
            <iframe
              src={document.file_url}
              className="w-full h-full rounded-lg"
              title={document.title}
            />
          </div>
        ) : document.file_type.startsWith('image/') ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={document.file_url}
              alt={document.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          </div>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center p-12">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
              <p className="text-gray-600 mb-6">
                This file type cannot be previewed in the browser
              </p>
              <Button onClick={() => downloadDocument(document.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download to View
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Signature Section */}
      {needsSignature && (
        <div className="p-6 border-t bg-yellow-50">
          <div className="flex items-start space-x-3 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-900 mb-1">Signature Required</p>
              <p className="text-sm text-yellow-800">
                This document requires your signature to proceed. Please review the document
                carefully before signing.
              </p>
            </div>
          </div>

          {!showSignatureBox ? (
            <Button
              onClick={() => setShowSignatureBox(true)}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Sign Document
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type your full name to sign
                  </label>
                  <Textarea
                    placeholder="Enter your full legal name"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    rows={2}
                    className="font-serif text-xl"
                  />
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="mb-1">
                    By signing this document, you acknowledge that:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You have read and understood the document contents</li>
                    <li>Your electronic signature is legally binding</li>
                    <li>The signature timestamp will be recorded</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={handleSign}
                    disabled={isSigning || !signatureText.trim()}
                    className="flex-1"
                  >
                    {isSigning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Signature
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSignatureBox(false);
                      setSignatureText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 border-t flex space-x-3">
        <Button
          variant="outline"
          onClick={() => downloadDocument(document.id)}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
      </div>
    </div>
  );
}