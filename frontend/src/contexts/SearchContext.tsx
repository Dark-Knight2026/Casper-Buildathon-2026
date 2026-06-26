import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { logger } from '@/utils/logger';
import {
  SearchQuery,
  SearchResult,
  SavedSearch,
  SearchHistory,
  SearchSuggestion,
  SearchableEntity,
  SearchFilters,
  SearchSortOption,
} from '@/types/search';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics';
import { calculateRelevanceScore } from '@/utils/fuzzyMatch';

interface SearchContextType {
  // Search state
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  
  // Search actions
  search: (query: string, entityTypes?: SearchableEntity[], filters?: SearchFilters) => Promise<void>;
  clearSearch: () => void;
  setQuery: (query: string) => void;

  // Saved searches
  savedSearches: SavedSearch[];
  saveSearch: (name: string, searchQuery: SearchQuery) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
  executeSavedSearch: (id: string) => Promise<void>;

  // Search history
  searchHistory: SearchHistory[];
  clearSearchHistory: () => void;

  // Suggestions
  suggestions: SearchSuggestion[];
  getSuggestions: (partial: string) => Promise<void>;

  // Filters
  activeFilters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;

  // Sort
  sortBy: SearchSortOption;
  setSortBy: (sort: SearchSortOption) => void;

  // Analytics
  trackResultClick: (resultId: string, resultType: string, position: number) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Type definitions for database records
interface PropertyRecord {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  price?: number;
  price_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
  image_url?: string;
  type?: string;
  created_at: string;
}

interface TenantRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  unit_number?: string;
  created_at: string;
}

interface DocumentRecord {
  id: string;
  title?: string;
  description?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  category?: string;
  status?: string;
  created_at: string;
}

interface AgentRecord {
  id: string;
  name?: string;
  email?: string;
  specialization?: string;
  bio?: string;
  rating?: number;
  properties_sold?: number;
  avatar_url?: string;
  profile_image?: string;
  created_at: string;
}

interface LeaseRecord {
  id: string;
  lease_number?: string;
  status?: string;
  end_date?: string;
  properties?: {
    address?: string;
  };
  tenants?: {
    name?: string;
  };
  created_at: string;
}

interface MaintenanceRecord {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  properties?: {
    address?: string;
  };
  created_at: string;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SearchSortOption>('relevance');

  // Analytics hook
  const { trackSearch, trackResultClick: trackClick, getPopularSearches, startSearch } = useSearchAnalytics();

