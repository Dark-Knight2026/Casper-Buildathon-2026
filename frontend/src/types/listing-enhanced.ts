/**
 * Enhanced Listing Type Definitions
 * Extends base listing types with advanced features
 */

import type { Listing } from './listing';

// Listing Status Types
export type ListingStatus = 
  | 'draft'
  | 'coming_soon'
  | 'active'
  | 'pending'
  | 'under_contract'
  | 'sold'
  | 'rented'
  | 'off_market'
  | 'expired'
  | 'archived';

export type ListingVisibility = 'public' | 'private' | 'mls_only' | 'coming_soon';

// Photo Management
export interface ListingPhoto {
  id: string;
  listingId: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  isFeatured: boolean;
  uploadedAt: Date;
  uploadedBy: string;
  metadata?: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export interface PhotoUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Virtual Tour
export interface VirtualTour {
  id: string;
  listingId: string;
  type: 'matterport' | 'zillow_3d' | 'youtube' | 'custom';
  url: string;
  embedCode?: string;
  createdAt: Date;
}

// Floor Plan
export interface FloorPlan {
  id: string;
  listingId: string;
  name: string;
  imageUrl: string;
  level?: string;
  squareFootage?: number;
  order: number;
}

// Listing Template
export interface ListingTemplate {
  id: string;
  name: string;
  description?: string;
  propertyType: string;
  templateData: Partial<EnhancedListing>;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  usageCount: number;
}

// Pricing Intelligence
export interface PricingRecommendation {
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: number;
  comparables: ComparableProperty[];
  marketTrends: MarketTrend[];
  reasoning: string;
  lastUpdated: Date;
}

export interface ComparableProperty {
  id: string;
  address: string;
  price: number;
  soldPrice?: number;
  soldDate?: Date;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  daysOnMarket: number;
  distance: number; // miles from subject property
  similarity: number; // 0-100 score
  adjustments: PriceAdjustment[];
}

export interface PriceAdjustment {
  factor: string;
  amount: number;
  reason: string;
}

export interface MarketTrend {
  period: string;
  averagePrice: number;
  medianPrice: number;
  daysOnMarket: number;
  inventoryLevel: number;
  priceChange: number;
}

// Listing Analytics
export interface ListingAnalytics {
  listingId: string;
  totalViews: number;
  uniqueViews: number;
  averageTimeOnPage: number;
  inquiries: number;
  showingRequests: number;
  favorites: number;
  shares: number;
  trafficSources: TrafficSource[];
  viewsByDay: ViewsByDay[];
  engagementMetrics: EngagementMetrics;
  lastUpdated: Date;
}

export interface TrafficSource {
  source: string;
  views: number;
  percentage: number;
}

export interface ViewsByDay {
  date: string;
  views: number;
  uniqueViews: number;
}

export interface EngagementMetrics {
  photoViews: PhotoEngagement[];
  mostViewedSection: string;
  averageScrollDepth: number;
  bounceRate: number;
  conversionRate: number;
}

export interface PhotoEngagement {
  photoId: string;
  views: number;
  averageViewTime: number;
}

// Lead Management
export interface ListingInquiry {
  id: string;
  listingId: string;
  inquirerName: string;
  inquirerEmail: string;
  inquirerPhone?: string;
  message: string;
  inquiryType: 'general' | 'showing' | 'offer' | 'financing';
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'showing_scheduled' | 'closed' | 'lost';
  priority: 'low' | 'medium' | 'high';
  score?: number;
  submittedAt: Date;
  followUpDate?: Date;
  notes?: string[];
}

export interface ShowingRequest {
  id: string;
  listingId: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedByPhone?: string;
  preferredDate: Date;
  preferredTime: string;
  alternateDate?: Date;
  alternateTime?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  confirmedDate?: Date;
  confirmedTime?: string;
  notes?: string;
  feedback?: ShowingFeedback;
  createdAt: Date;
}

export interface ShowingFeedback {
  rating: number;
  comments: string;
  interests: string[];
  concerns: string[];
  likelihood: 'very_interested' | 'interested' | 'neutral' | 'not_interested';
  submittedAt: Date;
}

// Marketing
export interface MarketingCampaign {
  id: string;
  listingId: string;
  name: string;
  type: 'email' | 'social' | 'print' | 'open_house' | 'virtual_tour';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  channels: MarketingChannel[];
  budget?: number;
  spent?: number;
  results?: CampaignResults;
}

export interface MarketingChannel {
  channel: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'email' | 'mls' | 'zillow' | 'realtor_com';
  status: 'pending' | 'active' | 'completed' | 'failed';
  postedAt?: Date;
  postUrl?: string;
  reach?: number;
  engagement?: number;
}

export interface CampaignResults {
  impressions: number;
  clicks: number;
  inquiries: number;
  showings: number;
  offers: number;
  costPerLead: number;
  roi: number;
}

// Documents
export interface ListingDocument {
  id: string;
  listingId: string;
  name: string;
  type: 'listing_agreement' | 'disclosure' | 'inspection' | 'appraisal' | 'title' | 'hoa' | 'other';
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  expiresAt?: Date;
  requiresSignature: boolean;
  signatureStatus?: 'pending' | 'signed' | 'declined';
  version: number;
  isPublic: boolean;
}

// Collaboration
export interface ListingCollaborator {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'owner' | 'co_agent' | 'team_member' | 'viewer';
  permissions: CollaboratorPermissions;
  addedAt: Date;
  addedBy: string;
}

export interface CollaboratorPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canViewAnalytics: boolean;
  canManageInquiries: boolean;
  canScheduleShowings: boolean;
  canManageDocuments: boolean;
}

