/**
 * Payment Form Component
 * Form for processing one-time payments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { DollarSign, Loader2, AlertCircle, CreditCard, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { stripeService, type PaymentMethodData } from '@/services/stripeService';

interface PaymentFormProps {
  amount: number;
  customerId: string;
  leaseId: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel?: () => void;
}

export function PaymentForm({
  amount,
  customerId,
  leaseId,
  description = 'Rent Payment',
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new');
  const [cardholderName, setCardholderName] = useState('');

  const loadPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const result = await stripeService.listPaymentMethods(customerId);
      if (result.success && result.paymentMethods) {
        setPaymentMethods(result.paymentMethods);
        // Auto-select first payment method if available
        if (result.paymentMethods.length > 0) {
          setSelectedPaymentMethod(result.paymentMethods[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      let paymentMethodId = selectedPaymentMethod;

      // If using a new card, create payment method first
      if (selectedPaymentMethod === 'new') {
        if (!cardholderName.trim()) {
          throw new Error('Please enter the cardholder name.');
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: cardholderName,
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }

        if (!paymentMethod) {
          throw new Error('Failed to create payment method');
        }

        paymentMethodId = paymentMethod.id;
      }

      // Create payment intent
      const intentResult = await stripeService.createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customerId,
        paymentMethodId,
        metadata: {
          leaseId,
          description,
        },
      });

      if (!intentResult.success || !intentResult.paymentIntent) {
        throw new Error(intentResult.error || 'Failed to create payment intent');
      }

      // Confirm payment
      const confirmResult = await stripe.confirmCardPayment(
        intentResult.paymentIntent.clientSecret,
        {
          payment_method: paymentMethodId,
        }
      );

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      if (confirmResult.paymentIntent?.status === 'succeeded') {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(confirmResult.paymentIntent!.id);
        }, 2000);
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
          <p className="text-gray-600 text-center mb-4">
            Your payment of {formatCurrency(amount)} has been processed successfully.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Make Payment
        </CardTitle>
        <CardDescription>
          {description} - {formatCurrency(amount)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Label>Payment Method</Label>
            <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value={pm.id} id={pm.id} />
                  <Label htmlFor={pm.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>
                        {pm.type === 'card' && pm.card
                          ? `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}`
                          : 'Bank Account'}
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Use a new card</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {selectedPaymentMethod === 'new' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  disabled={processing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Card Details</Label>
                <div className="border rounded-md p-3 bg-white">
                  <CardElement options={cardElementOptions} />
                </div>
                <p className="text-xs text-gray-500">
                  Your card information is securely processed by Stripe.
                </p>
              </div>
            </>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Amount</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Processing Fee</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{formatCurrency(amount)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={!stripe || processing || loading}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(amount)}`
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={processing}
              >
                Cancel
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-gray-500">
            By clicking "Pay", you agree to our terms of service and authorize this payment.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}