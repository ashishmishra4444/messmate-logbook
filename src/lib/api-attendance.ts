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
    mutationFn: async (payload: { auth_type: string; payload: string; scanner_device_id?: string; scanner_name?: string }): Promise<ValidationResult> => {
      const { data, error } = await supabase.functions.invoke('validate_identity', {
        body: payload
      });

      if (error) {
        // Edge function error or network error
        if (error.context && error.context.status) {
          // It's a structured error from the edge function
          try {
            const errorData = await error.context.json();
            return errorData as ValidationResult;
          } catch {
             throw new Error("Failed to parse validation error");
          }
        }
        throw error;
      }
      
      // Usually successful responses return 200 OK
      return data as ValidationResult;
    }
  });
}
