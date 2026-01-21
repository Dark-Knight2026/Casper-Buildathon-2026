import { Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { receiptService } from '@/services/receiptService';
import type { ReceiptData } from '@/types/receipt';

interface PaymentReceiptProps {
  receiptData: ReceiptData;
  showActions?: boolean;
}

export default function PaymentReceipt({
  receiptData,
  showActions = true,
}: PaymentReceiptProps) {
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      await receiptService.downloadReceipt(receiptData, {
        includeBreakdown: true,
        includeNotes: true,
      });
      toast({
        title: 'Receipt Downloaded',
        description: 'The receipt has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download receipt',
        variant: 'destructive',
      });
    }
  };

  const handleEmail = async () => {
    try {
      await receiptService.emailReceipt(receiptData, receiptData.tenant.email, {
        includeBreakdown: true,
        includeNotes: true,
      });
      toast({
        title: 'Receipt Sent',
        description: `Receipt has been sent to ${receiptData.tenant.email}`,
      });
    } catch (error) {
      toast({
        title: 'Email Failed',
        description: error instanceof Error ? error.message : 'Failed to email receipt',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Receipt</CardTitle>
            <CardDescription>Receipt #{receiptData.receiptNumber}</CardDescription>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Payment Date</p>
            <p className="font-medium">{receiptData.paymentDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Method</p>
            <p className="font-medium">{receiptData.paymentMethod}</p>
          </div>
        </div>

        <Separator />

        {/* Tenant Information */}
        <div>
          <h3 className="font-semibold mb-2">Paid By</h3>
          <p className="text-sm">{receiptData.tenant.name}</p>
          <p className="text-sm text-gray-600">{receiptData.tenant.email}</p>
          {receiptData.tenant.phone && (
            <p className="text-sm text-gray-600">{receiptData.tenant.phone}</p>
          )}
        </div>

        <Separator />

        {/* Property Information */}
        <div>
          <h3 className="font-semibold mb-2">Property</h3>
          <p className="text-sm">{receiptData.property.address}</p>
          {receiptData.property.unit && (
            <p className="text-sm text-gray-600">Unit: {receiptData.property.unit}</p>
          )}
          <p className="text-sm text-gray-600">
            {receiptData.property.city}, {receiptData.property.state}{' '}
            {receiptData.property.zipCode}
          </p>
        </div>

        <Separator />

        {/* Payment Breakdown */}
        <div>
          <h3 className="font-semibold mb-3">Payment Details</h3>
          <div className="space-y-2">
            {receiptData.breakdown.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.description}</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${receiptData.amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        {receiptData.notes && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{receiptData.notes}</p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Thank you for your payment!</p>
          <p className="text-xs mt-1">
            Please keep this receipt for your records.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}