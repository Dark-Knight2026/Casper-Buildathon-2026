import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import {
  TenantPreferences,
  PropertyFeatures,
  MatchScore,
  ComponentScores,
  CompatibilityMetrics,
  PropertyRecommendation,
  TenantRecommendation,
  MatchFeedback,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_MATCHING_CONFIG,
  MatchingConfig,
  Location,
  BatchMatchingJob,
  MatchingStats,
} from '@/types/matching';

/**
 * Cache entry type
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Tenant with user info from database
 */
interface TenantWithUser {
  user_id: string;
  users?: {
    name?: string;
    email?: string;
  };
  [key: string]: unknown;
}

/**
 * Application status type
 */
type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

/**
 * In-memory cache for match scores and recommendations
 */
class MatchingCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private ttl: number;

  constructor(ttlSeconds: number = 3600) {
    this.ttl = ttlSeconds * 1000; // Convert to milliseconds
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache has expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Property-Tenant Matching Service
 * Implements intelligent matching algorithm with multiple scoring factors
 */
export class MatchingService {
  private supabase;
  private cache: MatchingCache;
  private config: MatchingConfig;

  constructor(config?: Partial<MatchingConfig>) {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Initialize cache
    this.cache = new MatchingCache(
      config?.cache_ttl_seconds || DEFAULT_MATCHING_CONFIG.cache_ttl_seconds
    );

    // Merge provided config with defaults
    this.config = {
      ...DEFAULT_MATCHING_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_MATCHING_CONFIG.weights,
        ...config?.weights,
      },
    };
  }

  /**
   * Calculate distance between two locations using Haversine formula
   */
  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lng - loc1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) *
        Math.cos(this.toRadians(loc2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate price compatibility score (0-100)
   * Higher score = better price match with tenant budget
   */
  private calculatePriceScore(
    tenantPreferences: TenantPreferences,
    property: PropertyFeatures
  ): number {
    const { budget } = tenantPreferences;
    const rent = property.monthly_rent;

    // Add utilities if not included
    const totalCost = property.utilities_included
      ? rent
      : rent + (property.utilities_cost_estimate || 0);

    // Perfect match if within budget range
    if (totalCost >= budget.min && totalCost <= budget.max) {
      // Score higher for prices closer to the middle of the range
      const midpoint = (budget.min + budget.max) / 2;
      const deviation = Math.abs(totalCost - midpoint);
      const maxDeviation = (budget.max - budget.min) / 2;
      return 100 - (deviation / maxDeviation) * 20; // 80-100 range
    }

    // Below minimum budget (too cheap, might be suspicious)
    if (totalCost < budget.min) {
      const deviation = budget.min - totalCost;
      const penalty = Math.min((deviation / budget.min) * 100, 50);
      return 50 - penalty; // 0-50 range
    }

    // Above maximum budget (too expensive)
    const deviation = totalCost - budget.max;
    const maxDeviation = budget.max * this.config.max_price_deviation_percentage / 100;
    
    if (deviation > maxDeviation) {
      return 0; // Too expensive
    }

    // Linear decay for prices above budget
    const penalty = (deviation / maxDeviation) * 80;
    return 80 - penalty; // 0-80 range
  }

  /**
   * Calculate location compatibility score (0-100)
   * Higher score = closer to preferred locations
   */
  private calculateLocationScore(
    tenantPreferences: TenantPreferences,
    property: PropertyFeatures
  ): number {
    const { preferred_locations, max_distance_miles } = tenantPreferences;

    if (!preferred_locations || preferred_locations.length === 0) {
      return 50; // Neutral score if no preference
    }

    // Calculate distance to closest preferred location
    const distances = preferred_locations.map((loc) =>
      this.calculateDistance(loc, property.location)
    );
    const minDistance = Math.min(...distances);
    const maxDistance = max_distance_miles || this.config.max_distance_miles;

    // Perfect score if within 1 mile
    if (minDistance <= 1) {
      return 100;
    }

    // Zero score if beyond max distance
    if (minDistance > maxDistance) {
      return 0;
    }

    // Exponential decay based on distance
    const decayRate = this.config.distance_decay_rate;
    const score = 100 * Math.exp(-decayRate * (minDistance - 1));
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate amenity compatibility score (0-100)
   * Higher score = more amenities matched
   */
  private calculateAmenityScore(
    tenantPreferences: TenantPreferences,
    property: PropertyFeatures
  ): number {
    const { required_amenities, preferred_amenities } = tenantPreferences;
    const propertyAmenities = new Set(property.amenities);

    // Check required amenities (must have all)
    const requiredMet = required_amenities.every((amenity) =>
      propertyAmenities.has(amenity)
    );

    if (!requiredMet) {
      return 0; // Fail if required amenities not met
    }

    // Count preferred amenities matched
    const preferredMatched = preferred_amenities.filter((amenity) =>
      propertyAmenities.has(amenity)
    ).length;

    // Base score for meeting required amenities
    const baseScore = 60;

    // Bonus for preferred amenities
    const preferredScore =
      preferred_amenities.length > 0
        ? (preferredMatched / preferred_amenities.length) * 40
        : 40; // Full bonus if no preferences

    return baseScore + preferredScore;
  }

  /**
   * Calculate lease term compatibility score (0-100)
   * Higher score = better lease term match
   */
  private calculateLeaseTermScore(
    tenantPreferences: TenantPreferences,
    property: PropertyFeatures
  ): number {
    const { preferred_lease_terms, move_in_date, flexible_move_in } =
      tenantPreferences;

    // Check lease term compatibility
    const leaseTermMatch = preferred_lease_terms.some((term) =>
      property.lease_terms.includes(term)
    );

    if (!leaseTermMatch) {
      return 20; // Low score if no lease term match
    }

    let score = 70; // Base score for lease term match

    // Check move-in date compatibility
    if (move_in_date) {
      const tenantMoveIn = new Date(move_in_date);
      const propertyAvailable = new Date(property.available_date);
      const daysDifference = Math.abs(
        (tenantMoveIn.getTime() - propertyAvailable.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference === 0) {
        score += 30; // Perfect match
      } else if (daysDifference <= 7) {
        score += 25; // Within a week
      } else if (daysDifference <= 30) {
        score += 15; // Within a month
      } else if (flexible_move_in) {
        score += 10; // Flexible but not ideal
      }
    } else {
      score += 15; // No specific move-in date
    }

    return Math.min(100, score);
  }

  /**
   * Calculate pet policy compatibility score (0-100)
   * Higher score = better pet policy match
   */
  private calculatePetPolicyScore(
    tenantPreferences: TenantPreferences,
    property: PropertyFeatures
  ): number {
    const { has_pets, pet_types } = tenantPreferences;

    // If tenant has no pets, any policy is fine
    if (!has_pets) {
      return 100;
    }

    // Tenant has pets, check property policy
    const { pet_policy } = property;

    // No pets allowed
    if (pet_policy === 'no_pets') {
      return 0;
    }

    // All pets allowed
    if (pet_policy === 'all_pets') {
      return 100;
    }

    // Case by case (neutral)
    if (pet_policy === 'case_by_case') {
      return 60;
    }

    // Check specific pet types
    if (!pet_types || pet_types.length === 0) {
      return 80; // Has pets but type not specified
    }

    const hasCat = pet_types.includes('cat');
    const hasDog = pet_types.includes('dog');

    if (pet_policy === 'cats_only' && hasCat && !hasDog) {
      return 100;
    }

    if (pet_policy === 'dogs_only' && hasDog && !hasCat) {
      return 100;
    }

    if (pet_policy === 'cats_and_dogs' && (hasCat || hasDog)) {
      return 100;
    }

    // Pet type mismatch
    return 30;
  }

  /**
   * Calculate overall match score between tenant and property
   */
  public calculateMatchScore(
    tenant: TenantPreferences,
    property: PropertyFeatures
  ): MatchScore {
    // Use custom weights if provided, otherwise use config weights
    const weights = tenant.custom_weights || this.config.weights;

    // Calculate component scores
    const priceScore = this.calculatePriceScore(tenant, property);
    const locationScore = this.calculateLocationScore(tenant, property);
    const amenityScore = this.calculateAmenityScore(tenant, property);
    const leaseTermScore = this.calculateLeaseTermScore(tenant, property);
    const petPolicyScore = this.calculatePetPolicyScore(tenant, property);

    const componentScores: ComponentScores = {
      price_score: priceScore,
      location_score: locationScore,
      amenity_score: amenityScore,
      lease_term_score: leaseTermScore,
      pet_policy_score: petPolicyScore,
    };

    // Calculate weighted overall score
    const overallScore =
      priceScore * weights.price +
      locationScore * weights.location +
      amenityScore * weights.amenities +
      leaseTermScore * weights.lease_term +
      petPolicyScore * weights.pet_policy;

    // Calculate compatibility metrics
    const compatibilityMetrics = this.calculateCompatibilityMetrics(
      tenant,
      property,
      componentScores
    );

    // Calculate confidence based on data completeness
    const confidence = this.calculateConfidence(tenant, property);

    const matchScore: MatchScore = {
      property_id: property.id,
      tenant_id: tenant.user_id,
      overall_score: Math.round(overallScore * 100) / 100,
      component_scores: componentScores,
      compatibility_metrics: compatibilityMetrics,
      weights,
      calculated_at: new Date().toISOString(),
      version: this.config.algorithm_version,
      confidence,
    };

    return matchScore;
  }

  /**
   * Calculate detailed compatibility metrics
   */
  private calculateCompatibilityMetrics(
    tenant: TenantPreferences,
    property: PropertyFeatures,
    scores: ComponentScores
  ): CompatibilityMetrics {
    // Distance calculation
    const distances = tenant.preferred_locations.map((loc) =>
      this.calculateDistance(loc, property.location)
    );
    const minDistance = distances.length > 0 ? Math.min(...distances) : undefined;

    // Price metrics
    const totalCost = property.utilities_included
      ? property.monthly_rent
      : property.monthly_rent + (property.utilities_cost_estimate || 0);
    const priceDifference = totalCost - tenant.budget.max;
    const pricePercentage = (totalCost / tenant.budget.max) * 100;
    const affordabilityScore = scores.price_score;

    // Amenity metrics
    const propertyAmenities = new Set(property.amenities);
    const requiredMet = tenant.required_amenities.filter((a) =>
      propertyAmenities.has(a)
    ).length;
    const preferredMet = tenant.preferred_amenities.filter((a) =>
      propertyAmenities.has(a)
    ).length;
    const totalMatched = requiredMet + preferredMet;
    const totalRequested =
      tenant.required_amenities.length + tenant.preferred_amenities.length;
    const amenityMatchPercentage =
      totalRequested > 0 ? (totalMatched / totalRequested) * 100 : 100;

    // Lease metrics
    const leaseTermMatch = tenant.preferred_lease_terms.some((term) =>
      property.lease_terms.includes(term)
    );
    const moveInCompatible = tenant.move_in_date
      ? new Date(property.available_date) <= new Date(tenant.move_in_date)
      : true;

    // Pet metrics
    const petCompatible =
      !tenant.has_pets ||
      property.pet_policy === 'all_pets' ||
      property.pet_policy === 'case_by_case' ||
      (property.pet_policy === 'cats_and_dogs' &&
        tenant.pet_types?.every((t) => t === 'cat' || t === 'dog'));

    // Overall compatibility
    const overallCompatibility =
      (scores.price_score +
        scores.location_score +
        scores.amenity_score +
        scores.lease_term_score +
        scores.pet_policy_score) /
      5;

    return {
      distance_miles: minDistance,
      price_difference: priceDifference,
      price_percentage_of_budget: pricePercentage,
      affordability_score: affordabilityScore,
      required_amenities_met: requiredMet,
      preferred_amenities_met: preferredMet,
      total_amenities_matched: totalMatched,
      amenity_match_percentage: amenityMatchPercentage,
      lease_term_match: leaseTermMatch,
      move_in_date_compatible: moveInCompatible,
      pet_compatible: petCompatible,
      overall_compatibility: overallCompatibility,
    };
  }

  /**
   * Calculate confidence score based on data completeness
   */
  private calculateConfidence(
    tenant: TenantPreferences,
    property: PropertyFeatures
  ): number {
    let score = 0;
    let total = 0;

    // Tenant data completeness
    const tenantFields = [
      tenant.preferred_locations.length > 0,
      tenant.budget.min > 0 && tenant.budget.max > 0,
      tenant.required_amenities.length > 0,
      tenant.preferred_lease_terms.length > 0,
      tenant.move_in_date !== undefined,
    ];

    score += tenantFields.filter(Boolean).length;
    total += tenantFields.length;

    // Property data completeness
    const propertyFields = [
      property.location.lat !== 0 && property.location.lng !== 0,
      property.monthly_rent > 0,
      property.amenities.length > 0,
      property.lease_terms.length > 0,
      property.photos && property.photos.length > 0,
    ];

    score += propertyFields.filter(Boolean).length;
    total += propertyFields.length;

    return score / total;
  }

  /**
   * Get property recommendations for a tenant
   */
  public async getRecommendations(
    tenantId: string,
    limit: number = 20
  ): Promise<PropertyRecommendation[]> {
    // Check cache first
    const cacheKey = `recommendations:tenant:${tenantId}:${limit}`;
    const cached = this.cache.get<PropertyRecommendation[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch tenant preferences
      const { data: tenantData, error: tenantError } = await this.supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', tenantId)
        .single();

      if (tenantError || !tenantData) {
        throw new Error(`Tenant profile not found: ${tenantId}`);
      }

      // Fetch active properties
      const { data: properties, error: propertiesError } = await this.supabase
        .from('properties')
        .select('*')
        .eq('status', 'active')
        .limit(1000);

      if (propertiesError) {
        throw new Error(`Failed to fetch properties: ${propertiesError.message}`);
      }

      // Calculate match scores for all properties
      const matches: Array<{
        property: PropertyFeatures;
        matchScore: MatchScore;
      }> = properties.map((property) => ({
        property: property as PropertyFeatures,
        matchScore: this.calculateMatchScore(
          tenantData as TenantPreferences,
          property as PropertyFeatures
        ),
      }));

      // Filter by minimum score
      const filtered = matches.filter(
        (m) => m.matchScore.overall_score >= this.config.min_match_score
      );

      // Sort by overall score (descending)
      filtered.sort((a, b) => b.matchScore.overall_score - a.matchScore.overall_score);

      // Take top N
      const topMatches = filtered.slice(0, limit);

      // Generate recommendations with explanations
      const recommendations: PropertyRecommendation[] = topMatches.map((match, index) => ({
        property: match.property,
        match_score: match.matchScore,
        rank: index + 1,
        reason: this.generateRecommendationReason(match.matchScore),
        highlights: this.generateHighlights(match.matchScore, match.property),
        concerns: this.generateConcerns(match.matchScore, match.property),
      }));

      // Cache results
      this.cache.set(cacheKey, recommendations);

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Get tenant matches for a property (landlord view)
   */
  public async getTenantMatches(
    propertyId: string,
    limit: number = 20
  ): Promise<TenantRecommendation[]> {
    const cacheKey = `matches:property:${propertyId}:${limit}`;
    const cached = this.cache.get<TenantRecommendation[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch property
      const { data: property, error: propertyError } = await this.supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      // Fetch active tenant profiles
      const { data: tenants, error: tenantsError } = await this.supabase
        .from('tenant_profiles')
        .select('*, users(name, email)')
        .limit(1000);

      if (tenantsError) {
        throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
      }

      // Calculate match scores for all tenants
      const matches: Array<{
        tenant: TenantWithUser;
        matchScore: MatchScore;
      }> = tenants.map((tenant) => ({
        tenant: tenant as TenantWithUser,
        matchScore: this.calculateMatchScore(
          tenant as TenantPreferences,
          property as PropertyFeatures
        ),
      }));

      // Filter and sort
      const filtered = matches.filter(
        (m) => m.matchScore.overall_score >= this.config.min_match_score
      );
      filtered.sort((a, b) => b.matchScore.overall_score - a.matchScore.overall_score);
      const topMatches = filtered.slice(0, limit);

      // Check application status
      const tenantIds = topMatches.map((m) => m.tenant.user_id);
      const { data: applications } = await this.supabase
        .from('applications')
        .select('tenant_id, status')
        .eq('property_id', propertyId)
        .in('tenant_id', tenantIds);

      const applicationMap = new Map<string, ApplicationStatus>(
        applications?.map((app) => [app.tenant_id, app.status as ApplicationStatus]) || []
      );

      // Generate recommendations
      const recommendations: TenantRecommendation[] = topMatches.map((match, index) => ({
        tenant_id: match.tenant.user_id,
        tenant_name: match.tenant.users?.name,
        tenant_email: match.tenant.users?.email,
        match_score: match.matchScore,
        rank: index + 1,
        reason: this.generateRecommendationReason(match.matchScore),
        highlights: this.generateHighlights(match.matchScore, property as PropertyFeatures),
        concerns: this.generateConcerns(match.matchScore, property as PropertyFeatures),
        application_status: applicationMap.get(match.tenant.user_id) || 'none',
      }));

      this.cache.set(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      logger.error('Error getting tenant matches:', error);
      throw error;
    }
  }

  /**
   * Generate human-readable recommendation reason
   */
  private generateRecommendationReason(matchScore: MatchScore): string {
    const score = matchScore.overall_score;

    if (score >= this.config.excellent_match_threshold) {
      return 'Excellent match based on your preferences and requirements.';
    } else if (score >= this.config.good_match_threshold) {
      return 'Good match with most of your preferences met.';
    }

    return 'Fair match with some of your preferences met.';
  }

  /**
   * Generate highlights for recommendation
   */
  private generateHighlights(
    matchScore: MatchScore,
    property: PropertyFeatures
  ): string[] {
    const highlights: string[] = [];
    const { component_scores, compatibility_metrics } = matchScore;

    if (component_scores.price_score >= 80) {
      highlights.push(`Great price at $${property.monthly_rent}/month`);
    }

    if (component_scores.location_score >= 80) {
      highlights.push(`Excellent location near your preferred areas`);
    }

    if (compatibility_metrics.amenity_match_percentage >= 80) {
      highlights.push(`${Math.round(compatibility_metrics.amenity_match_percentage)}% of your desired amenities`);
    }

    if (component_scores.lease_term_score >= 80) {
      highlights.push(`Flexible lease terms available`);
    }

    if (component_scores.pet_policy_score === 100) {
      highlights.push(`Pet-friendly property`);
    }

    return highlights;
  }

  /**
   * Generate concerns for recommendation
   */
  private generateConcerns(
    matchScore: MatchScore,
    property: PropertyFeatures
  ): string[] | undefined {
    const concerns: string[] = [];
    const { component_scores, compatibility_metrics } = matchScore;

    if (component_scores.price_score < 50) {
      concerns.push(`Price may be above your budget`);
    }

    if (component_scores.location_score < 50) {
      concerns.push(`Location is farther from your preferred areas`);
    }

    if (compatibility_metrics.required_amenities_met < tenant.required_amenities.length) {
      concerns.push(`Some required amenities may be missing`);
    }

    if (component_scores.pet_policy_score < 50) {
      concerns.push(`Pet policy may not accommodate your pets`);
    }

    return concerns.length > 0 ? concerns : undefined;
  }

  /**
   * Update matching model based on user feedback
   */
  public async updateMatchingModel(feedback: MatchFeedback): Promise<void> {
    try {
      // Store feedback in database
      const { error } = await this.supabase
        .from('match_feedback')
        .insert({
          user_id: feedback.user_id,
          property_id: feedback.property_id,
          feedback_type: feedback.feedback_type,
          rating: feedback.rating,
          comment: feedback.comment,
          timestamp: feedback.timestamp,
        });

      if (error) {
        throw error;
      }

      // Invalidate cache for this user
      this.cache.invalidate(feedback.user_id);
    } catch (error) {
      logger.error('Error updating matching model:', error);
      throw error;
    }
  }

  /**
   * Batch process matches for multiple tenants or properties
   */
  public async batchProcessMatches(
    tenantIds?: string[],
    propertyIds?: string[]
  ): Promise<BatchMatchingJob> {
    const jobId = `batch_${Date.now()}`;
    const startTime = new Date().toISOString();

    try {
      let totalMatches = 0;

      // Process tenant matches
      if (tenantIds && tenantIds.length > 0) {
        for (const tenantId of tenantIds) {
          const recommendations = await this.getRecommendations(
            tenantId,
            this.config.default_recommendation_limit
          );
          totalMatches += recommendations.length;
        }
      }

      // Process property matches
      if (propertyIds && propertyIds.length > 0) {
        for (const propertyId of propertyIds) {
          const matches = await this.getTenantMatches(
            propertyId,
            this.config.default_recommendation_limit
          );
          totalMatches += matches.length;
        }
      }

      return {
        job_id: jobId,
        status: 'completed',
        tenant_ids: tenantIds,
        property_ids: propertyIds,
        total_matches: totalMatches,
        processed_count: (tenantIds?.length || 0) + (propertyIds?.length || 0),
        started_at: startTime,
        completed_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        job_id: jobId,
        status: 'failed',
        tenant_ids: tenantIds,
        property_ids: propertyIds,
        total_matches: 0,
        processed_count: 0,
        started_at: startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get matching statistics
   */
  public getMatchingStats(): MatchingStats {
    return {
      total_matches_calculated: 0,
      average_match_score: 0,
      excellent_matches: 0,
      good_matches: 0,
      fair_matches: 0,
      poor_matches: 0,
      cache_size: this.cache.size(),
      cache_hit_rate: 0,
      calculation_time_ms: 0,
    };
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  public getCacheSize(): number {
    return this.cache.size();
  }
}

// Export singleton instance
export const matchingService = new MatchingService();