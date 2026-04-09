import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SavePropertyButton } from '@/components/property/SavePropertyButton';
import { MapPin, Bed, Bath, Square, TrendingUp, Star, Camera } from 'lucide-react';

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
  priceChange?: string;
  rating?: number;
  daysOnMarket?: number;
  photoCount?: number;
}

interface PropertyCardProps {
  property: PropertyCardData;
  onClick: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const image = property.images?.[0] ?? FALLBACK_IMAGE;

  return (
    <Card
      className="group flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 border border-border bg-card cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          For Rent
        </Badge>

        {property.priceChange && (
          <Badge variant="info" className="absolute top-3 right-3 shadow-sm flex items-center gap-1">
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

        <SavePropertyButton iconOnly className="absolute bottom-3 right-3" />
      </div>

      <CardContent className="p-5 w-full">
        <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
          {property.title}
        </h3>
        <p className="text-muted-foreground text-sm flex items-center gap-1 mb-4">
          <MapPin className="h-4 w-4 shrink-0" />
          {property.address}, {property.city}, {property.state}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-primary">
            ${property.price.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
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
      </CardContent>
    </Card>
  );
}
