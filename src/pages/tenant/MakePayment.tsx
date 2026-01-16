/**
 * Make Payment Page
 * One-time payment processing for tenants
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StripeProvider } from '@/components/payments/StripeProvider';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { supabase } from '@/lib/supabase/client';
import { stripeService } from '@/services/stripeService';
import { paymentService } from '@/services/paymentService';
import { leaseManagementService } from '@/services/leaseManagementService';

export function MakePayment() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [leaseId, setLeaseId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loadPaymentData = useCallback(async () => {
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

      // Get lease ID from URL params or get active lease
      const leaseIdParam = searchParams.get('leaseId');
      if (leaseIdParam) {
        setLeaseId(leaseIdParam);
        
        // Get lease details
        const lease = await leaseManagementService.getLeaseById(leaseIdParam);
        if (lease) {
          setAmount(lease.rentAmount);
          setDescription(`Rent Payment - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        }
      } else {
        // Get active lease
        const leases = await leaseManagementService.getLeases({
          tenantId: user.id,
          status: 'active',
        });

        if (leases.length === 0) {
          throw new Error('No active lease found');
        }

        const activeLease = leases[0];
        setLeaseId(activeLease.id);
        setAmount(activeLease.rentAmount);
        setDescription(`Rent Payment - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      }
    } catch (err) {
      console.error('Error loading payment data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create payment record
      await paymentService.createPayment({
        leaseId,
        tenantId: user.id,
        amount,
        paymentMethod: 'credit_card',
      });

      // Update payment status
      const payments = await paymentService.getPaymentsByLeaseId(leaseId);
      const latestPayment = payments[0];
      if (latestPayment) {
        await paymentService.updatePaymentStatus(
          latestPayment.id,
          'completed',
          paymentIntentId
        );
      }

      // Redirect to payment history
      setTimeout(() => {
        navigate('/tenant/payments');
      }, 2000);
    } catch (err) {
      console.error('Error recording payment:', err);
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
        <Button
          variant="outline"
          onClick={() => navigate('/tenant/payments')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Button>
      </div>
    );
  }

  return (
    <StripeProvider>
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/tenant/payments')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Make Payment</h1>
            <p className="text-gray-600">Process your rent payment securely</p>
          </div>

          <PaymentForm
            amount={amount}
            customerId={customerId}
            leaseId={leaseId}
            description={description}
            onSuccess={handlePaymentSuccess}
            onCancel={() => navigate('/tenant/payments')}
          />
        </div>
      </div>
    </StripeProvider>
  );
}

export default MakePayment;