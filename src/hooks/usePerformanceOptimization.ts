import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce, throttle, prefersReducedMotion } from '@/utils/performance';

/**
 * Custom hook for performance optimization utilities
 */
export function usePerformanceOptimization() {
  const reducedMotion = prefersReducedMotion();

  /**
   * Create a debounced callback
   */
  const useDebouncedCallback = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      callback: T,
      delay: number
    ): ((...args: Parameters<T>) => void) => {
      return debounce(callback, delay);
    },
    []
  );

  /**
   * Create a throttled callback
   */
  const useThrottledCallback = useCallback(
    <T extends (...args: unknown[]) => unknown>(
      callback: T,
      limit: number
    ): ((...args: Parameters<T>) => void) => {
      return throttle(callback, limit);
    },
    []
  );

  return {
    reducedMotion,
    useDebouncedCallback,
    useThrottledCallback
  };
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, placeholder?: string) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            const img = entry.target as HTMLImageElement;
            img.src = src;
            img.onload = () => {
              setIsLoaded(true);
              setCurrentSrc(src);
            };
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [src, isLoaded]);

  return { imgRef, isLoaded, currentSrc };
}

/**
 * Hook for tracking component render performance
 */
export function useRenderTracking(componentName: string, enabled: boolean = true) {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    startTime.current = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      
      if (duration > 16) { // More than one frame (60fps = 16.67ms per frame)
        console.warn(
          `[Performance] ${componentName} render #${renderCount.current} took ${duration.toFixed(2)}ms (> 16ms)`
        );
      }
    };
  });

  return renderCount.current;
}

/**
 * Hook for intersection observer (visibility detection)
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
) {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      options
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [options]);

  return { elementRef, isVisible };
}

/**
 * Hook for prefetching data
 */
export function usePrefetch<T>(
  fetchFn: () => Promise<T>,
  shouldPrefetch: boolean = true
) {
  const dataRef = useRef<T | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!shouldPrefetch || dataRef.current || isLoadingRef.current) return;

    isLoadingRef.current = true;
    fetchFn()
      .then((data) => {
        dataRef.current = data;
      })
      .catch((error) => {
        console.error('[Prefetch Error]', error);
      })
      .finally(() => {
        isLoadingRef.current = false;
      });
  }, [shouldPrefetch, fetchFn]);

  return { data: dataRef.current, isLoading: isLoadingRef.current };
}

/**
 * Hook for network status monitoring
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string | undefined>();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    const connection = (navigator as unknown as {
      connection?: { effectiveType?: string };
    }).connection;
    
    if (connection) {
      setConnectionType(connection.effectiveType);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType
  };
}