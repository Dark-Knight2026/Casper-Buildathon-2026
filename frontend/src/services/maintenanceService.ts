/**
 * Maintenance Service
 * Handles all maintenance request operations
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import type { Database } from '@/types/supabase';

export type IssueType = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'other';
export type Priority = 'low' | 'medium' | 'high' | 'emergency';
export type RequestStatus = 'submitted' | 'assigned' | 'in_progress' | 'completed' | 'closed';
export type SenderType = 'tenant' | 'landlord' | 'vendor';

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  vendorId: string | null;
  title: string;
  description: string;
  issueType: IssueType;
  priority: Priority;
  status: RequestStatus;
  preferredAccessTime: Date | null;
  permissionToEnter: boolean;
  estimatedCost: number | null;
  actualCost: number | null;
  completedAt: Date | null;
  rating: number | null;
  review: string | null;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
  // Relations
  property?: {
    title: string;
    address: string;
    city: string;
    state: string;
  };
  tenant?: {
    fullName: string;
    email: string;
    phone: string | null;
  };
  landlord?: {
    fullName: string;
    email: string;
    phone: string | null;
  };
  vendor?: {
    fullName: string;
    email: string;
    phone: string | null;
    company: string | null;
  };
}

export interface MaintenanceMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderType: SenderType;
  message: string;
  attachments: string[];
  createdAt: Date;
  sender?: {
    fullName: string;
  };
}

export interface CreateRequestData {
  propertyId: string;
  tenantId: string;
  landlordId: string;
  title: string;
  description: string;
  issueType: IssueType;
  priority: Priority;
  permissionToEnter: boolean;
  preferredAccessTime?: Date;
  photos?: File[];
}

export interface RequestFilters {
  status?: RequestStatus[];
  priority?: Priority[];
  issueType?: IssueType[];
  propertyId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface DatabaseRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  vendor_id: string | null;
  title: string;
  description: string;
  issue_type: IssueType;
  priority: Priority;
  status: RequestStatus;
  preferred_access_time: string | null;
  permission_to_enter: boolean;
  estimated_cost: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  rating: number | null;
  review: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
  property?: {
    title: string;
    address: string;
    city: string;
    state: string;
  };
  tenant?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  landlord?: {
    full_name: string;
    email: string;
    phone: string | null;
  };
  vendor?: {
    full_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  };
}

interface DatabaseMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_type: SenderType;
  message: string;
  attachments: string[] | null;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

type MaintenanceRequestQuery = PostgrestFilterBuilder<
  Database['public'],
  Database['public']['Tables']['maintenance_requests']['Row'],
  unknown
>;

class MaintenanceService {
  /**
   * Create a new maintenance request
   */
  async createRequest(data: CreateRequestData): Promise<MaintenanceRequest> {
    try {
      // Upload photos first if any
      let photoUrls: string[] = [];
      if (data.photos && data.photos.length > 0) {
        photoUrls = await this.uploadPhotos(data.photos);
      }

      // Create request
      const { data: request, error } = await supabase
        .from('maintenance_requests')
        .insert({
          property_id: data.propertyId,
          tenant_id: data.tenantId,
          landlord_id: data.landlordId,
          title: data.title,
          description: data.description,
          issue_type: data.issueType,
          priority: data.priority,
          status: 'submitted',
          preferred_access_time: data.preferredAccessTime?.toISOString() || null,
          permission_to_enter: data.permissionToEnter,
          photos: photoUrls
        })
        .select(`
          *,
          property:properties(title, address, city, state),
          tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone)
        `)
        .single();

      if (error) {
        logger.error('Error creating maintenance request:', error);
        throw new Error('Failed to create maintenance request');
      }

      // Send notification to landlord
      await this.notifyLandlord(request);

      // Send SMS for emergency requests
      if (data.priority === 'emergency' && request.landlord?.phone) {
        await smsService.sendMaintenanceAlert(
          request.landlord.phone,
          request.title,
          request.property?.address || 'Unknown property'
        );
      }

      return this.mapRequest(request);
    } catch (error) {
      logger.error('Error in createRequest:', error);
      throw error instanceof Error ? error : new Error('Failed to create maintenance request');
    }
  }

  /**
   * Get requests by tenant
   */
  async getRequestsByTenant(
    tenantId: string,
    filters?: RequestFilters
  ): Promise<MaintenanceRequest[]> {
    try {
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties(title, address, city, state),
          tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
          vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone)
        `)
        .eq('tenant_id', tenantId);

      query = this.applyFilters(query, filters);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching tenant requests:', error);
        throw new Error('Failed to fetch maintenance requests');
      }

      return data.map(this.mapRequest);
    } catch (error) {
      logger.error('Error in getRequestsByTenant:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch maintenance requests');
    }
  }

  /**
   * Get requests by landlord
   */
  async getRequestsByLandlord(
    landlordId: string,
    filters?: RequestFilters
  ): Promise<MaintenanceRequest[]> {
    try {
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties(title, address, city, state),
          tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
          vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone)
        `)
        .eq('landlord_id', landlordId);

      query = this.applyFilters(query, filters);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching landlord requests:', error);
        throw new Error('Failed to fetch maintenance requests');
      }

      return data.map(this.mapRequest);
    } catch (error) {
      logger.error('Error in getRequestsByLandlord:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch maintenance requests');
    }
  }

  /**
   * Get requests by vendor
   */
  async getRequestsByVendor(
    vendorId: string,
    filters?: RequestFilters
  ): Promise<MaintenanceRequest[]> {
    try {
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties(title, address, city, state),
          tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
          vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone)
        `)
        .eq('vendor_id', vendorId);

      query = this.applyFilters(query, filters);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching vendor requests:', error);
        throw new Error('Failed to fetch maintenance requests');
      }

      return data.map(this.mapRequest);
    } catch (error) {
      logger.error('Error in getRequestsByVendor:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch maintenance requests');
    }
  }

  /**
   * Get request by ID
   */
  async getRequestById(id: string): Promise<MaintenanceRequest | null> {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties(title, address, city, state),
          tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
          vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone)
        `)
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error fetching request:', error);
        return null;
      }

      return this.mapRequest(data);
    } catch (error) {
      logger.error('Error in getRequestById:', error);
      return null;
    }
  }

  /**
   * Assign vendor to request
   */
  async assignVendor(requestId: string, vendorId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          vendor_id: vendorId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        logger.error('Error assigning vendor:', error);
        throw new Error('Failed to assign vendor');
      }

      // Get request details for notification
      const request = await this.getRequestById(requestId);
      if (request && request.vendor) {
        // Send notification to vendor
        await emailService.sendMaintenanceAssignment(
          request.vendor.email,
          request.vendor.fullName,
          request.title,
          request.property?.address || 'Unknown property'
        );

        // Send SMS to vendor
        if (request.vendor.phone) {
          await smsService.sendMaintenanceAssignment(
            request.vendor.phone,
            request.vendor.fullName,
            request.title,
            request.property?.address || 'Unknown property'
          );
        }
      }
    } catch (error) {
      logger.error('Error in assignVendor:', error);
      throw error instanceof Error ? error : new Error('Failed to assign vendor');
    }
  }

  /**
   * Update request status
   */
  async updateStatus(requestId: string, status: RequestStatus): Promise<void> {
    try {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) {
        logger.error('Error updating status:', error);
        throw new Error('Failed to update status');
      }

      // Send notification based on status
      const request = await this.getRequestById(requestId);
      if (request) {
        if (status === 'completed' && request.tenant) {
          await emailService.sendMaintenanceCompleted(
            request.tenant.email,
            request.tenant.fullName,
            request.title
          );
        }
      }
    } catch (error) {
      logger.error('Error in updateStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update status');
    }
  }

  /**
   * Add message to request thread
   */
  async addMessage(
    requestId: string,
    senderId: string,
    senderType: SenderType,
    message: string,
    attachments?: string[]
  ): Promise<MaintenanceMessage> {
    try {
      const { data, error } = await supabase
        .from('maintenance_messages')
        .insert({
          request_id: requestId,
          sender_id: senderId,
          sender_type: senderType,
          message,
          attachments: attachments || []
        })
        .select(`
          *,
          sender:users(full_name)
        `)
        .single();

      if (error) {
        logger.error('Error adding message:', error);
        throw new Error('Failed to add message');
      }

      return this.mapMessage(data);
    } catch (error) {
      logger.error('Error in addMessage:', error);
      throw error instanceof Error ? error : new Error('Failed to add message');
    }
  }

  /**
   * Get messages for a request
   */
  async getMessages(requestId: string): Promise<MaintenanceMessage[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_messages')
        .select(`
          *,
          sender:users(full_name)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages');
      }

      return data.map(this.mapMessage);
    } catch (error) {
      logger.error('Error in getMessages:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch messages');
    }
  }

  /**
   * Rate completed request
   */
  async rateRequest(requestId: string, rating: number, review: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          rating,
          review,
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        logger.error('Error rating request:', error);
        throw new Error('Failed to rate request');
      }
    } catch (error) {
      logger.error('Error in rateRequest:', error);
      throw error instanceof Error ? error : new Error('Failed to rate request');
    }
  }

  /**
   * Upload photos to Supabase Storage
   */
  private async uploadPhotos(files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `maintenance/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          logger.error('Error uploading photo:', uploadError);
          throw new Error('Failed to upload photo');
        }

        const { data } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        return data.publicUrl;
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error('Error in uploadPhotos:', error);
      throw error instanceof Error ? error : new Error('Failed to upload photos');
    }
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: MaintenanceRequestQuery, filters?: RequestFilters): MaintenanceRequestQuery {
    if (!filters) return query;

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters.issueType && filters.issueType.length > 0) {
      query = query.in('issue_type', filters.issueType);
    }

    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    return query;
  }

  /**
   * Send notification to landlord
   */
  private async notifyLandlord(request: DatabaseRequest): Promise<void> {
    try {
      if (request.landlord?.email) {
        await emailService.sendMaintenanceRequest(
          request.landlord.email,
          request.landlord.full_name,
          request.title,
          request.description,
          request.priority,
          request.property?.address || 'Unknown property'
        );
      }
    } catch (error) {
      logger.error('Error notifying landlord:', error);
      // Don't throw, notification failure shouldn't block request creation
    }
  }

  /**
   * Map database record to MaintenanceRequest
   */
  private mapRequest(data: DatabaseRequest): MaintenanceRequest {
    return {
      id: data.id,
      propertyId: data.property_id,
      tenantId: data.tenant_id,
      landlordId: data.landlord_id,
      vendorId: data.vendor_id,
      title: data.title,
      description: data.description,
      issueType: data.issue_type,
      priority: data.priority,
      status: data.status,
      preferredAccessTime: data.preferred_access_time ? new Date(data.preferred_access_time) : null,
      permissionToEnter: data.permission_to_enter,
      estimatedCost: data.estimated_cost,
      actualCost: data.actual_cost,
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      rating: data.rating,
      review: data.review,
      photos: data.photos || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      property: data.property ? {
        title: data.property.title,
        address: data.property.address,
        city: data.property.city,
        state: data.property.state
      } : undefined,
      tenant: data.tenant ? {
        fullName: data.tenant.full_name,
        email: data.tenant.email,
        phone: data.tenant.phone
      } : undefined,
      landlord: data.landlord ? {
        fullName: data.landlord.full_name,
        email: data.landlord.email,
        phone: data.landlord.phone
      } : undefined,
      vendor: data.vendor ? {
        fullName: data.vendor.full_name,
        email: data.vendor.email,
        phone: data.vendor.phone,
        company: data.vendor.company
      } : undefined
    };
  }

  /**
   * Map database record to MaintenanceMessage
   */
  private mapMessage(data: DatabaseMessage): MaintenanceMessage {
    return {
      id: data.id,
      requestId: data.request_id,
      senderId: data.sender_id,
      senderType: data.sender_type,
      message: data.message,
      attachments: data.attachments || [],
      createdAt: new Date(data.created_at),
      sender: data.sender ? {
        fullName: data.sender.full_name
      } : undefined
    };
  }
}

export const maintenanceService = new MaintenanceService();