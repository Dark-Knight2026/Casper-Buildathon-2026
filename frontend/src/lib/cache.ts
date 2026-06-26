/**
 * Caching Utilities
 * Provides in-memory and local storage caching with TTL support
 */

import { logger } from '@/utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-memory cache store
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.cache = new Map();
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Local storage cache store
 */
class LocalStorageCache {
  private prefix = 'cache_';

  set<T>(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      
      localStorage.setItem(
        this.prefix + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      logger.error('Failed to set cache in localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);

      if (!item) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      logger.error('Failed to get cache from localStorage:', error);
      return null;
    }
  }

  has(key: string): boolean {
    try {
      const item = localStorage.getItem(this.prefix + key);

      if (!item) {
        return false;
      }

      const entry: CacheEntry<unknown> = JSON.parse(item);

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      logger.error('Failed to delete cache from localStorage:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      logger.error('Failed to clear cache from localStorage:', error);
    }
  }

  cleanup(): void {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key);
          
          if (item) {
            const entry: CacheEntry<unknown> = JSON.parse(item);
            
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup localStorage cache:', error);
    }
  }
}

/**
 * Cache manager
 */
class CacheManager {
  private memoryCache: MemoryCache;
  private localStorageCache: LocalStorageCache;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.memoryCache = new MemoryCache();
    this.localStorageCache = new LocalStorageCache();

    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.memoryCache.cleanup();
      this.localStorageCache.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const storage = options.storage || 'memory';

    if (storage === 'localStorage') {
      this.localStorageCache.set(key, data, ttl);
    } else {
      this.memoryCache.set(key, data, ttl);
    }
  }

  /**
   * Get cache entry
   */
  get<T>(key: string, storage: 'memory' | 'localStorage' = 'memory'): T | null {
    if (storage === 'localStorage') {
      return this.localStorageCache.get<T>(key);
    }
    return this.memoryCache.get<T>(key);
  }

  /**
   * Check if cache entry exists
   */
  has(key: string, storage: 'memory' | 'localStorage' = 'memory'): boolean {
    if (storage === 'localStorage') {
      return this.localStorageCache.has(key);
    }
    return this.memoryCache.has(key);
  }

  /**
   * Delete cache entry
   */
  delete(key: string, storage: 'memory' | 'localStorage' = 'memory'): void {
    if (storage === 'localStorage') {
      this.localStorageCache.delete(key);
    } else {
      this.memoryCache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(storage?: 'memory' | 'localStorage'): void {
    if (!storage || storage === 'memory') {
      this.memoryCache.clear();
    }
    if (!storage || storage === 'localStorage') {
      this.localStorageCache.clear();
    }
  }

  /**
   * Get or set cache entry
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const storage = options.storage || 'memory';
    const cached = this.get<T>(key, storage);

    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string, storage: 'memory' | 'localStorage' = 'memory'): void {
    if (storage === 'memory') {
      // Memory cache doesn't support pattern matching, clear all
      this.memoryCache.clear();
    } else {
      // Clear localStorage entries matching pattern
      try {
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
          if (key.includes(pattern)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        logger.error('Failed to invalidate cache pattern:', error);
      }
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  keyGenerator: (...args: Parameters<T>) => string,
  options: CacheOptions = {}
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyGenerator(...args);
      const storage = options.storage || 'memory';
      const cached = cache.get(key, storage);

      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, options);
      return result;
    };

    return descriptor;
  };
}