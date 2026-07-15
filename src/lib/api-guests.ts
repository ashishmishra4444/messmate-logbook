import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type GuestMeal = Database["public"]["Tables"]["guest_meals"]["Row"];
type GuestMealInsert = Database["public"]["Tables"]["guest_meals"]["Insert"];
type GuestMealUpdate = Database["public"]["Tables"]["guest_meals"]["Update"];
type MessSettings = Database["public"]["Tables"]["mess_settings"]["Row"];

export function useMessSettings() {
  return useQuery({
    queryKey: ["mess-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mess_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") throw error; // Ignore not found error
      return data as MessSettings | null;
    },
  });
}

export function useUpdateMessSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<MessSettings>) => {
      // Upsert logic for single row settings
      const { data: existing } = await supabase.from("mess_settings").select("id").limit(1).single();
      if (existing?.id) {
        const { error } = await supabase.from("mess_settings").update(settings).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mess_settings").insert([settings]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mess-settings"] });
      toast.success("Settings updated");
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

export function useGuestMeals(filters?: { date?: string; meal?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["guest-meals", filters],
    queryFn: async () => {
      let query = supabase
        .from("guest_meals")
        .select(`
          *,
          host:members(id, name, room_number)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.date) query = query.eq("date", filters.date);
      if (filters?.meal && filters.meal !== "all") query = query.eq("meal", filters.meal);
      if (filters?.status && filters.status !== "all") query = query.eq("payment_status", filters.status);
      if (filters?.search) query = query.ilike("guest_name", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAddGuestMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guestMeal: GuestMealInsert) => {
      const { data, error } = await supabase
        .from("guest_meals")
        .insert([guestMeal])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Guest meal recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add guest meal: ${error.message}`);
    },
  });
}

export function useUpdateGuestMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: GuestMealUpdate }) => {
      const { data, error } = await supabase
        .from("guest_meals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Guest meal updated");
    },
    onError: (error) => {
      toast.error(`Failed to update guest meal: ${error.message}`);
    },
  });
}

export function useDeleteGuestMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guest_meals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Guest meal deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete guest meal: ${error.message}`);
    },
  });
}
