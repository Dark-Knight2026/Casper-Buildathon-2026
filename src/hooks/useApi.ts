import { useState, useCallback } from 'react';
import { apiClient, ApiResponse, ApiError } from '@/lib/api-client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<ApiResponse<T> | null>;
  reset: () => void;
}

/**
 * Hook for making API requests
 */
export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<ApiResponse<T>>,
  immediate = false
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null
  });

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);
        setState({ data: response.data, loading: false, error: null });
        return response;
      } catch (error) {
        const apiError = error as ApiError;
        setState({ data: null, loading: false, error: apiError });
        return null;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

/**
 * Hook for GET requests
 */
export function useGet<T>(url: string, immediate = false) {
  return useApi<T>(
    useCallback(() => apiClient.get<T>(url), [url]),
    immediate
  );
}

/**
 * Hook for POST requests
 */
export function usePost<T>(url: string) {
  return useApi<T>(
    useCallback((data: unknown) => apiClient.post<T>(url, data), [url]),
    false
  );
}

/**
 * Hook for PUT requests
 */
export function usePut<T>(url: string) {
  return useApi<T>(
    useCallback((data: unknown) => apiClient.put<T>(url, data), [url]),
    false
  );
}

/**
 * Hook for PATCH requests
 */
export function usePatch<T>(url: string) {
  return useApi<T>(
    useCallback((data: unknown) => apiClient.patch<T>(url, data), [url]),
    false
  );
}

/**
 * Hook for DELETE requests
 */
export function useDelete<T>(url: string) {
  return useApi<T>(
    useCallback(() => apiClient.delete<T>(url), [url]),
    false
  );
}