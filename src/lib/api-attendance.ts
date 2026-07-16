import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManualOverrideArgs {
  memberId: string;
  mealSessionId: string;
  reason: string;
}

export function useManualOverride() {
  return useMutation({
    mutationFn: async ({ memberId, mealSessionId, reason }: ManualOverrideArgs) => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Authentication required");

      const { error } = await supabase.rpc('record_attendance_override', {
        p_member_id: memberId,
        p_meal_session_id: mealSessionId,
        p_reason: reason,
        p_admin_id: authData.user.id
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return true;
    },
    onSuccess: () => {
      toast.success("Attendance overridden successfully");
    },
    onError: (error) => {
      toast.error(`Manual override failed: ${error.message}`);
    }
  });
}

export interface ValidationResult {
  status: 'approved' | 'rejected';
  reason?: string;
  message?: string;
  member_id?: string;
  details?: {
    time: string;
    session: string;
    scanner: string;
  };
}

export function useValidateIdentity() {
  return useMutation({
    mutationFn: async (payload: { 
      auth_type: string; 
      payload: string; 
      scanner_device_id?: string; 
      scanner_name?: string;
      meal_session_id?: string;
      meal_type?: string;
    }): Promise<ValidationResult> => {
      
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          const { data, error } = await supabase.functions.invoke('validate_identity', {
            body: payload
          });

          if (error) {
            if (error.context && error.context.status) {
              try {
                const errorData = await error.context.json();
                return errorData as ValidationResult;
              } catch {
                throw new Error("Failed to parse validation error");
              }
            }
            throw error;
          }
          
          return data as ValidationResult;
        } catch (err: any) {
          // If it's a network fetch error, fallback to offline
          if (err.message === 'Failed to fetch' || err instanceof TypeError) {
             console.warn("Network error during validation, falling back to offline mode");
             return handleOfflineScan(payload);
          }
          throw err;
        }
      } else {
         return handleOfflineScan(payload);
      }
    }
  });
}

async function handleOfflineScan(payload: any): Promise<ValidationResult> {
  const { addOfflineScan } = await import('./offline-store');
  const { jwtDecode } = await import('jwt-decode');
  
  let memberId = "Unknown";
  try {
    if (payload.auth_type === 'qr') {
       const decoded = jwtDecode(payload.payload) as any;
       // Verify expiry locally
       if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          return {
            status: 'rejected',
            reason: 'qr_expired',
            message: 'QR Code Expired (Offline Validation)'
          };
       }
       memberId = decoded.member_id || "Unknown";
    } else {
       memberId = payload.payload.member_id;
    }
  } catch (e) {
    return {
      status: 'rejected',
      reason: 'invalid_qr',
      message: 'Invalid QR Format (Offline)'
    };
  }

  const newScan = await addOfflineScan({
    id: crypto.randomUUID(),
    payload: payload.payload,
    auth_type: payload.auth_type,
    scanner_device_id: payload.scanner_device_id || 'unknown',
    scanner_name: payload.scanner_name || 'Kitchen Scanner',
    offline_timestamp: Date.now(),
    meal_session_id: payload.meal_session_id || '',
    meal_type: payload.meal_type || 'Unknown'
  });

  return {
    status: 'approved',
    member_id: memberId,
    message: 'Approved Offline',
    details: {
      time: new Date().toISOString(),
      session: payload.meal_type || 'Session',
      scanner: payload.scanner_name || 'Kitchen Scanner'
    }
  };
}
