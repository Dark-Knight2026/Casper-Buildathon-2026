// ───────────────────────────────────────────────────────────────────────────
// Rental-applications wire contract (LeaseFi Rust backend, `feat/properties`).
//
// An application is a tenant's request to rent a listing. These mirror the
// backend `services::applications::models` one-to-one (camelCase wire shape) —
// the landlord domain shipped in `19efb52`…`f0e8a3d`. No Supabase here; the
// FE's nested view-model (`personalInfo.*`, `employmentInfo.*`) is mapped onto
// this flat shape at the page boundary, not stored.
// ───────────────────────────────────────────────────────────────────────────

import type { Listing } from '@/types/listingContract';

/**
 * Lifecycle status of an application.
 *
 * Note `denied` (legacy FE name) is the backend's `rejected`. There is no
 * `request_info` state — that FE action has no backend endpoint.
 */
export type ApplicationStatus =
  | 'draft' // being filled in by the applicant, pre-submit
  | 'pending' // submitted, awaiting landlord review
  | 'under_review' // landlord actively reviewing
  | 'conditional' // conditionally approved, pending stated conditions
  | 'approved'
  | 'rejected';

/**
 * The subset of {@link ApplicationStatus} a landlord review may set via
 * `PUT /applications/{id}/status`. `draft`/`pending` are rejected by the
 * backend as review targets; reachability from the current state is also
 * state-machine-guarded server-side (an illegal transition is a `409`).
 */
export type ReviewableStatus =
  | 'under_review'
  | 'conditional'
  | 'approved'
  | 'rejected';

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
  listing?: Listing; // nested in GET /applications and GET /applications/landlord
  createdAt: string;
  updatedAt: string;
}

/**
 * `POST /listings/{id}/applications` body. With `asDraft: true` the backend
 * creates an editable `draft` instead of submitting straight to `pending`.
 */
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
  asDraft?: boolean; // create as a draft instead of submitting now
}

/**
 * `GET /applications/landlord` query params (cross-listing inbox). All
 * optional; `dateFrom`/`dateTo` are inclusive `YYYY-MM-DD`. There is no
 * score-range filter on the backend.
 */
export interface LandlordApplicationParams {
  status?: ApplicationStatus;
  search?: string; // ILIKE over applicant name + email
  listingId?: string;
  dateFrom?: string; // YYYY-MM-DD, inclusive
  dateTo?: string; // YYYY-MM-DD, inclusive
  page?: number;
  pageSize?: number;
}

/** A private landlord note on an application. */
export interface ApplicationNote {
  id: string;
  applicationId: string;
  authorId: string; // reviewing landlord user id
  body: string;
  createdAt: string;
}

/** `POST /applications/{id}/notes` body. */
export interface AddNoteBody {
  body: string;
}

export type BackgroundCheckType = 'credit' | 'criminal' | 'eviction';

export type BackgroundCheckStatus = 'pending' | 'completed' | 'failed';

/**
 * A background check on an application. The provider is stubbed on the backend
 * (hackathon) — `result`/`reference`/`completedAt` are fake until resolved.
 */
export interface BackgroundCheck {
  id: string;
  applicationId: string;
  requestedBy: string; // requesting landlord user id
  checkType: BackgroundCheckType;
  status: BackgroundCheckStatus;
  result: unknown | null; // bureau report, absent until resolved
  reference: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** `POST /applications/{id}/background-checks` body. */
export interface RequestBackgroundCheckBody {
  checkType: BackgroundCheckType;
}

/** A weighted factor in an applicant's score. */
export type ScoreFactorKind =
  | 'income'
  | 'credit'
  | 'employment'
  | 'references'
  | 'background';

/** A single factor's contribution to an applicant's score. */
export interface ScoreFactor {
  factor: ScoreFactorKind;
  weight: number; // the factor's maximum contribution
  score: number; // points awarded, 0..=weight
}

/**
 * A computed applicant score with its weighted breakdown (out of 100). The
 * scoring is stubbed on the backend (hackathon) — values are illustrative.
 */
export interface ApplicationScore {
  total: number; // 0..=100
  breakdown: ScoreFactor[];
}
