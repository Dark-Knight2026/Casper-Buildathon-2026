import { useState, useEffect, useCallback } from 'react';
import { dataSyncManager } from '@/lib/data-sync';

interface UseOfflineStorageOptions {
  syncOnChange?: boolean;
  syncOnMount?: boolean;
}

/**
 * Hook for offline-first data storage
 */
export function useOfflineStorage<T>(
  key: string,
  initialValue: T,
  options: UseOfflineStorageOptions = {}
) {
  const { syncOnChange = true, syncOnMount = true } = options;

  // Get initial value from localStorage
  const getStoredValue = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('[OfflineStorage] Error reading from localStorage:', error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [value, setValue] = useState<T>(getStoredValue);
  const [isSyncing, setIsSyncing] = useState(false);

  // Save to localStorage
  const saveToStorage = useCallback(
    (newValue: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error('[OfflineStorage] Error writing to localStorage:', error);
      }
    },
    [key]
  );

  // Update value and optionally sync
  const updateValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(prev => {
        const updated = typeof newValue === 'function' 
          ? (newValue as (prev: T) => T)(prev)
          : newValue;
        
        saveToStorage(updated);

        // Add to sync queue if online sync is enabled
        if (syncOnChange) {
          dataSyncManager.addToQueue(key, 'data', 'update', updated);
        }

        return updated;
      });
    },
    [key, saveToStorage, syncOnChange]
  );

  // Sync with server
  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('[OfflineStorage] Cannot sync while offline');
      return false;
    }

    setIsSyncing(true);
    try {
      const result = await dataSyncManager.sync();
      return result.success;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Clear value
  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  // Sync on mount if enabled
  useEffect(() => {
    if (syncOnMount && navigator.onLine) {
      sync();
    }
  }, [syncOnMount, sync]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error('[OfflineStorage] Error parsing storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return {
    value,
    setValue: updateValue,
    sync,
    clear,
    isSyncing,
    isOnline: navigator.onLine
  };
}

/**
 * Hook for offline list storage with CRUD operations
 */
export function useOfflineList<T extends { id: string }>(
  key: string,
  options: UseOfflineStorageOptions = {}
) {
  const { value: items, setValue: setItems, ...rest } = useOfflineStorage<T[]>(
    key,
    [],
    options
  );

  const add = useCallback(
    (item: T) => {
      setItems(prev => [...prev, item]);
      dataSyncManager.addToQueue(item.id, key, 'create', item);
    },
    [key, setItems]
  );

  const update = useCallback(
    (id: string, updates: Partial<T>) => {
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      );
      dataSyncManager.addToQueue(id, key, 'update', updates);
    },
    [key, setItems]
  );

  const remove = useCallback(
    (id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
      dataSyncManager.addToQueue(id, key, 'delete', { id });
    },
    [key, setItems]
  );

  const find = useCallback(
    (id: string) => {
      return items.find(item => item.id === id);
    },
    [items]
  );

  const filter = useCallback(
    (predicate: (item: T) => boolean) => {
      return items.filter(predicate);
    },
    [items]
  );

  return {
    items,
    add,
    update,
    remove,
    find,
    filter,
    ...rest
  };
}