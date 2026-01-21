/**
 * Global Search System Type Definitions
 * Supports unified search across properties, tenants, documents, and agents
 */

export type SearchableEntity = 'property' | 'tenant' | 'document' | 'agent' | 'lease' | 'maintenance' | 'all';

export interface SearchResult {
  id: string;
  type: SearchableEntity;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  relevanceScore: number;
  highlightedText?: string;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchQuery {
  query: string;
  entityTypes: SearchableEntity[];
  filters: SearchFilters;
  sortBy?: SearchSortOption;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  // Property filters
  propertyType?: string[];
  priceRange?: { min?: number; max?: number };
  bedroomRange?: { min?: number; max?: number };
  bathroomRange?: { min?: number; max?: number };
  location?: string[];
  
  // Tenant filters
  tenantStatus?: string[];
  leaseStatus?: string[];
  
  // Document filters
  documentCategory?: string[];
  requiresSignature?: boolean;
  
  // Agent filters
  agentSpecialties?: string[];
  agentRating?: number;
  
  // Common filters
  dateRange?: { start?: Date; end?: Date };
  status?: string[];
  tags?: string[];
}

export type SearchSortOption = 
  | 'relevance'
  | 'date-desc'
  | 'date-asc'
  | 'price-desc'
  | 'price-asc'
  | 'alphabetical';

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: SearchQuery;
  isActive: boolean;
  notificationsEnabled: boolean;
  lastExecuted?: Date;
  resultCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  entityTypes: SearchableEntity[];
  resultCount: number;
  timestamp: Date;
}

export interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'autocomplete';
  count?: number;
}

export interface SearchAnalytics {
  totalSearches: number;
  popularSearches: Array<{ query: string; count: number }>;
  averageResultsPerSearch: number;
  searchConversionRate: number;
  topEntityTypes: Array<{ type: SearchableEntity; count: number }>;
}