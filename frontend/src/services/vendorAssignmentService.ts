import { supabase } from '@/lib/supabase/client';
import type {
  VendorAssignment,
  AssignVendorParams,
  UpdateAssignmentParams,
  AssignmentStatus,
} from '@/types/vendor';

class VendorAssignmentService {
  /**
   * Assign vendor to maintenance request
   */
  async assignVendor(params: AssignVendorParams): Promise<VendorAssignment> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vendor_assignments')
        .insert({
          vendor_id: params.vendor_id,
          maintenance_request_id: params.maintenance_request_id,
          assigned_by: user.id,
          estimated_cost: params.estimated_cost,
          notes: params.notes,
          status: 'assigned',
        })
        .select()
        .single();

      if (error) throw error;
      return data as VendorAssignment;
    } catch (error) {
      console.error('Error assigning vendor:', error);
      throw error;
    }
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    id: string,
    params: UpdateAssignmentParams
  ): Promise<VendorAssignment> {
    try {
      const { data, error } = await supabase
        .from('vendor_assignments')
        .update({
          ...params,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as VendorAssignment;
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Cancel assignment
   */
  async cancelAssignment(id: string, reason?: string): Promise<void> {
    try {
      const updateData: UpdateAssignmentParams = {
        status: 'cancelled',
      };

      if (reason) {
        updateData.notes = reason;
      }

      await this.updateAssignment(id, updateData);
    } catch (error) {
      console.error('Error cancelling assignment:', error);
      throw error;
    }
  }

  /**
   * Get assignment by ID
   */
  async getAssignment(id: string): Promise<VendorAssignment> {
    try {
      const { data, error } = await supabase
        .from('vendor_assignments')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as VendorAssignment;
    } catch (error) {
      console.error('Error getting assignment:', error);
      throw error;
    }
  }

  /**
   * Get all assignments for a vendor
   */
  async getVendorAssignments(vendorId: string): Promise<VendorAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_assignments')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data as VendorAssignment[]) || [];
    } catch (error) {
      console.error('Error getting vendor assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignments for a maintenance request
   */
  async getMaintenanceRequestAssignments(
    requestId: string
  ): Promise<VendorAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_assignments')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('maintenance_request_id', requestId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return (data as VendorAssignment[]) || [];
    } catch (error) {
      console.error('Error getting maintenance request assignments:', error);
      throw error;
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    id: string,
    status: AssignmentStatus
  ): Promise<void> {
    try {
      const updateData: UpdateAssignmentParams = { status };

      // Set timestamps based on status
      switch (status) {
        case 'accepted':
          updateData.accepted_at = new Date();
          break;
        case 'in_progress':
          updateData.started_at = new Date();
          break;
        case 'completed':
          updateData.completed_at = new Date();
          break;
      }

      await this.updateAssignment(id, updateData);
    } catch (error) {
      console.error('Error updating assignment status:', error);
      throw error;
    }
  }

  /**
   * Get active assignment for maintenance request
   */
  async getActiveAssignment(requestId: string): Promise<VendorAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('vendor_assignments')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('maintenance_request_id', requestId)
        .in('status', ['assigned', 'accepted', 'in_progress'])
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return (data as VendorAssignment) || null;
    } catch (error) {
      console.error('Error getting active assignment:', error);
      return null;
    }
  }
}

export const vendorAssignmentService = new VendorAssignmentService();