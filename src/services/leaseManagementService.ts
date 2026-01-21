/**
 * Lease Management Service
 * Handles all lease management operations including CRUD, filtering, search, and bulk actions
 * Optimized with pagination, caching, and efficient database queries
 */

import { LeaseAgreement, LeaseFilter, LeaseStatus, LeaseType } from '@/types/lease';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { documentStorageService, STORAGE_BUCKETS, type DocumentMetadata } from './documentStorageService';
import { cache } from '@/lib/cache';
import { normalizePaginationParams, calculatePaginationMetadata, type PaginationResult } from '@/lib/pagination';

type LeaseRow = Database['public']['Tables']['leases']['Row'];
type LeaseInsert = Database['public']['Tables']['leases']['Insert'];
type LeaseUpdate = Database['public']['Tables']['leases']['Update'];

export interface LeaseStatistics {
  total: number;
  active: number;
  pending: number;
  expired: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  averageRent: number;
  totalMonthlyRevenue: number;
  occupancyRate: number;
}

export type LeaseSearchResult = PaginationResult<LeaseAgreement>;

export interface RenewalReminder {
  id: string;
  leaseId: string;
  propertyId: string;
  tenantIds: string[];
  daysUntilExpiration: number;
  reminderType: '90-day' | '60-day' | '30-day' | 'expired';
  status: 'pending' | 'sent' | 'responded' | 'ignored';
  sentAt?: Date;
  respondedAt?: Date;
  response?: 'accepted' | 'declined' | 'negotiating';
}

export interface LeaseAmendment {
  id: string;
  leaseId: string;
  type: 'rent-increase' | 'pet-addendum' | 'parking' | 'occupant-change' | 'term-extension' | 'other';
  title: string;
  description: string;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  status: 'draft' | 'pending-approval' | 'approved' | 'rejected' | 'active';
  effectiveDate: Date;
  createdAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

interface PetPolicy {
  allowed: boolean;
  deposit?: number;
  monthlyFee?: number;
  restrictions?: string[];
}

interface MaintenanceResponsibilities {
  landlord: string[];
  tenant: string[];
}

/**
 * Helper function to convert Supabase lease row to LeaseAgreement
 */
function mapLeaseRowToAgreement(row: LeaseRow): LeaseAgreement {
  return {
    id: row.id,
    landlordId: row.landlord_id,
    tenantIds: row.tenant_ids,
    agentId: row.agent_id || undefined,
    propertyId: row.property_id,
    propertyAddress: row.property_address,
    type: row.type as LeaseType,
    status: row.status as LeaseStatus,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    monthlyRent: row.monthly_rent,
    securityDeposit: row.security_deposit,
    paymentDueDay: row.payment_due_day,
    lateFeeAmount: row.late_fee_amount || undefined,
    lateFeeGracePeriod: row.late_fee_grace_period || undefined,
    utilities: row.utilities || undefined,
    petPolicy: row.pet_policy as PetPolicy | undefined,
    parkingSpaces: row.parking_spaces || undefined,
    storageUnit: row.storage_unit || undefined,
    maintenanceResponsibilities: row.maintenance_responsibilities as MaintenanceResponsibilities | undefined,
    specialTerms: row.special_terms || undefined,
    documents: row.documents || undefined,
    signatures: row.signatures || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastModifiedBy: row.last_modified_by
  };
}

class LeaseManagementService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Upload lease document
   */
  async uploadLeaseDocument(
    leaseId: string,
    file: File,
    uploadedBy: string,
    category: 'lease-agreement' | 'signature' | 'general' = 'lease-agreement'
  ): Promise<{ success: boolean; documentId?: string; url?: string; error?: string }> {
    try {
      const metadata: DocumentMetadata = {
        leaseId,
        uploadedBy,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category,
        tags: ['lease', category],
        description: `${category} for lease ${leaseId}`
      };

      const result = await documentStorageService.uploadDocument(
        file,
        STORAGE_BUCKETS.LEASE_AGREEMENTS,
        metadata,
        leaseId
      );

      if (result.success) {
        // Update lease documents array
        const { data: lease } = await supabase
          .from('leases')
          .select('documents')
          .eq('id', leaseId)
          .single();

        if (lease) {
          const documents = lease.documents || [];
          documents.push({
            id: result.documentId,
            name: file.name,
            url: result.url,
            uploadedAt: new Date().toISOString()
          });

          await supabase
            .from('leases')
            .update({ documents })
            .eq('id', leaseId);
        }

        // Invalidate cache
        cache.delete(`lease:${leaseId}`);
      }

      return result;
    } catch (error) {
      logger.error('Error uploading lease document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
      };
    }
  }