  // Load saved searches and history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedSearches');
    const history = localStorage.getItem('searchHistory');
    
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (e) {
        logger.error('Failed to load saved searches:', e);
      }
    }

    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        logger.error('Failed to load search history:', e);
      }
    }
  }, []);

  // Search properties with fuzzy matching and relevance scoring
  const searchProperties = async (searchQuery: string, filters: SearchFilters): Promise<SearchResult[]> => {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .or(`address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

      // Apply filters
      if (filters.propertyType) {
        query = query.eq('type', filters.propertyType);
      }

      if (filters.priceRange) {
        if (filters.priceRange.min !== undefined) {
          query = query.gte('price', filters.priceRange.min);
        }
        if (filters.priceRange.max !== undefined) {
          query = query.lte('price', filters.priceRange.max);
        }
      }

      if (filters.bedrooms !== undefined) {
        query = query.gte('bedrooms', filters.bedrooms);
      }

      if (filters.bathrooms !== undefined) {
        query = query.gte('bathrooms', filters.bathrooms);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return (data || []).map((property: PropertyRecord) => {
        // Calculate relevance score using fuzzy matching
        const relevanceScore = calculateRelevanceScore(searchQuery, [
          { text: property.address || '', weight: 3 },
          { text: property.city || '', weight: 2 },
          { text: property.state || '', weight: 1 },
          { text: property.description || '', weight: 1.5 },
        ]);

        return {
          id: property.id,
          type: 'property' as const,
          title: property.address || 'Property',
          subtitle: `$${property.price?.toLocaleString() || 'N/A'}${property.price_type === 'rent' ? '/month' : ''} • ${property.bedrooms || 0} bed, ${property.bathrooms || 0} bath`,
          description: property.description || '',
          imageUrl: property.images?.[0] || property.image_url,
          relevanceScore,
          url: `/properties/${property.id}`,
          createdAt: new Date(property.created_at),
        };
      });
    } catch (err) {
      logger.error('Error searching properties:', err);
      return [];
    }
  };

  // Search tenants with fuzzy matching
  const searchTenants = async (searchQuery: string, filters: SearchFilters): Promise<SearchResult[]> => {
    try {
      let query = supabase
        .from('tenants')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

      if (filters.tenantStatus) {
        query = query.eq('status', filters.tenantStatus);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return (data || []).map((tenant: TenantRecord) => {
        const relevanceScore = calculateRelevanceScore(searchQuery, [
          { text: tenant.name || '', weight: 3 },
          { text: tenant.email || '', weight: 2 },
          { text: tenant.phone || '', weight: 1 },
        ]);

        return {
          id: tenant.id,
          type: 'tenant' as const,
          title: tenant.name || 'Tenant',
          subtitle: `${tenant.status || 'Unknown'} • ${tenant.unit_number || 'No unit'}`,
          description: tenant.email || tenant.phone || '',
          relevanceScore,
          url: `/tenants/${tenant.id}`,
          createdAt: new Date(tenant.created_at),
        };
      });
    } catch (err) {
      logger.error('Error searching tenants:', err);
      return [];
    }
  };

  // Search documents with fuzzy matching
  const searchDocuments = async (searchQuery: string, filters: SearchFilters): Promise<SearchResult[]> => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,file_name.ilike.%${searchQuery}%`);

      if (filters.documentCategory) {
        query = query.eq('category', filters.documentCategory);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return (data || []).map((doc: DocumentRecord) => {
        const relevanceScore = calculateRelevanceScore(searchQuery, [
          { text: doc.title || '', weight: 3 },
          { text: doc.file_name || '', weight: 2 },
          { text: doc.description || '', weight: 1.5 },
        ]);

        return {
          id: doc.id,
          type: 'document' as const,
          title: doc.title || doc.file_name || 'Document',
          subtitle: `${doc.file_type?.toUpperCase() || 'FILE'} • ${doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Unknown size'} • ${doc.status || 'Pending'}`,
          description: doc.description || '',
          relevanceScore,
          url: `/documents/${doc.id}`,
          createdAt: new Date(doc.created_at),
        };
      });
    } catch (err) {
      logger.error('Error searching documents:', err);
      return [];
    }
  };

  // Search agents with fuzzy matching
  const searchAgents = async (searchQuery: string, filters: SearchFilters): Promise<SearchResult[]> => {
    try {
      let query = supabase
        .from('agents')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,specialization.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);

      if (filters.agentRating !== undefined) {
        query = query.gte('rating', filters.agentRating);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return (data || []).map((agent: AgentRecord) => {
        const relevanceScore = calculateRelevanceScore(searchQuery, [
          { text: agent.name || '', weight: 3 },
          { text: agent.specialization || '', weight: 2 },
          { text: agent.bio || '', weight: 1 },
        ]);

        return {
          id: agent.id,
          type: 'agent' as const,
          title: agent.name || 'Agent',
          subtitle: `${agent.rating ? `${agent.rating} ⭐` : 'No rating'} • ${agent.properties_sold || 0}+ properties sold`,
          description: agent.bio || agent.specialization || '',
          imageUrl: agent.avatar_url || agent.profile_image,
          relevanceScore,
          url: `/agents/${agent.id}`,
          createdAt: new Date(agent.created_at),
        };
      });
    } catch (err) {
      logger.error('Error searching agents:', err);
      return [];
    }
  };

  // Search leases with fuzzy matching
  const searchLeases = async (searchQuery: string, filters: SearchFilters): Promise<SearchResult[]> => {
    try {
      let query = supabase
        .from('leases')
        .select('*, properties(address), tenants(name)')
        .or(`lease_number.ilike.%${searchQuery}%`);

      if (filters.leaseStatus) {
        query = query.eq('status', filters.leaseStatus);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      return (data || []).map((lease: LeaseRecord) => {
        const relevanceScore = calculateRelevanceScore(searchQuery, [
          { text: lease.lease_number || '', weight: 3 },
          { text: lease.properties?.address || '', weight: 2 },
          { text: lease.tenants?.name || '', weight: 2 },
        ]);

        return {
          id: lease.id,
          type: 'lease' as const,
          title: `Lease ${lease.lease_number || lease.id}`,
          subtitle: `${lease.properties?.address || 'Property'} • ${lease.tenants?.name || 'Tenant'}`,
          description: `${lease.status || 'Active'} • Expires: ${lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'N/A'}`,
          relevanceScore,
          url: `/leases/${lease.id}`,
          createdAt: new Date(lease.created_at),
        };
      });
    } catch (err) {
      logger.error('Error searching leases:', err);
      return [];
    }
  };

  // Search maintenance requests with fuzzy matching
  const searchMaintenance = async (searchQuery: string): Promise<SearchResult[]> => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, properties(address)')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .limit(50);

      if (error) throw error;

      return (data || []).map((request: MaintenanceRecord) => {
        const relevanceScore = calculateRelevanceScore(searchQuery, [
          { text: request.title || '', weight: 3 },
          { text: request.description || '', weight: 2 },
          { text: request.category || '', weight: 1.5 },
        ]);

        return {
          id: request.id,
          type: 'maintenance' as const,
          title: request.title || 'Maintenance Request',
          subtitle: `${request.category || 'General'} • ${request.priority || 'Normal'} Priority`,
          description: `${request.properties?.address || 'Property'} • ${request.status || 'Pending'}`,
          relevanceScore,
          url: `/maintenance/${request.id}`,
          createdAt: new Date(request.created_at),
        };
      });
    } catch (err) {
      logger.error('Error searching maintenance:', err);
      return [];
    }
  };

  // Fallback mock search function
  const searchWithMockData = useCallback(async (
    searchQuery: string,
    entityTypes: SearchableEntity[],
    filters: SearchFilters
  ) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'property',
        title: '123 Main St, Los Angeles, CA',
        subtitle: '$2,500/month • 2 bed, 2 bath',
        description: 'Modern apartment in downtown LA with great amenities',
        imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
        relevanceScore: 0.95,
        url: '/properties/1',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        type: 'tenant',
        title: 'John Smith',
        subtitle: 'Active Tenant • Unit 205',
        description: 'Lease expires: Dec 2025',
        relevanceScore: 0.88,
        url: '/tenants/2',
        createdAt: new Date('2024-02-20'),
      },
      {
        id: '3',
        type: 'document',
        title: 'Lease Agreement - 123 Main St',
        subtitle: 'PDF • 245 KB • Signed',
        description: 'Standard residential lease agreement',
        relevanceScore: 0.82,
        url: '/documents/3',
        createdAt: new Date('2024-01-10'),
      },
      {
        id: '4',
        type: 'agent',
        title: 'Sarah Johnson',
        subtitle: '4.9 ⭐ • 150+ properties sold',
        description: 'Specializes in residential properties in Los Angeles',
        imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
        relevanceScore: 0.75,
        url: '/agents/4',
        createdAt: new Date('2023-06-01'),
      },
    ];

    let filteredResults = mockResults;

    if (!entityTypes.includes('all')) {
      filteredResults = mockResults.filter(r => entityTypes.includes(r.type));
    }

    const sortedResults = [...filteredResults].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'date-desc':
          return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
        case 'date-asc':
          return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setResults(sortedResults);

    const historyEntry: SearchHistory = {
      id: Date.now().toString(),
      userId: 'current-user',
      query: searchQuery,
      entityTypes,
      resultCount: sortedResults.length,
      timestamp: new Date(),
    };

    const updatedHistory = [historyEntry, ...searchHistory].slice(0, 20);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  }, [sortBy, searchHistory]);

  // Main search function with analytics
  const search = useCallback(async (
    searchQuery: string,
    entityTypes: SearchableEntity[] = ['all'],
    filters: SearchFilters = {}
  ) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    startSearch();
    setIsSearching(true);
    setError(null);

    try {
      if (!isSupabaseConfigured()) {
        logger.warn('Supabase not configured, using mock data');
        await searchWithMockData(searchQuery, entityTypes, filters);
        await trackSearch(searchQuery, entityTypes.map(String), results.length, filters);
        return;
      }

      const searchPromises: Promise<SearchResult[]>[] = [];
      const shouldSearchAll = entityTypes.includes('all');

      if (shouldSearchAll || entityTypes.includes('property')) {
        searchPromises.push(searchProperties(searchQuery, filters));
      }

      if (shouldSearchAll || entityTypes.includes('tenant')) {
        searchPromises.push(searchTenants(searchQuery, filters));
      }

      if (shouldSearchAll || entityTypes.includes('document')) {
        searchPromises.push(searchDocuments(searchQuery, filters));
      }

      if (shouldSearchAll || entityTypes.includes('agent')) {
        searchPromises.push(searchAgents(searchQuery, filters));
      }

      if (shouldSearchAll || entityTypes.includes('lease')) {
        searchPromises.push(searchLeases(searchQuery, filters));
      }

      if (shouldSearchAll || entityTypes.includes('maintenance')) {
        searchPromises.push(searchMaintenance(searchQuery));
      }

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Filter results by minimum relevance score
      const relevantResults = allResults.filter(r => r.relevanceScore >= 0.3);

      const sortedResults = [...relevantResults].sort((a, b) => {
        switch (sortBy) {
          case 'relevance':
            return b.relevanceScore - a.relevanceScore;
          case 'date-desc':
            return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
          case 'date-asc':
            return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          case 'alphabetical':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });

      setResults(sortedResults);

      // Track search analytics
      await trackSearch(searchQuery, entityTypes.map(String), sortedResults.length, filters);

      const historyEntry: SearchHistory = {
        id: Date.now().toString(),
        userId: 'current-user',
        query: searchQuery,
        entityTypes,
        resultCount: sortedResults.length,
        timestamp: new Date(),
      };

      const updatedHistory = [historyEntry, ...searchHistory].slice(0, 20);
      setSearchHistory(updatedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    } catch (err) {
      logger.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [sortBy, searchHistory, searchWithMockData, startSearch, trackSearch, results.length]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  const saveSearch = useCallback(async (name: string, searchQuery: SearchQuery) => {
    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      userId: 'current-user',
      name,
      query: searchQuery,
      isActive: true,
      notificationsEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = [...savedSearches, newSavedSearch];
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  }, [savedSearches]);

  const deleteSavedSearch = useCallback(async (id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  }, [savedSearches]);

  const executeSavedSearch = useCallback(async (id: string) => {
    const savedSearch = savedSearches.find(s => s.id === id);
    if (savedSearch) {
      setQuery(savedSearch.query.query);
      await search(
        savedSearch.query.query,
        savedSearch.query.entityTypes,
        savedSearch.query.filters
      );
    }
  }, [savedSearches, search]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  // Enhanced suggestions with popular searches from database
  const getSuggestions = useCallback(async (partial: string) => {
    if (!partial.trim()) {
      setSuggestions([]);
      return;
    }

    // Get popular searches from analytics
    const popularSearches = await getPopularSearches(5);
    const popularSuggestions = popularSearches
      .filter(ps => ps.query.toLowerCase().includes(partial.toLowerCase()))
      .map(ps => ({ text: ps.query, type: 'popular' as const }));

    // Generate autocomplete suggestions
    const autocompleteSuggestions: SearchSuggestion[] = [
      { text: partial, type: 'autocomplete' },
      { text: `${partial} apartments`, type: 'autocomplete' },
      { text: `${partial} for rent`, type: 'autocomplete' },
    ];

    // Add recent searches that match
    const recentSuggestions = searchHistory
      .filter(h => h.query.toLowerCase().includes(partial.toLowerCase()))
      .slice(0, 3)
      .map(h => ({ text: h.query, type: 'recent' as const }));

    setSuggestions([...popularSuggestions, ...recentSuggestions, ...autocompleteSuggestions]);
  }, [searchHistory, getPopularSearches]);

  const setFilters = useCallback((filters: SearchFilters) => {
    setActiveFilters(filters);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const trackResultClick = useCallback((resultId: string, resultType: string, position: number) => {
    trackClick(query, resultId, resultType, position);
  }, [query, trackClick]);

  return (
    <SearchContext.Provider
      value={{
        query,
        results,
        isSearching,
        error,
        search,
        clearSearch,
        setQuery,
        savedSearches,
        saveSearch,
        deleteSavedSearch,
        executeSavedSearch,
        searchHistory,
        clearSearchHistory,
        suggestions,
        getSuggestions,
        activeFilters,
        setFilters,
        clearFilters,
        sortBy,
        setSortBy,
        trackResultClick,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}