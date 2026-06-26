/**
 * Property Service
 * Handles all property-related operations with Supabase
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';
import type {
  Property,
  PropertyFormData,
  PropertySearchParams,
  PropertyListResponse,
  PropertyStatistics,
  Unit,
  HistoricalDataCount
} from '@/types/property';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

/**
 * Helper function to convert Supabase property row to Property type
 */
function mapPropertyRowToProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    title: row.title,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    propertyType: row.property_type as Property['propertyType'],
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms),
    squareFeet: row.square_feet,
    rent: Number(row.rent),
    securityDeposit: Number(row.security_deposit),
    availableDate: new Date(row.available_date),
    leaseTerms: row.lease_terms || [],
    amenities: row.amenities || [],
    petPolicy: row.pet_policy || 'No Pets',
    petsAllowed: row.pets_allowed || false,
    furnished: row.furnished || false,
    utilitiesIncluded: row.utilities_included || [],
    parkingAvailable: row.parking_available || false,
    images: row.images || [],
    status: row.status as Property['status'],
    views: row.views || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

/**
 * Helper function to convert PropertyFormData to Supabase insert format
 */
function mapFormDataToInsert(data: PropertyFormData, landlordId: string): PropertyInsert {
  return {
    landlord_id: landlordId,
    title: data.title,
    description: data.description || null,
    address: data.address,
    city: data.city,
    state: data.state,
    zip_code: data.zipCode,
    property_type: data.propertyType,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    square_feet: data.squareFeet,
    rent: data.rent,
    security_deposit: data.securityDeposit,
    available_date: data.availableDate,
    lease_terms: data.leaseTerms,
    amenities: data.amenities,
    pet_policy: data.petPolicy,
    pets_allowed: data.petsAllowed,
    furnished: data.furnished,
    utilities_included: data.utilitiesIncluded,
    parking_available: data.parkingAvailable,
    status: data.status
  };
}

