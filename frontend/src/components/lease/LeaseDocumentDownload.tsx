/**
 * Lease Document Download Component
 * Download lease agreements and related documents
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2 } from 'lucide-react';
import { documentService } from '@/services/documentService';

interface LeaseDocumentDownloadProps {
  leaseId: string;
  leaseData: {
    id: string;
    propertyAddress: string;
    tenantName: string;
    landlordName: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    securityDeposit: number;
    terms: string[];
    signatures: {
      tenant: { name: string; date: string };
      landlord: { name: string; date: string };
    };
  };
}

export function LeaseDocumentDownload({ leaseId, leaseData }: LeaseDocumentDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await documentService.downloadLeaseAgreement({
        ...leaseData,
        leaseId,
      });
    } catch (error) {
      console.error('Error downloading lease document:', error);
      alert('Failed to download lease document');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lease Documents</CardTitle>
        <CardDescription>Download your lease agreement and related documents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-semibold">Lease Agreement</p>
                <p className="text-sm text-gray-600">Complete lease terms and signatures</p>
              </div>
            </div>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}