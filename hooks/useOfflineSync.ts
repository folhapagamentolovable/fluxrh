import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

interface OfflineData {
  key: string;
  data: unknown;
  timestamp: number;
  expiry?: number;
}

const SYNC_QUEUE_KEY = 'fluxpay-sync-queue';
const OFFLINE_CACHE_KEY = 'fluxpay-offline-cache';
const MAX_RETRIES = 3;

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load sync queue from localStorage
  useEffect(() => {
    const savedQueue = localStorage.getItem(SYNC_QUEUE_KEY);
    if (savedQueue) {
      try {
        setSyncQueue(JSON.parse(savedQueue));
      } catch (error) {
      }
    }
  }, []);

  // Save sync queue to localStorage
  useEffect(() => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Send message to service worker about connection status
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CONNECTION_STATUS',
        isOnline: navigator.onLine
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic sync check
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncing && syncQueue.length > 0) {
          syncData();
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, syncQueue.length, isSyncing]);

  // Add item to sync queue
  const addToSyncQueue = useCallback((
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ) => {
    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      table,
      operation,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    setSyncQueue(prev => [...prev, item]);
    
    // If online, try to sync immediately
    if (isOnline) {
      setTimeout(() => syncData(), 1000);
    }
  }, [isOnline]);

  // Sync data with server
  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing || syncQueue.length === 0) return;

    setIsSyncing(true);
    const failedItems: SyncQueueItem[] = [];
    const successfulIds: string[] = [];

    for (const item of syncQueue) {
      try {
        let result;

        switch (item.operation) {
          case 'insert':
            result = await supabase
              .from(item.table as any)
              .insert(item.data as any);
            break;
          case 'update':
            const { id, ...updateData } = item.data;
            result = await supabase
              .from(item.table as any)
              .update(updateData as any)
              .eq('id', id);
            break;
          case 'delete':
            result = await supabase
              .from(item.table as any)
              .delete()
              .eq('id', item.data.id);
            break;
        }

        if (result?.error) {
          throw result.error;
        }

        successfulIds.push(item.id);
      } catch (error) {
        
        if (item.retries < MAX_RETRIES) {
          failedItems.push({
            ...item,
            retries: item.retries + 1
          });
        } else {
        }
      }
    }

    setSyncQueue(failedItems);
    setLastSyncTime(new Date());
    setIsSyncing(false);

    // Notify service worker about sync completion
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_COMPLETE',
        successCount: successfulIds.length,
        failedCount: failedItems.length
      });
    }
  }, [isOnline, isSyncing, syncQueue]);

  // Cache data for offline use
  const cacheData = useCallback((key: string, data: unknown, expiryMinutes?: number) => {
    const cache: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      expiry: expiryMinutes ? Date.now() + expiryMinutes * 60 * 1000 : undefined
    };

    try {
      const existingCache = localStorage.getItem(OFFLINE_CACHE_KEY);
      const cacheMap: Record<string, OfflineData> = existingCache 
        ? JSON.parse(existingCache) 
        : {};
      
      cacheMap[key] = cache;
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cacheMap));
    } catch (error) {
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(<T>(key: string): T | null => {
    try {
      const existingCache = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (!existingCache) return null;

      const cacheMap: Record<string, OfflineData> = JSON.parse(existingCache);
      const cached = cacheMap[key];

      if (!cached) return null;

      // Check expiry
      if (cached.expiry && Date.now() > cached.expiry) {
        delete cacheMap[key];
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cacheMap));
        return null;
      }

      return cached.data as T;
    } catch (error) {
      return null;
    }
  }, []);

  // Clear expired cache
  const clearExpiredCache = useCallback(() => {
    try {
      const existingCache = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (!existingCache) return;

      const cacheMap: Record<string, OfflineData> = JSON.parse(existingCache);
      const now = Date.now();

      Object.keys(cacheMap).forEach(key => {
        if (cacheMap[key].expiry && now > cacheMap[key].expiry!) {
          delete cacheMap[key];
        }
      });

      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cacheMap));
    } catch (error) {
    }
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(() => {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    localStorage.removeItem(OFFLINE_CACHE_KEY);
    setSyncQueue([]);
  }, []);

  return {
    isOnline,
    isSyncing,
    syncQueue,
    pendingChanges: syncQueue.length,
    lastSyncTime,
    addToSyncQueue,
    syncData,
    cacheData,
    getCachedData,
    clearExpiredCache,
    clearOfflineData
  };
};

export default useOfflineSync;