class PropertyService {
  /**
   * Get all properties for a landlord with filters and pagination
   */
  async getProperties(
    landlordId: string,
    params: PropertySearchParams = {}
  ): Promise<PropertyListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        propertyType,
        city,
        minRent,
        maxRent,
        minBedrooms,
        maxBedrooms,
        minBathrooms,
        amenities,
        petsAllowed,
        furnished,
        parkingAvailable,
        search
      } = params;

      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('landlord_id', landlordId);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (propertyType && propertyType.length > 0) {
        query = query.in('property_type', propertyType);
      }

      if (city && city.length > 0) {
        query = query.in('city', city);
      }

      if (minRent !== undefined) {
        query = query.gte('rent', minRent);
      }

      if (maxRent !== undefined) {
        query = query.lte('rent', maxRent);
      }

      if (minBedrooms !== undefined) {
        query = query.gte('bedrooms', minBedrooms);
      }

      if (maxBedrooms !== undefined) {
        query = query.lte('bedrooms', maxBedrooms);
      }

      if (minBathrooms !== undefined) {
        query = query.gte('bathrooms', minBathrooms);
      }

      if (amenities && amenities.length > 0) {
        query = query.contains('amenities', amenities);
      }

      if (petsAllowed !== undefined) {
        query = query.eq('pets_allowed', petsAllowed);
      }

      if (furnished !== undefined) {
        query = query.eq('furnished', furnished);
      }

      if (parkingAvailable !== undefined) {
        query = query.eq('parking_available', parkingAvailable);
      }

      // Search by title or address
      if (search) {
        query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%`);
      }

      // Apply sorting
      const sortColumn = sortBy === 'createdAt' ? 'created_at' :
                        sortBy === 'updatedAt' ? 'updated_at' :
                        sortBy === 'availableDate' ? 'available_date' :
                        sortBy;

      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching properties:', error);
        throw new Error('Failed to fetch properties');
      }

      const properties = (data || []).map(mapPropertyRowToProperty);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        properties,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Error in getProperties:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch properties');
    }
  }

  /**
   * Get a single property by ID
   */
  async getPropertyById(propertyId: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching property:', error);
        throw new Error('Failed to fetch property');
      }

      return data ? mapPropertyRowToProperty(data) : null;
    } catch (error) {
      logger.error('Error in getPropertyById:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch property');
    }
  }

  /**
   * Create a new property
   */
  async createProperty(
    formData: PropertyFormData,
    landlordId: string
  ): Promise<Property> {
    try {
      const propertyInsert = mapFormDataToInsert(formData, landlordId);

      const { data, error } = await supabase
        .from('properties')
        .insert(propertyInsert)
        .select()
        .single();

      if (error) {
        logger.error('Error creating property:', error);
        throw new Error('Failed to create property');
      }

      if (!data) {
        throw new Error('No data returned from property creation');
      }

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'create_property',
        resource_type: 'property',
        resource_id: data.id,
        changes: { created: formData } as unknown as Database['public']['Tables']['audit_logs']['Insert']['changes']
      });

      return mapPropertyRowToProperty(data);
    } catch (error) {
      logger.error('Error in createProperty:', error);
      throw error instanceof Error ? error : new Error('Failed to create property');
    }
  }

  /**
   * Update an existing property
   */
  async updateProperty(
    propertyId: string,
    landlordId: string,
    formData: Partial<PropertyFormData>
  ): Promise<Property> {
    try {
      // Get original property for audit log
      const originalProperty = await this.getPropertyById(propertyId);

      const updates: PropertyUpdate = {};

      if (formData.title !== undefined) updates.title = formData.title;
      if (formData.description !== undefined) updates.description = formData.description || null;
      if (formData.address !== undefined) updates.address = formData.address;
      if (formData.city !== undefined) updates.city = formData.city;
      if (formData.state !== undefined) updates.state = formData.state;
      if (formData.zipCode !== undefined) updates.zip_code = formData.zipCode;
      if (formData.propertyType !== undefined) updates.property_type = formData.propertyType;
      if (formData.bedrooms !== undefined) updates.bedrooms = formData.bedrooms;
      if (formData.bathrooms !== undefined) updates.bathrooms = formData.bathrooms;
      if (formData.squareFeet !== undefined) updates.square_feet = formData.squareFeet;
      if (formData.rent !== undefined) updates.rent = formData.rent;
      if (formData.securityDeposit !== undefined) updates.security_deposit = formData.securityDeposit;
      if (formData.availableDate !== undefined) updates.available_date = formData.availableDate;
      if (formData.leaseTerms !== undefined) updates.lease_terms = formData.leaseTerms;
      if (formData.amenities !== undefined) updates.amenities = formData.amenities;
      if (formData.petPolicy !== undefined) updates.pet_policy = formData.petPolicy;
      if (formData.petsAllowed !== undefined) updates.pets_allowed = formData.petsAllowed;
      if (formData.furnished !== undefined) updates.furnished = formData.furnished;
      if (formData.utilitiesIncluded !== undefined) updates.utilities_included = formData.utilitiesIncluded;
      if (formData.parkingAvailable !== undefined) updates.parking_available = formData.parkingAvailable;
      if (formData.status !== undefined) updates.status = formData.status;

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId)
        .eq('landlord_id', landlordId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating property:', error);
        throw new Error('Failed to update property');
      }

      if (!data) {
        throw new Error('Property not found or unauthorized');
      }

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'update_property',
        resource_type: 'property',
        resource_id: propertyId,
        changes: {
          before: originalProperty,
          after: formData
        } as unknown as Database['public']['Tables']['audit_logs']['Insert']['changes']
      });

      return mapPropertyRowToProperty(data);
    } catch (error) {
      logger.error('Error in updateProperty:', error);
      throw error instanceof Error ? error : new Error('Failed to update property');
    }
  }

  /**
   * Get historical data count for a property
   * Used to warn users before deletion
   */
  async getHistoricalDataCount(propertyId: string): Promise<HistoricalDataCount> {
    try {
      // Count leases
      const { count: leasesCount } = await supabase
        .from('leases')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      // Count payments (through leases)
      const { data: leaseData } = await supabase
        .from('leases')
        .select('id')
        .eq('property_id', propertyId);

      const leaseIds = leaseData?.map(l => l.id) || [];
      let paymentsCount = 0;
      
      if (leaseIds.length > 0) {
        const { count } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .in('lease_id', leaseIds);
        paymentsCount = count || 0;
      }

      // Count maintenance requests
      const { count: maintenanceCount } = await supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      // Count applications
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      const totalLeases = leasesCount || 0;
      const totalPayments = paymentsCount;
      const totalMaintenanceRequests = maintenanceCount || 0;
      const totalApplications = applicationsCount || 0;

      return {
        leases: totalLeases,
        payments: totalPayments,
        maintenanceRequests: totalMaintenanceRequests,
        applications: totalApplications,
        hasHistoricalData: totalLeases > 0 || totalPayments > 0 || totalMaintenanceRequests > 0 || totalApplications > 0
      };
    } catch (error) {
      logger.error('Error in getHistoricalDataCount:', error);
      // Return zero counts on error to allow deletion
      return {
        leases: 0,
        payments: 0,
        maintenanceRequests: 0,
        applications: 0,
        hasHistoricalData: false
      };
    }
  }

  /**
   * Archive a property (soft delete)
   * Preserves all historical data
   */
  async archiveProperty(propertyId: string, landlordId: string): Promise<Property> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .eq('landlord_id', landlordId)
        .select()
        .single();

      if (error) {
        logger.error('Error archiving property:', error);
        throw new Error('Failed to archive property');
      }

      if (!data) {
        throw new Error('Property not found or unauthorized');
      }

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'archive_property',
        resource_type: 'property',
        resource_id: propertyId,
        changes: { status: 'archived' } as unknown as Database['public']['Tables']['audit_logs']['Insert']['changes']
      });

      return mapPropertyRowToProperty(data);
    } catch (error) {
      logger.error('Error in archiveProperty:', error);
      throw error instanceof Error ? error : new Error('Failed to archive property');
    }
  }

  /**
   * Delete a property (hard delete)
   * Should only be used after checking historical data
   */
  async deleteProperty(propertyId: string, landlordId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('landlord_id', landlordId);

      if (error) {
        logger.error('Error deleting property:', error);
        throw new Error('Failed to delete property');
      }

      // Log audit trail
      await supabase.from('audit_logs').insert({
        user_id: landlordId,
        action: 'delete_property',
        resource_type: 'property',
        resource_id: propertyId,
        changes: null
      });
    } catch (error) {
      logger.error('Error in deleteProperty:', error);
      throw error instanceof Error ? error : new Error('Failed to delete property');
    }
  }

  /**
   * Upload property images to Supabase Storage
   */
  async uploadPropertyImages(
    propertyId: string,
    files: File[]
  ): Promise<string[]> {
    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${propertyId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          logger.error('Error uploading image:', error);
          throw new Error(`Failed to upload image: ${file.name}`);
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      return uploadedUrls;
    } catch (error) {
      logger.error('Error in uploadPropertyImages:', error);
      throw error instanceof Error ? error : new Error('Failed to upload images');
    }
  }

  /**
   * Update property images
   */
  async updatePropertyImages(
    propertyId: string,
    imageUrls: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ images: imageUrls })
        .eq('id', propertyId);

      if (error) {
        logger.error('Error updating property images:', error);
        throw new Error('Failed to update property images');
      }
    } catch (error) {
      logger.error('Error in updatePropertyImages:', error);
      throw error instanceof Error ? error : new Error('Failed to update property images');
    }
  }

  /**
   * Get property statistics
   */
  async getPropertyStatistics(propertyId: string): Promise<PropertyStatistics> {
    try {
      // Get property views
      const { data: property } = await supabase
        .from('properties')
        .select('views')
        .eq('id', propertyId)
        .single();

      // Get total applications (from applications table if exists)
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      // Get active leases
      const { count: leasesCount } = await supabase
        .from('leases')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('status', 'active');

      // Get monthly revenue from active leases
      const { data: activeLeases } = await supabase
        .from('leases')
        .select('monthly_rent')
        .eq('property_id', propertyId)
        .eq('status', 'active');

      const monthlyRevenue = activeLeases?.reduce((sum, lease) => sum + lease.monthly_rent, 0) || 0;

      return {
        totalViews: property?.views || 0,
        totalApplications: applicationsCount || 0,
        activeLeases: leasesCount || 0,
        monthlyRevenue,
        occupancyRate: leasesCount && leasesCount > 0 ? 100 : 0
      };
    } catch (error) {
      logger.error('Error in getPropertyStatistics:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch property statistics');
    }
  }

  /**
   * Increment property views
   */
  async incrementPropertyViews(propertyId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_property_views', {
        property_uuid: propertyId
      });

      if (error) {
        logger.error('Error incrementing property views:', error);
      }
    } catch (error) {
      logger.error('Error in incrementPropertyViews:', error);
    }
  }

  /**
   * Get distinct cities for filter dropdown
   */
  async getCities(landlordId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('city')
        .eq('landlord_id', landlordId);

      if (error) {
        logger.error('Error fetching cities:', error);
        return [];
      }

      const cities = [...new Set(data.map(p => p.city))].filter(Boolean).sort();
      return cities;
    } catch (error) {
      logger.error('Error in getCities:', error);
      return [];
    }
  }
}

export const propertyService = new PropertyService();