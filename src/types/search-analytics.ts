/**
 * Search Analytics Type Definitions
 * Tracks search behavior, popular queries, and performance metrics
 */

export interface SearchAnalyticsEvent {
  id: string;
  userId: string;
  sessionId: string;
  query: string;
  entityTypes: string[];
  resultCount: number;
  clickedResultId?: string;
  clickedResultType?: string;
  clickedResultPosition?: number;
  timeToFirstClick?: number; // milliseconds
  searchDuration: number; // milliseconds
  filters?: Record<string, unknown>;
  timestamp: Date;
}

export interface PopularSearch {
  query: string;
  searchCount: number;
  avgResultCount: number;
  clickThroughRate: number;
  lastSearched: Date;
}

export interface SearchPerformanceMetrics {
  totalSearches: number;
  avgSearchDuration: number;
  avgResultCount: number;
  avgClickThroughRate: number;
  topQueries: PopularSearch[];
  searchesByEntityType: Record<string, number>;
  searchesByTimeOfDay: Record<number, number>; // hour -> count
  noResultQueries: string[];
}

export interface SearchSuggestionFromDB {
  text: string;
  type: 'popular' | 'recent' | 'autocomplete';
  searchCount?: number;
  relevanceScore?: number;
}