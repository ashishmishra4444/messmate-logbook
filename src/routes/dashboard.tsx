import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGuestMeals } from "@/lib/api-guests";
import type { Database } from "@/integrations/supabase/types";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Utensils,
  Soup,
  Sandwich,
  TrendingUp,
  Coffee,
  Activity,
  AlertTriangle,
  Banknote,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { formatDateISO } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Member = Database["public"]["Tables"]["members"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"] & {
  inventory_items?: { name: string; unit: string } | null;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MessMate" }] }),
  component: Dashboard,
});

function Dashboard() {
  const today = formatDateISO(new Date());
  const weekStart = formatDateISO(addDays(new Date(), -6));

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: todayAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["attendance", "today", today],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").eq("date", today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: weeklyAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["attendance", "weekly", weekStart, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("date", weekStart)
        .lte("date", today)
        .order("date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: inventoryMovements = [] } = useQuery<InventoryMovement[]>({
    queryKey: ["inventory_movements", "dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, inventory_items(name, unit)")
        .order("occurred_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as InventoryMovement[];
    },
  });

  const breakfastToday = todayAttendance.filter((a) => a.breakfast_status === "present").length;
  const lunchToday = todayAttendance.filter((a) => a.lunch_status === "present").length;
  const dinnerToday = todayAttendance.filter((a) => a.dinner_status === "present").length;

  const absentToday = members.reduce((acc, m) => {
    const dbRecord = todayAttendance.find((a) => a.member_id === m.id);
    const isBreakfastAbsent = isPlanEligible(m.meal_plan, "breakfast") && dbRecord?.breakfast_status === "absent";
    const isLunchAbsent = isPlanEligible(m.meal_plan, "lunch") && dbRecord?.lunch_status === "absent";
    const isDinnerAbsent = isPlanEligible(m.meal_plan, "dinner") && dbRecord?.dinner_status === "absent";
    return acc + (isBreakfastAbsent ? 1 : 0) + (isLunchAbsent ? 1 : 0) + (isDinnerAbsent ? 1 : 0);
  }, 0);

  // Guest Stats
  const { data: allGuests = [] } = useGuestMeals();
  
  const todayGuestsCount = allGuests.filter(g => g.date === today).length;
  
  const currentMonthPrefix = today.substring(0, 7); // e.g. "2026-07"
  const monthlyGuests = allGuests.filter(g => g.date.startsWith(currentMonthPrefix));
  const monthlyGuestsCount = monthlyGuests.length;
  
  const guestRevenue = allGuests.reduce((acc, g) => acc + Number(g.total_amount), 0);
  const outstandingGuestPayments = allGuests.filter(g => g.payment_status === 'unpaid').reduce((acc, g) => acc + Number(g.total_amount), 0);


  const overviewData = [
    { name: "Breakfast", value: breakfastToday, fill: "#F59E0B" },
    { name: "Lunch",     value: lunchToday,     fill: "#5B5CEB" },
    { name: "Dinner",    value: dinnerToday,     fill: "#8B5CF6" },
    { name: "Missed",    value: absentToday,     fill: "#EF4444" },
  ];
  const overviewChartData = overviewData.map((item) => ({
    ...item,
    chartValue: item.value > 0 ? item.value : null,
  }));

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(new Date(), index - 6);
    const iso = formatDateISO(date);
    return {
      date: iso,
      label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      attendance: attendanceCountForDate(iso, weeklyAttendance, members),
    };
  });
  const hasWeeklyData = weekDays.some((d) => d.attendance !== null);

  const lowStockItems = inventoryItems.filter(
    (item) => Number(item.available_qty) <= Number(item.min_qty),
  );

  const recentActivities = [
    ...members.map((m) => ({
      label: `New member registered: ${m.name}`,
      time: m.created_at,
      type: "member" as const,
    })),
    ...weeklyAttendance.map((a) => ({
      label: "Attendance marked",
      time: a.updated_at || a.created_at,
      type: "attendance" as const,
    })),
    ...inventoryMovements.map((m) => ({
      label: `Inventory ${m.movement_type.replace("_", " ")}: ${m.inventory_items?.name ?? "item"}`,
      time: m.occurred_at || m.created_at,
      type: "inventory" as const,
    })),
  ]
    .filter((activity) => activity.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  const markedToday = breakfastToday + lunchToday + dinnerToday;
  const possibleToday = members.reduce((acc, m) => {
    return (
      acc +
      Number(isPlanEligible(m.meal_plan, "breakfast")) +
      Number(isPlanEligible(m.meal_plan, "lunch")) +
      Number(isPlanEligible(m.meal_plan, "dinner"))
    );
  }, 0);
  const attendancePercentage =
    possibleToday > 0 ? Math.round((markedToday / possibleToday) * 100) : null;

  const mealPlanDistribution = [
    { label: "Breakfast", value: members.filter((m) => isPlanEligible(m.meal_plan, "breakfast")).length },
    { label: "Lunch",     value: members.filter((m) => isPlanEligible(m.meal_plan, "lunch")).length },
    { label: "Dinner",    value: members.filter((m) => isPlanEligible(m.meal_plan, "dinner")).length },
    { label: "All Meals", value: members.filter((m) => m.meal_plan === "all").length },
  ];

  const tiles = [
    { label: "Total Members",      value: members.length,      icon: Users,     color: "text-blue-500", bg: "bg-blue-500/10 border border-blue-500/20" },
    { label: "Breakfast Today",    value: breakfastToday,      icon: Coffee,    color: "text-amber-500", bg: "bg-amber-500/10 border border-amber-500/20" },
    { label: "Lunch Today",        value: lunchToday,          icon: Soup,      color: "text-indigo-500", bg: "bg-indigo-500/10 border border-indigo-500/20" },
    { label: "Dinner Today",       value: dinnerToday,         icon: Sandwich,  color: "text-sky-500", bg: "bg-sky-500/10 border border-sky-500/20" },
    { label: "Missed Meals Today", value: absentToday,         icon: TrendingUp,color: "text-red-500", bg: "bg-red-500/10 border border-red-500/20" },
  ];

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <div className="page-enter min-h-screen p-6 sm:p-8 space-y-8">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{todayFormatted}</p>
        </div>
      </div>

      {/* ── KPI Tiles ────────────────────────────────── */}
        {/* Members & Attendance KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card card-hover cursor-default"
            >
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${t.bg}`}
              >
                <t.icon className={`h-5 w-5 ${t.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[11px] leading-tight font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</div>
                <div className="mt-1 text-2xl font-bold leading-none tracking-tight">{t.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Guest Stats KPIs */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold uppercase text-muted-foreground">Today's Guests</div>
              <div className="mt-1 text-2xl font-bold">{todayGuestsCount}</div>
            </div>
            <Users className="h-8 w-8 text-indigo-500/20" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold uppercase text-muted-foreground">Monthly Guests</div>
              <div className="mt-1 text-2xl font-bold">{monthlyGuestsCount}</div>
            </div>
            <Calendar className="h-8 w-8 text-blue-500/20" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold uppercase text-muted-foreground">Guest Revenue</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{guestRevenue.toFixed(2)}</div>
            </div>
            <Banknote className="h-8 w-8 text-emerald-500/20" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold uppercase text-muted-foreground">Outstanding</div>
              <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">₹{outstandingGuestPayments.toFixed(2)}</div>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500/20" />
          </div>
        </div>

      {/* ── Charts Row ───────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Meal Attendance Overview" icon={Utensils}>
          {overviewData.some((item) => item.value > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="32%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--color-muted-foreground)" }} dy={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--color-muted-foreground)" }} dx={-8} />
                  <Tooltip content={<AttendanceBarTooltip />} cursor={{ fill: "var(--color-secondary)" }} filterNull shared={false} wrapperStyle={{ pointerEvents: "none" }} />
                  <Bar dataKey="chartValue" name="Present" radius={[6, 6, 0, 0]} minPointSize={2}>
                    {overviewChartData.map((item) => (
                      <Cell key={item.name} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No attendance has been marked for today." />
          )}
        </Panel>

        <Panel title="Weekly Attendance Trend" icon={TrendingUp}>
          {hasWeeklyData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekDays} margin={{ top: 4, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--color-muted-foreground)" }} dy={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--color-muted-foreground)" }} dx={-8} />
                  <Tooltip content={<WeeklyLineTooltip />} filterNull wrapperStyle={{ pointerEvents: "none" }} />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 3.5, fill: "var(--color-primary)", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No historical attendance records are available yet." />
          )}
        </Panel>
      </div>

      {/* ── Activity + Low Stock ──────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Recent Activity" icon={Activity}>
          {recentActivities.length > 0 ? (
            <ul className="space-y-0">
              {recentActivities.map((activity, index) => (
                <li
                  key={`${activity.time}-${index}`}
                  className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={[
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      activity.type === "member"     ? "bg-indigo-400"  : "",
                      activity.type === "attendance" ? "bg-emerald-400" : "",
                      activity.type === "inventory"  ? "bg-amber-400"   : "",
                    ].join(" ")} />
                    <span className="truncate text-[13px] text-foreground">{activity.label}</span>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground font-medium">
                    {formatActivityTime(activity.time)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No recent activity available." />
          )}
        </Panel>

        <Panel title="Low Stock Alert" icon={AlertTriangle}>
          {lowStockItems.length > 0 ? (
            <ul className="space-y-0">
              {lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Min: {item.min_qty} {item.unit}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-500 border border-red-500/20">
                    {item.available_qty} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="All items are well stocked. No low stock items found." />
          )}
        </Panel>
      </div>

      {/* ── Quick Stats ──────────────────────────────── */}
      <Panel title="Quick Statistics" icon={Users}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickStat label="Active Members" value={members.length} />
          <QuickStat
            label="Today's Attendance"
            value={attendancePercentage === null ? "—" : `${attendancePercentage}%`}
          />
          <QuickStat label="Low Stock Items" value={lowStockItems.length} />
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Meal Plan Split
            </div>
            <div className="space-y-2.5">
              {mealPlanDistribution.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-muted-foreground">{item.label}</span>
                  <span className="text-[13px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ── Shared Sub-components ───────────────────────────────────── */

function Panel({
  title, icon: Icon, className, children,
}: {
  title: string; icon: LucideIcon; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card p-6 shadow-card ${className ?? ""}`}>
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[15px] font-semibold">{title}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-44 items-center justify-center rounded-xl border border-border border-dashed px-4 text-center bg-muted/30">
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 p-5">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

/* ── Chart Tooltips ─────────────────────────────────────────── */
type DashboardTooltipPayload = {
  value?: number | null;
  payload?: { name?: string; label?: string; value?: number; fill?: string; attendance?: number | null };
};

function AttendanceBarTooltip({ active, payload }: { active?: boolean; payload?: DashboardTooltipPayload[] }) {
  const item = payload?.[0];
  if (!active || !item || item.value === null || item.value === undefined || item.value <= 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-card-md">
      <div className="font-semibold text-foreground">{item.payload?.name}</div>
      <div className="text-[12px] text-muted-foreground">Count: {item.value}</div>
    </div>
  );
}

function WeeklyLineTooltip({ active, payload, label }: { active?: boolean; payload?: DashboardTooltipPayload[]; label?: string }) {
  const item = payload?.[0];
  if (!active || !item || item.value === null || item.value === undefined) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-card-md">
      <div className="font-semibold text-foreground">{label}</div>
      <div className="text-[12px] text-muted-foreground">Meals: {item.value}</div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isPlanEligible(plan: string, meal: "breakfast" | "lunch" | "dinner") {
  if (plan === "all") return true;
  if (plan === "both") return meal === "lunch" || meal === "dinner";
  return plan.includes(meal);
}

function attendanceCountForDate(date: string, records: Attendance[], _members: Member[]) {
  const dayRecords = records.filter((record) => record.date === date);
  const breakfast = dayRecords.filter((record) => record.breakfast_status === "present").length;
  const lunch = dayRecords.filter((record) => record.lunch_status === "present").length;
  const dinner = dayRecords.filter((record) => record.dinner_status === "present").length;
  const total = breakfast + lunch + dinner;
  return dayRecords.length > 0 ? total : null;
}

function formatActivityTime(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
