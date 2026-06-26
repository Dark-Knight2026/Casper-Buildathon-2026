import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import { Payment } from '@/types/tenant';
import { CreditCard, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MakePaymentFormProps {
  payment: Payment;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MakePaymentForm({ payment, onSuccess, onCancel }: MakePaymentFormProps) {
  const { paymentMethods, makePayment } = useTenantDashboard();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState(
    paymentMethods.find(pm => pm.is_default)?.id || ''
  );
  const [saveForFuture, setSaveForFuture] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethodId) {
      toast({
        title: 'Payment Method Required',
        description: 'Please select a payment method',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      await makePayment({
        amount: payment.total_amount,
        payment_method_id: selectedMethodId,
        payment_date: new Date()
      });
      
      toast({
        title: 'Payment Successful',
        description: `Your payment of $${payment.total_amount.toLocaleString()} has been processed successfully.`
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: 'There was an error processing your payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const selectedMethod = paymentMethods.find(pm => pm.id === selectedMethodId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg">Payment Summary</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Rent Amount</span>
                <span className="font-medium">${payment.amount.toLocaleString()}</span>
              </div>
              
              {payment.late_fee > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Late Fee</span>
                  <span className="font-medium">${payment.late_fee.toLocaleString()}</span>
                </div>
              )}
              
              {payment.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-${payment.discount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total Due</span>
                <span>${payment.total_amount.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              Due Date: {formatDate(payment.due_date)}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            {paymentMethods.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <CreditCard className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-3">
                  No payment methods on file
                </p>
                <Button type="button" variant="outline" size="sm">
                  Add Payment Method
                </Button>
              </div>
            ) : (
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>
                          {method.provider} •••• {method.last_four}
                          {method.is_default && ' (Default)'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Payment Method Details */}
          {selectedMethod && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      {selectedMethod.provider} ending in {selectedMethod.last_four}
                    </p>
                    {selectedMethod.expiry_date && (
                      <p className="text-sm text-blue-700">
                        Expires: {selectedMethod.expiry_date}
                      </p>
                    )}
                    {selectedMethod.is_auto_pay && (
                      <p className="text-sm text-blue-700">
                        Auto-pay enabled (charges on day {selectedMethod.auto_pay_day} of each month)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-pay Option */}
          {selectedMethod && !selectedMethod.is_auto_pay && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="save-for-future"
                checked={saveForFuture}
                onCheckedChange={(checked) => setSaveForFuture(checked as boolean)}
              />
              <div>
                <Label htmlFor="save-for-future" className="text-sm font-normal cursor-pointer">
                  Enable auto-pay for future rent payments
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically charge this payment method on the 28th of each month
                </p>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>
                Your payment information is encrypted and secure. We never store your full card details.
              </p>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Payment Terms</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Payments are processed immediately and cannot be cancelled</li>
                  <li>A receipt will be emailed to you upon successful payment</li>
                  <li>Late fees may apply if payment is received after the due date</li>
                  <li>Contact property management for payment disputes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={isProcessing || !selectedMethodId}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay ${payment.total_amount.toLocaleString()}
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}