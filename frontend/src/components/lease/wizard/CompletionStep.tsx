import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, FileText, Download, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LeaseFormData } from '@/types/lease';

interface CompletionStepProps {
  leaseData: Partial<LeaseFormData>;
  generatedPdfUrl: string | null;
}

export default function CompletionStep({ leaseData, generatedPdfUrl }: CompletionStepProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center">
        <CheckCircle className="h-20 w-20 text-green-500" />
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-2">Lease Created Successfully!</h3>
        <p className="text-gray-600">
          Your lease agreement has been created and sent for signatures.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-left">
            <div>
              <div className="font-semibold">Property</div>
              <div className="text-gray-600">{leaseData.propertyAddress || 'Not specified'}</div>
            </div>
            <div>
              <div className="font-semibold">Monthly Rent</div>
              <div className="text-gray-600">${leaseData.monthlyRent?.toFixed(2) || '0.00'}</div>
            </div>
            <div>
              <div className="font-semibold">Lease Duration</div>
              <div className="text-gray-600">
                {leaseData.startDate && leaseData.endDate
                  ? `${new Date(leaseData.startDate).toLocaleDateString()} - ${new Date(leaseData.endDate).toLocaleDateString()}`
                  : 'Not specified'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={() => navigate('/landlord/leases')}>
          <FileText className="mr-2 h-4 w-4" />
          View All Leases
        </Button>
        {generatedPdfUrl && (
          <>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview Lease
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </>
        )}
      </div>

      <Button
        variant="link"
        onClick={() => window.location.reload()}
      >
        Create Another Lease
      </Button>
    </div>
  );
}
