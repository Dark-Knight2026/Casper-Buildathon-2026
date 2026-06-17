import { supabase } from '@/lib/supabase/client';
import { backendClient } from '@/lib/api-client';
import { toQueryString } from '@/lib/queryString';
import type { PaginatedResponse } from '@/types/listingContract';
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
import type {
  RentalApplication,
  SubmitApplicationBody,
  ReviewableStatus,
  LandlordApplicationParams,
  ApplicationNote as BackendApplicationNote,
  BackgroundCheck,
  BackgroundCheckType,
  ApplicationScore,
} from '@/types/applicationContract';

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
// LeaseFi backend applications API (PL-23a tenant + PL-42 landlord domain)
//
// An application is a tenant's request to rent a listing. The legacy
// `ApplicationService` class above is the dead Supabase surface, kept only for
// the not-yet-rewired `ApplicationList`/`ApplicationDetail`/`TenantApplication`
// shells (PL-43/44 reuse those visuals against these backend fns; PL-29 deletes
// the class). Wire types live in `types/applicationContract.ts`.
// ───────────────────────────────────────────────────────────────────────────

const LISTINGS = '/api/v1/listings';
const APPLICATIONS = '/api/v1/applications';

// Re-exported so existing importers (PL-23a/23a+ pages, the status badge) keep
// sourcing the wire types from this service.
export type {
  ApplicationStatus,
  ReviewableStatus,
  RentalApplication,
  SubmitApplicationBody,
  LandlordApplicationParams,
  ApplicationNote as BackendApplicationNote,
  BackgroundCheck,
  BackgroundCheckType,
  BackgroundCheckStatus,
  RequestBackgroundCheckBody,
  ApplicationScore,
  ScoreFactor,
  ScoreFactorKind,
} from '@/types/applicationContract';

/** `POST /listings/{id}/applications`. Tenant submits (or, with `asDraft`, drafts). */
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

/**
 * `GET /applications/landlord`. Landlord — all applications across their
 * listings, paginated; filterable by status/search/listing/date range.
 */
export async function getLandlordApplications(
  params: LandlordApplicationParams = {}
): Promise<PaginatedResponse<RentalApplication>> {
  return backendClient.get<PaginatedResponse<RentalApplication>>(
    `${APPLICATIONS}/landlord${toQueryString({ ...params })}`
  );
}

/** `GET /applications/{id}`. Single application detail by id. */
export async function getApplication(
  applicationId: string
): Promise<RentalApplication> {
  return backendClient.get<RentalApplication>(
    `${APPLICATIONS}/${applicationId}`
  );
}

/**
 * `PUT /applications/{id}/status`. Landlord review — `under_review`,
 * `conditional`, `approved` or `rejected`. The backend `409`s a transition the
 * application's current state can't reach.
 */
export async function reviewApplication(
  applicationId: string,
  status: ReviewableStatus
): Promise<RentalApplication> {
  return backendClient.put<RentalApplication>(
    `${APPLICATIONS}/${applicationId}/status`,
    { status }
  );
}

/** `GET /applications/{id}/notes`. Internal landlord notes (newest first). */
export async function getApplicationNotes(
  applicationId: string
): Promise<BackendApplicationNote[]> {
  return backendClient.get<BackendApplicationNote[]>(
    `${APPLICATIONS}/${applicationId}/notes`
  );
}

/** `POST /applications/{id}/notes`. Adds a private landlord note. */
export async function addApplicationNote(
  applicationId: string,
  body: string
): Promise<BackendApplicationNote> {
  return backendClient.post<BackendApplicationNote>(
    `${APPLICATIONS}/${applicationId}/notes`,
    { body }
  );
}

/**
 * `POST /applications/{id}/background-checks`. Requests a check. The provider
 * is stubbed on the backend (hackathon) — results are fake.
 */
export async function requestBackgroundCheck(
  applicationId: string,
  checkType: BackgroundCheckType
): Promise<BackgroundCheck> {
  return backendClient.post<BackgroundCheck>(
    `${APPLICATIONS}/${applicationId}/background-checks`,
    { checkType }
  );
}

/** `GET /applications/{id}/background-checks`. Lists requested checks. */
export async function getBackgroundChecks(
  applicationId: string
): Promise<BackgroundCheck[]> {
  return backendClient.get<BackgroundCheck[]>(
    `${APPLICATIONS}/${applicationId}/background-checks`
  );
}

/** `GET /applications/{id}/score`. Server-computed score breakdown (stubbed). */
export async function getApplicationScore(
  applicationId: string
): Promise<ApplicationScore> {
  return backendClient.get<ApplicationScore>(
    `${APPLICATIONS}/${applicationId}/score`
  );
}

/**
 * `PATCH /applications/{id}`. Replaces a draft's fields. Tenant-only, and only
 * while the application is a `draft` (the backend `409`s otherwise).
 */
export async function updateDraftApplication(
  applicationId: string,
  body: SubmitApplicationBody
): Promise<RentalApplication> {
  return backendClient.patch<RentalApplication>(
    `${APPLICATIONS}/${applicationId}`,
    body
  );
}

/**
 * `POST /applications/{id}/submit`. Submits a draft (`draft -> pending`).
 * Tenant-only, draft-only.
 */
export async function submitDraftApplication(
  applicationId: string
): Promise<RentalApplication> {
  return backendClient.post<RentalApplication>(
    `${APPLICATIONS}/${applicationId}/submit`
  );
}
