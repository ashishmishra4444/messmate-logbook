import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Wifi, WifiOff } from 'lucide-react';

export function LiveScannerHealth() {
  const { data: devices } = useQuery({
    queryKey: ['device_health_live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_health')
        .select('*')
        .order('last_seen', { ascending: false });
      if (error) return [];
      return data;
    },
    refetchInterval: 10000 // Refetch every 10 seconds (in addition to Realtime)
  });

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Scanner Device Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices && devices.length > 0 ? (
            devices.map((device: any) => {
              const isOffline = new Date().getTime() - new Date(device.last_seen).getTime() > 90000; // 90 seconds
              const statusColor = isOffline ? 'text-red-500' : 'text-green-500';
              
              return (
                <div key={device.device_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {isOffline ? <WifiOff className="h-5 w-5 text-red-500" /> : <Wifi className="h-5 w-5 text-green-500" />}
                    <div>
                      <p className="font-medium text-sm">{device.device_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Last seen: {new Date(device.last_seen).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${statusColor}`}>
                      {isOffline ? 'OFFLINE' : 'ONLINE'}
                    </p>
                    <p className="text-xs text-amber-500">
                      {device.pending_queue_size > 0 ? `${device.pending_queue_size} in queue` : 'Synced'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No active scanners detected.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
