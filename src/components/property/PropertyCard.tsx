import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SavePropertyButton } from '@/components/property/SavePropertyButton';
import {
  MapPin,
  Bed,
  Bath,
  Square,
  TrendingUp,
  Star,
  Camera,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SurroundingCategory } from '@/types/property';
import { SURROUNDING_CATEGORIES } from '@/data/amenityCategories';

type PropertyStatus = 'active' | 'pending' | 'rented' | 'inactive' | 'archived';

const STATUS_LABELS: Record<PropertyStatus, string> = {
  active: 'For Rent',
  pending: 'Pending',
  rented: 'Rented',
  inactive: 'Inactive',
  archived: 'Archived',
};

export interface PropertyCardData {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  images: string[];
  status?: PropertyStatus;
  priceChange?: string;
  rating?: number;
  daysOnMarket?: number;
  photoCount?: number;
  // Trust indicators derived from the listing's provenance gate. Optional so
  // the lease-history cards (which have no listing) can omit them.
  verifiedListerBadge?: boolean;
  onChainProvenance?: boolean;
}

interface PropertyCardProps {
  property: PropertyCardData;
  onClick: () => void;
  showSave?: boolean;
  className?: string;
  // Per-category POI distance chips (spec §2.3.2). Populated only when the
  // card is rendered as part of an extended search result — undefined values
  // mean the category has no nearby POI for this property.
  nearestByCategory?: Partial<Record<SurroundingCategory, number>>;
  // Compare-selection wiring. Rendered only when `onToggleCompare` is provided
  // (i.e. on surfaces that support comparison), so other consumers of the card
  // are unaffected. `compareDisabled` reflects the selection cap being reached.
  compareSelected?: boolean;
  onToggleCompare?: () => void;
  compareDisabled?: boolean;
}

const CATEGORY_LABEL: Record<SurroundingCategory, string> =
  SURROUNDING_CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.category]: c.label }),
    {} as Record<SurroundingCategory, string>
  );

const formatDistance = (miles: number): string =>
  miles < 1 ? `${(miles * 5280).toFixed(0)}ft` : `${miles.toFixed(1)}mi`;

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

export function PropertyCard({
  property,
  onClick,
  showSave = true,
  className,
  nearestByCategory,
  compareSelected = false,
  onToggleCompare,
  compareDisabled = false,
}: PropertyCardProps) {
  const image = property.images?.[0] ?? FALLBACK_IMAGE;
  const distanceEntries = nearestByCategory
    ? (
        Object.entries(nearestByCategory) as Array<
          [SurroundingCategory, number]
        >
      ).filter(([, miles]) => typeof miles === 'number')
    : [];

  return (
    <Card
      className={cn(
        'group flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 border border-border bg-card cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${property.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative w-full overflow-hidden">
        <img
          src={image}
          alt={property.title}
          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <Badge variant="success" className="absolute top-3 left-3 shadow-sm">
          {STATUS_LABELS[property.status ?? 'active']}
        </Badge>

        {property.priceChange && (
          <Badge
            variant="info"
            className="absolute top-3 right-3 shadow-sm flex items-center gap-1"
          >
            <TrendingUp className="h-3 w-3" />
            {property.priceChange}
          </Badge>
        )}

        {property.photoCount && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {property.photoCount}
          </div>
        )}

        {showSave && (
          <SavePropertyButton iconOnly className="absolute bottom-3 right-3" />
        )}
      </div>

      <CardContent className="p-5 w-full flex-1 flex flex-col">
        <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
          {property.title}
        </h3>
        <p className="text-muted-foreground text-sm flex items-center gap-1 mb-4">
          <MapPin className="h-4 w-4 shrink-0" />
          {property.address}, {property.city}, {property.state}
        </p>

        {(property.verifiedListerBadge || property.onChainProvenance) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {property.verifiedListerBadge && (
              <Badge
                variant="secondary"
                className="text-xs font-normal flex items-center gap-1"
              >
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Verified lister
              </Badge>
            )}
            {property.onChainProvenance && (
              <Badge
                variant="secondary"
                className="text-xs font-normal flex items-center gap-1"
              >
                <Link2 className="h-3 w-3 text-sky-600" />
                On-chain
              </Badge>
            )}
          </div>
        )}

        {distanceEntries.length > 0 && (
          <div
            className="flex flex-wrap gap-1 mb-4"
            aria-label="Nearby points of interest"
          >
            {distanceEntries.map(([category, miles]) => (
              <Badge
                key={category}
                variant="secondary"
                className="text-xs font-normal"
              >
                {CATEGORY_LABEL[category]} {formatDistance(miles)}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-primary">
            ${property.price.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground">
              /mo
            </span>
          </div>
          {property.rating && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              {property.rating}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 border-t border-border pt-4">
          <span className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            {property.bathrooms} bath
          </span>
          {property.squareFeet && (
            <span className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              {property.squareFeet.toLocaleString()} sqft
            </span>
          )}
        </div>

        {property.daysOnMarket !== undefined && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{property.daysOnMarket} days on market</span>
            {property.squareFeet && (
              <span className="font-medium text-foreground">
                ${Math.round(property.price / property.squareFeet)}/sqft
              </span>
            )}
          </div>
        )}

        {onToggleCompare && (
          // Stop propagation so toggling compare doesn't trigger the card's
          // navigate-to-detail click/keyboard handlers.
          <div
            className="mt-3 pt-3 border-t border-border"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={compareSelected}
                onCheckedChange={() => onToggleCompare()}
                disabled={compareDisabled && !compareSelected}
                aria-label={`Compare ${property.title}`}
              />
              Compare
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
