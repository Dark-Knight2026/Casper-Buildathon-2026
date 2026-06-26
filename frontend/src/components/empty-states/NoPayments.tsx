/**
 * No Payments Empty State
 * Displayed when payment history is empty
 */

import { CreditCard, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from './EmptyState';

interface NoPaymentsProps {
  compact?: boolean;
}

export function NoPayments({ compact = false }: NoPaymentsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTenant = user?.role === 'tenant';

  const handleAction = () => {
    if (isTenant) {
      navigate('/tenant/payments/make');
    }
  };

  return (
    <EmptyState
      icon={CreditCard}
      heading="No payments yet"
      message="Your payment history will appear here once you make your first payment."
      action={
        isTenant
          ? {
              label: 'Make Payment',
              onClick: handleAction,
              icon: Plus,
            }
          : undefined
      }
      compact={compact}
    />
  );
}