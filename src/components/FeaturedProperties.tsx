import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Camera,
  TrendingUp,
  Star
} from 'lucide-react';

export default function FeaturedProperties() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    );
  };

  const featuredProperties = [
    {
      id: 1,
      title: 'Stunning Waterfront Colonial',
      address: '1234 Ocean View Drive, Virginia Beach, VA',
      price: 485000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2850,
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 12,
      priceChange: '+2.5%',
      rating: 4.8,
      photos: 24
    },
    {
      id: 2,
      title: 'Modern Downtown Condo',
      address: '567 Main Street, Norfolk, VA',
      price: 325000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 8,
      priceChange: '+1.8%',
      rating: 4.6,
      photos: 18
    },
    {
      id: 3,
      title: 'Charming Suburban Home',
      address: '890 Maple Lane, Chesapeake, VA',
      price: 395000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1950,
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 15,
      priceChange: '+3.2%',
      rating: 4.7,
      photos: 21
    },
    {
      id: 4,
      title: 'Luxury Estate with Pool',
      address: '123 Executive Drive, Virginia Beach, VA',
      price: 750000,
      bedrooms: 5,
      bathrooms: 4,
      sqft: 3500,
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 22,
      priceChange: '+1.2%',
      rating: 4.9,
      photos: 32
    },
    {
      id: 5,
      title: 'Historic Townhouse',
      address: '456 Heritage Street, Portsmouth, VA',
      price: 285000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1650,
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 18,
      priceChange: '+4.1%',
      rating: 4.5,
      photos: 16
    },
    {
      id: 6,
      title: 'Contemporary Loft',
      address: '789 Arts District, Norfolk, VA',
      price: 425000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1400,
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 6,
      priceChange: '+2.8%',
      rating: 4.8,
      photos: 19
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {featuredProperties.map((property) => (
        <Card
          key={property.id}
          className="group overflow-hidden hover:shadow-md transition-shadow duration-200 border border-border bg-card cursor-pointer rounded-md"
          onClick={() => navigate(`/properties/${property.id}`)}
        >
          <div className="relative overflow-hidden">
            <img
              src={property.image}
              alt={property.title}
              className="w-full h-56 object-cover"
            />

            {/* Status Badge */}
            <Badge variant="success" className="absolute top-3 left-3 shadow-sm">
              {property.status}
            </Badge>

            {/* Price Change */}
            <Badge variant="info" className="absolute top-3 right-3 shadow-sm flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {property.priceChange}
            </Badge>

            {/* Photo Count */}
            <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {property.photos}
            </div>

            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-3 right-3 bg-card/90 hover:bg-card p-2 rounded-full shadow-sm h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(property.id);
              }}
            >
              <Heart
                className={`h-4 w-4 ${
                  favorites.includes(property.id)
                    ? 'fill-red-500 text-red-500'
                    : 'text-muted-foreground'
                }`}
              />
            </Button>
          </div>

          <CardContent className="p-5">
            <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            <p className="text-muted-foreground text-sm flex items-center gap-1 mb-4">
              <MapPin className="h-4 w-4 shrink-0" />
              {property.address}
            </p>

            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-primary">
                ${property.price.toLocaleString()}
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
              <span className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                {property.sqft.toLocaleString()} sqft
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{property.daysOnMarket} days on market</span>
              <span className="font-medium text-foreground">
                ${Math.round(property.price / property.sqft)}/sqft
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
