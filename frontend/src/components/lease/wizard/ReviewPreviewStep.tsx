import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Eye } from 'lucide-react';
import type { LeaseFormData, LeaseClause, LeaseTemplate } from '@/types/lease';

interface ReviewPreviewStepProps {
  leaseData: Partial<LeaseFormData>;
  clauses: LeaseClause[];
  template: LeaseTemplate | null;
  onGeneratePdf: (url: string) => void;
  generatedPdfUrl: string | null;
}

export default function ReviewPreviewStep({
  leaseData,
  clauses,
  template,
  onGeneratePdf,
  generatedPdfUrl,
}: ReviewPreviewStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      // TODO: Implement PDF generation
      setTimeout(() => {
        onGeneratePdf('https://example.com/lease.pdf');
        setIsGenerating(false);
      }, 2000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review & Preview</h3>
        <p className="text-sm text-gray-600">
          Review all lease details and generate the final document
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lease Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">Property</div>
              <div className="text-gray-600">{leaseData.propertyAddress || 'Not specified'}</div>
            </div>
            <div>
              <div className="font-semibold">Lease Duration</div>
              <div className="text-gray-600">
                {leaseData.startDate && leaseData.endDate
                  ? `${new Date(leaseData.startDate).toLocaleDateString()} - ${new Date(leaseData.endDate).toLocaleDateString()}`
                  : 'Not specified'}
              </div>
            </div>
            <div>
              <div className="font-semibold">Monthly Rent</div>
              <div className="text-gray-600">${leaseData.monthlyRent?.toFixed(2) || '0.00'}</div>
            </div>
            <div>
              <div className="font-semibold">Security Deposit</div>
              <div className="text-gray-600">${leaseData.securityDeposit?.toFixed(2) || '0.00'}</div>
            </div>
            <div>
              <div className="font-semibold">Total Clauses</div>
              <div className="text-gray-600">{clauses.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!generatedPdfUrl ? (
              <Button
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate PDF'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <FileText className="h-4 w-4" />
                  PDF generated successfully
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
