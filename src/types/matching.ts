// Property-Tenant Matching System Type Definitions

/**
 * Geographic location coordinates
 */
export interface Location {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
}

/**
 * Budget range for tenant preferences
 */
export interface BudgetRange {
  min: number;
  max: number;
  currency?: string;
}

/**
 * Amenity types available in properties
 */
export type AmenityType =
  | 'parking'
  | 'gym'
  | 'pool'
  | 'laundry_in_unit'
  | 'laundry_in_building'
  | 'dishwasher'
  | 'air_conditioning'
  | 'heating'
  | 'balcony'
  | 'patio'
  | 'hardwood_floors'
  | 'carpet'
  | 'elevator'
  | 'doorman'
  | 'storage'
  | 'bike_storage'
  | 'pet_friendly'
  | 'furnished'
  | 'wheelchair_accessible'
  | 'high_speed_internet'
  | 'cable_tv'
  | 'security_system'
  | 'gated_community'
  | 'concierge';

/**
 * Lease term duration options
 */
export type LeaseTermType = 'month_to_month' | '3_months' | '6_months' | '1_year' | '2_years' | 'flexible';

/**
 * Pet policy options
 */
export type PetPolicyType = 'no_pets' | 'cats_only' | 'dogs_only' | 'cats_and_dogs' | 'all_pets' | 'case_by_case';

/**
 * Property types
 */
export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'studio' | 'loft' | 'duplex';

/**
 * Tenant preferences for property matching
 */
export interface TenantPreferences {
  user_id: string;
  
  // Location preferences
  preferred_locations: Location[];
  max_distance_miles?: number;
  preferred_neighborhoods?: string[];
  
  // Budget preferences
  budget: BudgetRange;
  utilities_included_preference?: boolean;
  
  // Property preferences
  property_types?: PropertyType[];
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_bathrooms?: number;
  max_bathrooms?: number;
  min_square_feet?: number;
  max_square_feet?: number;
  
  // Amenity preferences
  required_amenities: AmenityType[];
  preferred_amenities: AmenityType[];
  
  // Lease preferences
  preferred_lease_terms: LeaseTermType[];
  move_in_date?: string;
  flexible_move_in?: boolean;
  
  // Pet preferences
  has_pets: boolean;
  pet_types?: ('cat' | 'dog' | 'other')[];
  number_of_pets?: number;
  
  // Additional preferences
  smoking_allowed?: boolean;
  furnished_preference?: boolean;
  floor_preference?: 'ground' | 'high' | 'any';
  
  // Weights for scoring (optional custom weights)
  custom_weights?: ScoringWeights;
}

/**
 * Property features for matching
 */
export interface PropertyFeatures {
  id: string;
  landlord_id: string;
  
  // Basic information
  property_type: PropertyType;
  address: string;
  location: Location;
  
  // Property details
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  floor_number?: number;
  total_floors?: number;
  
  // Financial details
  monthly_rent: number;
  security_deposit: number;
  utilities_included: boolean;
  utilities_cost_estimate?: number;
  
  // Availability
  available_date: string;
  lease_terms: LeaseTermType[];
  
  // Amenities
  amenities: AmenityType[];
  
  // Policies
  pet_policy: PetPolicyType;
  smoking_allowed: boolean;
  furnished: boolean;
  
  // Additional features
  parking_spaces?: number;
  parking_type?: 'street' | 'garage' | 'lot' | 'covered';
  year_built?: number;
  last_renovated?: number;
  
  // Media
  photos?: string[];
  virtual_tour_url?: string;
  
  // Status
  status: 'active' | 'pending' | 'rented' | 'inactive';
  view_count?: number;
  application_count?: number;
}

/**
 * Scoring weights for different matching factors
 */
export interface ScoringWeights {
  price: number;        // Default: 0.30 (30%)
  location: number;     // Default: 0.25 (25%)
  amenities: number;    // Default: 0.20 (20%)
  lease_term: number;   // Default: 0.15 (15%)
  pet_policy: number;   // Default: 0.10 (10%)
}

/**
 * Individual component scores
 */
export interface ComponentScores {
  price_score: number;
  location_score: number;
  amenity_score: number;
  lease_term_score: number;
  pet_policy_score: number;
}

/**
 * Compatibility metrics between tenant and property
 */
export interface CompatibilityMetrics {
  // Distance metrics
  distance_miles?: number;
  commute_time_minutes?: number;
  
  // Price metrics
  price_difference: number;
  price_percentage_of_budget: number;
  affordability_score: number;
  
  // Amenity metrics
  required_amenities_met: number;
  preferred_amenities_met: number;
  total_amenities_matched: number;
  amenity_match_percentage: number;
  
  // Lease metrics
  lease_term_match: boolean;
  move_in_date_compatible: boolean;
  
