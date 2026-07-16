import { useEffect } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeAttendance(queryClient: QueryClient) {

  useEffect(() => {
    // Subscribe to attendance inserts
    const channel = supabase.channel('public:attendance')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance' },
        (payload) => {
          // Invalidate attendance list so the dashboard feed updates
          // Or optimistically inject into cache if needed
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['meal_session_stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
