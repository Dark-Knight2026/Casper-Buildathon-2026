/**
 * Optimized Query Hook
 * React hook that integrates caching and query monitoring
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { cacheService } from '@/services/cacheService';
import { queryMonitorService } from '@/services/queryMonitorService';

interface UseOptimizedQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'> {
  cacheKey?: string;
  cacheTTL?: number;
  enableCaching?: boolean;
  enableMonitoring?: boolean;
}

export function useOptimizedQuery<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options: UseOptimizedQueryOptions<TData> = {}
): UseQueryResult<TData> {
  const {
    cacheKey = queryKey.join(':'),
    cacheTTL,
    enableCaching = true,
    enableMonitoring = true,
    ...queryOptions
  } = options;

  const optimizedQueryFn = async (): Promise<TData> => {
    const startTime = Date.now();
    let fromCache = false;

    try {
      // Try to get from cache first
      if (enableCaching) {
        const cached = await cacheService.get<TData>(cacheKey);
        if (cached !== null) {
          fromCache = true;
          
          if (enableMonitoring) {
            queryMonitorService.logQuery({
              query: `Query: ${cacheKey}`,
              executionTime: Date.now() - startTime,
              operation: 'SELECT',
              cached: true,
            });
          }
          
          return cached;
        }
      }

      // Fetch data if not in cache
      const data = await queryFn();

      // Store in cache
      if (enableCaching) {
        await cacheService.set(cacheKey, data, cacheTTL);
      }

      // Log query execution
      if (enableMonitoring) {
        queryMonitorService.logQuery({
          query: `Query: ${cacheKey}`,
          executionTime: Date.now() - startTime,
          operation: 'SELECT',
          cached: false,
        });
      }

      return data;
    } catch (error) {
      // Log error
      if (enableMonitoring) {
        queryMonitorService.logQuery({
          query: `Query: ${cacheKey}`,
          executionTime: Date.now() - startTime,
          operation: 'SELECT',
          cached: fromCache,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error;
    }
  };

  return useQuery({
    queryKey,
    queryFn: optimizedQueryFn,
    ...queryOptions,
  });
}