  // Pet metrics
  pet_compatible: boolean;
  
  // Overall metrics
  overall_compatibility: number;
}

/**
 * Match score between tenant and property
 */
export interface MatchScore {
  property_id: string;
  tenant_id: string;
  
  // Scores
  overall_score: number;          // 0-100
  component_scores: ComponentScores;
  compatibility_metrics: CompatibilityMetrics;
  
  // Weights used
  weights: ScoringWeights;
  
  // Metadata
  calculated_at: string;
  version: string;                // Algorithm version
  confidence: number;             // 0-1, confidence in the match
}

/**
 * Property recommendation for a tenant
 */
export interface PropertyRecommendation {
  property: PropertyFeatures;
  match_score: MatchScore;
  rank: number;
  reason: string;                 // Human-readable explanation
  highlights: string[];           // Key matching features
  concerns?: string[];            // Potential issues
}

/**
 * Tenant recommendation for a property
 */
export interface TenantRecommendation {
  tenant_id: string;
  tenant_name?: string;
  tenant_email?: string;
  match_score: MatchScore;
  rank: number;
  reason: string;
  highlights: string[];
  application_status?: 'none' | 'pending' | 'approved' | 'rejected';
}

/**
 * Recommendation request parameters
 */
export interface RecommendationRequest {
  user_id: string;
  user_type: 'tenant' | 'landlord';
  limit?: number;
  offset?: number;
  min_score?: number;
  filters?: {
    property_types?: PropertyType[];
    price_range?: BudgetRange;
    locations?: string[];
    available_after?: string;
  };
  include_reasons?: boolean;
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  recommendations: PropertyRecommendation[] | TenantRecommendation[];
  total_count: number;
  page: number;
  limit: number;
  algorithm_version: string;
  generated_at: string;
}

/**
 * User feedback for improving recommendations
 */
export interface MatchFeedback {
  user_id: string;
  property_id: string;
  feedback_type: 'view' | 'save' | 'apply' | 'contact' | 'skip' | 'hide';
  rating?: number;              // 1-5 stars
  comment?: string;
  timestamp: string;
}

/**
 * Matching algorithm configuration
 */
export interface MatchingConfig {
  weights: ScoringWeights;
  algorithm_version: string;
  
  // Scoring thresholds
  min_match_score: number;
  excellent_match_threshold: number;
  good_match_threshold: number;
  
  // Distance thresholds
  max_distance_miles: number;
  distance_decay_rate: number;
  
  // Price thresholds
  max_price_deviation_percentage: number;
  price_tolerance_factor: number;
  
  // Recommendation settings
  default_recommendation_limit: number;
  diversity_factor: number;       // 0-1, higher = more diverse recommendations
  
  // Cache settings
  cache_ttl_seconds: number;
  batch_size: number;
}

/**
 * Batch matching job
 */
export interface BatchMatchingJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  tenant_ids?: string[];
  property_ids?: string[];
  total_matches: number;
  processed_count: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

/**
 * Matching statistics
 */
export interface MatchingStats {
  total_matches_calculated: number;
  average_match_score: number;
  excellent_matches: number;
  good_matches: number;
  fair_matches: number;
  poor_matches: number;
  calculation_time_ms: number;
}

/**
 * Historical matching data for ML training
 */
export interface HistoricalMatch {
  tenant_id: string;
  property_id: string;
  match_score: number;
  outcome: 'applied' | 'viewed' | 'saved' | 'contacted' | 'leased' | 'rejected' | 'ignored';
  tenant_preferences: TenantPreferences;
  property_features: PropertyFeatures;
  feedback?: MatchFeedback;
  timestamp: string;
}

/**
 * ML model training data
 */
export interface TrainingData {
  features: number[][];           // Feature matrix
  labels: number[];               // Outcome labels
  feature_names: string[];
  sample_count: number;
  positive_samples: number;
  negative_samples: number;
}

/**
 * ML model performance metrics
 */
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  confusion_matrix: number[][];
  training_samples: number;
  validation_samples: number;
  model_version: string;
  trained_at: string;
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  price: 0.30,
  location: 0.25,
  amenities: 0.20,
  lease_term: 0.15,
  pet_policy: 0.10,
};

/**
 * Default matching configuration
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  weights: DEFAULT_SCORING_WEIGHTS,
  algorithm_version: '1.0.0',
  min_match_score: 50,
  excellent_match_threshold: 85,
  good_match_threshold: 70,
  max_distance_miles: 50,
  distance_decay_rate: 0.1,
  max_price_deviation_percentage: 20,
  price_tolerance_factor: 1.2,
  default_recommendation_limit: 20,
  diversity_factor: 0.3,
  cache_ttl_seconds: 3600,
  batch_size: 100,
};
