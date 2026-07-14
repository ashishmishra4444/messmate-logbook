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
  const [viewMeal, setViewMeal] = useState<"breakfast" | "lunch" | "dinner">("lunch");
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
      return (data as Member[]).map((m) => {
        const localPlan = localStorage.getItem(`messmate.member_meal_plan.${m.id}`);
        return localPlan ? { ...m, meal_plan: localPlan as any } : m;
      });
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

  // Attendance for selected member (current month + neighbouring data)
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

  // Lifetime stats
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
    let breakfastDays = 0;
    if (selectedId) {
      const prefix = `messmate.attendance_breakfast.${selectedId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const val = localStorage.getItem(key);
          if (val === "present") breakfastDays++;
        }
      }
    }
    const lunchDays = allAttendance.filter((a) => a.lunch_status === "present").length;
    const dinnerDays = allAttendance.filter((a) => a.dinner_status === "present").length;
    const total = breakfastDays + lunchDays + dinnerDays;
    const possible = allAttendance.reduce((acc, a) => {
      if (!selected) return acc;
      const plan = selected.meal_plan;
      const localBreakfastStatus = localStorage.getItem(`messmate.attendance_breakfast.${selected.id}_${a.date}`);
      
      const breakfastMarked = (plan.includes("breakfast") || plan === "all") && localBreakfastStatus !== "not_marked" ? 1 : 0;
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
      const localBreakfastStatus = localStorage.getItem(`messmate.attendance_breakfast.${selected.id}_${a.date}`);
      return (
        acc +
        ((selected.meal_plan.includes("breakfast") || selected.meal_plan === "all") && localBreakfastStatus === "present" ? 1 : 0) +
        ((selected.meal_plan.includes("lunch") || selected.meal_plan === "all") && a.lunch_status === "present" ? 1 : 0) +
        ((selected.meal_plan.includes("dinner") || selected.meal_plan === "all") && a.dinner_status === "present" ? 1 : 0)
      );
    }, 0);
    const pct = possible > 0 ? Math.round((present / possible) * 100) : 0;
    return { breakfastDays, lunchDays, dinnerDays, total, pct };
  }, [allAttendance, selected, selectedId]);

  // Build month rows
  const monthRows = useMemo(() => {
    const rows: { date: Date; iso: string; record?: Attendance & { breakfast_status?: Status } }[] = [];
    const d = new Date(viewMonth);
    d.setDate(1);
    const m = d.getMonth();
    while (d.getMonth() === m) {
      const iso = formatDateISO(d);
      const record = monthAttendance.find((a) => a.date === iso);
      const localBreakfastStatus = selectedId ? localStorage.getItem(`messmate.attendance_breakfast.${selectedId}_${iso}`) : null;
      rows.push({
        date: new Date(d),
        iso,
        record: record ? {
          ...record,
          breakfast_status: (localBreakfastStatus || "not_marked") as Status
        } : (localBreakfastStatus ? {
          id: "",
          member_id: selectedId || "",
          date: iso,
          lunch_status: "not_marked" as Status,
          dinner_status: "not_marked" as Status,
          remarks: "",
          created_at: "",
          updated_at: "",
          breakfast_status: localBreakfastStatus as Status
        } : undefined)
      });
      d.setDate(d.getDate() + 1);
    }
    return rows;
  }, [viewMonth, monthAttendance, selectedId]);

  const setMark = useMutation({
    mutationFn: async (vars: {
      memberId: string;
      date: string;
      field: "breakfast_status" | "lunch_status" | "dinner_status";
      value: Status;
    }) => {
      if (vars.field === "breakfast_status") {
        localStorage.setItem(`messmate.attendance_breakfast.${vars.memberId}_${vars.date}`, vars.value);
        const { data: existing } = await supabase
          .from("attendance")
          .select("lunch_status, dinner_status")
          .eq("member_id", vars.memberId)
          .eq("date", vars.date)
          .maybeSingle();

        const payload: Database["public"]["Tables"]["attendance"]["Insert"] = {
          member_id: vars.memberId,
          date: vars.date,
          updated_at: new Date().toISOString(),
          lunch_status: existing?.lunch_status ?? ("not_marked" as Status),
          dinner_status: existing?.dinner_status ?? ("not_marked" as Status),
        };
        const { error } = await supabase
          .from("attendance")
          .upsert(payload, { onConflict: "member_id,date" });
        if (error) throw error;
      } else {
        const payload: Database["public"]["Tables"]["attendance"]["Insert"] = {
          member_id: vars.memberId,
          date: vars.date,
          updated_at: new Date().toISOString(),
          ...(vars.field === "lunch_status"
            ? { lunch_status: vars.value }
            : { dinner_status: vars.value }),
        };
        const { error } = await supabase
          .from("attendance")
          .upsert(payload, { onConflict: "member_id,date" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markAllPresent = useMutation({
    mutationFn: async () => {
      const iso = formatDateISO(today);
      const rows = members.map((m) => ({
        member_id: m.id,
        date: iso,
        lunch_status: (m.meal_plan === "dinner" || m.meal_plan === "breakfast" || m.meal_plan === "breakfast_dinner" ? "not_marked" : "present") as Status,
        dinner_status: (m.meal_plan === "lunch" || m.meal_plan === "breakfast" || m.meal_plan === "breakfast_lunch" ? "not_marked" : "present") as Status,
        updated_at: new Date().toISOString(),
      }));

      members.forEach((m) => {
        const eligibleForBreakfast = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
        if (eligibleForBreakfast) {
          localStorage.setItem(`messmate.attendance_breakfast.${m.id}_${iso}`, "present");
        }
      });

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All members marked present for today");
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
        if (currentId && selectedIds.includes(currentId)) {
          return null;
        }
        return currentId;
      });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete member(s).");
    },
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
    <div className="flex h-[calc(100vh-0px)] min-h-screen flex-col">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-4 sm:px-6 lg:flex lg:flex-wrap">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">Manage members and their attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                {today.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
                <ChevR className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={today} onSelect={(d) => d && setToday(d)} />
            </PopoverContent>
          </Popover>

          <Tabs value={viewMeal} onValueChange={(v) => setViewMeal(v as "breakfast" | "lunch" | "dinner")}>
            <TabsList className="bg-muted">
              <TabsTrigger
                value="breakfast"
                className="gap-1.5 data-[state=active]:text-[oklch(var(--breakfast))]"
              >
                <Utensils className="h-4 w-4" />
                Breakfast
              </TabsTrigger>
              <TabsTrigger
                value="lunch"
                className="gap-1.5 data-[state=active]:text-[oklch(var(--lunch))]"
              >
                <Soup className="h-4 w-4" />
                Lunch
              </TabsTrigger>
              <TabsTrigger
                value="dinner"
                className="gap-1.5 data-[state=active]:text-[oklch(var(--dinner))]"
              >
                <Sandwich className="h-4 w-4" />
                Dinner
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={() => markAllPresent.mutate()}
            disabled={markAllPresent.isPending}
            className="gap-2 bg-success text-success-foreground hover:bg-success/90"
          >
            <CheckCheck className="h-4 w-4" /> Mark All Present
          </Button>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* LEFT: members list */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile or room no..."
                className="h-10 pl-9"
              />
            </div>
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirmDeleteOpen(true)}
              className="gap-1.5 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
            >
              <Trash2 className="h-4 w-4" />
              Delete{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Button>
          </div>

          <div className="mt-3 text-xs font-medium text-muted-foreground">
            Total Members: <span className="text-foreground">{members.length}</span>
          </div>

          <ScrollArea className="mt-3 -mx-2 flex-1 px-2">
            <ul className="flex flex-col gap-2 pb-2">
              {filtered.map((m) => {
                const active = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <div
                      className={cn(
                        "grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-all",
                        active ? "border-primary/40 bg-accent shadow-sm" : "hover:bg-muted/60",
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(m.id)}
                        onCheckedChange={() => {
                          setSelectedIds((prev) =>
                            prev.includes(m.id)
                              ? prev.filter((id) => id !== m.id)
                              : [...prev, m.id],
                          );
                        }}
                      />
                      <button
                        onClick={() => setSelectedId(m.id)}
                        className="col-span-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 w-full text-left"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback
                            className={cn("text-xs font-semibold", avatarColor(m.id))}
                          >
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{m.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            <span>{m.mobile}</span>
                            <span className="mx-1.5 opacity-50">•</span>
                            <span>Room {m.room_number}</span>
                            {m.member_code && (
                              <>
                                <span className="mx-1.5 opacity-50">•</span>
                                <span>#{m.member_code}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active ? "text-primary" : "text-muted-foreground/40",
                          )}
                        />
                      </button>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-2 py-8 text-center text-sm text-muted-foreground">
                  No members found.
                </li>
              )}
            </ul>
          </ScrollArea>
        </section>

        {/* RIGHT: member detail */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
          {selected ? (
            <>
              {/* Header */}
              <div className="grid grid-cols-1 gap-4 border-b border-border p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 items-start gap-4">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className={cn("text-base font-bold", avatarColor(selected.id))}>
                      {initials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-xl font-bold">{selected.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {selected.mobile}
                      </span>
                      <span>Room No. {selected.room_number}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Member Since:{" "}
                      {new Date(selected.join_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                        <Utensils className="h-3 w-3" /> {selected.meal_plan}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <StatCard
                    label="Breakfast Days"
                    value={stats.breakfastDays}
                    accent="text-[oklch(var(--breakfast))]"
                    bg="bg-yellow-50/50"
                  />
                  <StatCard
                    label="Lunch Days"
                    value={stats.lunchDays}
                    accent="text-[oklch(var(--lunch))]"
                    bg="bg-orange-50"
                  />
                  <StatCard
                    label="Dinner Days"
                    value={stats.dinnerDays}
                    accent="text-[oklch(var(--dinner))]"
                    bg="bg-blue-50"
                  />
                  <StatCard
                    label="Total Meals"
                    value={stats.total}
                    accent="text-emerald-700"
                    bg="bg-emerald-50"
                  />
                  <StatCard
                    label="Attendance"
                    value={`${stats.pct}%`}
                    accent="text-amber-700"
                    bg="bg-amber-50"
                  />
                </div>
              </div>

              {/* Month nav */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const d = new Date(viewMonth);
                    d.setMonth(d.getMonth() - 1);
                    setViewMonth(d);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold">
                  {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const d = new Date(viewMonth);
                    d.setMonth(d.getMonth() + 1);
                    setViewMonth(d);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Notebook table */}
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="notebook-rings absolute inset-y-0 left-0 w-6" />
                <ScrollArea className="h-full">
                  <div className="notebook-paper pl-8 pr-4 pb-6">
                    <div className="sticky top-0 z-10 grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] border-b border-border bg-card/95 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <div>Date</div>
                      <div className="inline-flex items-center gap-1.5 text-[oklch(var(--breakfast))]">
                        <Utensils className="h-3.5 w-3.5" />
                        Breakfast
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-[oklch(var(--lunch))]">
                        <Soup className="h-3.5 w-3.5" />
                        Lunch
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-[oklch(var(--dinner))]">
                        <Sandwich className="h-3.5 w-3.5" />
                        Dinner
                      </div>
                      <div>Remarks</div>
                    </div>
                    {monthRows.map((row) => {
                      const isSun = row.date.getDay() === 0;
                      const breakfastEnabled = selected.meal_plan.includes("breakfast") || selected.meal_plan === "all";
                      const lunchEnabled = selected.meal_plan.includes("lunch") || selected.meal_plan === "all";
                      const dinnerEnabled = selected.meal_plan.includes("dinner") || selected.meal_plan === "all";
                      return (
                        <div
                          key={row.iso}
                          className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] items-center border-b border-[oklch(var(--notebook-line))] py-2 text-sm"
                        >
                          <div className={cn("font-medium", isSun && "text-muted-foreground")}>
                            {row.date.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                            , {row.date.toLocaleDateString("en-US", { weekday: "short" })}
                          </div>
                          <StatusCell
                            status={
                              breakfastEnabled
                                ? (row.record?.breakfast_status ?? "not_marked")
                                : "not_marked"
                            }
                            disabled={!breakfastEnabled}
                            onChange={(v) =>
                              setMark.mutate({
                                memberId: selected.id,
                                date: row.iso,
                                field: "breakfast_status",
                                value: v,
                              })
                            }
                            weeklyOff={isSun && !breakfastEnabled}
                          />
                          <StatusCell
                            status={
                              lunchEnabled
                                ? (row.record?.lunch_status ?? "not_marked")
                                : "not_marked"
                            }
                            disabled={!lunchEnabled}
                            onChange={(v) =>
                              setMark.mutate({
                                memberId: selected.id,
                                date: row.iso,
                                field: "lunch_status",
                                value: v,
                              })
                            }
                            weeklyOff={isSun && !lunchEnabled}
                          />
                          <StatusCell
                            status={
                              dinnerEnabled
                                ? (row.record?.dinner_status ?? "not_marked")
                                : "not_marked"
                            }
                            disabled={!dinnerEnabled}
                            onChange={(v) =>
                              setMark.mutate({
                                memberId: selected.id,
                                date: row.iso,
                                field: "dinner_status",
                                value: v,
                              })
                            }
                            weeklyOff={isSun && !dinnerEnabled}
                          />
                          <div className="truncate text-xs text-muted-foreground">
                            {isSun && !row.record ? "Weekly Off" : (row.record?.remarks ?? "—")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer legend + actions */}
              <div className="grid grid-cols-1 items-center gap-3 border-t border-border p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <Legend color="bg-success" label="Present" />
                  <Legend color="bg-destructive" label="Absent" />
                  <Legend color="bg-muted-foreground/30" label="Not Applicable" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => setSummaryOpen(true)}>
                    <FileBarChart className="h-4 w-4" /> View Monthly Summary
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={exportCSV}>
                    <FileDown className="h-4 w-4" /> Export CSV
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={exportPDF}>
                    <FileDown className="h-4 w-4" /> Export PDF
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Select a member
            </div>
          )}
        </section>
      </div>

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["members"] })}
      />
      <MonthlySummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        member={selected}
        rows={monthRows}
        stats={stats}
      />
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Members</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Are you sure you want to delete the selected member(s)? This action cannot be undone.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMembers.mutate(selectedIds)}
              disabled={deleteMembers.isPending}
              className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
            >
              {deleteMembers.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  bg,
}: {
  label: string;
  value: string | number;
  accent: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border px-3 py-2 text-center", bg)}>
      <div className={cn("text-2xl font-bold leading-tight", accent)}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function StatusCell({
  status,
  disabled,
  weeklyOff,
  onChange,
}: {
  status: Status;
  disabled?: boolean;
  weeklyOff?: boolean;
  onChange: (v: Status) => void;
}) {
  if (disabled) {
    return <div className="text-xs text-muted-foreground">{weeklyOff ? "—" : "N/A"}</div>;
  }
  const next: Status =
    status === "not_marked" ? "present" : status === "present" ? "absent" : "not_marked";
  return (
    <button
      onClick={() => onChange(next)}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
        status === "present" && "border-success/30 bg-success/10 text-success",
        status === "absent" && "border-destructive/30 bg-destructive/10 text-destructive",
        status === "not_marked" &&
          "border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground hover:bg-muted",
      )}
    >
      {status === "present" && (
        <>
          <Check className="h-3.5 w-3.5" />
          Present
        </>
      )}
      {status === "absent" && (
        <>
          <X className="h-3.5 w-3.5" />
          Absent
        </>
      )}
      {status === "not_marked" && (
        <>
          <Minus className="h-3.5 w-3.5" />
          Mark
        </>
      )}
    </button>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    room_number: "",
    meal_plan: "both" as string,
    member_code: "",
    id_proof_type: "",
    id_proof_number: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rooms")
        .select("room_number")
        .order("room_number");
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

  const reset = () =>
    setForm({
      name: "",
      mobile: "",
      room_number: "",
      meal_plan: "both",
      member_code: "",
      id_proof_type: "",
      id_proof_number: "",
    });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.mobile.length !== 10) return toast.error("Mobile number must be exactly 10 digits");
    if (!form.room_number) return toast.error("Please select a room");
    if (!form.meal_plan) return toast.error("Please choose a meal plan");
    if (!form.id_proof_type) return toast.error("ID Proof type is required");
    if (!form.id_proof_number.trim()) return toast.error("ID Proof number is required");

    setSaving(true);

    let dbPlan: "lunch" | "dinner" | "both" = "both";
    if (form.meal_plan === "lunch") {
      dbPlan = "lunch";
    } else if (form.meal_plan === "dinner") {
      dbPlan = "dinner";
    } else if (form.meal_plan === "breakfast") {
      dbPlan = "lunch";
    } else if (form.meal_plan === "breakfast_lunch") {
      dbPlan = "lunch";
    } else if (form.meal_plan === "breakfast_dinner") {
      dbPlan = "dinner";
    } else if (form.meal_plan === "lunch_dinner") {
      dbPlan = "both";
    } else if (form.meal_plan === "all") {
      dbPlan = "both";
    }

    const { data, error } = await supabase
      .from("members")
      .insert({
        name: form.name.trim(),
        mobile: form.mobile,
        room_number: form.room_number,
        meal_plan: dbPlan,
        member_code: form.member_code.trim() || null,
        id_proof_type: form.id_proof_type,
        id_proof_number: form.id_proof_number.trim(),
      } as any)
      .select("id")
      .single();

    setSaving(false);
    if (error) return toast.error(error.message);

    if (data?.id) {
      localStorage.setItem(`messmate.member_meal_plan.${data.id}`, form.meal_plan);
    }

    toast.success("Member added");
    reset();
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label>
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <Label>
                Mobile number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.mobile}
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                onChange={(e) =>
                  setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
              />
              {form.mobile.length > 0 && form.mobile.length < 10 && (
                <span className="text-[11px] text-destructive">
                  Enter all 10 digits ({form.mobile.length}/10)
                </span>
              )}
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label>
                Room No. <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.room_number}
                onValueChange={(v) => setForm({ ...form, room_number: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableRooms.length ? "Select an available room" : "No rooms available"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      All rooms are occupied.
                    </div>
                  )}
                  {availableRooms.map((rn) => (
                    <SelectItem key={rn} value={rn}>
                      Room {rn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                {availableRooms.length} of {rooms.length} rooms available
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <Label>
                Meal plan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.meal_plan}
                onValueChange={(v) => setForm({ ...form, meal_plan: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast only</SelectItem>
                  <SelectItem value="lunch">Lunch only</SelectItem>
                  <SelectItem value="dinner">Dinner only</SelectItem>
                  <SelectItem value="breakfast_lunch">Breakfast + Lunch</SelectItem>
                  <SelectItem value="breakfast_dinner">Breakfast + Dinner</SelectItem>
                  <SelectItem value="lunch_dinner">Lunch + Dinner</SelectItem>
                  <SelectItem value="all">All Meals (Breakfast + Lunch + Dinner)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label>Member code</Label>
              <Input
                value={form.member_code}
                onChange={(e) => setForm({ ...form, member_code: e.target.value })}
                placeholder="Optional, e.g. M-101"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <Label>
                ID Proof type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.id_proof_type}
                onValueChange={(v) => setForm({ ...form, id_proof_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ID proof" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                  <SelectItem value="pan">PAN Card</SelectItem>
                  <SelectItem value="voter">Voter ID</SelectItem>
                  <SelectItem value="driving">Driving License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="student">Student ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-0 gap-1.5">
              <Label>
                ID Proof number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.id_proof_number}
                onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })}
                placeholder="Document number"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MonthlySummaryDialog({
  open,
  onOpenChange,
  member,
  rows,
  stats,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: Member | null;
  rows: { date: Date; iso: string; record?: Attendance & { breakfast_status?: Status } }[];
  stats: { breakfastDays: number; lunchDays: number; dinnerDays: number; total: number; pct: number };
}) {
  if (!member) return null;
  const breakfastPresent = rows.filter((r) => r.record?.breakfast_status === "present").length;
  const breakfastAbsent = rows.filter((r) => r.record?.breakfast_status === "absent").length;
  const lunchPresent = rows.filter((r) => r.record?.lunch_status === "present").length;
  const lunchAbsent = rows.filter((r) => r.record?.lunch_status === "absent").length;
  const dinnerPresent = rows.filter((r) => r.record?.dinner_status === "present").length;
  const dinnerAbsent = rows.filter((r) => r.record?.dinner_status === "absent").length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member.name} — Monthly Summary</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-2 text-sm">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Breakfast (this month)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-success">{breakfastPresent}</span>
              <span className="text-xs text-muted-foreground">present</span>
            </div>
            <div className="text-xs text-destructive">{breakfastAbsent} absent</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Lunch (this month)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-success">{lunchPresent}</span>
              <span className="text-xs text-muted-foreground">present</span>
            </div>
            <div className="text-xs text-destructive">{lunchAbsent} absent</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Dinner (this month)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-success">{dinnerPresent}</span>
              <span className="text-xs text-muted-foreground">present</span>
            </div>
            <div className="text-xs text-destructive">{dinnerAbsent} absent</div>
          </div>
          <div className="col-span-3 grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/60 p-3 text-center">
              <div className="text-xl font-bold">{stats.breakfastDays}</div>
              <div className="text-[11px] uppercase text-muted-foreground">Lifetime Breakfast</div>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 text-center">
              <div className="text-xl font-bold">{stats.lunchDays}</div>
              <div className="text-[11px] uppercase text-muted-foreground">Lifetime Lunch</div>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 text-center">
              <div className="text-xl font-bold">{stats.dinnerDays}</div>
              <div className="text-[11px] uppercase text-muted-foreground">Lifetime Dinner</div>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 text-center">
              <div className="text-xl font-bold">{stats.pct}%</div>
              <div className="text-[11px] uppercase text-muted-foreground">Attendance</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
