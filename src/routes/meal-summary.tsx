import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateISO } from "@/lib/format";

export const Route = createFileRoute("/meal-summary")({
  head: () => ({ meta: [{ title: "Meal Summary — MessMate" }] }),
  component: DashboardSummary,
});

function DashboardSummary() {
  const monthStart = (() => { const d = new Date(); d.setDate(1); return formatDateISO(d); })();
  const monthEnd = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return formatDateISO(d); })();

  const { data: rows = [] } = useQuery({
    queryKey: ["meal-summary", monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("lunch_status, dinner_status, member_id, members(name, room_number, meal_plan)")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      return (data ?? []).map((r: any) => {
        if (r.member_id) {
          const localPlan = localStorage.getItem(`messmate.member_meal_plan.${r.member_id}`);
          if (localPlan && r.members) {
            r.members.meal_plan = localPlan;
          }
        }
        return r;
      });
    },
  });

  const map = new Map<string, { name: string; room: string; plan: string; breakfast: number; lunch: number; dinner: number }>();
  rows.forEach((r: any) => {
    const k = r.member_id;
    if (!map.has(k)) {
      let breakfast = 0;
      const startD = new Date(monthStart);
      const endD = new Date(monthEnd);
      for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
        const iso = formatDateISO(d);
        const val = localStorage.getItem(`messmate.attendance_breakfast.${k}_${iso}`);
        if (val === "present") {
          breakfast++;
        }
      }
      map.set(k, {
        name: r.members?.name ?? "",
        room: r.members?.room_number ?? "",
        plan: r.members?.meal_plan ?? "",
        breakfast,
        lunch: 0,
        dinner: 0
      });
    }
    const cur = map.get(k)!;
    if (r.lunch_status === "present") cur.lunch++;
    if (r.dinner_status === "present") cur.dinner++;
  });

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Meal Summary</h1>
        <p className="text-sm text-muted-foreground">Member-wise meal count for this month</p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Room</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-right">Breakfast</th>
              <th className="px-4 py-3 text-right">Lunch</th>
              <th className="px-4 py-3 text-right">Dinner</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(map.values()).map((m, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{m.room}</td>
                <td className="px-4 py-2.5 capitalize">{m.plan.replace("_", " + ")}</td>
                <td className="px-4 py-2.5 text-right text-[oklch(var(--breakfast))] font-semibold">{m.breakfast}</td>
                <td className="px-4 py-2.5 text-right text-[oklch(var(--lunch))] font-semibold">{m.lunch}</td>
                <td className="px-4 py-2.5 text-right text-[oklch(var(--dinner))] font-semibold">{m.dinner}</td>
                <td className="px-4 py-2.5 text-right font-bold">{m.breakfast + m.lunch + m.dinner}</td>
              </tr>
            ))}
            {map.size === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No data this month yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
