import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { RecommendedProperties } from '@/components/tenant/RecommendedProperties';
import { CURRENT_TENANT_ID, getMyCurrentProperties } from '@/data/tenantLeases';

export default function TenantRecommended() {
  const navigate = useNavigate();
  const [firstCurrent] = getMyCurrentProperties(CURRENT_TENANT_ID);

  if (!firstCurrent) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Home}
            title="No active lease"
            description="Recommendations appear within 6 months of your lease end date."
            action={{ label: 'Browse properties', onClick: () => navigate('/tenant/property-search') }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Recommended for you</h1>
            <p className="text-muted-foreground">
              Properties available around the time your current lease ends.
            </p>
          </div>
        </div>

        <RecommendedProperties
          tenantId={CURRENT_TENANT_ID}
          leaseEndDate={firstCurrent.lease.endDate}
          monthlyRent={firstCurrent.lease.monthlyRent}
          currentProperty={firstCurrent.property}
          variant="full"
          maxCards={50}
        />
      </div>
    </ErrorBoundary>
  );
}
