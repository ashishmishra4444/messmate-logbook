import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QRTokenResponse {
  token: string;
  issued_at: number;
  expires_at: number;
}

export function useGenerateQRToken(deviceId: string, sessionId: string) {
  return useQuery({
    queryKey: ["member_qr_token", deviceId, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<QRTokenResponse>(
        "generate_member_qr_token",
        {
          body: { device_id: deviceId, session_id: sessionId },
        }
      );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from edge function");
      }

      return data;
    },
    // Refetch exactly every 25 seconds
    refetchInterval: 25000,
    // Keep it refetching in background
    refetchIntervalInBackground: true,
    // Handle offline states gracefully
    networkMode: "offlineFirst",
    staleTime: 20000,
  });
}
