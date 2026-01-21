/**
 * Vendor Management Type Definitions
 */

export interface Vendor {
  id: string;
  landlord_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  category: VendorCategory;
  service_areas: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  license_number?: string;
  insurance_expiry?: Date;
  hourly_rate?: number;
  emergency_available: boolean;
  preferred: boolean;
  status: VendorStatus;
  notes?: string;
  website?: string;
  created_at: Date;
  updated_at: Date;
  // Computed fields
  average_rating?: number;
  total_jobs?: number;
  completion_rate?: number;
}

export type VendorCategory = 
  | 'plumber'
  | 'electrician'
  | 'hvac'
  | 'landscaping'
  | 'general'
  | 'pest_control'
  | 'roofing'
  | 'painting'
  | 'cleaning'
  | 'appliance_repair';

export type VendorStatus = 'active' | 'inactive' | 'suspended';

export interface VendorRating {
  id: string;
  vendor_id: string;
  maintenance_request_id?: string;
  rated_by: string;
  rating: number;
  review?: string;
  quality_rating?: number;
  timeliness_rating?: number;
  professionalism_rating?: number;
  value_rating?: number;
  would_recommend: boolean;
  created_at: Date;
  updated_at: Date;
}

export type VendorAssignment = {
  id: string;
  vendor_id: string;
  maintenance_request_id: string;
  assigned_by: string;
  assigned_at: Date;
  accepted_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  status: AssignmentStatus;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  // Relations
  vendor?: Vendor;
};

export type AssignmentStatus = 
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface VendorPerformanceMetrics {
  vendor_id: string;
  total_assignments: number;
  completed_assignments: number;
  cancelled_assignments: number;
  completion_rate: number;
  average_rating: number;
  average_response_time_hours: number;
  average_completion_time_hours: number;
  total_cost: number;
  last_assignment_date?: Date;
  updated_at: Date;
}

export interface CreateVendorParams {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  category: VendorCategory;
  service_areas?: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  license_number?: string;
  insurance_expiry?: Date;
  hourly_rate?: number;
  emergency_available?: boolean;
  preferred?: boolean;
  notes?: string;
  website?: string;
}

export interface UpdateVendorParams extends Partial<CreateVendorParams> {
  status?: VendorStatus;
}

export interface VendorFilterParams {
  category?: VendorCategory;
  service_area?: string;
  status?: VendorStatus;
  emergency_available?: boolean;
  preferred?: boolean;
  min_rating?: number;
  search?: string;
}

export interface CreateRatingParams {
  vendor_id: string;
  maintenance_request_id?: string;
  rating: number;
  review?: string;
  quality_rating?: number;
  timeliness_rating?: number;
  professionalism_rating?: number;
  value_rating?: number;
  would_recommend?: boolean;
}

export type UpdateRatingParams = Partial<CreateRatingParams>;

export interface AssignVendorParams {
  vendor_id: string;
  maintenance_request_id: string;
  estimated_cost?: number;
  notes?: string;
}

export interface UpdateAssignmentParams {
  status?: AssignmentStatus;
  accepted_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  actual_cost?: number;
  notes?: string;
}

export interface RatingBreakdown {
  average_rating: number;
  total_ratings: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  average_quality: number;
  average_timeliness: number;
  average_professionalism: number;
  average_value: number;
  recommendation_rate: number;
}

export interface PerformanceReport {
  vendor: Vendor;
  metrics: VendorPerformanceMetrics;
  rating_breakdown: RatingBreakdown;
  recent_assignments: VendorAssignment[];
  recent_ratings: VendorRating[];
}

export const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'general', label: 'General Maintenance' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
];

export const VENDOR_STATUSES: { value: VendorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export const ASSIGNMENT_STATUSES: { value: AssignmentStatus; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];