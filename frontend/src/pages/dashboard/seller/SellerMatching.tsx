import { useState } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import PropertyBuyerMatching from '@/components/seller/PropertyBuyerMatching';
import { useAuth } from '@/hooks/useAuth';

export default function SellerMatching() {
  const { user } = useAuth();
  const sellerId = user?.id || 'seller_123';

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        <PropertyBuyerMatching sellerId={sellerId} />
      </div>
    </ErrorBoundary>
  );
}