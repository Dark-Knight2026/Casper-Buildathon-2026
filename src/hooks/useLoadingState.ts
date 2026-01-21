/**
 * Loading State Hook
 * Manages loading states with minimum display time
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLoadingStateOptions {
  minDisplayTime?: number; // Minimum time to show loading (ms)
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const { minDisplayTime = 300 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (!startTimeRef.current) {
      setIsLoading(false);
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = minDisplayTime - elapsed;

    if (remaining > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        startTimeRef.current = null;
      }, remaining);
    } else {
      setIsLoading(false);
      startTimeRef.current = null;
    }
  }, [minDisplayTime]);

  const withLoading = useCallback(
    async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await asyncFn();
        stopLoading();
        return result;
      } catch (error) {
        stopLoading();
        throw error;
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}