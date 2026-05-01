import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MapPin, Bed, Bath, Square, Heart, Camera, TrendingUp, Star } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import { cn } from '@/lib/utils';
import type { Property } from '@/types/property';

const STATUS_LABELS: Record<Property['status'], string> = {
  active: 'For Rent',
  pending: 'Pending',
  rented: 'Rented',
  inactive: 'Inactive',
  archived: 'Archived',
};

export function FeaturedProperties() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {FEATURED_PROPERTIES.map((property) => (
        <Card
          key={property.id}
          className="group flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 border border-border bg-card cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => navigate(`/properties/${property.id}`, { state: { property } })}
          tabIndex={0}
          role="button"
          aria-label={`View details for ${property.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/properties/${property.id}`, { state: { property } });
            }
          }}
        >
          <div className="relative w-full overflow-hidden">
            {property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-56 object-cover"
              />
            ) : (
              <div className="w-full h-56 bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}

            <Badge variant="success" className="absolute top-3 left-3 shadow-sm">
              {STATUS_LABELS[property.status] ?? property.status}
            </Badge>

            <Badge variant="info" className="absolute top-3 right-3 shadow-sm flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {property.priceChange}
            </Badge>

            <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {property.photoCount}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-3 right-3 bg-card/90 hover:bg-card p-2 rounded-full shadow-sm h-8 w-8"
              aria-label={
                favorites.includes(property.id)
                  ? `Remove ${property.title} from favorites`
                  : `Save ${property.title} to favorites`
              }
              aria-pressed={favorites.includes(property.id)}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(property.id);
              }}
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  favorites.includes(property.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                )}
              />
            </Button>
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
                ${property.rent.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-yellow-500" />
                {property.rating}
              </div>
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
              {property.squareFeet ? (
                <span className="flex items-center gap-1">
                  <Square className="h-4 w-4" />
                  {property.squareFeet.toLocaleString()} sqft
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{property.daysOnMarket} days on market</span>
              {property.squareFeet ? (
                <span className="font-medium text-foreground">
                  ${Math.round(property.rent / property.squareFeet)}/sqft
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
