/**
 * Payment Methods Management Page
 * Manage saved payment methods and autopay settings
 */

import { useState } from 'react';
import { CreditCard, Plus, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StripeProvider } from '@/components/payments/StripeProvider';
import { PaymentMethodCard } from '@/components/payments/PaymentMethodCard';
import { AddPaymentMethodForm } from '@/components/payments/AddPaymentMethodForm';
import { AutopaySetup } from '@/components/payments/AutopaySetup';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethodData } from '@/services/stripeService';

// TODO: remove when GET /api/v1/stripe/payment-methods is ready
const MOCK_CUSTOMER_ID = 'cus_mock_tenant_1';

const MOCK_PAYMENT_METHODS: PaymentMethodData[] = [
  {
    id: 'pm_mock_1',
    type: 'card',
    card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2027 },
    billing_details: { name: 'Jane Doe', email: 'tenant@demo.com' },
    created: Date.now() / 1000,
  },
  {
    id: 'pm_mock_2',
    type: 'us_bank_account',
    us_bank_account: { bank_name: 'Chase', last4: '6789', account_type: 'checking' },
    billing_details: { name: 'Jane Doe' },
    created: Date.now() / 1000,
  },
];

// TODO: replace with GET /api/v1/leases?status=active when backend is ready
const MOCK_ACTIVE_LEASE = { id: 'mock-lease-1', rentAmount: 1500 };

export function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>(MOCK_PAYMENT_METHODS);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState('pm_mock_1');
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  // TODO: wire to PATCH /api/v1/stripe/payment-methods/:id/default when backend is ready
  const handleSetDefault = async (paymentMethodId: string) => {
    setActionLoading(true);
    await new Promise(res => setTimeout(res, 400));
    setDefaultPaymentMethodId(paymentMethodId);
    toast({ title: 'Default payment method updated (mock)' });
    setActionLoading(false);
  };

  // TODO: wire to DELETE /api/v1/stripe/payment-methods/:id when backend is ready
  const handleRemove = async (paymentMethodId: string) => {
    if (paymentMethodId === defaultPaymentMethodId) {
      toast({
        title: 'Cannot remove default payment method',
        description: 'Please set another method as default first.',
        variant: 'destructive',
      });
      return;
    }
    if (!confirm('Remove this payment method?')) return;

    setActionLoading(true);
    await new Promise(res => setTimeout(res, 400));
    setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
    toast({ title: 'Payment method removed (mock)' });
    setActionLoading(false);
  };

  // TODO: wire to POST /api/v1/stripe/payment-methods when backend is ready
  const handleAddPaymentMethod = (_paymentMethodId: string) => {
    setShowAddForm(false);
    toast({ title: 'Payment method added (mock)' });
  };

  return (
    <StripeProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your payment methods and autopay settings</p>
        </div>

        <Tabs defaultValue="methods" className="space-y-6">
          <TabsList>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="autopay" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Autopay
            </TabsTrigger>
          </TabsList>

          {/* ── Payment Methods ── */}
          <TabsContent value="methods" className="space-y-6">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Saved Payment Methods</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your saved cards and bank accounts
                </p>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                size="icon"
                className="sm:size-auto sm:px-4"
                aria-label="Add Payment Method"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Payment Method</span>
              </Button>
            </div>

            {paymentMethods.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Payment Methods</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Add a payment method to make rent payments easier
                  </p>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Payment Method
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((pm) => (
                  <PaymentMethodCard
                    key={pm.id}
                    paymentMethod={pm}
                    isDefault={pm.id === defaultPaymentMethodId}
                    onSetDefault={handleSetDefault}
                    onRemove={handleRemove}
                    loading={actionLoading}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Autopay ── */}
          <TabsContent value="autopay" className="space-y-6">
            <AutopaySetup
              leaseId={MOCK_ACTIVE_LEASE.id}
              customerId={MOCK_CUSTOMER_ID}
              rentAmount={MOCK_ACTIVE_LEASE.rentAmount}
              onSuccess={() => toast({ title: 'Autopay updated (mock)' })}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <AddPaymentMethodForm
              customerId={MOCK_CUSTOMER_ID}
              onSuccess={handleAddPaymentMethod}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </StripeProvider>
  );
}

export default PaymentMethods;