export interface ListingActivity {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Enhanced Listing
export interface EnhancedListing extends Listing {
  // Status & Visibility
  status: ListingStatus;
  visibility: ListingVisibility;
  expirationDate?: Date;
  autoRenew: boolean;
  
  // Unique Identification
  fingerprint?: string;
  parcelId?: string;
  
  // Media
  photos: ListingPhoto[];
  virtualTours: VirtualTour[];
  floorPlans: FloorPlan[];
  videoUrl?: string;
  
  // Pricing
  originalPrice?: number;
  priceHistory: PriceChange[];
  pricingRecommendation?: PricingRecommendation;
  
  // Analytics
  analytics?: ListingAnalytics;
  daysOnMarket: number;
  viewCount: number;
  inquiryCount: number;
  
  // Marketing
  marketingCampaigns: MarketingCampaign[];
  qrCode?: string;
  landingPageUrl?: string;
  mlsNumber?: string;
  syndicatedTo: string[];
  
  // Lead Management
  inquiries: ListingInquiry[];
  showingRequests: ShowingRequest[];
  
  // Documents
  documents: ListingDocument[];
  
  // Collaboration
  collaborators: ListingCollaborator[];
  activities: ListingActivity[];
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  
  // Neighborhood
  neighborhoodData?: NeighborhoodData;
  
  // Internal
  internalNotes?: string;
  agentRemarks?: string;
  isDraft: boolean;
  lastModifiedBy: string;
  lastModifiedAt: Date;
}

export interface PriceChange {
  date: Date;
  oldPrice: number;
  newPrice: number;
  reason?: string;
  changedBy: string;
}

export interface NeighborhoodData {
  schools: SchoolInfo[];
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
  crimeRate?: string;
  demographics?: Demographics;
  amenities: Amenity[];
  commuteTime?: CommuteInfo[];
}

export interface SchoolInfo {
  name: string;
  type: 'elementary' | 'middle' | 'high';
  rating?: number;
  distance: number;
  grades: string;
}

export interface Demographics {
  medianIncome?: number;
  medianAge?: number;
  population?: number;
  householdSize?: number;
}

export interface Amenity {
  name: string;
  type: 'restaurant' | 'shopping' | 'park' | 'hospital' | 'transit' | 'entertainment';
  distance: number;
  rating?: number;
}

export interface CommuteInfo {
  destination: string;
  driveTime: number;
  transitTime?: number;
  distance: number;
}

// AI Description Generation
export interface AIDescriptionRequest {
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage?: number;
  features: string[];
  location: string;
  price: number;
  tone?: 'professional' | 'casual' | 'luxury' | 'family_friendly';
  length?: 'short' | 'medium' | 'long';
}

export interface AIDescriptionResponse {
  title: string;
  description: string;
  highlights: string[];
  seoKeywords: string[];
  marketingRemarks: string;
}

// Bulk Operations
export interface BulkListingOperation {
  id: string;
  operationType: 'import' | 'export' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errors: BulkOperationError[];
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
}

export interface BulkOperationError {
  itemId: string;
  error: string;
  details?: string;
}

// Listing Filters
export interface ListingFilters {
  status?: ListingStatus[];
  propertyType?: string[];
  priceMin?: number;
  priceMax?: number;
  bedroomsMin?: number;
  bathroomsMin?: number;
  squareFootageMin?: number;
  squareFootageMax?: number;
  daysOnMarketMax?: number;
  hasVirtualTour?: boolean;
  hasOpenHouse?: boolean;
  clientType?: string[];
  agentId?: string;
  searchTerm?: string;
  sortBy?: 'price' | 'date' | 'views' | 'inquiries' | 'daysOnMarket';
  sortOrder?: 'asc' | 'desc';
}

// Listing Statistics
export interface ListingStatistics {
  total: number;
  byStatus: Record<ListingStatus, number>;
  byPropertyType: Record<string, number>;
  averagePrice: number;
  medianPrice: number;
  averageDaysOnMarket: number;
  totalViews: number;
  totalInquiries: number;
  conversionRate: number;
  activeListingsValue: number;
}