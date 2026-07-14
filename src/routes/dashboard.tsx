import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      return (data ?? []).map((m) => {
        const localPlan = localStorage.getItem(`messmate.member_meal_plan.${m.id}`);
        return localPlan ? { ...m, meal_plan: localPlan as Member["meal_plan"] } : m;
      });
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

  const breakfastToday = members.reduce((acc, m) => {
    const isEligible = isPlanEligible(m.meal_plan, "breakfast");
    if (isEligible) {
      const status = localStorage.getItem(`messmate.attendance_breakfast.${m.id}_${today}`);
      if (status === "present") return acc + 1;
    }
    return acc;
  }, 0);

  const lunchToday = todayAttendance.filter((a) => a.lunch_status === "present").length;
  const dinnerToday = todayAttendance.filter((a) => a.dinner_status === "present").length;

  const absentToday = members.reduce((acc, m) => {
    const hasBreakfastAbsence =
      isPlanEligible(m.meal_plan, "breakfast") &&
      localStorage.getItem(`messmate.attendance_breakfast.${m.id}_${today}`) === "absent";

    const dbRecord = todayAttendance.find((a) => a.member_id === m.id);
    const hasLunchAbsence =
      isPlanEligible(m.meal_plan, "lunch") && dbRecord?.lunch_status === "absent";
    const hasDinnerAbsence =
      isPlanEligible(m.meal_plan, "dinner") && dbRecord?.dinner_status === "absent";

    if (hasBreakfastAbsence || hasLunchAbsence || hasDinnerAbsence) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const overviewData = [
    { name: "Breakfast", value: breakfastToday, fill: "#FBBF24" },
    { name: "Lunch", value: lunchToday, fill: "#F97316" },
    { name: "Dinner", value: dinnerToday, fill: "#3B82F6" },
    { name: "Absent", value: absentToday, fill: "#EF4444" },
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
    })),
    ...weeklyAttendance.map((a) => ({
      label: "Attendance marked",
      time: a.updated_at || a.created_at,
    })),
    ...inventoryMovements.map((m) => ({
      label: `Inventory ${m.movement_type.replace("_", " ")}: ${m.inventory_items?.name ?? "item"}`,
      time: m.occurred_at || m.created_at,
    })),
    ...inventoryItems.map((item) => ({
      label: `Inventory updated: ${item.name}`,
      time: item.updated_at,
    })),
  ]
    .filter((activity) => activity.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

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
    {
      label: "Breakfast",
      value: members.filter((m) => isPlanEligible(m.meal_plan, "breakfast")).length,
    },
    { label: "Lunch", value: members.filter((m) => isPlanEligible(m.meal_plan, "lunch")).length },
    { label: "Dinner", value: members.filter((m) => isPlanEligible(m.meal_plan, "dinner")).length },
    { label: "All Meals", value: members.filter((m) => m.meal_plan === "all").length },
  ];

  const tiles = [
    {
      label: "Total Members",
      value: members.length,
      icon: Users,
      color: "from-violet-500 to-fuchsia-500",
    },
    {
      label: "Breakfast Today",
      value: breakfastToday,
      icon: Coffee,
      color: "from-yellow-400 to-amber-500",
    },
    { label: "Lunch Today", value: lunchToday, icon: Soup, color: "from-orange-400 to-amber-500" },
    {
      label: "Dinner Today",
      value: dinnerToday,
      icon: Sandwich,
      color: "from-blue-500 to-sky-500",
    },
    {
      label: "Absent Today",
      value: absentToday,
      icon: TrendingUp,
      color: "from-rose-500 to-red-500",
    },
  ];

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Today's mess overview</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow`}
            >
              <t.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-3xl font-bold">{t.value}</div>
              <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">
                {t.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="Meal Attendance Overview" icon={Utensils}>
          {overviewData.some((item) => item.value > 0) ? (
            <div className="h-72 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overviewChartData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    content={<AttendanceBarTooltip />}
                    cursor={false}
                    filterNull
                    shared={false}
                    wrapperStyle={{ pointerEvents: "none" }}
                  />
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
        </DashboardPanel>

        <DashboardPanel title="Weekly Attendance Trend" icon={TrendingUp}>
          {hasWeeklyData ? (
            <div className="h-72 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekDays} margin={{ top: 8, right: 12, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    content={<WeeklyLineTooltip />}
                    filterNull
                    wrapperStyle={{ pointerEvents: "none" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 3, fill: "#8B5CF6", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#8B5CF6", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No historical attendance records are available yet." />
          )}
        </DashboardPanel>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DashboardPanel title="Recent Activity" icon={Activity}>
          {recentActivities.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentActivities.map((activity, index) => (
                <li
                  key={`${activity.time}-${index}`}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm">{activity.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatActivityTime(activity.time)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No recent activity available." />
          )}
        </DashboardPanel>

        <DashboardPanel title="Low Stock Alert" icon={AlertTriangle}>
          {lowStockItems.length > 0 ? (
            <ul className="divide-y divide-border">
              {lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Minimum: {item.min_qty} {item.unit}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                    {item.available_qty} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No low stock items." />
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel title="Quick Statistics" icon={Users} className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickStat label="Active Members" value={members.length} />
          <QuickStat label="Inactive Members" value="Not tracked" />
          <QuickStat
            label="Today's Attendance"
            value={attendancePercentage === null ? "No data" : `${attendancePercentage}%`}
          />
          <div className="rounded-xl border border-border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Meal Plan Distribution
            </div>
            <div className="mt-3 space-y-2">
              {mealPlanDistribution.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardPanel>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Utensils className="h-4 w-4 text-primary" /> Welcome back, Mess Manager
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the Members page to mark today's attendance, search members, or review the notebook
          for any member.
        </p>
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className ?? ""}`}
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

type DashboardTooltipPayload = {
  value?: number | null;
  payload?: {
    name?: string;
    label?: string;
    value?: number;
    fill?: string;
    attendance?: number | null;
  };
};

function AttendanceBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: DashboardTooltipPayload[];
}) {
  const item = payload?.[0];
  if (!active || !item || item.value === null || item.value === undefined || item.value <= 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-semibold">{item.payload?.name}</div>
      <div className="text-muted-foreground">Count: {item.value}</div>
    </div>
  );
}

function WeeklyLineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: DashboardTooltipPayload[];
  label?: string;
}) {
  const item = payload?.[0];
  if (!active || !item || item.value === null || item.value === undefined) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-semibold">{label}</div>
      <div className="text-muted-foreground">Attendance: {item.value}</div>
    </div>
  );
}

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

function attendanceCountForDate(date: string, records: Attendance[], members: Member[]) {
  const dayRecords = records.filter((record) => record.date === date);
  const breakfast = members.reduce((acc, member) => {
    if (!isPlanEligible(member.meal_plan, "breakfast")) return acc;
    return localStorage.getItem(`messmate.attendance_breakfast.${member.id}_${date}`) === "present"
      ? acc + 1
      : acc;
  }, 0);

  const lunch = dayRecords.filter((record) => record.lunch_status === "present").length;
  const dinner = dayRecords.filter((record) => record.dinner_status === "present").length;
  const total = breakfast + lunch + dinner;
  return dayRecords.length > 0 || breakfast > 0 ? total : null;
}

function formatActivityTime(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
