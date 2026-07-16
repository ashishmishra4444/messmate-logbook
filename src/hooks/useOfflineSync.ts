import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPendingScans, removeScan, moveToDeadLetter, incrementRetry, getQueueSize } from '@/lib/offline-store';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const syncIntervalRef = useRef<number | null>(null);

  const updateQueueSize = useCallback(async () => {
    const size = await getQueueSize();
    setQueueSize(size);
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    
    const pendingScans = await getPendingScans();
    if (pendingScans.length === 0) return;

    setIsSyncing(true);
    try {
      // Send up to 50 scans at a time
      const batch = pendingScans.slice(0, 50);
      
      const { data, error } = await supabase.functions.invoke('sync_offline_attendance', {
        body: { scans: batch }
      });

      if (error) throw error;
      
      if (data?.results) {
        for (const result of data.results) {
          const scan = batch.find(s => s.id === result.queue_id);
          if (!scan) continue;

          if (result.status === 'success' || result.status === 'resolved_duplicate') {
            await removeScan(scan.id);
          } else {
            // Failed
            if (scan.retryCount >= 3) {
              await moveToDeadLetter(scan, result.reason || 'Unknown Edge Function error');
            } else {
              await incrementRetry(scan);
            }
          }
        }
      }
      
      await updateQueueSize();

    } catch (err) {
      console.error("Offline sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updateQueueSize]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    updateQueueSize();

    // Periodic sync attempt if online
    syncIntervalRef.current = window.setInterval(() => {
      updateQueueSize();
      if (navigator.onLine) {
        syncNow();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [syncNow, updateQueueSize]);

  return { isOnline, isSyncing, queueSize, syncNow, updateQueueSize };
}
