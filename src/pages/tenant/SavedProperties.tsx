import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { propertyActionsService, type Favorite } from '@/services/propertyActionsService';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Bed, Bath, Square, DollarSign, Loader2, Heart, Trash2 } from 'lucide-react';

export default function SavedProperties() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await propertyActionsService.getFavorites(user.id);
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved properties. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    fetchFavorites();
  }, [user, navigate, fetchFavorites]);

  const handleRemoveFavorite = async (propertyId: string) => {
    if (!user) return;

    setRemovingId(propertyId);
    try {
      await propertyActionsService.removeFromFavorites(user.id, propertyId);
      setFavorites(favorites.filter(f => f.property_id !== propertyId));
      toast({
        title: 'Removed from favorites',
        description: 'Property removed from your saved list.',
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove property. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  const getPropertyImage = (property: Favorite['property']) => {
    if (property?.images && property.images.length > 0) {
      return property.images[0];
    }
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading saved properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Properties</h1>
              <p className="text-gray-600">
                {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
              </p>
            </div>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No saved properties yet</h2>
            <p className="text-gray-600 mb-6">
              Start browsing properties and save your favorites to view them here.
            </p>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const property = favorite.property;
              if (!property) return null;

              return (
                <Card
                  key={favorite.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div className="relative" onClick={() => handlePropertyClick(property.id)}>
                    <img
                      src={getPropertyImage(property)}
                      alt={property.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="default"
                        size="icon"
                        className="bg-white/90 hover:bg-white text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(property.id);
                        }}
                        disabled={removingId === property.id}
                      >
                        {removingId === property.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4" onClick={() => handlePropertyClick(property.id)}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="text-sm truncate">
                        {property.address}, {property.city}, {property.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Bed className="h-4 w-4 mr-1" />
                        <span>{property.bedrooms} bed</span>
                      </div>
                      <div className="flex items-center">
                        <Bath className="h-4 w-4 mr-1" />
                        <span>{property.bathrooms} bath</span>
                      </div>
                      {property.square_feet && (
                        <div className="flex items-center">
                          <Square className="h-4 w-4 mr-1" />
                          <span>{property.square_feet} sqft</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center text-2xl font-bold text-gray-900">
                        <DollarSign className="h-5 w-5" />
                        {property.price.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 ml-1">/mo</span>
                      </div>
                      {property.is_available && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Available
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePropertyClick(property.id);
                      }}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}