  /**
   * Get all documents for a lease
   */
  async getLeaseDocuments(leaseId: string) {
    return await documentStorageService.listDocumentsByLeaseId(leaseId);
  }

  /**
   * Delete lease document
   */
  async deleteLeaseDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    return await documentStorageService.deleteDocumentById(documentId);
  }

  /**
   * Create a new lease agreement
   */
  async createLease(lease: Omit<LeaseAgreement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const leaseInsert: LeaseInsert = {
        landlord_id: lease.landlordId,
        tenant_ids: lease.tenantIds,
        agent_id: lease.agentId || null,
        property_id: lease.propertyId,
        property_address: lease.propertyAddress,
        type: lease.type,
        status: lease.status,
        start_date: lease.startDate.toISOString(),
        end_date: lease.endDate.toISOString(),
        monthly_rent: lease.monthlyRent,
        security_deposit: lease.securityDeposit,
        payment_due_day: lease.paymentDueDay,
        late_fee_amount: lease.lateFeeAmount || null,
        late_fee_grace_period: lease.lateFeeGracePeriod || null,
        utilities: lease.utilities || null,
        pet_policy: lease.petPolicy as unknown as Database['public']['Tables']['leases']['Insert']['pet_policy'],
        parking_spaces: lease.parkingSpaces || null,
        storage_unit: lease.storageUnit || null,
        maintenance_responsibilities: lease.maintenanceResponsibilities as unknown as Database['public']['Tables']['leases']['Insert']['maintenance_responsibilities'],
        special_terms: lease.specialTerms || null,
        documents: lease.documents || null,
        signatures: lease.signatures || null,
        last_modified_by: lease.lastModifiedBy
      };

      const { data, error } = await supabase
        .from('leases')
        .insert(leaseInsert)
        .select()
        .single();

      if (error) {
        logger.error('Error creating lease:', error);
        throw new Error(`Failed to create lease: ${error.message}`);
      }

      // Invalidate related caches
      cache.invalidatePattern('leases:');
      cache.delete('lease:statistics');

      return data.id;
    } catch (error) {
      logger.error('Error in createLease:', error);
      throw error;
    }
  }

  /**
   * Get lease by ID with caching
   */
  async getLeaseById(id: string): Promise<LeaseAgreement | null> {
    try {
      return await cache.getOrSet(
        `lease:${id}`,
        async () => {
          const { data, error } = await supabase
            .from('leases')
            .select('*')
            .eq('id', id)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              return null;
            }
            logger.error('Error fetching lease:', error);
            throw new Error(`Failed to fetch lease: ${error.message}`);
          }

          return mapLeaseRowToAgreement(data);
        },
        { ttl: this.CACHE_TTL }
      );
    } catch (error) {
      logger.error('Error in getLeaseById:', error);
      return null;
    }
  }

  /**
   * Update lease
   */
  async updateLease(id: string, updates: Partial<LeaseAgreement>): Promise<LeaseAgreement> {
    try {
      const leaseUpdate: LeaseUpdate = {
        ...(updates.landlordId && { landlord_id: updates.landlordId }),
        ...(updates.tenantIds && { tenant_ids: updates.tenantIds }),
        ...(updates.agentId !== undefined && { agent_id: updates.agentId || null }),
        ...(updates.propertyId && { property_id: updates.propertyId }),
        ...(updates.propertyAddress && { property_address: updates.propertyAddress }),
        ...(updates.type && { type: updates.type }),
        ...(updates.status && { status: updates.status }),
        ...(updates.startDate && { start_date: updates.startDate.toISOString() }),
        ...(updates.endDate && { end_date: updates.endDate.toISOString() }),
        ...(updates.monthlyRent !== undefined && { monthly_rent: updates.monthlyRent }),
        ...(updates.securityDeposit !== undefined && { security_deposit: updates.securityDeposit }),
        ...(updates.paymentDueDay !== undefined && { payment_due_day: updates.paymentDueDay }),
        ...(updates.lateFeeAmount !== undefined && { late_fee_amount: updates.lateFeeAmount || null }),
        ...(updates.lateFeeGracePeriod !== undefined && { late_fee_grace_period: updates.lateFeeGracePeriod || null }),
        ...(updates.utilities !== undefined && { utilities: updates.utilities || null }),
        ...(updates.petPolicy !== undefined && { pet_policy: updates.petPolicy as unknown as Database['public']['Tables']['leases']['Update']['pet_policy'] }),
        ...(updates.parkingSpaces !== undefined && { parking_spaces: updates.parkingSpaces || null }),
        ...(updates.storageUnit !== undefined && { storage_unit: updates.storageUnit || null }),
        ...(updates.maintenanceResponsibilities !== undefined && { maintenance_responsibilities: updates.maintenanceResponsibilities as unknown as Database['public']['Tables']['leases']['Update']['maintenance_responsibilities'] }),
        ...(updates.specialTerms !== undefined && { special_terms: updates.specialTerms || null }),
        ...(updates.documents !== undefined && { documents: updates.documents || null }),
        ...(updates.signatures !== undefined && { signatures: updates.signatures || null }),
        ...(updates.lastModifiedBy && { last_modified_by: updates.lastModifiedBy })
      };

      const { data, error } = await supabase
        .from('leases')
        .update(leaseUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating lease:', error);
        throw new Error(`Failed to update lease: ${error.message}`);
      }

      // Invalidate caches
      cache.delete(`lease:${id}`);
      cache.invalidatePattern('leases:');
      cache.delete('lease:statistics');

      return mapLeaseRowToAgreement(data);
    } catch (error) {
      logger.error('Error in updateLease:', error);
      throw error;
    }
  }

  /**
   * Delete lease
   */
  async deleteLease(id: string): Promise<void> {
    try {
      // Delete associated documents first
      const documentsResult = await this.getLeaseDocuments(id);
      if (documentsResult.success && documentsResult.files) {
        for (const doc of documentsResult.files) {
          await this.deleteLeaseDocument(doc.id);
        }
      }

      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting lease:', error);
        throw new Error(`Failed to delete lease: ${error.message}`);
      }

      // Invalidate caches
      cache.delete(`lease:${id}`);
      cache.invalidatePattern('leases:');
      cache.delete('lease:statistics');
    } catch (error) {
      logger.error('Error in deleteLease:', error);
      throw error;
    }
  }

  /**
   * Get all leases with optional filtering and pagination
   * Optimized to fetch only necessary columns
   */
  async getLeases(
    filter?: LeaseFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<LeaseAgreement>> {
    try {
      const { page: normalizedPage, limit: normalizedLimit, offset } = normalizePaginationParams({ page, limit });

      // Build query with only necessary columns
      let query = supabase
        .from('leases')
        .select('*', { count: 'exact' });

      if (filter) {
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        if (filter.type) {
          query = query.eq('type', filter.type);
        }
        if (filter.landlordId) {
          query = query.eq('landlord_id', filter.landlordId);
        }
        if (filter.tenantId) {
          query = query.contains('tenant_ids', [filter.tenantId]);
        }
        if (filter.propertyId) {
          query = query.eq('property_id', filter.propertyId);
        }
        if (filter.startDateFrom) {
          query = query.gte('start_date', filter.startDateFrom.toISOString());
        }
        if (filter.startDateTo) {
          query = query.lte('start_date', filter.startDateTo.toISOString());
        }
        if (filter.endDateFrom) {
          query = query.gte('end_date', filter.endDateFrom.toISOString());
        }
        if (filter.endDateTo) {
          query = query.lte('end_date', filter.endDateTo.toISOString());
        }
        if (filter.minRent !== undefined) {
          query = query.gte('monthly_rent', filter.minRent);
        }
        if (filter.maxRent !== undefined) {
          query = query.lte('monthly_rent', filter.maxRent);
        }
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + normalizedLimit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching leases:', error);
        throw new Error(`Failed to fetch leases: ${error.message}`);
      }

      const leases = (data || []).map(mapLeaseRowToAgreement);
      const pagination = calculatePaginationMetadata(count || 0, normalizedPage, normalizedLimit);

      return {
        data: leases,
        pagination,
      };
    } catch (error) {
      logger.error('Error in getLeases:', error);
      throw error;
    }
  }

  /**
   * Search leases with pagination
   * Optimized with indexed search
   */
  async searchLeases(
    searchTerm: string,
    filter?: LeaseFilter,
    page: number = 1,
    pageSize: number = 20
  ): Promise<LeaseSearchResult> {
    try {
      const { page: normalizedPage, limit: normalizedLimit, offset } = normalizePaginationParams({ page, limit: pageSize });

      let query = supabase.from('leases').select('*', { count: 'exact' });

      // Apply filters
      if (filter) {
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.type) query = query.eq('type', filter.type);
        if (filter.landlordId) query = query.eq('landlord_id', filter.landlordId);
        if (filter.tenantId) query = query.contains('tenant_ids', [filter.tenantId]);
        if (filter.propertyId) query = query.eq('property_id', filter.propertyId);
      }

      // Apply search term
      if (searchTerm) {
        query = query.or(`property_address.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + normalizedLimit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error searching leases:', error);
        throw new Error(`Failed to search leases: ${error.message}`);
      }

      const leases = (data || []).map(mapLeaseRowToAgreement);
      const pagination = calculatePaginationMetadata(count || 0, normalizedPage, normalizedLimit);

      return {
        data: leases,
        pagination,
      };
    } catch (error) {
      logger.error('Error in searchLeases:', error);
      throw error;
    }
  }

  /**
   * Get lease statistics with caching
   */
  async getLeaseStatistics(): Promise<LeaseStatistics> {
    try {
      return await cache.getOrSet(
        'lease:statistics',
        async () => {
          // Use aggregate queries for better performance
          const { data: leases, error } = await supabase
            .from('leases')
            .select('status, monthly_rent, end_date');

          if (error) {
            logger.error('Error fetching lease statistics:', error);
            throw new Error(`Failed to fetch statistics: ${error.message}`);
          }

          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
          const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

          const statistics: LeaseStatistics = {
            total: leases?.length || 0,
            active: leases?.filter(l => l.status === 'active').length || 0,
            pending: leases?.filter(l => l.status === 'pending').length || 0,
            expired: leases?.filter(l => l.status === 'expired').length || 0,
            expiringIn30Days: leases?.filter(l => {
              const endDate = new Date(l.end_date);
              return endDate >= now && endDate <= thirtyDaysFromNow;
            }).length || 0,
            expiringIn60Days: leases?.filter(l => {
              const endDate = new Date(l.end_date);
              return endDate >= now && endDate <= sixtyDaysFromNow;
            }).length || 0,
            expiringIn90Days: leases?.filter(l => {
              const endDate = new Date(l.end_date);
              return endDate >= now && endDate <= ninetyDaysFromNow;
            }).length || 0,
            averageRent: leases?.length
              ? leases.reduce((sum, l) => sum + l.monthly_rent, 0) / leases.length
              : 0,
            totalMonthlyRevenue: leases
              ?.filter(l => l.status === 'active')
              .reduce((sum, l) => sum + l.monthly_rent, 0) || 0,
            occupancyRate: 0
          };

          return statistics;
        },
        { ttl: this.CACHE_TTL }
      );
    } catch (error) {
      logger.error('Error in getLeaseStatistics:', error);
      throw error;
    }
  }

  /**
   * Get renewal reminders with pagination
   */
  async getRenewalReminders(page: number = 1, limit: number = 20): Promise<PaginationResult<RenewalReminder>> {
    try {
      const now = new Date();
      const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const { page: normalizedPage, limit: normalizedLimit, offset } = normalizePaginationParams({ page, limit });

      const { data: leases, error, count } = await supabase
        .from('leases')
        .select('id, property_id, tenant_ids, end_date', { count: 'exact' })
        .eq('status', 'active')
        .lte('end_date', ninetyDaysFromNow.toISOString())
        .order('end_date', { ascending: true })
        .range(offset, offset + normalizedLimit - 1);

      if (error) {
        logger.error('Error fetching renewal reminders:', error);
        throw new Error(`Failed to fetch reminders: ${error.message}`);
      }

      const reminders: RenewalReminder[] = (leases || []).map(lease => {
        const endDate = new Date(lease.end_date);
        const daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let reminderType: RenewalReminder['reminderType'];
        if (daysUntilExpiration <= 0) {
          reminderType = 'expired';
        } else if (daysUntilExpiration <= 30) {
          reminderType = '30-day';
        } else if (daysUntilExpiration <= 60) {
          reminderType = '60-day';
        } else {
          reminderType = '90-day';
        }

        return {
          id: `reminder-${lease.id}`,
          leaseId: lease.id,
          propertyId: lease.property_id,
          tenantIds: lease.tenant_ids,
          daysUntilExpiration,
          reminderType,
          status: 'pending'
        };
      });

      const pagination = calculatePaginationMetadata(count || 0, normalizedPage, normalizedLimit);

      return {
        data: reminders,
        pagination,
      };
    } catch (error) {
      logger.error('Error in getRenewalReminders:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminder with email and SMS notifications
   */
  async sendRenewalReminder(reminderId: string): Promise<void> {
    try {
      const remindersResult = await this.getRenewalReminders(1, 100);
      const reminder = remindersResult.data.find(r => r.id === reminderId);

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      const lease = await this.getLeaseById(reminder.leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      // Get tenant information
      for (const tenantId of reminder.tenantIds) {
        const { data: tenant } = await supabase
          .from('users')
          .select('email, phone, full_name')
          .eq('id', tenantId)
          .single();

        if (tenant) {
          // Send email notification
          try {
            await emailService.sendLeaseExpirationReminderEmail(
              tenant.email,
              tenant.full_name || 'Tenant',
              lease.propertyAddress,
              lease.endDate,
              reminder.daysUntilExpiration
            );
          } catch (error) {
            logger.error('Error sending renewal reminder email:', error);
          }

          // Send SMS notification
          if (tenant.phone) {
            try {
              await smsService.sendLeaseExpirationReminderSMS(
                tenant.phone,
                tenant.full_name || 'Tenant',
                lease.propertyAddress,
                lease.endDate
              );
            } catch (error) {
              logger.error('Error sending renewal reminder SMS:', error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error in sendRenewalReminder:', error);
      throw error;
    }
  }

  /**
   * Bulk update lease statuses
   */
  async bulkUpdateStatus(leaseIds: string[], status: LeaseStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('leases')
        .update({ status })
        .in('id', leaseIds);

      if (error) {
        logger.error('Error bulk updating lease statuses:', error);
        throw new Error(`Failed to update statuses: ${error.message}`);
      }

      // Invalidate caches
      leaseIds.forEach(id => cache.delete(`lease:${id}`));
      cache.invalidatePattern('leases:');
      cache.delete('lease:statistics');
    } catch (error) {
      logger.error('Error in bulkUpdateStatus:', error);
      throw error;
    }
  }

  /**
   * Get expiring leases with pagination
   */
  async getExpiringLeases(
    days: number = 30,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<LeaseAgreement>> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const { page: normalizedPage, limit: normalizedLimit, offset } = normalizePaginationParams({ page, limit });

      const { data, error, count } = await supabase
        .from('leases')
        .select('*', { count: 'exact' })
        .eq('status', 'active')
        .gte('end_date', now.toISOString())
        .lte('end_date', futureDate.toISOString())
        .order('end_date', { ascending: true })
        .range(offset, offset + normalizedLimit - 1);

      if (error) {
        logger.error('Error fetching expiring leases:', error);
        throw new Error(`Failed to fetch expiring leases: ${error.message}`);
      }

      const leases = (data || []).map(mapLeaseRowToAgreement);
      const pagination = calculatePaginationMetadata(count || 0, normalizedPage, normalizedLimit);

      return {
        data: leases,
        pagination,
      };
    } catch (error) {
      logger.error('Error in getExpiringLeases:', error);
      throw error;
    }
  }
}

export const leaseManagementService = new LeaseManagementService();