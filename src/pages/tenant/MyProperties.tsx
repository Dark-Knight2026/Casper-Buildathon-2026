import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/property/PropertyCard';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  getMyCurrentProperties,
  getMyPastProperties,
  type LeasedProperty,
} from '@/data/tenantLeases';

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' }).format(d);

function LeasedPropertyCard({
  item,
  onClick,
}: {
  item: LeasedProperty;
  onClick: () => void;
}) {
  const { lease, property } = item;
  return (
    <div className="space-y-2 w-full [&>div]:w-full">
      <PropertyCard
        property={{
          id: property.id,
          title: property.title,
          address: property.address,
          city: property.city,
          state: property.state,
          price: lease.monthlyRent,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          squareFeet: property.squareFeet ?? undefined,
          images: property.images ?? [],
          status: lease.status === 'active' ? 'rented' : 'archived',
        }}
        onClick={onClick}
        showSave={false}
      />
      <p className="text-xs text-muted-foreground px-1">
        Leased {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
      </p>
    </div>
  );
}

export default function MyProperties() {
  const navigate = useNavigate();

  // TODO: replace with GET /api/v1/tenants/me/properties when backend is ready
  const current = getMyCurrentProperties();
  const past = getMyPastProperties();

  const goToDetail = (item: LeasedProperty) =>
    navigate(`/tenant/properties/${item.property.id}`, { state: { property: item.property } });

  if (current.length === 0 && past.length === 0) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            icon={Home}
            title="No Properties Yet"
            description="You don't have any current or past lease agreements. Start by browsing available properties."
            action={{ label: 'Browse Properties', onClick: () => navigate('/tenant/property-search') }}
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
          <Button variant="outline" onClick={() => navigate('/tenant/property-search')}>
            <Search className="h-4 w-4 mr-2" />
            Browse New
          </Button>
        </div>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Current</h2>
            <span className="text-sm text-muted-foreground">
              {current.length} {current.length === 1 ? 'property' : 'properties'}
            </span>
          </div>
          {current.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              You don't have an active lease right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {current.map((item) => (
                <LeasedPropertyCard key={item.lease.id} item={item} onClick={() => goToDetail(item)} />
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
            <p className="text-sm text-muted-foreground italic">No past leases.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.map((item) => (
                <LeasedPropertyCard key={item.lease.id} item={item} onClick={() => goToDetail(item)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
}
