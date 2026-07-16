import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQueueSize } from '@/lib/offline-store';

export function useScannerHeartbeat(deviceId: string) {
  const heartbeatIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!deviceId) return;

    const emitHeartbeat = async () => {
      try {
        const pending_queue_size = await getQueueSize();
        const network_status = navigator.onLine ? 'online' : 'offline';
        // Mock battery level API (not supported natively in many browsers yet)
        const battery_level = 100;

        await supabase
          .from('device_health')
          .upsert({
            device_id: deviceId,
            last_seen: new Date().toISOString(),
            battery_level,
            pending_queue_size,
            network_status,
            updated_at: new Date().toISOString()
          }, { onConflict: 'device_id' });
      } catch (err) {
        console.warn("Failed to emit heartbeat", err);
      }
    };

    // Initial heartbeat
    emitHeartbeat();

    // Heartbeat every 60 seconds
    heartbeatIntervalRef.current = window.setInterval(emitHeartbeat, 60000);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [deviceId]);
}
