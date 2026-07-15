import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type BillingCycle = Database["public"]["Tables"]["billing_cycles"]["Row"];
type BillingRecord = Database["public"]["Tables"]["billing_records"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type AuditLog = Database["public"]["Tables"]["billing_audit_logs"]["Row"];

export function useBillingCycles() {
  return useQuery({
    queryKey: ["billing-cycles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_cycles")
        .select("*, billing_records(count)")
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useBillingRecords(cycleId?: string) {
  return useQuery({
    queryKey: ["billing-records", cycleId],
    queryFn: async () => {
      let query = supabase
        .from("billing_records")
        .select("*")
        .order("member_name", { ascending: true });
        
      if (cycleId) {
        query = query.eq("billing_cycle_id", cycleId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BillingRecord[];
    },
    enabled: cycleId !== undefined,
  });
}

export function useGenerateBillingCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ monthName, startDate, endDate }: { monthName: string, startDate: string, endDate: string }) => {
      // 1. Fetch settings
      const { data: settings } = await supabase.from("mess_settings").select("*").single();
      if (!settings) throw new Error("Settings not found");
      
      const dueDays = settings.billing_due_days || 5;
      const dueDate = new Date(endDate);
      dueDate.setDate(dueDate.getDate() + dueDays);
      const isoDueDate = dueDate.toISOString().split("T")[0];

      // 2. Create the cycle
      const { data: cycle, error: cycleErr } = await supabase
        .from("billing_cycles")
        .insert([{
          month_name: monthName,
          start_date: startDate,
          end_date: endDate,
          due_date: isoDueDate,
          status: "draft"
        }])
        .select()
        .single();
        
      if (cycleErr || !cycle) throw cycleErr || new Error("Failed to create cycle");

      // 3. Fetch Members
      const { data: members, error: memErr } = await supabase.from("members").select("*");
      if (memErr) throw memErr;

      // 4. Fetch Attendance & Guest Meals for this period
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
        
      const { data: guestMeals } = await supabase
        .from("guest_meals")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .eq("payment_status", "unpaid");

      // 5. Fetch Past unpaid bills to calculate previous balance
      const { data: pastUnpaid } = await supabase
        .from("billing_records")
        .select("member_id, total_amount, status") // amount_paid is implicit if we track balance or assume total unpaid
        .in("status", ["draft", "pending", "partially_paid", "overdue"]);

      // Generate invoice number prefix
      const d = new Date(startDate);
      const prefix = `${settings.invoice_prefix || "MM"}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let seq = 1;
      
      const recordsToInsert = [];
      
      for (const m of (members || [])) {
        const memAtt = (attendance || []).filter(a => a.member_id === m.id);
        const bCount = memAtt.filter(a => a.breakfast_status === "present").length;
        const lCount = memAtt.filter(a => a.lunch_status === "present").length;
        const dCount = memAtt.filter(a => a.dinner_status === "present").length;
        
        const mGuest = (guestMeals || []).filter(g => g.host_member_id === m.id);
        // Assuming guest meal table has total_amount, else calculate from quantity * price
        const guestCharges = mGuest.reduce((sum, g) => sum + (Number(g.quantity || 1) * (
          g.meal === "breakfast" ? (settings.breakfast_price || 0) : 
          g.meal === "lunch" ? (settings.lunch_price || 0) : (settings.dinner_price || 0)
        )), 0);
        
        const bPrice = Number(settings.breakfast_price) || 0;
        const lPrice = Number(settings.lunch_price) || 0;
        const dPrice = Number(settings.dinner_price) || 0;
        
        const mealCharges = (bCount * bPrice) + (lCount * lPrice) + (dCount * dPrice);
        
        // Prev balance (simplifying assuming if pending, full amount is unpaid - real impl would sum (total - paid))
        const prevBills = (pastUnpaid || []).filter(b => b.member_id === m.id);
        const prevBal = prevBills.reduce((sum, b) => sum + Number(b.total_amount), 0);
        
        const total = mealCharges + guestCharges + prevBal;
        
        // We only generate a bill if there are charges or previous balances
        if (total > 0) {
          recordsToInsert.push({
            invoice_number: `${prefix}-${String(seq++).padStart(4, "0")}`,
            billing_cycle_id: cycle.id,
            member_id: m.id,
            member_name: m.name,
            room_number: m.room_number,
            meal_plan: m.meal_plan,
            mobile: m.mobile,
            breakfast_price: bPrice,
            lunch_price: lPrice,
            dinner_price: dPrice,
            gst_percentage: Number(settings.gst_percentage) || 0,
            late_fee: Number(settings.late_fee) || 0,
            breakfast_count: bCount,
            lunch_count: lCount,
            dinner_count: dCount,
            total_meals: bCount + lCount + dCount,
            meal_charges: mealCharges,
            guest_charges: guestCharges,
            extra_charges: 0,
            discounts: 0,
            previous_balance: prevBal,
            total_amount: total,
            status: "draft",
            due_date: isoDueDate,
            generated_date: new Date().toISOString().split("T")[0]
          });
        }
      }
      
      if (recordsToInsert.length > 0) {
        const { error: insertErr } = await supabase.from("billing_records").insert(recordsToInsert);
        if (insertErr) throw insertErr;
      }
      
      // Audit log
      await supabase.from("billing_audit_logs").insert([{
        action: "Cycle Generated",
        reference_id: cycle.id,
        notes: `Generated ${recordsToInsert.length} bills for ${monthName}`
      }]);

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-cycles"] });
      toast.success("Billing cycle generated successfully");
    },
    onError: (err) => {
      toast.error(`Failed to generate billing cycle: ${err.message}`);
    }
  });
}

export function useDeleteBillingCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await supabase
        .from("billing_cycles")
        .delete()
        .eq("id", cycleId);
        
      if (error) throw error;
      
      // Also log the deletion
      await supabase.from("billing_audit_logs").insert([{
        action: "Cycle Deleted",
        notes: `Deleted billing cycle ${cycleId}`
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["billing-records"] });
      toast.success("Billing cycle deleted successfully");
    },
    onError: (err) => {
      toast.error(`Failed to delete billing cycle: ${err.message}`);
    }
  });
}
