import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, ChefHat, Users, BarChart3 } from "lucide-react";
import { downloadCSV, formatDateISO } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — MessMate" }] }),
  component: ReportsPage,
});

type Status = "present" | "absent" | "not_marked";

function ReportsPage() {
  const monthStart = useMemo(() => { const d = new Date(); d.setDate(1); return formatDateISO(d); }, []);
  const monthEnd = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return formatDateISO(d); }, []);

  const { data: rows = [] } = useQuery({
    queryKey: ["report", "all", monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("date, lunch_status, dinner_status, remarks, members(id, name, room_number, meal_plan)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: false });

      return (data ?? []).map((r: any) => {
        if (r.members) {
          const localPlan = localStorage.getItem(`messmate.member_meal_plan.${r.members.id}`);
          if (localPlan) {
            r.members.meal_plan = localPlan;
          }
        }
        const localBreakfastStatus = r.members?.id ? localStorage.getItem(`messmate.attendance_breakfast.${r.members.id}_${r.date}`) : null;
        return {
          ...r,
          breakfast_status: (localBreakfastStatus || "not_marked") as Status
        };
      });
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["report", "movements", monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("inventory_movements")
        .select("occurred_at, movement_type, quantity, total_cost, supplier, used_by, purpose, inventory_items(name, category, unit)")
        .gte("occurred_at", monthStart)
        .lte("occurred_at", monthEnd)
        .order("occurred_at", { ascending: false });
      return data ?? [];
    },
  });

  // Overall stats
  const overall = useMemo(() => {
    const breakfast = rows.filter((r: any) => r.breakfast_status === "present").length;
    const lunch = rows.filter((r: any) => r.lunch_status === "present").length;
    const dinner = rows.filter((r: any) => r.dinner_status === "present").length;

    const absent = rows.reduce((acc: number, r: any) => {
      const plan = r.members?.meal_plan ?? "";
      const hasBreakfastAbsence = (plan.includes("breakfast") || plan === "all") && r.breakfast_status === "absent";
      const hasLunchAbsence = (plan.includes("lunch") || plan === "all") && r.lunch_status === "absent";
      const hasDinnerAbsence = (plan.includes("dinner") || plan === "all") && r.dinner_status === "absent";
      if (hasBreakfastAbsence || hasLunchAbsence || hasDinnerAbsence) {
        return acc + 1;
      }
      return acc;
    }, 0);

    return {
      breakfast,
      lunch,
      dinner,
      total: breakfast + lunch + dinner,
      absent,
      days: new Set(rows.map((r: any) => r.date)).size
    };
  }, [rows]);

  // Per-member (Customer)
  const byMember = useMemo(() => {
    const map = new Map<string, { name: string; room: string; plan: string; breakfast: number; lunch: number; dinner: number; absent: number }>();
    rows.forEach((r: any) => {
      const m = r.members;
      if (!m) return;
      const cur = map.get(m.id) ?? { name: m.name, room: m.room_number, plan: m.meal_plan, breakfast: 0, lunch: 0, dinner: 0, absent: 0 };
      if (r.breakfast_status === "present") cur.breakfast++;
      if (r.lunch_status === "present") cur.lunch++;
      if (r.dinner_status === "present") cur.dinner++;

      const hasBreakfastAbsence = (m.meal_plan.includes("breakfast") || m.meal_plan === "all") && r.breakfast_status === "absent";
      const hasLunchAbsence = (m.meal_plan.includes("lunch") || m.meal_plan === "all") && r.lunch_status === "absent";
      const hasDinnerAbsence = (m.meal_plan.includes("dinner") || m.meal_plan === "all") && r.dinner_status === "absent";
      if (hasBreakfastAbsence || hasLunchAbsence || hasDinnerAbsence) {
        cur.absent++;
      }
      map.set(m.id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.breakfast + b.lunch + b.dinner - (a.breakfast + a.lunch + a.dinner));
  }, [rows]);

  // Per-day kitchen totals
  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; breakfast: number; lunch: number; dinner: number }>();
    rows.forEach((r: any) => {
      const cur = map.get(r.date) ?? { date: r.date, breakfast: 0, lunch: 0, dinner: 0 };
      if (r.breakfast_status === "present") cur.breakfast++;
      if (r.lunch_status === "present") cur.lunch++;
      if (r.dinner_status === "present") cur.dinner++;
      map.set(r.date, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).reverse();
  }, [rows]);

  const exportOverall = () => {
    const csv: (string | number)[][] = [["Date", "Member", "Room", "Plan", "Breakfast", "Lunch", "Dinner", "Remarks"]];
    rows.forEach((r: any) => {
      csv.push([r.date, r.members?.name ?? "", r.members?.room_number ?? "", r.members?.meal_plan ?? "", r.breakfast_status, r.lunch_status, r.dinner_status, r.remarks ?? ""]);
    });
    downloadCSV(`messmate-overall-${monthStart}.csv`, csv);
  };

  const exportCustomer = () => {
    const csv: (string | number)[][] = [["Member", "Room", "Plan", "Breakfast", "Lunch", "Dinner", "Total", "Absent"]];
    byMember.forEach((m) => csv.push([m.name, m.room, m.plan, m.breakfast, m.lunch, m.dinner, m.breakfast + m.lunch + m.dinner, m.absent]));
    downloadCSV(`messmate-customer-${monthStart}.csv`, csv);
  };

  const exportKitchen = () => {
    const csv: (string | number)[][] = [["Date", "Breakfast served", "Lunch served", "Dinner served", "Total meals"]];
    byDay.forEach((d) => csv.push([d.date, d.breakfast, d.lunch, d.dinner, d.breakfast + d.lunch + d.dinner]));
    downloadCSV(`messmate-kitchen-${monthStart}.csv`, csv);
  };

  return (
    <div className="p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Kitchen, customer and overall reports for the current month</p>
        </div>
      </header>

      {/* Quick stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Breakfast served" value={overall.breakfast} tone="bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300" />
        <Stat label="Lunch served" value={overall.lunch} tone="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" />
        <Stat label="Dinner served" value={overall.dinner} tone="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" />
        <Stat label="Total meals" value={overall.total} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" />
        <Stat label="Absences" value={overall.absent} tone="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" />
      </div>

      <Tabs defaultValue="overall" className="mt-5">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="overall" className="gap-2"><BarChart3 className="h-4 w-4" />Overall</TabsTrigger>
          <TabsTrigger value="kitchen" className="gap-2"><ChefHat className="h-4 w-4" />Kitchen</TabsTrigger>
          <TabsTrigger value="customer" className="gap-2"><Users className="h-4 w-4" />Customer</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="mt-4">
          <SectionCard title="All attendance entries this month" onExport={exportOverall}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <Th>Date</Th><Th>Member</Th><Th>Room</Th><Th>Breakfast</Th><Th>Lunch</Th><Th>Dinner</Th><Th>Remarks</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <Td className="font-medium">{new Date(r.date).toLocaleDateString("en-GB")}</Td>
                      <Td>{r.members?.name}</Td>
                      <Td className="text-muted-foreground">{r.members?.room_number}</Td>
                      <Td className="capitalize">{r.breakfast_status.replace("_", " ")}</Td>
                      <Td className="capitalize">{r.lunch_status.replace("_", " ")}</Td>
                      <Td className="capitalize">{r.dinner_status.replace("_", " ")}</Td>
                      <Td className="text-muted-foreground">{r.remarks ?? "—"}</Td>
                    </tr>
                  ))}
                  {rows.length === 0 && <EmptyRow cols={7} />}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="kitchen" className="mt-4">
          <SectionCard title="Meals prepared per day" onExport={exportKitchen}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><Th>Date</Th><Th right>Breakfast served</Th><Th right>Lunch served</Th><Th right>Dinner served</Th><Th right>Total meals</Th></tr>
                </thead>
                <tbody>
                  {byDay.map((d) => (
                    <tr key={d.date} className="border-t border-border">
                      <Td className="font-medium">{new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}</Td>
                      <Td right className="text-[oklch(var(--breakfast))] font-semibold">{d.breakfast}</Td>
                      <Td right className="text-[oklch(var(--lunch))] font-semibold">{d.lunch}</Td>
                      <Td right className="text-[oklch(var(--dinner))] font-semibold">{d.dinner}</Td>
                      <Td right className="font-bold">{d.breakfast + d.lunch + d.dinner}</Td>
                    </tr>
                  ))}
                  {byDay.length === 0 && <EmptyRow cols={5} />}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Inventory movements (stock in / out)">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr><Th>Date</Th><Th>Item</Th><Th>Type</Th><Th right>Qty</Th><Th>Supplier / Used by</Th><Th>Purpose</Th></tr>
                  </thead>
                  <tbody>
                    {movements.map((m: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <Td className="font-medium">{new Date(m.occurred_at).toLocaleDateString("en-GB")}</Td>
                        <Td>{m.inventory_items?.name}</Td>
                        <Td className="capitalize">{String(m.movement_type).replace("_", " ")}</Td>
                        <Td right className="font-semibold">{m.quantity} {m.inventory_items?.unit}</Td>
                        <Td className="text-muted-foreground">{m.supplier ?? m.used_by ?? "—"}</Td>
                        <Td className="text-muted-foreground">{m.purpose ?? "—"}</Td>
                      </tr>
                    ))}
                    {movements.length === 0 && <EmptyRow cols={6} />}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="mt-4">
          <SectionCard title="Member-wise meals consumed" onExport={exportCustomer}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><Th>Member</Th><Th>Room</Th><Th>Plan</Th><Th right>Breakfast</Th><Th right>Lunch</Th><Th right>Dinner</Th><Th right>Total</Th><Th right>Absent</Th></tr>
                </thead>
                <tbody>
                  {byMember.map((m, i) => (
                    <tr key={i} className="border-t border-border">
                      <Td className="font-medium">{m.name}</Td>
                      <Td className="text-muted-foreground">{m.room}</Td>
                      <Td className="capitalize">{m.plan.replace("_", " + ")}</Td>
                      <Td right className="text-[oklch(var(--breakfast))] font-semibold">{m.breakfast}</Td>
                      <Td right className="text-[oklch(var(--lunch))] font-semibold">{m.lunch}</Td>
                      <Td right className="text-[oklch(var(--dinner))] font-semibold">{m.dinner}</Td>
                      <Td right className="font-bold">{m.breakfast + m.lunch + m.dinner}</Td>
                      <Td right className="text-rose-600">{m.absent}</Td>
                    </tr>
                  ))}
                  {byMember.length === 0 && <EmptyRow cols={8} />}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-border p-4 ${tone}`}>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function SectionCard({ title, onExport, children }: { title: string; onExport?: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onExport && (
          <Button size="sm" variant="outline" className="gap-2" onClick={onExport}>
            <FileDown className="h-3.5 w-3.5" /> Export CSV
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-3 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-4 py-2.5 ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}
function EmptyRow({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-muted-foreground">No records yet for this month.</td></tr>;
}
