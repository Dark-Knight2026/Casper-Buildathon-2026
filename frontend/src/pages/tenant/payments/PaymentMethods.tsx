/**
 * Payment Methods Page
 * Allows tenants to manage their payment methods (credit cards, bank accounts)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { stripeService, PaymentMethodData } from '@/services/stripeService';
import { supabase } from '@/lib/supabase/client';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/services/stripeService';

function AddPaymentMethodForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      // Get user and customer ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const customerResult = await stripeService.getOrCreateCustomer(user.id);
      if (!customerResult.success || !customerResult.customerId) {
        throw new Error(customerResult.error || 'Failed to get customer');
      }

      // Attach payment method to customer
      const result = await stripeService.addPaymentMethod(customerResult.customerId, paymentMethod.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add payment method');
      }

      onSuccess();
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Card Information</label>
        <div className="border rounded-md p-3">
          <CardElement
            options={{
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
            }}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? 'Adding...' : 'Add Payment Method'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function PaymentMethods() {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const customerResult = await stripeService.getOrCreateCustomer(user.id);
      if (!customerResult.success || !customerResult.customerId) {
        throw new Error(customerResult.error || 'Failed to get customer');
      }

      const result = await stripeService.listPaymentMethods(customerResult.customerId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to load payment methods');
      }

      setPaymentMethods(result.paymentMethods || []);
      setError(null);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setDeletingId(paymentMethodId);
      const result = await stripeService.removePaymentMethod(paymentMethodId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove payment method');
      }

      await loadPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const customerResult = await stripeService.getOrCreateCustomer(user.id);
      if (!customerResult.success || !customerResult.customerId) {
        throw new Error(customerResult.error || 'Failed to get customer');
      }

      const result = await stripeService.setDefaultPaymentMethod(customerResult.customerId, paymentMethodId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to set default payment method');
      }

      await loadPaymentMethods();
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
    }
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brands[brand] || brand;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading payment methods...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your payment methods for rent payments</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment methods</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add a payment method to make rent payments
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((method) => (
            <Card key={method.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    <CardTitle className="text-lg">
                      {method.card ? formatCardBrand(method.card.brand) : 'Bank Account'}
                    </CardTitle>
                  </div>
                  {method.id === paymentMethods[0]?.id && (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {method.card
                    ? `•••• •••• •••• ${method.card.last4}`
                    : method.us_bank_account
                    ? `${method.us_bank_account.bank_name} •••• ${method.us_bank_account.last4}`
                    : 'Payment method'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {method.card && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
                      <span>
                        {method.card.exp_month.toString().padStart(2, '0')}/{method.card.exp_year}
                      </span>
                    </div>
                  )}
                  {method.billing_details.name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span>{method.billing_details.name}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    {method.id !== paymentMethods[0]?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(method.id)}
                      disabled={deletingId === method.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deletingId === method.id ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Security</CardTitle>
          <CardDescription>Your payment information is secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">PCI DSS Compliant</p>
              <p className="text-sm text-muted-foreground">
                All payment information is encrypted and stored securely by Stripe
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">No Storage on Our Servers</p>
              <p className="text-sm text-muted-foreground">
                We never store your full card details on our servers
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Secure Transactions</p>
              <p className="text-sm text-muted-foreground">
                All transactions are processed through secure, encrypted connections
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a credit or debit card to make rent payments
            </DialogDescription>
          </DialogHeader>
          <Elements stripe={getStripe()}>
            <AddPaymentMethodForm
              onSuccess={() => {
                setShowAddDialog(false);
                loadPaymentMethods();
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    </div>
  );
}