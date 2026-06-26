/**
 * Buyer Favorites Page
 * Wishlist management with backend persistence
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { buyerService, BuyerFavorite } from '@/services/buyerService';

export default function BuyerFavorites() {
  const [favorites, setFavorites] = useState<BuyerFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadFavorites = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await buyerService.getFavorites(userId);
      setFavorites(data);
    } catch (err) {
      console.error('Error loading favorites:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load favorites';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadFavorites();
    }
  }, [userId, loadFavorites]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = buyerService.subscribeToFavorites(userId, () => {
      loadFavorites();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadFavorites]);

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      await buyerService.removeFavorite(favoriteId);
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      toast({
        title: 'Success',
        description: 'Property removed from favorites'
      });
    } catch (err) {
      console.error('Error removing favorite:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove favorite'
      });
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const filteredFavorites = favorites.filter((fav) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      fav.property?.title?.toLowerCase().includes(searchLower) ||
      fav.property?.address?.toLowerCase().includes(searchLower)
    );
  });

  if (loading && favorites.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  if (error && favorites.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Favorite Properties</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadFavorites}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Favorite Properties</h1>
            <p className="text-gray-500 mt-1">Your saved properties and wishlist</p>
          </div>
          <Button variant="outline" onClick={loadFavorites} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favorites.length}</div>
              <p className="text-xs text-gray-500 mt-1">Properties saved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {favorites.length > 0
                  ? formatPrice(
                      favorites.reduce((sum, f) => sum + (f.property?.price || 0), 0) /
                        favorites.length
                    )
                  : '$0'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all favorites</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {favorites.filter((f) => f.property?.status === 'available').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">Ready to view</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search favorites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Favorites Grid */}
        {filteredFavorites.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? 'No properties match your search'
                    : 'Start adding properties to your wishlist'}
                </p>
                <Button onClick={() => navigate('/dashboard/buyer/search')}>
                  <Search className="mr-2 h-4 w-4" />
                  Search Properties
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFavorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gray-200">
                  {favorite.property?.images && favorite.property.images.length > 0 ? (
                    <img
                      src={favorite.property.images[0]}
                      alt={favorite.property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <Badge
                    className="absolute top-2 right-2"
                    variant={favorite.property?.status === 'available' ? 'default' : 'secondary'}
                  >
                    {favorite.property?.status || 'Unknown'}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg mb-1">{favorite.property?.title}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {favorite.property?.address}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-primary-600">
                      {formatPrice(favorite.property?.price || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Bed className="h-4 w-4 mr-1" />
                      {favorite.property?.bedrooms || 0}
                    </div>
                    <div className="flex items-center">
                      <Bath className="h-4 w-4 mr-1" />
                      {favorite.property?.bathrooms || 0}
                    </div>
                    <div className="flex items-center">
                      <Square className="h-4 w-4 mr-1" />
                      {favorite.property?.sqft?.toLocaleString() || 0} sqft
                    </div>
                  </div>

                  {favorite.notes && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{favorite.notes}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="mr-1 h-3 w-3" />
                      Tour
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFavorite(favorite.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Added {favorite.addedAt.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}