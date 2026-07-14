import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevR,
  CalendarDays,
  Check,
  X,
  Minus,
  FileBarChart,
  FileDown,
  MoreVertical,
  CheckCheck,
  Utensils,
  Soup,
  Sandwich,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { initials, avatarColor, formatDateISO, downloadCSV } from "@/lib/format";

type Member = Database["public"]["Tables"]["members"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
type MealPlan = Database["public"]["Enums"]["meal_plan"];
type Status = Database["public"]["Enums"]["attendance_status"];

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Members — MessMate" },
      { name: "description", content: "Manage mess members and their daily attendance notebook." },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [today, setToday] = useState<Date>(new Date());
  const [viewMeal, setViewMeal] = useState<"breakfast" | "lunch" | "dinner" | "all">("all");
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [addOpen, setAddOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Member[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.mobile.toLowerCase().includes(q) ||
        m.room_number.toLowerCase().includes(q) ||
        (m.member_code ?? "").toLowerCase().includes(q),
    );
  }, [members, search]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  const monthStart = useMemo(() => formatDateISO(viewMonth), [viewMonth]);
  const monthEnd = useMemo(() => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return formatDateISO(d);
  }, [viewMonth]);

  const { data: monthAttendance = [] } = useQuery({
    queryKey: ["attendance", selectedId, monthStart, monthEnd],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", selectedId!)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Attendance[];
    },
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance-all", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", selectedId!);
      if (error) throw error;
      return data as Attendance[];
    },
  });

  const stats = useMemo(() => {
    const breakfastDays = allAttendance.filter((a) => a.breakfast_status === "present").length;
    const lunchDays = allAttendance.filter((a) => a.lunch_status === "present").length;
    const dinnerDays = allAttendance.filter((a) => a.dinner_status === "present").length;
    const total = breakfastDays + lunchDays + dinnerDays;
    const possible = allAttendance.reduce((acc, a) => {
      if (!selected) return acc;
      const plan = selected.meal_plan;
      const breakfastMarked = (plan.includes("breakfast") || plan === "all") && a.breakfast_status !== "not_marked" ? 1 : 0;
      const lunchMarked = (plan.includes("lunch") || plan === "all") && a.lunch_status !== "not_marked" ? 1 : 0;
      const dinnerMarked = (plan.includes("dinner") || plan === "all") && a.dinner_status !== "not_marked" ? 1 : 0;
      const slots = (plan.includes("breakfast") || plan === "all" ? 1 : 0) +
                    (plan.includes("lunch") || plan === "all" ? 1 : 0) +
                    (plan.includes("dinner") || plan === "all" ? 1 : 0);
      const hasMarked = (breakfastMarked + lunchMarked + dinnerMarked) > 0;
      return acc + (hasMarked ? slots : 0);
    }, 0);
    const present = allAttendance.reduce((acc, a) => {
      if (!selected) return acc;
      return (
        acc +
        ((selected.meal_plan.includes("breakfast") || selected.meal_plan === "all") && a.breakfast_status === "present" ? 1 : 0) +
        ((selected.meal_plan.includes("lunch") || selected.meal_plan === "all") && a.lunch_status === "present" ? 1 : 0) +
        ((selected.meal_plan.includes("dinner") || selected.meal_plan === "all") && a.dinner_status === "present" ? 1 : 0)
      );
    }, 0);
    const pct = possible > 0 ? Math.round((present / possible) * 100) : 0;
    return { breakfastDays, lunchDays, dinnerDays, total, pct };
  }, [allAttendance, selected]);

  const monthRows = useMemo(() => {
    const rows: { date: Date; iso: string; record?: Attendance }[] = [];
    const d = new Date(viewMonth);
    d.setDate(1);
    const m = d.getMonth();
    while (d.getMonth() === m) {
      const iso = formatDateISO(d);
      const record = monthAttendance.find((a) => a.date === iso);
      rows.push({ date: new Date(d), iso, record });
      d.setDate(d.getDate() + 1);
    }
    return rows;
  }, [viewMonth, monthAttendance]);

  const setMark = useMutation({
    mutationFn: async (vars: {
      memberId: string;
      date: string;
      field: "breakfast_status" | "lunch_status" | "dinner_status";
      value: Status;
    }) => {
      const payload: Database["public"]["Tables"]["attendance"]["Insert"] = {
        member_id: vars.memberId,
        date: vars.date,
        updated_at: new Date().toISOString(),
        [vars.field]: vars.value,
      };
      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isEligible = (plan: string, meal: "breakfast" | "lunch" | "dinner") => {
    if (plan === "all") return true;
    return plan.includes(meal);
  };

  const markAllPresent = useMutation({
    mutationFn: async () => {
      const iso = formatDateISO(today);
      const { data: existing = [] } = await supabase.from("attendance").select("*").eq("date", iso);
      const existingMap = new Map(existing?.map((r) => [r.member_id, r]) || []);
      const rows = members.map((m) => {
        const exist = existingMap.get(m.id);
        return {
          member_id: m.id,
          date: iso,
          breakfast_status: (viewMeal === "breakfast" || viewMeal === "all")
            ? (isEligible(m.meal_plan, "breakfast") ? "present" as Status : "not_marked" as Status)
            : (exist?.breakfast_status || "not_marked" as Status),
          lunch_status: (viewMeal === "lunch" || viewMeal === "all")
            ? (isEligible(m.meal_plan, "lunch") ? "present" as Status : "not_marked" as Status)
            : (exist?.lunch_status || "not_marked" as Status),
          dinner_status: (viewMeal === "dinner" || viewMeal === "all")
            ? (isEligible(m.meal_plan, "dinner") ? "present" as Status : "not_marked" as Status)
            : (exist?.dinner_status || "not_marked" as Status),
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`All members marked present for ${viewMeal}`);
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAllAbsent = useMutation({
    mutationFn: async () => {
      const iso = formatDateISO(today);
      const { data: existing = [] } = await supabase.from("attendance").select("*").eq("date", iso);
      const existingMap = new Map(existing?.map((r) => [r.member_id, r]) || []);
      const rows = members.map((m) => {
        const exist = existingMap.get(m.id);
        return {
          member_id: m.id,
          date: iso,
          breakfast_status: (viewMeal === "breakfast" || viewMeal === "all")
            ? (isEligible(m.meal_plan, "breakfast") ? "absent" as Status : "not_marked" as Status)
            : (exist?.breakfast_status || "not_marked" as Status),
          lunch_status: (viewMeal === "lunch" || viewMeal === "all")
            ? (isEligible(m.meal_plan, "lunch") ? "absent" as Status : "not_marked" as Status)
            : (exist?.lunch_status || "not_marked" as Status),
          dinner_status: (viewMeal === "dinner" || viewMeal === "all")
            ? (isEligible(m.meal_plan, "dinner") ? "absent" as Status : "not_marked" as Status)
            : (exist?.dinner_status || "not_marked" as Status),
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`All members marked absent for ${viewMeal}`);
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAllMarks = useMutation({
    mutationFn: async () => {
      const iso = formatDateISO(today);
      const { data: existing = [] } = await supabase.from("attendance").select("*").eq("date", iso);
      const existingMap = new Map(existing?.map((r) => [r.member_id, r]) || []);
      const rows = members.map((m) => {
        const exist = existingMap.get(m.id);
        return {
          member_id: m.id,
          date: iso,
          breakfast_status: (viewMeal === "breakfast" || viewMeal === "all") ? "not_marked" as Status : (exist?.breakfast_status || "not_marked" as Status),
          lunch_status: (viewMeal === "lunch" || viewMeal === "all") ? "not_marked" as Status : (exist?.lunch_status || "not_marked" as Status),
          dinner_status: (viewMeal === "dinner" || viewMeal === "all") ? "not_marked" as Status : (exist?.dinner_status || "not_marked" as Status),
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Attendance cleared for ${viewMeal}`);
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMembers = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("members").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member(s) deleted successfully.");
      setSelectedIds([]);
      setConfirmDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ["members"] });
      setSelectedId((currentId) => {
        if (currentId && selectedIds.includes(currentId)) return null;
        return currentId;
      });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete member(s)."),
  });

  const exportPDF = () => {
    if (!selected) return;
    window.print();
  };

  const exportCSV = () => {
    if (!selected) return;
    const rows: (string | number)[][] = [["Date", "Day", "Breakfast", "Lunch", "Dinner", "Remarks"]];
    monthRows.forEach((r) => {
      rows.push([
        r.date.toLocaleDateString("en-GB"),
        r.date.toLocaleDateString("en-US", { weekday: "short" }),
        r.record?.breakfast_status ?? "not_marked",
        r.record?.lunch_status ?? "not_marked",
        r.record?.dinner_status ?? "not_marked",
        r.record?.remarks ?? "",
      ]);
    });
    downloadCSV(`${selected.name}-${monthStart}.csv`, rows);
  };

  return (
    <div className="page-enter flex h-[calc(100vh-0px)] min-h-screen flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Members</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Manage members and their attendance notebook</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl text-[13px] font-medium h-9 bg-card">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  <ChevR className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                <Calendar mode="single" selected={today} onSelect={(d) => d && setToday(d)} />
              </PopoverContent>
            </Popover>

            <Tabs value={viewMeal} onValueChange={(v) => setViewMeal(v as "breakfast" | "lunch" | "dinner" | "all")}>
              <TabsList className="bg-muted rounded-xl h-9">
                <TabsTrigger value="breakfast" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:text-amber-500 data-[state=active]:shadow-sm gap-1.5">
                  <Utensils className="h-3.5 w-3.5" />Breakfast
                </TabsTrigger>
                <TabsTrigger value="lunch" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:text-indigo-500 data-[state=active]:shadow-sm gap-1.5">
                  <Soup className="h-3.5 w-3.5" />Lunch
                </TabsTrigger>
                <TabsTrigger value="dinner" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:text-violet-500 data-[state=active]:shadow-sm gap-1.5">
                  <Sandwich className="h-3.5 w-3.5" />Dinner
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5">
                  <CheckCheck className="h-3.5 w-3.5" />All
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              onClick={() => markAllPresent.mutate()}
              disabled={markAllPresent.isPending}
              className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold h-9 shadow-sm"
            >
              <CheckCheck className="h-4 w-4" /> Mark All Present
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={members.length === 0} className="rounded-xl h-9 w-9 bg-card">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl bg-card">
                <DropdownMenuItem className="text-red-500 cursor-pointer gap-2 focus:bg-red-500/10 focus:text-red-500" onClick={() => markAllAbsent.mutate()} disabled={markAllAbsent.isPending}>
                  <X className="h-4 w-4" /> Mark All Absent
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-secondary" onClick={() => clearAllMarks.mutate()} disabled={clearAllMarks.isPending}>
                  <Minus className="h-4 w-4" /> Clear Today's Marks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── LEFT: Member List ────────────────────── */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          {/* Search + Actions */}
          <div className="flex items-center gap-2 p-3 border-b border-border bg-card">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="h-9 pl-9 rounded-xl bg-background text-[13px] border-input focus-visible:ring-primary text-foreground"
              />
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              className="gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] h-9 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirmDeleteOpen(true)}
              className="gap-1.5 rounded-xl text-[13px] h-9"
            >
              <Trash2 className="h-4 w-4" />
              {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
            </Button>
          </div>

          <div className="px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-[12px] text-muted-foreground font-medium">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </div>

          <ScrollArea className="flex-1">
            <ul className="p-2 flex flex-col gap-1">
              {filtered.map((m) => {
                const active = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <div
                      className={cn(
                        "grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl p-2.5 transition-all duration-150 cursor-pointer",
                        active
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50 border border-transparent",
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(m.id)}
                        onCheckedChange={() => {
                          setSelectedIds((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
                          );
                        }}
                      />
                      <button
                        onClick={() => setSelectedId(m.id)}
                        className="col-span-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 w-full text-left"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className={cn("text-[11px] font-semibold", avatarColor(m.id))}>
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className={cn("truncate text-[13px] font-semibold", active ? "text-primary" : "text-foreground")}>
                            {m.name}
                          </div>
                          <div className={cn("truncate text-[11px]", active ? "text-primary/70" : "text-muted-foreground")}>
                            {m.mobile} · Room {m.room_number}
                            {m.member_code && <span className="opacity-60"> · #{m.member_code}</span>}
                          </div>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground/30")} />
                      </button>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-10 text-center text-[13px] text-gray-400">No members found.</li>
              )}
            </ul>
          </ScrollArea>
        </section>

        {/* ── RIGHT: Notebook ──────────────────────── */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-card-md overflow-hidden relative">
          {selected ? (
            <>
              {/* Member info header */}
              <div className="border-b border-border p-5 bg-card relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className={cn("text-sm font-bold shadow-sm", avatarColor(selected.id))}>
                        {initials(selected.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-xl font-bold text-foreground truncate">{selected.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />{selected.mobile}
                        </span>
                        <span>Room {selected.room_number}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <Utensils className="h-3 w-3" />
                          {selected.meal_plan.replace(/_/g, " + ")}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground/60">
                        Member since{" "}
                        {new Date(selected.join_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-500 border-transparent hover:border-red-500/20 shrink-0 h-9 w-9 bg-muted"
                    onClick={() => { setSelectedIds([selected.id]); setConfirmDeleteOpen(true); }}
                    title="Delete Member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stat cards */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {[
                    { label: "Breakfast", value: stats.breakfastDays, color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20" },
                    { label: "Lunch",     value: stats.lunchDays,     color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" },
                    { label: "Dinner",    value: stats.dinnerDays,    color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20" },
                    { label: "Total",     value: stats.total,         color: "text-emerald-500",bg: "bg-emerald-500/10 border-emerald-500/20" },
                    { label: "Rate",      value: `${stats.pct}%`,     color: "text-foreground", bg: "bg-muted border-border" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border border-border px-3 py-2.5 text-center ${s.bg}`}>
                      <div className={`text-xl font-extrabold leading-none ${s.color}`}>{s.value}</div>
                      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between border-b border-border px-5 py-2.5 bg-muted/50 relative z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary"
                  onClick={() => {
                    const d = new Date(viewMonth);
                    d.setMonth(d.getMonth() - 1);
                    setViewMonth(d);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-[13px] font-semibold text-foreground">
                  {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-secondary"
                  onClick={() => {
                    const d = new Date(viewMonth);
                    d.setMonth(d.getMonth() + 1);
                    setViewMonth(d);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* ── Notebook Body ──────────────────── */}
              <div className="relative min-h-0 flex-1 overflow-hidden bg-[var(--color-notebook)] text-slate-800 dark:text-foreground">
                {/* Spiral rings */}
                <div className="notebook-rings absolute inset-y-0 left-0 w-7" />
                <ScrollArea className="h-full">
                  <div className="notebook-paper min-w-[600px] pl-10 pr-4 pb-6">
                    {/* Sticky header row */}
                    <div className="sticky top-0 z-10 grid grid-cols-[110px_1fr_1fr_1fr_1.2fr] border-b border-[var(--color-notebook-line)] bg-[var(--color-notebook)]/95 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 backdrop-blur">
                      <div>Date</div>
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500"><Utensils className="h-3 w-3" />Breakfast</div>
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-500"><Soup className="h-3 w-3" />Lunch</div>
                      <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-500"><Sandwich className="h-3 w-3" />Dinner</div>
                      <div>Remarks</div>
                    </div>

                    {/* Day rows */}
                    {monthRows.map((row) => {
                      const isSun = row.date.getDay() === 0;
                      const breakfastEnabled = selected.meal_plan.includes("breakfast") || selected.meal_plan === "all";
                      const lunchEnabled = selected.meal_plan.includes("lunch") || selected.meal_plan === "all";
                      const dinnerEnabled = selected.meal_plan.includes("dinner") || selected.meal_plan === "all";
                      return (
                        <div
                          key={row.iso}
                          className={cn(
                            "grid grid-cols-[110px_1fr_1fr_1fr_1.2fr] items-center border-b border-[var(--color-notebook-line)] py-2 text-sm transition-colors",
                            isSun && "bg-slate-50/50 dark:bg-muted/30",
                          )}
                        >
                          <div className={cn("text-[12px] font-medium", isSun ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200")}>
                            {row.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })},{" "}
                            <span className={isSun ? "text-slate-400 dark:text-slate-500" : "text-slate-400 dark:text-slate-400"}>
                              {row.date.toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                          </div>
                          <StatusCell
                            status={breakfastEnabled ? (row.record?.breakfast_status ?? "not_marked") : "not_marked"}
                            disabled={!breakfastEnabled}
                            onChange={(v) => setMark.mutate({ memberId: selected.id, date: row.iso, field: "breakfast_status", value: v })}
                            weeklyOff={isSun && !breakfastEnabled}
                          />
                          <StatusCell
                            status={lunchEnabled ? (row.record?.lunch_status ?? "not_marked") : "not_marked"}
                            disabled={!lunchEnabled}
                            onChange={(v) => setMark.mutate({ memberId: selected.id, date: row.iso, field: "lunch_status", value: v })}
                            weeklyOff={isSun && !lunchEnabled}
                          />
                          <StatusCell
                            status={dinnerEnabled ? (row.record?.dinner_status ?? "not_marked") : "not_marked"}
                            disabled={!dinnerEnabled}
                            onChange={(v) => setMark.mutate({ memberId: selected.id, date: row.iso, field: "dinner_status", value: v })}
                            weeklyOff={isSun && !dinnerEnabled}
                          />
                          <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {isSun && !row.record ? "Weekly Off" : (row.record?.remarks ?? "—")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Notebook footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 relative z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Present
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Absent
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Not Applicable
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="gap-1.5 rounded-xl text-[12px] h-8 bg-card" onClick={() => setSummaryOpen(true)}>
                    <FileBarChart className="h-3.5 w-3.5" /> Summary
                  </Button>
                  <Button variant="outline" className="gap-1.5 rounded-xl text-[12px] h-8 bg-card" onClick={exportCSV}>
                    <FileDown className="h-3.5 w-3.5" /> CSV
                  </Button>
                  <Button variant="outline" className="gap-1.5 rounded-xl text-[12px] h-8 bg-card" onClick={exportPDF}>
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground bg-muted/10">
              Select a member to view their notebook
            </div>
          )}
        </section>
      </div>

      {/* Dialogs */}
      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["members"] })} />
      <MonthlySummaryDialog open={summaryOpen} onOpenChange={setSummaryOpen} member={selected} rows={monthRows} stats={stats} />
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Member{selectedIds.length > 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-[13px] text-gray-500">
            Are you sure you want to delete {selectedIds.length > 1 ? `these ${selectedIds.length} members` : "this member"}? This action cannot be undone.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteMembers.mutate(selectedIds)}
              disabled={deleteMembers.isPending}
            >
              {deleteMembers.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── StatusCell (Notebook) ──────────────────────────────────── */
function StatusCell({ status, disabled, weeklyOff, onChange }: {
  status: Status; disabled?: boolean; weeklyOff?: boolean; onChange: (v: Status) => void;
}) {
  if (disabled) {
    return <div className="text-[11px] text-muted-foreground/30">{weeklyOff ? "—" : "N/A"}</div>;
  }
  const next: Status = status === "not_marked" ? "present" : status === "present" ? "absent" : "not_marked";
  return (
    <button
      onClick={() => onChange(next)}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all duration-150 border",
        status === "present"    && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20",
        status === "absent"     && "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20",
        status === "not_marked" && "border-dashed border-border bg-transparent text-muted-foreground hover:bg-muted/50",
      )}
    >
      {status === "present"    && <><Check className="h-3 w-3" />Present</>}
      {status === "absent"     && <><X className="h-3 w-3" />Absent</>}
      {status === "not_marked" && <><Minus className="h-3 w-3" />Mark</>}
    </button>
  );
}

/* ── AddMemberDialog ─────────────────────────────────────────── */
function AddMemberDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "", mobile: "", room_number: "", meal_plan: "both" as string,
    member_code: "", id_proof_type: "", id_proof_number: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("rooms").select("room_number").order("room_number");
      if (error) throw error;
      return (data ?? []) as { room_number: string }[];
    },
    enabled: open,
  });

  const { data: occupied = [] } = useQuery({
    queryKey: ["occupied_rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("room_number");
      if (error) throw error;
      return (data ?? []).map((r) => r.room_number);
    },
    enabled: open,
  });

  const availableRooms = useMemo(
    () => rooms.map((r) => r.room_number).filter((rn) => !occupied.includes(rn)),
    [rooms, occupied],
  );

  const reset = () => setForm({ name: "", mobile: "", room_number: "", meal_plan: "both", member_code: "", id_proof_type: "", id_proof_number: "" });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits");
    if (!form.room_number) return toast.error("Please select a room");
    if (!form.meal_plan) return toast.error("Please choose a meal plan");
    if (!form.id_proof_type) return toast.error("ID Proof type is required");
    if (!form.id_proof_number.trim()) return toast.error("ID Proof number is required");
    setSaving(true);
    const { error } = await supabase.from("members").insert({
      name: form.name.trim(), mobile: form.mobile, room_number: form.room_number,
      meal_plan: form.meal_plan as any, member_code: form.member_code.trim() || null,
      id_proof_type: form.id_proof_type, id_proof_number: form.id_proof_number.trim(),
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Member added");
    reset();
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add New Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-medium text-gray-700">Full Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" className="rounded-xl border-gray-200 text-[13px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Mobile <span className="text-red-500">*</span></Label>
              <Input value={form.mobile} inputMode="numeric" maxLength={10} placeholder="10-digit number" className="rounded-xl border-gray-200 text-[13px]"
                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
              {form.mobile.length > 0 && form.mobile.length < 10 && (
                <span className="text-[11px] text-red-500">{form.mobile.length}/10 digits</span>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Room No. <span className="text-red-500">*</span></Label>
              <Select value={form.room_number} onValueChange={(v) => setForm({ ...form, room_number: v })}>
                <SelectTrigger className="rounded-xl border-gray-200 text-[13px]">
                  <SelectValue placeholder={availableRooms.length ? "Select room" : "No rooms"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableRooms.length === 0 && <div className="px-3 py-2 text-[12px] text-gray-400">All rooms occupied.</div>}
                  {availableRooms.map((rn) => <SelectItem key={rn} value={rn}>Room {rn}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-gray-400">{availableRooms.length} of {rooms.length} available</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Meal Plan <span className="text-red-500">*</span></Label>
              <Select value={form.meal_plan} onValueChange={(v) => setForm({ ...form, meal_plan: v })}>
                <SelectTrigger className="rounded-xl border-gray-200 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="breakfast">Breakfast only</SelectItem>
                  <SelectItem value="lunch">Lunch only</SelectItem>
                  <SelectItem value="dinner">Dinner only</SelectItem>
                  <SelectItem value="breakfast_lunch">Breakfast + Lunch</SelectItem>
                  <SelectItem value="breakfast_dinner">Breakfast + Dinner</SelectItem>
                  <SelectItem value="lunch_dinner">Lunch + Dinner</SelectItem>
                  <SelectItem value="all">All Meals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Member Code</Label>
              <Input value={form.member_code} onChange={(e) => setForm({ ...form, member_code: e.target.value })} placeholder="e.g. M-101 (optional)" className="rounded-xl border-gray-200 text-[13px]" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-gray-700">ID Proof Type <span className="text-red-500">*</span></Label>
              <Select value={form.id_proof_type} onValueChange={(v) => setForm({ ...form, id_proof_type: v })}>
                <SelectTrigger className="rounded-xl border-gray-200 text-[13px]"><SelectValue placeholder="Select ID" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                  <SelectItem value="pan">PAN Card</SelectItem>
                  <SelectItem value="voter">Voter ID</SelectItem>
                  <SelectItem value="driving">Driving License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="student">Student ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[13px] font-medium text-gray-700">ID Number <span className="text-red-500">*</span></Label>
              <Input value={form.id_proof_number} onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })} placeholder="Document number" className="rounded-xl border-gray-200 text-[13px]" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? "Saving..." : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── MonthlySummaryDialog ─────────────────────────────────────── */
function MonthlySummaryDialog({ open, onOpenChange, member, rows, stats }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  member: Member | null;
  rows: { date: Date; iso: string; record?: Attendance & { breakfast_status?: Status } }[];
  stats: { breakfastDays: number; lunchDays: number; dinnerDays: number; total: number; pct: number };
}) {
  if (!member) return null;
  const breakfastPresent = rows.filter((r) => r.record?.breakfast_status === "present").length;
  const breakfastAbsent  = rows.filter((r) => r.record?.breakfast_status === "absent").length;
  const lunchPresent     = rows.filter((r) => r.record?.lunch_status === "present").length;
  const lunchAbsent      = rows.filter((r) => r.record?.lunch_status === "absent").length;
  const dinnerPresent    = rows.filter((r) => r.record?.dinner_status === "present").length;
  const dinnerAbsent     = rows.filter((r) => r.record?.dinner_status === "absent").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{member.name} — Monthly Summary</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-2">
          {[
            { label: "Breakfast", present: breakfastPresent, absent: breakfastAbsent, color: "text-amber-600" },
            { label: "Lunch",     present: lunchPresent,     absent: lunchAbsent,     color: "text-indigo-600" },
            { label: "Dinner",    present: dinnerPresent,    absent: dinnerAbsent,    color: "text-violet-600" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-gray-100 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{m.label}</div>
              <div className={`mt-1.5 text-2xl font-bold ${m.color}`}>{m.present}</div>
              <div className="text-[11px] text-gray-400">present</div>
              <div className="mt-1 text-[11px] text-red-400">{m.absent} absent</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Lifetime Breakfast", value: stats.breakfastDays },
            { label: "Lifetime Lunch",     value: stats.lunchDays },
            { label: "Lifetime Dinner",    value: stats.dinnerDays },
            { label: "Attendance Rate",    value: `${stats.pct}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{s.value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
