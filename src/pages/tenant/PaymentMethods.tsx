/**
 * Payment Methods Management Page
 * Manage saved payment methods and autopay settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Plus, Loader2, AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase/client';
import { stripeService, type PaymentMethodData } from '@/services/stripeService';
import { StripeProvider } from '@/components/payments/StripeProvider';
import { PaymentMethodCard } from '@/components/payments/PaymentMethodCard';
import { AddPaymentMethodForm } from '@/components/payments/AddPaymentMethodForm';
import { AutopaySetup } from '@/components/payments/AutopaySetup';
import { leaseManagementService } from '@/services/leaseManagementService';
import { useToast } from '@/hooks/use-toast';

export function PaymentMethods() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeLeaseId, setActiveLeaseId] = useState<string>('');
  const [rentAmount, setRentAmount] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get or create Stripe customer
      const customerResult = await stripeService.getOrCreateCustomer(user.id);
      if (!customerResult.success || !customerResult.customerId) {
        throw new Error(customerResult.error || 'Failed to get customer');
      }

      setCustomerId(customerResult.customerId);

      // Load payment methods
      const pmResult = await stripeService.listPaymentMethods(customerResult.customerId);
      if (pmResult.success && pmResult.paymentMethods) {
        setPaymentMethods(pmResult.paymentMethods);
        // First payment method is typically the default
        if (pmResult.paymentMethods.length > 0) {
          setDefaultPaymentMethodId(pmResult.paymentMethods[0].id);
        }
      }

      // Get active lease for autopay setup
      const leases = await leaseManagementService.getLeases({
        tenantId: user.id,
        status: 'active',
      });

      if (leases.length > 0) {
        setActiveLeaseId(leases[0].id);
        setRentAmount(leases[0].rentAmount);
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPaymentMethod = async (paymentMethodId: string) => {
    setShowAddForm(false);
    toast({
      title: 'Payment method added',
      description: 'Your payment method has been added successfully.',
    });
    await loadData();
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    setActionLoading(true);
    try {
      const result = await stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
      if (!result.success) {
        throw new Error(result.error);
      }

      setDefaultPaymentMethodId(paymentMethodId);
      toast({
        title: 'Default payment method updated',
        description: 'Your default payment method has been updated.',
      });
    } catch (err) {
      console.error('Error setting default payment method:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to set default payment method',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (paymentMethodId: string) => {
    if (paymentMethodId === defaultPaymentMethodId) {
      toast({
        title: 'Cannot remove default payment method',
        description: 'Please set another payment method as default first.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await stripeService.removePaymentMethod(paymentMethodId);
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'Payment method removed',
        description: 'Your payment method has been removed successfully.',
      });
      await loadData();
    } catch (err) {
      console.error('Error removing payment method:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove payment method',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <StripeProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
          <p className="text-gray-600">Manage your payment methods and autopay settings</p>
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

          <TabsContent value="methods" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Saved Payment Methods</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your saved cards and bank accounts
                </p>
              </div>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
            </div>

            {paymentMethods.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">
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

          <TabsContent value="autopay" className="space-y-6">
            {!activeLeaseId ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't have an active lease. Autopay is only available for active leases.
                </AlertDescription>
              </Alert>
            ) : paymentMethods.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please add a payment method before setting up autopay.
                </AlertDescription>
              </Alert>
            ) : (
              <AutopaySetup
                leaseId={activeLeaseId}
                customerId={customerId}
                rentAmount={rentAmount}
                onSuccess={() => {
                  toast({
                    title: 'Autopay updated',
                    description: 'Your autopay settings have been saved.',
                  });
                }}
              />
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <AddPaymentMethodForm
              customerId={customerId}
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