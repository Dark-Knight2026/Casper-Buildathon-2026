/**
 * Tenant "My Properties" — the properties the tenant leases, derived from real
 * data: `GET /api/v1/leases?tenantId=me` plus `GET /api/v1/properties/{id}` for
 * each leased property. Current vs past is split by lease status. No mock.
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { listLeases } from '@/services/leaseService';
import { fetchAllPages } from '@/lib/pagination';
import { getProperty } from '@/services/propertyAssetService';
import { formatPropertyType } from '@/lib/listingDisplay';
import { formatLeaseDate } from '@/lib/leaseDisplay';
import type { Lease } from '@/types/leaseContract';
import type { PropertyAsset } from '@/types/listingContract';

interface LeasedItem {
  lease: Lease;
  property: PropertyAsset | null;
}

const PAST_STATUSES: Lease['status'][] = ['expired', 'terminated', 'renewed'];

function LeasedPropertyCard({
  item,
  onClick,
}: {
  item: LeasedItem;
  onClick: () => void;
}) {
  const { lease, property } = item;
  const isCurrent = !PAST_STATUSES.includes(lease.status);
  return (
    <div className="flex h-full w-full flex-col gap-2 [&>div]:w-full">
      <PropertyCard
        property={{
          id: property?.id ?? lease.propertyId,
          title: property
            ? formatPropertyType(property.propertyType)
            : `Property ${lease.propertyId.slice(0, 8)}…`,
          address: property?.addressLine1 ?? '',
          city: property?.city ?? '',
          state: property?.stateOrProvince ?? '',
          price: lease.monthlyRent,
          bedrooms: property?.bedroomsTotal ?? 0,
          bathrooms: property?.bathroomsTotal ?? 0,
          squareFeet: property?.livingArea ?? undefined,
          images: [],
          status: isCurrent ? 'rented' : 'archived',
        }}
        onClick={onClick}
        showSave={false}
        className="h-full w-full"
      />
      <p className="text-xs text-muted-foreground px-1">
        Leased {formatLeaseDate(lease.startDate)} –{' '}
        {formatLeaseDate(lease.endDate)}
      </p>
    </div>
  );
}

export default function MyProperties() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-my-properties'],
    queryFn: async (): Promise<LeasedItem[]> => {
      const leases = await fetchAllPages((page, pageSize) =>
        listLeases({ tenantId: 'me', page, pageSize })
      );
      const ids = [...new Set(leases.map((l) => l.propertyId))];
      const props = await Promise.all(
        ids.map((id) => getProperty(id).catch(() => null))
      );
      const byId = new Map(ids.map((id, i) => [id, props[i]]));
      return leases.map((lease) => ({
        lease,
        property: byId.get(lease.propertyId) ?? null,
      }));
    },
  });

  const items = data ?? [];
  const current = items.filter((i) => !PAST_STATUSES.includes(i.lease.status));
  const past = items.filter((i) => PAST_STATUSES.includes(i.lease.status));

  const goToDetail = (item: LeasedItem) =>
    navigate(`/tenant/leases/${item.lease.id}`);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Home}
            title="Couldn’t load your properties"
            description="Something went wrong fetching your leases. Please try again."
          />
        </div>
      </ErrorBoundary>
    );
  }

  if (items.length === 0) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Home}
            title="No Properties Yet"
            description="You don't have any current or past lease agreements. Start by browsing available properties."
            action={{
              label: 'Browse Properties',
              onClick: () => navigate('/tenant/property-search'),
            }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Properties</h1>
            <p className="text-muted-foreground">
              Properties from your current and past lease agreements.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/tenant/property-search')}
          >
            <Search className="h-4 w-4 mr-2 hidden md:block" />
            Find New
          </Button>
        </div>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Current</h2>
            <span className="text-sm text-muted-foreground">
              {current.length}{' '}
              {current.length === 1 ? 'property' : 'properties'}
            </span>
          </div>
          {current.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              You don't have an active lease right now.
            </p>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {current.map((item) => (
                <LeasedPropertyCard
                  key={item.lease.id}
                  item={item}
                  onClick={() => goToDetail(item)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Past</h2>
            <span className="text-sm text-muted-foreground">
              {past.length} {past.length === 1 ? 'property' : 'properties'}
            </span>
          </div>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No past leases.
            </p>
          ) : (
            <div className="grid auto-rows-fr grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.map((item) => (
                <LeasedPropertyCard
                  key={item.lease.id}
                  item={item}
                  onClick={() => goToDetail(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
}
