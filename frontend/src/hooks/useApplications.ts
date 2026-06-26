/**
 * React Query hooks for application operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  ssn_last_4?: string;
}

interface EmploymentInfo {
  employer_name: string;
  position: string;
  monthly_income: number;
  employment_length: string;
}

interface RentalHistory {
  address: string;
  landlord_name: string;
  landlord_phone: string;
  move_in_date: string;
  move_out_date?: string;
  monthly_rent: number;
}

interface Reference {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

interface ScreeningResults {
  credit_score?: number;
  background_check_passed?: boolean;
  eviction_history?: boolean;
  criminal_record?: boolean;
  notes?: string;
}

interface PropertyInfo {
  id: string;
  title: string;
  address: string;
  rent: number;
  landlord?: {
    full_name: string;
    avatar_url?: string;
    phone?: string;
  };
}

interface TenantInfo {
  full_name: string;
  avatar_url?: string;
  phone?: string;
}

interface Application {
  id: string;
  property_id: string;
  tenant_id: string;
  match_id?: string;
  status: string;
  personal_info: PersonalInfo;
  employment_info: EmploymentInfo;
  rental_history: RentalHistory[];
  references: Reference[];
  documents: string[];
  screening_results?: ScreeningResults;
  screening_completed_at?: string;
  landlord_notes?: string;
  tenant_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  property?: PropertyInfo;
  tenant?: TenantInfo;
}

// Fetch applications for tenant
export function useTenantApplications(tenantId?: string) {
  return useQuery({
    queryKey: ['tenant-applications', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID required');

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          property:properties (
            *,
            landlord:user_profiles!landlord_id (
              full_name,
              avatar_url,
              phone
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
    enabled: !!tenantId,
  });
}

// Fetch applications for landlord's properties
export function useLandlordApplications(landlordId?: string) {
  return useQuery({
    queryKey: ['landlord-applications', landlordId],
    queryFn: async () => {
      if (!landlordId) throw new Error('Landlord ID required');

      // First get landlord's properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', landlordId);

      if (propertiesError) throw propertiesError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map(p => p.id);

      // Then get applications for those properties
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          property:properties (
            id,
            title,
            address,
            rent
          ),
          tenant:user_profiles!tenant_id (
            full_name,
            avatar_url,
            phone
          )
        `)
        .in('property_id', propertyIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
    enabled: !!landlordId,
  });
}

// Fetch single application
export function useApplication(applicationId?: string) {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID required');

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          property:properties (
            *,
            landlord:user_profiles!landlord_id (
              full_name,
              avatar_url,
              phone
            )
          ),
          tenant:user_profiles!tenant_id (
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('id', applicationId)
        .single();

      if (error) throw error;
      return data as Application;
    },
    enabled: !!applicationId,
  });
}

// Submit application
export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (application: Partial<Application>) => {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          ...application,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-applications'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
    },
  });
}

// Update application status
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      status, 
      landlordNotes 
    }: { 
      applicationId: string; 
      status: string; 
      landlordNotes?: string;
    }) => {
      const updates: Record<string, string> = { status };
      if (landlordNotes) updates.landlord_notes = landlordNotes;
      if (status === 'approved' || status === 'rejected') {
        updates.reviewed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-applications'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
      queryClient.invalidateQueries({ queryKey: ['application'] });
    },
  });
}

// Withdraw application
export function useWithdrawApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-applications'] });
    },
  });
}

// Update screening results
export function useUpdateScreeningResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      screeningResults 
    }: { 
      applicationId: string; 
      screeningResults: ScreeningResults;
    }) => {
      const { data, error } = await supabase
        .from('applications')
        .update({
          screening_results: screeningResults,
          screening_completed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-applications'] });
    },
  });
}