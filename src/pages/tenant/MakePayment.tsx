/**
 * Make Payment Page
 * One-time payment processing for tenants
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StripeProvider } from '@/components/payments/StripeProvider';
import { PaymentForm } from '@/components/payments/PaymentForm';

// TODO: remove when GET /api/v1/leases?status=active is ready
const MOCK_CUSTOMER_ID = 'cus_mock_tenant_1';

const MOCK_LEASES: Record<string, { rentAmount: number; address: string }> = {
  'mock-lease-1': { rentAmount: 1500, address: '123 Demo Street, New York, NY 10001' },
  'mock-lease-2': { rentAmount: 1350, address: '456 Park Avenue, Brooklyn, NY 11201' },
};

const DEFAULT_LEASE_ID = 'mock-lease-1';

const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function MakePayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const leaseIdParam = searchParams.get('leaseId') ?? DEFAULT_LEASE_ID;
  const lease = MOCK_LEASES[leaseIdParam] ?? MOCK_LEASES[DEFAULT_LEASE_ID];

  const amount      = lease.rentAmount;
  const description = `Rent Payment — ${currentMonth}`;

  // TODO: wire to POST /api/v1/payments when backend is ready
  const handlePaymentSuccess = (_paymentIntentId: string) => {
    setTimeout(() => navigate('/tenant/payments'), 1500);
  };

  return (
    <StripeProvider>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/tenant/payments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Make Payment</h1>
            <p className="text-muted-foreground">Process your rent payment securely</p>
          </div>

          <PaymentForm
            amount={amount}
            customerId={MOCK_CUSTOMER_ID}
            leaseId={leaseIdParam}
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
