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
        .select("breakfast_status, lunch_status, dinner_status, member_id, members(name, room_number, meal_plan)")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      return data ?? [];
    },
  });

  const map = new Map<string, { name: string; room: string; plan: string; breakfast: number; lunch: number; dinner: number }>();
  rows.forEach((r: any) => {
    const k = r.member_id;
    if (!map.has(k)) {
      map.set(k, {
        name: r.members?.name ?? "",
        room: r.members?.room_number ?? "",
        plan: r.members?.meal_plan ?? "",
        breakfast: 0,
        lunch: 0,
        dinner: 0
      });
    }
    const cur = map.get(k)!;
    if (r.breakfast_status === "present") cur.breakfast++;
    if (r.lunch_status === "present") cur.lunch++;
    if (r.dinner_status === "present") cur.dinner++;
  });

  return (
    <div className="page-enter min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Meal Summary</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Member-wise meal count for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Member</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Room</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Plan</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-amber-500">Breakfast</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Lunch</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-violet-500">Dinner</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {Array.from(map.values()).map((m, i) => (
                <tr key={i} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-[13px] font-semibold text-foreground">{m.name}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">Room {m.room}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary capitalize">
                      {m.plan.replace(/_/g, " + ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-bold text-amber-500">{m.breakfast}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-bold text-indigo-500">{m.lunch}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-bold text-violet-500">{m.dinner}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-extrabold text-foreground">{m.breakfast + m.lunch + m.dinner}</td>
                </tr>
              ))}
              {map.size === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No attendance data for this month yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
