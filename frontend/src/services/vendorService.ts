import { supabase } from '@/lib/supabase/client';
import type {
  Vendor,
  CreateVendorParams,
  UpdateVendorParams,
  VendorFilterParams,
  VendorCategory,
  VendorStatus,
} from '@/types/vendor';

class VendorService {
  /**
   * Create a new vendor
   */
  async createVendor(params: CreateVendorParams): Promise<Vendor> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vendors')
        .insert({
          landlord_id: user.id,
          company_name: params.company_name,
          contact_name: params.contact_name,
          email: params.email,
          phone: params.phone,
          category: params.category,
          service_areas: params.service_areas || [],
          address: params.address,
          city: params.city,
          state: params.state,
          zip_code: params.zip_code,
          license_number: params.license_number,
          insurance_expiry: params.insurance_expiry?.toISOString(),
          hourly_rate: params.hourly_rate,
          emergency_available: params.emergency_available || false,
          preferred: params.preferred || false,
          notes: params.notes,
          website: params.website,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  /**
   * Update vendor
   */
  async updateVendor(id: string, params: UpdateVendorParams): Promise<Vendor> {
    try {
      const updateData: Record<string, unknown> = {
        ...params,
        updated_at: new Date().toISOString(),
      };

      if (params.insurance_expiry) {
        updateData.insurance_expiry = params.insurance_expiry.toISOString();
      }

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  }

  /**
   * Delete vendor
   */
  async deleteVendor(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
  }

  /**
   * Get vendor by ID
   */
  async getVendor(id: string): Promise<Vendor> {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Vendor;
    } catch (error) {
      console.error('Error getting vendor:', error);
      throw error;
    }
  }

  /**
   * Get all vendors with optional filters
   */
  async getVendors(filters?: VendorFilterParams): Promise<Vendor[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('vendors')
        .select('*')
        .eq('landlord_id', user.id);

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.emergency_available !== undefined) {
        query = query.eq('emergency_available', filters.emergency_available);
      }

      if (filters?.preferred !== undefined) {
        query = query.eq('preferred', filters.preferred);
      }

      if (filters?.service_area) {
        query = query.contains('service_areas', [filters.service_area]);
      }

      if (filters?.search) {
        query = query.or(
          `company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      query = query.order('company_name', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return (data as Vendor[]) || [];
    } catch (error) {
      console.error('Error getting vendors:', error);
      throw error;
    }
  }

  /**
   * Search vendors
   */
  async searchVendors(query: string): Promise<Vendor[]> {
    return this.getVendors({ search: query });
  }

  /**
   * Get vendors by category
   */
  async getVendorsByCategory(category: VendorCategory): Promise<Vendor[]> {
    return this.getVendors({ category });
  }

  /**
   * Get preferred vendors
   */
  async getPreferredVendors(): Promise<Vendor[]> {
    return this.getVendors({ preferred: true, status: 'active' });
  }

  /**
   * Toggle preferred status
   */
  async togglePreferred(id: string): Promise<void> {
    try {
      const vendor = await this.getVendor(id);
      await this.updateVendor(id, { preferred: !vendor.preferred });
    } catch (error) {
      console.error('Error toggling preferred:', error);
      throw error;
    }
  }

  /**
   * Update vendor status
   */
  async updateVendorStatus(id: string, status: VendorStatus): Promise<void> {
    try {
      await this.updateVendor(id, { status });
    } catch (error) {
      console.error('Error updating vendor status:', error);
      throw error;
    }
  }

  /**
   * Get vendors for maintenance request (by category and service area)
   */
  async getVendorsForMaintenanceRequest(
    category: VendorCategory,
    serviceArea?: string
  ): Promise<Vendor[]> {
    const filters: VendorFilterParams = {
      category,
      status: 'active',
    };

    if (serviceArea) {
      filters.service_area = serviceArea;
    }

    return this.getVendors(filters);
  }
}

export const vendorService = new VendorService();