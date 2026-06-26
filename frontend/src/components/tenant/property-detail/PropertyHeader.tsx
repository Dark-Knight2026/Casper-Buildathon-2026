import { Bed, Bath, MapPin, Square } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Property } from '@/types/property';
import type { TenantLease } from '@/data/tenantLeases';
import { FALLBACK_PROPERTY_IMAGE, LEASE_STATUS_BADGE } from './shared';

interface PropertyHeaderProps {
  property: Property;
  currentLease: TenantLease;
}

export function PropertyHeader({ property, currentLease }: PropertyHeaderProps) {
  const heroImage = property.images?.[0] ?? FALLBACK_PROPERTY_IMAGE;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <img
            src={heroImage}
            alt={property.title}
            className="w-full h-32 md:h-full md:max-h-40 object-cover md:rounded-l-lg"
          />
          <div className="p-4 md:col-span-2 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={LEASE_STATUS_BADGE[currentLease.status]}>
                  {currentLease.status.toUpperCase()}
                </Badge>
                <Badge variant="outline">{property.propertyType}</Badge>
              </div>
              <h1 className="text-lg font-bold leading-tight">{property.title}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {property.address}, {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" /> {property.bedrooms} bed
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" /> {property.bathrooms} bath
              </span>
              {property.squareFeet && (
                <span className="flex items-center gap-1">
                  <Square className="h-3.5 w-3.5" /> {property.squareFeet.toLocaleString()} sqft
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
