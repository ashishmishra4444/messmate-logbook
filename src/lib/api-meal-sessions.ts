import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type MealSession = Database["public"]["Tables"]["meal_sessions"]["Row"];
type MealSessionInsert = Database["public"]["Tables"]["meal_sessions"]["Insert"];
type MealSessionUpdate = Database["public"]["Tables"]["meal_sessions"]["Update"];

export function useMealSessions(filters?: { date?: string; status?: string; meal_type?: string }) {
  return useQuery({
    queryKey: ["meal-sessions", filters],
    queryFn: async () => {
      let query = supabase
        .from("meal_sessions")
        .select("*")
        .order("session_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (filters?.date) query = query.eq("session_date", filters.date);
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status as Database["public"]["Enums"]["meal_session_status"]);
      if (filters?.meal_type && filters.meal_type !== "all") query = query.eq("meal_type", filters.meal_type as Database["public"]["Enums"]["meal_type"]);

      const { data, error } = await query;
      if (error) throw error;
      return data as MealSession[];
    },
  });
}

export function useCreateMealSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: Omit<MealSessionInsert, 'id' | 'created_at' | 'updated_at' | 'current_attendance' | 'status'>) => {
      // Use the RPC for creation to encapsulate logic
      const { data, error } = await supabase.rpc("create_meal_session", {
        p_name: session.name,
        p_meal_type: session.meal_type,
        p_session_date: session.session_date,
        p_start_time: session.start_time,
        p_end_time: session.end_time,
        p_expected_count: session.expected_count ?? 0,
        p_max_capacity: session.max_capacity ?? 0
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-sessions"] });
      toast.success("Meal session created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
}

export function useUpdateMealSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MealSessionUpdate }) => {
      const { error } = await supabase.rpc("update_meal_session", {
        p_id: id,
        p_name: updates.name,
        p_meal_type: updates.meal_type,
        p_start_time: updates.start_time,
        p_end_time: updates.end_time,
        p_expected_count: updates.expected_count ?? undefined,
        p_max_capacity: updates.max_capacity ?? undefined,
        p_status: updates.status
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-sessions"] });
      toast.success("Meal session updated");
    },
    onError: (error) => {
      toast.error(`Failed to update session: ${error.message}`);
    },
  });
}

export function useIncrementAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("increment_attendance", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-sessions"] });
    },
    onError: (error) => {
      toast.error(`Failed to increment attendance: ${error.message}`);
    },
  });
}

export function useDecrementAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("decrement_attendance", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-sessions"] });
    },
    onError: (error) => {
      toast.error(`Failed to decrement attendance: ${error.message}`);
    },
  });
}

export function useArchiveMealSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("archive_meal_session", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-sessions"] });
      toast.success("Meal session archived");
    },
    onError: (error) => {
      toast.error(`Failed to archive session: ${error.message}`);
    },
  });
}
