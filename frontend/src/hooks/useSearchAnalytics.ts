import { useState, useCallback, useEffect } from 'react';
import { SearchAnalyticsEvent, PopularSearch, SearchPerformanceMetrics } from '@/types/search-analytics';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface SearchAnalyticsRecord {
  query: string;
  result_count: number;
  clicked_result_id?: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Hook for tracking and analyzing search behavior
 */
export function useSearchAnalytics() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  // Track search event
  const trackSearch = useCallback(async (
    query: string,
    entityTypes: string[],
    resultCount: number,
    filters?: Record<string, unknown>
  ) => {
    const searchDuration = searchStartTime ? Date.now() - searchStartTime : 0;
    
    const event: SearchAnalyticsEvent = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'current-user', // Replace with actual user ID from auth context
      sessionId,
      query,
      entityTypes,
      resultCount,
      searchDuration,
      filters,
      timestamp: new Date(),
    };

    // Store in localStorage
    const existingEvents = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    const updatedEvents = [...existingEvents, event].slice(-100); // Keep last 100 events
    localStorage.setItem('searchAnalytics', JSON.stringify(updatedEvents));

    // Store in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('search_analytics').insert({
          user_id: event.userId,
          session_id: event.sessionId,
          query: event.query,
          entity_types: event.entityTypes,
          result_count: event.resultCount,
          search_duration: event.searchDuration,
          filters: event.filters,
          timestamp: event.timestamp.toISOString(),
        });
      } catch (error) {
        console.error('Failed to store search analytics:', error);
      }
    }

    setSearchStartTime(null);
  }, [sessionId, searchStartTime]);

  // Track result click
  const trackResultClick = useCallback(async (
    query: string,
    resultId: string,
    resultType: string,
    position: number
  ) => {
    const timeToFirstClick = searchStartTime ? Date.now() - searchStartTime : 0;

    // Update the most recent search event with click data
    const existingEvents = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    const lastEvent = existingEvents[existingEvents.length - 1];
    
    if (lastEvent && lastEvent.query === query) {
      lastEvent.clickedResultId = resultId;
      lastEvent.clickedResultType = resultType;
      lastEvent.clickedResultPosition = position;
      lastEvent.timeToFirstClick = timeToFirstClick;
      localStorage.setItem('searchAnalytics', JSON.stringify(existingEvents));

      // Update in Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('search_analytics')
            .update({
              clicked_result_id: resultId,
              clicked_result_type: resultType,
              clicked_result_position: position,
              time_to_first_click: timeToFirstClick,
            })
            .eq('session_id', sessionId)
            .eq('query', query)
            .order('timestamp', { ascending: false })
            .limit(1);
        } catch (error) {
          console.error('Failed to update search analytics:', error);
        }
      }
    }
  }, [sessionId, searchStartTime]);

  // Get popular searches
  const getPopularSearches = useCallback(async (limit: number = 10): Promise<PopularSearch[]> => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('search_analytics')
          .select('query, result_count, clicked_result_id')
          .order('timestamp', { ascending: false })
          .limit(1000);

        if (error) throw error;

        // Aggregate data
        const queryMap = new Map<string, { count: number; totalResults: number; clicks: number; lastSearched: Date }>();
        
        data?.forEach((event: SearchAnalyticsRecord) => {
          const existing = queryMap.get(event.query) || { count: 0, totalResults: 0, clicks: 0, lastSearched: new Date(0) };
          queryMap.set(event.query, {
            count: existing.count + 1,
            totalResults: existing.totalResults + (event.result_count || 0),
            clicks: existing.clicks + (event.clicked_result_id ? 1 : 0),
            lastSearched: new Date(Math.max(existing.lastSearched.getTime(), new Date(event.timestamp).getTime())),
          });
        });

        const popular: PopularSearch[] = Array.from(queryMap.entries())
          .map(([query, stats]) => ({
            query,
            searchCount: stats.count,
            avgResultCount: stats.totalResults / stats.count,
            clickThroughRate: stats.count > 0 ? (stats.clicks / stats.count) * 100 : 0,
            lastSearched: stats.lastSearched,
          }))
          .sort((a, b) => b.searchCount - a.searchCount)
          .slice(0, limit);

        return popular;
      } catch (error) {
        console.error('Failed to get popular searches from database:', error);
      }
    }

    // Fallback to localStorage
    const events: SearchAnalyticsEvent[] = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    const queryMap = new Map<string, { count: number; totalResults: number; clicks: number; lastSearched: Date }>();
    
    events.forEach(event => {
      const existing = queryMap.get(event.query) || { count: 0, totalResults: 0, clicks: 0, lastSearched: new Date(0) };
      queryMap.set(event.query, {
        count: existing.count + 1,
        totalResults: existing.totalResults + event.resultCount,
        clicks: existing.clicks + (event.clickedResultId ? 1 : 0),
        lastSearched: new Date(Math.max(existing.lastSearched.getTime(), event.timestamp.getTime())),
      });
    });

    const popular: PopularSearch[] = Array.from(queryMap.entries())
      .map(([query, stats]) => ({
        query,
        searchCount: stats.count,
        avgResultCount: stats.totalResults / stats.count,
        clickThroughRate: stats.count > 0 ? (stats.clicks / stats.count) * 100 : 0,
        lastSearched: stats.lastSearched,
      }))
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit);

    return popular;
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(async (): Promise<SearchPerformanceMetrics> => {
    const events: SearchAnalyticsEvent[] = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    
    if (events.length === 0) {
      return {
        totalSearches: 0,
        avgSearchDuration: 0,
        avgResultCount: 0,
        avgClickThroughRate: 0,
        topQueries: [],
        searchesByEntityType: {},
        searchesByTimeOfDay: {},
        noResultQueries: [],
      };
    }

    const totalSearches = events.length;
    const avgSearchDuration = events.reduce((sum, e) => sum + e.searchDuration, 0) / totalSearches;
    const avgResultCount = events.reduce((sum, e) => sum + e.resultCount, 0) / totalSearches;
    const clickedSearches = events.filter(e => e.clickedResultId).length;
    const avgClickThroughRate = (clickedSearches / totalSearches) * 100;

    const topQueries = await getPopularSearches(5);

    const searchesByEntityType: Record<string, number> = {};
    events.forEach(event => {
      event.entityTypes.forEach(type => {
        searchesByEntityType[type] = (searchesByEntityType[type] || 0) + 1;
      });
    });

    const searchesByTimeOfDay: Record<number, number> = {};
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      searchesByTimeOfDay[hour] = (searchesByTimeOfDay[hour] || 0) + 1;
    });

    const noResultQueries = events
      .filter(e => e.resultCount === 0)
      .map(e => e.query)
      .filter((query, index, self) => self.indexOf(query) === index)
      .slice(0, 10);

    return {
      totalSearches,
      avgSearchDuration,
      avgResultCount,
      avgClickThroughRate,
      topQueries,
      searchesByEntityType,
      searchesByTimeOfDay,
      noResultQueries,
    };
  }, [getPopularSearches]);

  // Mark search start time
  const startSearch = useCallback(() => {
    setSearchStartTime(Date.now());
  }, []);

  return {
    trackSearch,
    trackResultClick,
    getPopularSearches,
    getPerformanceMetrics,
    startSearch,
  };
}