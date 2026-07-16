import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function DeviceStatus() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: session } = useQuery({
    queryKey: ['active_meal_session_scanner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_sessions')
        .select('meal_type, start_time, end_time')
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    refetchInterval: 60000 // Refetch every minute
  });

  const { data: operator } = useQuery({
    queryKey: ['current_operator'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || "Unknown Operator";
    }
  });

  return (
    <div className="w-full flex items-center justify-between p-4 bg-zinc-900 text-zinc-100 border-b border-zinc-800">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-sm text-zinc-400">Current Session</span>
          <span className="font-semibold text-lg text-primary uppercase">
            {session ? session.meal_type : "No Active Session"}
          </span>
        </div>
        <div className="w-px h-8 bg-zinc-700" />
        <div className="flex flex-col">
          <span className="text-sm text-zinc-400">Operator</span>
          <span className="font-medium truncate max-w-[150px]">{operator || "Loading..."}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-right">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-zinc-300">Front Desk Scanner</span>
        </div>
        <div className="w-px h-8 bg-zinc-700" />
        <div className="text-2xl font-bold font-mono tracking-wider w-[120px]">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
