/**
 * React Query hooks for property operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { PropertyFeatures } from '@/types/matching';
import type { PropertyFilterState } from '@/components/marketplace/property/PropertyFilters';

interface Property extends PropertyFeatures {
  id: string;
  landlord_id: string;
  title: string;
  description?: string;
  images: string[];
  status: string;
  views: number;
  created_at: string;
  updated_at: string;
}

interface PropertyWithLandlord extends Property {
  landlord: {
    id: string;
    full_name: string;
    avatar_url?: string;
    rating?: number;
  };
}

// Fetch all properties with optional filters
export function useProperties(filters?: PropertyFilterState) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select(`
          *,
          landlord:user_profiles!landlord_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'active');

      // Apply filters
      if (filters) {
        if (filters.priceRange) {
          query = query
            .gte('rent', filters.priceRange[0])
            .lte('rent', filters.priceRange[1]);
        }

        if (filters.location) {
          query = query.or(`city.ilike.%${filters.location}%,address.ilike.%${filters.location}%`);
        }

        if (filters.propertyTypes && filters.propertyTypes.length > 0) {
          query = query.in('property_type', filters.propertyTypes);
        }

        if (filters.bedrooms !== null) {
          query = query.gte('bedrooms', filters.bedrooms);
        }

        if (filters.bathrooms !== null) {
          query = query.gte('bathrooms', filters.bathrooms);
        }

        if (filters.minSquareFeet) {
          query = query.gte('square_feet', filters.minSquareFeet);
        }

        if (filters.maxSquareFeet) {
          query = query.lte('square_feet', filters.maxSquareFeet);
        }

        if (filters.amenities && filters.amenities.length > 0) {
          query = query.contains('amenities', filters.amenities);
        }

        if (filters.furnished !== null) {
          query = query.eq('furnished', filters.furnished);
        }

        if (filters.availableFrom) {
          query = query.gte('available_date', filters.availableFrom);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as PropertyWithLandlord[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch single property by ID
export function useProperty(propertyId: string) {
  return useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:user_profiles!landlord_id (
            id,
            full_name,
            avatar_url,
            phone
          ),
          reviews:reviews!property_id (
            id,
            rating,
            comment,
            reviewer:user_profiles!reviewer_id (
              full_name,
              avatar_url
            ),
            created_at
          )
        `)
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase.rpc('increment_property_views', { property_uuid: propertyId });

      return data;
    },
    enabled: !!propertyId,
  });
}

// Fetch properties by landlord
export function useLandlordProperties(landlordId?: string) {
  return useQuery({
    queryKey: ['landlord-properties', landlordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', landlordId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
    enabled: !!landlordId,
  });
}

// Create property mutation
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (property: Partial<Property>) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(property)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
    },
  });
}

// Update property mutation
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Property> }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', data.id] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
    },
  });
}

// Delete property mutation
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-properties'] });
    },
  });
}

// Toggle favorite mutation
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, propertyId, isFavorited }: { 
      userId: string; 
      propertyId: string; 
      isFavorited: boolean;
    }) => {
      if (isFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_id', propertyId);

        if (error) throw error;
      } else {
        // Add favorite
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, property_id: propertyId });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

// Fetch user favorites
export function useFavorites(userId?: string) {
  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          property_id,
          property:properties (
            *,
            landlord:user_profiles!landlord_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId!);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}