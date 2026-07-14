import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search,
  CalendarDays,
  CheckCheck,
  Check,
  X,
  Minus,
  Soup,
  Sandwich,
  Utensils,
} from "lucide-react";
import { initials, avatarColor, formatDateISO } from "@/lib/format";

type Member = Database["public"]["Tables"]["members"]["Row"];
type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
type Status = Database["public"]["Enums"]["attendance_status"];

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — MessMate" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();
  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const iso = formatDateISO(date);

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").order("name");
      if (error) throw error;
      return data as Member[];
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ["attendance", "by-date", iso],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").eq("date", iso);
      if (error) throw error;
      return data as Attendance[];
    },
  });

  const recordByMember = useMemo(() => {
    const m = new Map<string, Attendance>();
    records.forEach((r) => m.set(r.member_id, r));
    return m;
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.mobile.toLowerCase().includes(q) ||
        m.room_number.toLowerCase().includes(q),
    );
  }, [members, search]);

  const setMark = useMutation({
    mutationFn: async (vars: { memberId: string; field: "breakfast_status" | "lunch_status" | "dinner_status"; value: Status }) => {
      const payload: Database["public"]["Tables"]["attendance"]["Insert"] = {
        member_id: vars.memberId,
        date: iso,
        updated_at: new Date().toISOString(),
        [vars.field]: vars.value,
      };
      const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const rows = members.map((m) => ({
        member_id: m.id,
        date: iso,
        lunch_status: (m.meal_plan === "dinner" || m.meal_plan === "breakfast" || m.meal_plan === "breakfast_dinner" ? "not_marked" : "present") as Status,
        dinner_status: (m.meal_plan === "lunch" || m.meal_plan === "breakfast" || m.meal_plan === "breakfast_lunch" ? "not_marked" : "present") as Status,
        breakfast_status: (m.meal_plan.includes("breakfast") || m.meal_plan === "all" ? "present" : "not_marked") as Status,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "member_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All members marked present");
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const breakfast = records.filter((r) => r.breakfast_status === "present").length;
    const lunch = records.filter((r) => r.lunch_status === "present").length;
    const dinner = records.filter((r) => r.dinner_status === "present").length;
    const absent = members.reduce((acc, m) => {
      const rec = recordByMember.get(m.id);
      const isBreakfastAbsent = (m.meal_plan.includes("breakfast") || m.meal_plan === "all") && rec?.breakfast_status === "absent";
      const isLunchAbsent = (m.meal_plan.includes("lunch") || m.meal_plan === "all") && rec?.lunch_status === "absent";
      const isDinnerAbsent = (m.meal_plan.includes("dinner") || m.meal_plan === "all") && rec?.dinner_status === "absent";
      return acc + (isBreakfastAbsent ? 1 : 0) + (isLunchAbsent ? 1 : 0) + (isDinnerAbsent ? 1 : 0);
    }, 0);
    return { breakfast, lunch, dinner, absent };
  }, [records, members, recordByMember]);

  return (
    <div className="page-enter flex min-h-screen flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <header className="border-b border-border bg-card px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Attendance</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Mark breakfast, lunch and dinner attendance for{" "}
              {date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl border-input bg-card hover:bg-accent text-foreground text-[13px] font-medium h-9">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-border bg-card" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold h-9 shadow-sm"
            >
              <CheckCheck className="h-4 w-4" /> Mark All Present
            </Button>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Breakfast Present", value: counts.breakfast, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Lunch Present",     value: counts.lunch,     color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" },
            { label: "Dinner Present",    value: counts.dinner,    color: "text-violet-500", bg: "bg-violet-500/10 border-violet-500/20" },
            { label: "Missed Meals",      value: counts.absent,    color: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/20" },
          ].map((tile) => (
            <div key={tile.label} className={`rounded-xl border p-3.5 ${tile.bg}`}>
              <div className={`text-2xl font-bold leading-none ${tile.color}`}>{tile.value}</div>
              <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{tile.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ── Table ───────────────────────────────────── */}
      <div className="flex-1 p-6">
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          {/* Search bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile or room no..."
                className="h-9 pl-9 rounded-xl border-input bg-background text-foreground text-[13px] focus-visible:ring-indigo-500/20"
              />
            </div>
            <span className="text-[12px] text-muted-foreground font-medium">
              {filtered.length} member{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Member</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Room</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Plan</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                      <span className="inline-flex items-center gap-1"><Utensils className="h-3.5 w-3.5" />Breakfast</span>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                      <span className="inline-flex items-center gap-1"><Soup className="h-3.5 w-3.5" />Lunch</span>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-violet-500">
                      <span className="inline-flex items-center gap-1"><Sandwich className="h-3.5 w-3.5" />Dinner</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((m) => {
                    const rec = recordByMember.get(m.id);
                    const breakfastEnabled = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
                    const lunchEnabled = m.meal_plan.includes("lunch") || m.meal_plan === "all";
                    const dinnerEnabled = m.meal_plan.includes("dinner") || m.meal_plan === "all";
                    return (
                      <tr key={m.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn("text-[11px] font-semibold", avatarColor(m.id))}>
                                {initials(m.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-[13px] font-medium text-foreground">{m.name}</div>
                              <div className="text-[11px] text-muted-foreground">{m.mobile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground">{m.room_number}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-500 capitalize">
                            {m.meal_plan.replace(/_/g, " + ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusToggle
                            status={breakfastEnabled ? (rec?.breakfast_status ?? "not_marked") : "not_marked"}
                            disabled={!breakfastEnabled}
                            onChange={(v) => setMark.mutate({ memberId: m.id, field: "breakfast_status", value: v })}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusToggle
                            status={lunchEnabled ? (rec?.lunch_status ?? "not_marked") : "not_marked"}
                            disabled={!lunchEnabled}
                            onChange={(v) => setMark.mutate({ memberId: m.id, field: "lunch_status", value: v })}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusToggle
                            status={dinnerEnabled ? (rec?.dinner_status ?? "not_marked") : "not_marked"}
                            disabled={!dinnerEnabled}
                            onChange={(v) => setMark.mutate({ memberId: m.id, field: "dinner_status", value: v })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-border/50">
            {filtered.map((m) => {
              const rec = recordByMember.get(m.id);
              const breakfastEnabled = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
              const lunchEnabled = m.meal_plan.includes("lunch") || m.meal_plan === "all";
              const dinnerEnabled = m.meal_plan.includes("dinner") || m.meal_plan === "all";
              return (
                <li key={m.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={cn("text-xs font-semibold", avatarColor(m.id))}>
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.mobile} · Room {m.room_number}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "Breakfast", icon: Utensils, enabled: breakfastEnabled, status: rec?.breakfast_status ?? "not_marked", field: "breakfast_status" as const, accent: "text-amber-500" },
                      { label: "Lunch",     icon: Soup,     enabled: lunchEnabled,     status: rec?.lunch_status ?? "not_marked",     field: "lunch_status" as const,     accent: "text-indigo-500" },
                      { label: "Dinner",    icon: Sandwich, enabled: dinnerEnabled,    status: rec?.dinner_status ?? "not_marked",    field: "dinner_status" as const,    accent: "text-violet-500" },
                    ].map((meal) => (
                      <div key={meal.label} className="rounded-xl border border-border p-2.5 bg-muted/30">
                        <div className={`mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${meal.accent}`}>
                          <meal.icon className="h-3 w-3" /> {meal.label}
                        </div>
                        <StatusToggle
                          status={meal.enabled ? (meal.status as Status) : "not_marked"}
                          disabled={!meal.enabled}
                          onChange={(v) => setMark.mutate({ memberId: m.id, field: meal.field, value: v })}
                        />
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-12 text-center text-[13px] text-muted-foreground">No members found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Status Toggle ──────────────────────────────────────────── */
function StatusToggle({
  status, disabled, onChange,
}: {
  status: Status; disabled?: boolean; onChange: (v: Status) => void;
}) {
  if (disabled) {
    return <span className="text-[11px] text-muted-foreground/50 font-medium">N/A</span>;
  }
  const next: Status = status === "not_marked" ? "present" : status === "present" ? "absent" : "not_marked";
  return (
    <button
      onClick={() => onChange(next)}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 border",
        status === "present"   && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20",
        status === "absent"    && "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20",
        status === "not_marked" && "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {status === "present"    && <><Check className="h-3 w-3" />Present</>}
      {status === "absent"     && <><X className="h-3 w-3" />Absent</>}
      {status === "not_marked" && <><Minus className="h-3 w-3" />Mark</>}
    </button>
  );
}
