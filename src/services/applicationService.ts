import { supabase } from '@/lib/supabase/client';
import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { Listing, PaginatedResponse } from '@/types/listingContract';
import type {
  TenantApplication,
  ApplicationFilters,
  ApplicationNote,
  PersonalInfo,
  EmploymentInfo,
  RentalHistory,
  References,
  AdditionalInfo,
} from '@/types/application';

interface UpdateData {
  personal_info?: PersonalInfo;
  employment_info?: EmploymentInfo;
  rental_history?: RentalHistory;
  references?: References;
  additional_info?: AdditionalInfo;
  documents?: TenantApplication['documents'];
  application_status?: string;
}

interface DatabaseTenant {
  id: string;
  property_id: string;
  user_id?: string;
  application_status: string;
  application_score?: number;
  personal_info: PersonalInfo;
  employment_info: EmploymentInfo;
  rental_history: RentalHistory;
  references: References;
  additional_info: AdditionalInfo;
  documents: TenantApplication['documents'];
  application_fee_paid: boolean;
  submitted_at?: string;
  reviewed_at?: string;
  decision_reason?: string;
  decision_date?: string;
  created_at: string;
  updated_at: string;
}

export class ApplicationService {
  /**
   * Create a new tenant application
   */
  static async createApplication(
    data: Partial<TenantApplication>
  ): Promise<TenantApplication> {
    const { data: application, error } = await supabase
      .from('tenants')
      .insert({
        property_id: data.propertyId,
        user_id: data.userId,
        application_status: 'draft',
        personal_info: data.personalInfo,
        employment_info: data.employmentInfo,
        rental_history: data.rentalHistory,
        references: data.references,
        additional_info: data.additionalInfo,
        documents: data.documents || [],
        application_fee_paid: false,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToApplication(application as DatabaseTenant);
  }

  /**
   * Update an existing application (draft mode)
   */
  static async updateApplication(
    id: string,
    data: Partial<TenantApplication>
  ): Promise<TenantApplication> {
    const updateData: UpdateData = {};

    if (data.personalInfo) updateData.personal_info = data.personalInfo;
    if (data.employmentInfo) updateData.employment_info = data.employmentInfo;
    if (data.rentalHistory) updateData.rental_history = data.rentalHistory;
    if (data.references) updateData.references = data.references;
    if (data.additionalInfo) updateData.additional_info = data.additionalInfo;
    if (data.documents) updateData.documents = data.documents;
    if (data.applicationStatus)
      updateData.application_status = data.applicationStatus;

    const { data: application, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToApplication(application as DatabaseTenant);
  }

  /**
   * Submit application for review
   */
  static async submitApplication(id: string): Promise<TenantApplication> {
    const { data: application, error } = await supabase
      .from('tenants')
      .update({
        application_status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // TODO: Send notification emails
    // - Confirmation to applicant
    // - Notification to landlord

    return this.mapToApplication(application as DatabaseTenant);
  }

  /**
   * Get all applications for a landlord
   */
  static async getApplicationsByLandlord(
    landlordId: string,
    filters?: ApplicationFilters
  ): Promise<TenantApplication[]> {
    let query = supabase
      .from('tenants')
      .select(
        `
        *,
        properties!inner(
          id,
          landlord_id,
          address
        )
      `
      )
      .eq('properties.landlord_id', landlordId);

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('application_status', filters.status);
    }

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters?.dateRange) {
      query = query
        .gte('submitted_at', filters.dateRange.start)
        .lte('submitted_at', filters.dateRange.end);
    }

    if (filters?.minScore !== undefined) {
      query = query.gte('application_score', filters.minScore);
    }

    if (filters?.maxScore !== undefined) {
      query = query.lte('application_score', filters.maxScore);
    }

    if (filters?.searchTerm) {
      const term = `%${filters.searchTerm}%`;
      query = query.or(
        `personal_info->>firstName.ilike.${term},` +
          `personal_info->>lastName.ilike.${term},` +
          `personal_info->>email.ilike.${term},` +
          `personal_info->>phone.ilike.${term}`
      );
    }

    query = query.order('submitted_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data as DatabaseTenant[]).map(this.mapToApplication);
  }

  /**
   * Get a single application by ID
   */
  static async getApplicationById(id: string): Promise<TenantApplication> {
    const { data, error } = await supabase
      .from('tenants')
      .select(
        `
        *,
        properties(
          id,
          address,
          monthly_rent
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToApplication(data as DatabaseTenant);
  }

  /**
   * Mark application fee as paid
   */
  static async markApplicationFeePaid(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ application_fee_paid: true })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Add internal note to application
   */
  static async addNote(
    applicationId: string,
    userId: string,
    note: string
  ): Promise<ApplicationNote> {
    const { data, error } = await supabase
      .from('application_notes')
      .insert({
        application_id: applicationId,
        user_id: userId,
        note,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ApplicationNote;
  }

  /**
   * Get all notes for an application
   */
  static async getNotes(applicationId: string): Promise<ApplicationNote[]> {
    interface NoteWithUser {
      id: string;
      application_id: string;
      user_id: string;
      note: string;
      created_at: string;
      users?: {
        first_name: string;
        last_name: string;
      };
    }

    const { data, error } = await supabase
      .from('application_notes')
      .select(
        `
        *,
        users(
          first_name,
          last_name
        )
      `
      )
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as NoteWithUser[]).map((note) => ({
      id: note.id,
      applicationId: note.application_id,
      userId: note.user_id,
      note: note.note,
      createdAt: note.created_at,
      userName: note.users
        ? `${note.users.first_name} ${note.users.last_name}`
        : 'Unknown User',
    }));
  }

  /**
   * Update application status
   */
  static async updateStatus(
    id: string,
    status: TenantApplication['applicationStatus'],
    reason?: string
  ): Promise<void> {
    const updateData: Record<string, string> = {
      application_status: status,
      reviewed_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.decision_reason = reason;
      updateData.decision_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Map database record to TenantApplication type
   */
  private static mapToApplication(data: DatabaseTenant): TenantApplication {
    return {
      id: data.id,
      propertyId: data.property_id,
      userId: data.user_id,
      applicationStatus:
        data.application_status as TenantApplication['applicationStatus'],
      applicationScore: data.application_score,
      personalInfo: data.personal_info,
      employmentInfo: data.employment_info,
      rentalHistory: data.rental_history,
      references: data.references,
      additionalInfo: data.additional_info,
      documents: data.documents || [],
      applicationFeePaid: data.application_fee_paid,
      submittedAt: data.submitted_at,
      reviewedAt: data.reviewed_at,
      decisionReason: data.decision_reason,
      decisionDate: data.decision_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// ───────────────────────────────────────────────────────────────────────────
// LeaseFi backend applications API (PL-23a — tenant side)
//
// An application is a tenant's request to rent a listing. The legacy
// `ApplicationService` class above is the dead Supabase landlord surface
// (PL-23b — blocked on missing endpoints + a model mismatch, see
// docs/BACKEND_FILTER_GAPS.md); it stays until that side is rewired.
// ───────────────────────────────────────────────────────────────────────────

const LISTINGS = '/api/v1/listings';
const APPLICATIONS = '/api/v1/applications';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

/** A rental application as returned by the backend (camelCase wire shape). */
export interface RentalApplication {
  id: string;
  listingId: string;
  userId: string;
  landlordId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  moveInDate: string;
  employer: string;
  jobTitle: string;
  employmentLength: string;
  monthlyIncome: number;
  reference1Name: string;
  reference1Phone: string;
  reference2Name: string | null;
  reference2Phone: string | null;
  pets: boolean;
  petDescription: string | null;
  additionalInfo: string | null;
  backgroundCheckConsent: boolean;
  status: ApplicationStatus;
  listing?: Listing; // nested in GET /applications
  createdAt: string;
  updatedAt: string;
}

/** `POST /listings/{id}/applications` body. */
export interface SubmitApplicationBody {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  moveInDate: string;
  employer: string;
  jobTitle: string;
  employmentLength: string;
  monthlyIncome: number;
  reference1Name: string;
  reference1Phone: string;
  reference2Name?: string;
  reference2Phone?: string;
  pets: boolean;
  petDescription?: string;
  additionalInfo?: string;
  backgroundCheckConsent: boolean;
}

/** `POST /listings/{id}/applications`. Tenant submits an application. */
export async function submitApplication(
  listingId: string,
  body: SubmitApplicationBody
): Promise<RentalApplication> {
  return backendClient.post<RentalApplication>(
    `${LISTINGS}/${listingId}/applications`,
    body
  );
}

/** `GET /applications`. The tenant's own applications (nested listing), paginated. */
export async function getMyApplications(
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<RentalApplication>> {
  return backendClient.get<PaginatedResponse<RentalApplication>>(
    `${APPLICATIONS}${toQueryString({ ...params })}`
  );
}

/** `GET /listings/{id}/applications`. Landlord — applications for one listing. */
export async function getListingApplications(
  listingId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedResponse<RentalApplication>> {
  return backendClient.get<PaginatedResponse<RentalApplication>>(
    `${LISTINGS}/${listingId}/applications${toQueryString({ ...params })}`
  );
}

/** `PUT /applications/{id}/status`. Landlord approves/rejects. */
export async function reviewApplication(
  applicationId: string,
  status: ApplicationStatus
): Promise<RentalApplication> {
  return backendClient.put<RentalApplication>(
    `${APPLICATIONS}/${applicationId}/status`,
    { status }
  );
}
