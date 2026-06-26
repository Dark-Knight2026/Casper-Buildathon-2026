/**
 * React Query hooks for match operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { MatchingService } from '@/services/matchingService';
import type { MatchScore, TenantPreferences, PropertyFeatures } from '@/types/matching';

const matchingService = new MatchingService();

interface CompatibilityMetrics {
  priceCompatibility: number;
  locationCompatibility: number;
  amenityCompatibility: number;
  leaseTermCompatibility: number;
  petPolicyCompatibility: number;
}

interface PropertyInfo {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  landlord?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface TenantInfo {
  full_name: string;
  avatar_url?: string;
}

interface Match {
  id: string;
  property_id: string;
  tenant_id: string;
  overall_score: number;
  price_score: number;
  location_score: number;
  amenity_score: number;
  lease_term_score: number;
  pet_policy_score: number;
  rank: number;
  highlights: string[];
  compatibility_metrics: CompatibilityMetrics;
  status: string;
  viewed_at?: string;
  created_at: string;
  property?: PropertyInfo;
  tenant?: TenantInfo;
}

// Fetch tenant matches (property recommendations)
export function useTenantMatches(tenantId?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['tenant-matches', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');

      // Get tenant preferences
      const { data: tenantProfile, error: profileError } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', tenantId)
        .single();

      if (profileError) throw profileError;

      // Get active properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:user_profiles!landlord_id (
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .limit(100); // Get top 100 to score

      if (propertiesError) throw propertiesError;

      // Calculate match scores using matching service
      const tenantPreferences: TenantPreferences = {
        budgetMin: Number(tenantProfile.budget_min),
        budgetMax: Number(tenantProfile.budget_max),
        preferredLocations: tenantProfile.preferred_locations || [],
        desiredBedrooms: tenantProfile.desired_bedrooms,
        desiredBathrooms: tenantProfile.desired_bathrooms,
        desiredAmenities: tenantProfile.desired_amenities || [],
        requiredAmenities: tenantProfile.required_amenities || [],
        leaseTermPreference: tenantProfile.lease_term_preference,
        moveInDate: tenantProfile.move_in_date ? new Date(tenantProfile.move_in_date) : undefined,
        hasPets: tenantProfile.has_pets,
        petTypes: tenantProfile.pet_types || [],
      };

      const matchScores = await Promise.all(
        properties.map(async (property) => {
          const propertyFeatures: PropertyFeatures = {
            address: property.address,
            city: property.city,
            state: property.state,
            zipCode: property.zip_code,
            latitude: property.latitude ? Number(property.latitude) : undefined,
            longitude: property.longitude ? Number(property.longitude) : undefined,
            propertyType: property.property_type,
            bedrooms: property.bedrooms,
            bathrooms: Number(property.bathrooms),
            squareFeet: property.square_feet,
            rent: Number(property.rent),
            securityDeposit: Number(property.security_deposit),
            availableDate: new Date(property.available_date),
            leaseTerms: property.lease_terms || [],
            amenities: property.amenities || [],
            petPolicy: property.pet_policy,
            petsAllowed: property.pets_allowed,
            furnished: property.furnished,
            utilitiesIncluded: property.utilities_included || [],
            parkingAvailable: property.parking_available,
          };

          const score = await matchingService.calculateMatchScore(
            tenantPreferences,
            propertyFeatures
          );

          return {
            ...score,
            property,
          };
        })
      );

      // Sort by overall score and limit
      const topMatches = matchScores
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, limit);

      // Store matches in database
      await Promise.all(
        topMatches.map(async (match, index) => {
          const { error } = await supabase
            .from('matches')
            .upsert({
              property_id: match.property.id,
              tenant_id: tenantId,
              overall_score: match.overallScore,
              price_score: match.componentScores.priceScore,
              location_score: match.componentScores.locationScore,
              amenity_score: match.componentScores.amenityScore,
              lease_term_score: match.componentScores.leaseTermScore,
              pet_policy_score: match.componentScores.petPolicyScore,
              rank: index + 1,
              highlights: match.highlights || [],
              compatibility_metrics: match.compatibilityMetrics,
              status: 'active',
            }, {
              onConflict: 'property_id,tenant_id',
            });

          if (error) console.error('Error storing match:', error);
        })
      );

      // Create notification for new matches
      if (topMatches.length > 0) {
        await supabase.rpc('create_notification', {
          p_user_id: tenantId,
          p_type: 'new_match',
          p_title: 'New Property Matches',
          p_message: `We found ${topMatches.length} properties that match your preferences!`,
          p_data: { match_count: topMatches.length },
        });
      }

      return topMatches;
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Fetch property matches (tenant recommendations for landlords)
export function usePropertyMatches(propertyId?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['property-matches', propertyId, limit],
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID required');

      const matches = await matchingService.getTenantMatches(propertyId, limit);
      return matches;
    },
    enabled: !!propertyId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Fetch stored matches from database
export function useStoredMatches(userId?: string, role: 'tenant' | 'landlord' = 'tenant') {
  return useQuery({
    queryKey: ['stored-matches', userId, role],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      let query = supabase
        .from('matches')
        .select(`
          *,
          property:properties (
            *,
            landlord:user_profiles!landlord_id (
              full_name,
              avatar_url
            )
          )
        `);

      if (role === 'tenant') {
        query = query.eq('tenant_id', userId);
      } else {
        // For landlords, get matches for their properties
        const { data: properties } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', userId);

        if (properties) {
          const propertyIds = properties.map(p => p.id);
          query = query.in('property_id', propertyIds);
        }
      }

      const { data, error } = await query
        .eq('status', 'active')
        .order('overall_score', { ascending: false });

      if (error) throw error;
      return data as Match[];
    },
    enabled: !!userId,
  });
}

// Update match status
export function useUpdateMatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      matchId, 
      status, 
      viewed 
    }: { 
      matchId: string; 
      status?: string; 
      viewed?: boolean;
    }) => {
      const updates: Record<string, string> = {};
      if (status) updates.status = status;
      if (viewed) updates.viewed_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stored-matches'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-matches'] });
    },
  });
}

// Calculate match score for a specific property-tenant pair
export function useCalculateMatchScore(
  tenantPreferences?: TenantPreferences,
  propertyFeatures?: PropertyFeatures
) {
  return useQuery({
    queryKey: ['match-score', tenantPreferences, propertyFeatures],
    queryFn: async () => {
      if (!tenantPreferences || !propertyFeatures) {
        throw new Error('Both tenant preferences and property features required');
      }

      const score = await matchingService.calculateMatchScore(
        tenantPreferences,
        propertyFeatures
      );

      return score;
    },
    enabled: !!tenantPreferences && !!propertyFeatures,
  });
}