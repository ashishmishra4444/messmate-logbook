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
      return (data as Member[]).map((m) => {
        const localPlan = localStorage.getItem(`messmate.member_meal_plan.${m.id}`);
        return localPlan ? { ...m, meal_plan: localPlan as any } : m;
      });
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ["attendance", "by-date", iso],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").eq("date", iso);
      if (error) throw error;
      return (data as Attendance[]).map((r) => {
        const localBreakfastStatus = localStorage.getItem(`messmate.attendance_breakfast.${r.member_id}_${iso}`);
        return {
          ...r,
          breakfast_status: (localBreakfastStatus || "not_marked") as Status
        };
      }) as (Attendance & { breakfast_status?: Status })[];
    },
  });

  const recordByMember = useMemo(() => {
    const m = new Map<string, Attendance & { breakfast_status?: Status }>();
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
      if (vars.field === "breakfast_status") {
        localStorage.setItem(`messmate.attendance_breakfast.${vars.memberId}_${iso}`, vars.value);
        const { data: existing } = await supabase
          .from("attendance")
          .select("lunch_status, dinner_status")
          .eq("member_id", vars.memberId)
          .eq("date", iso)
          .maybeSingle();

        const payload: Database["public"]["Tables"]["attendance"]["Insert"] = {
          member_id: vars.memberId,
          date: iso,
          updated_at: new Date().toISOString(),
          lunch_status: existing?.lunch_status ?? ("not_marked" as Status),
          dinner_status: existing?.dinner_status ?? ("not_marked" as Status),
        };
        const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "member_id,date" });
        if (error) throw error;
      } else {
        const payload: Database["public"]["Tables"]["attendance"]["Insert"] = {
          member_id: vars.memberId,
          date: iso,
          updated_at: new Date().toISOString(),
          ...(vars.field === "lunch_status" ? { lunch_status: vars.value } : { dinner_status: vars.value }),
        };
        const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "member_id,date" });
        if (error) throw error;
      }
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
        updated_at: new Date().toISOString(),
      }));

      members.forEach((m) => {
        const eligibleForBreakfast = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
        if (eligibleForBreakfast) {
          localStorage.setItem(`messmate.attendance_breakfast.${m.id}_${iso}`, "present");
        }
      });

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
    const breakfast = members.reduce((acc, m) => {
      const isEligible = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
      if (isEligible) {
        const status = localStorage.getItem(`messmate.attendance_breakfast.${m.id}_${iso}`);
        if (status === "present") return acc + 1;
      }
      return acc;
    }, 0);

    const lunch = records.filter((r) => r.lunch_status === "present").length;
    const dinner = records.filter((r) => r.dinner_status === "present").length;

    const absent = members.reduce((acc, m) => {
      const hasBreakfastAbsence = (m.meal_plan.includes("breakfast") || m.meal_plan === "all") &&
        localStorage.getItem(`messmate.attendance_breakfast.${m.id}_${iso}`) === "absent";
      
      const rec = recordByMember.get(m.id);
      const hasLunchAbsence = (m.meal_plan.includes("lunch") || m.meal_plan === "all") && rec?.lunch_status === "absent";
      const hasDinnerAbsence = (m.meal_plan.includes("dinner") || m.meal_plan === "all") && rec?.dinner_status === "absent";

      if (hasBreakfastAbsence || hasLunchAbsence || hasDinnerAbsence) {
        return acc + 1;
      }
      return acc;
    }, 0);

    return { breakfast, lunch, dinner, absent };
  }, [records, members, iso, recordByMember]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-sm text-muted-foreground">Mark today's breakfast, lunch and dinner attendance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
              </PopoverContent>
            </Popover>
            <Button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCheck className="h-4 w-4" /> Mark All Present
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Tile label="Breakfast present" value={counts.breakfast} tone="bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300" />
          <Tile label="Lunch present" value={counts.lunch} tone="bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" />
          <Tile label="Dinner present" value={counts.dinner} tone="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" />
          <Tile label="Absences" value={counts.absent} tone="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" />
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile or room no..."
                className="h-10 pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {filtered.length} member{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-left">Room</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-center">Breakfast</th>
                    <th className="px-4 py-3 text-center">Lunch</th>
                    <th className="px-4 py-3 text-center">Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const rec = recordByMember.get(m.id);
                    const breakfastEnabled = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
                    const lunchEnabled = m.meal_plan.includes("lunch") || m.meal_plan === "all";
                    const dinnerEnabled = m.meal_plan.includes("dinner") || m.meal_plan === "all";
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className={cn("text-xs font-semibold", avatarColor(m.id))}>{initials(m.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{m.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{m.mobile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.room_number}</td>
                        <td className="px-4 py-3 capitalize">{m.meal_plan.replace("_", " + ")}</td>
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
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No members found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-border">
            {filtered.map((m) => {
              const rec = recordByMember.get(m.id);
              const breakfastEnabled = m.meal_plan.includes("breakfast") || m.meal_plan === "all";
              const lunchEnabled = m.meal_plan.includes("lunch") || m.meal_plan === "all";
              const dinnerEnabled = m.meal_plan.includes("dinner") || m.meal_plan === "all";
              return (
                <li key={m.id} className="p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className={cn("text-xs font-semibold", avatarColor(m.id))}>{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{m.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.mobile} · Room {m.room_number} · <span className="capitalize">{m.meal_plan.replace("_", " + ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border p-2">
                      <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[oklch(var(--breakfast))]">
                        <Utensils className="h-3 w-3" /> Breakfast
                      </div>
                      <StatusToggle
                        status={breakfastEnabled ? (rec?.breakfast_status ?? "not_marked") : "not_marked"}
                        disabled={!breakfastEnabled}
                        onChange={(v) => setMark.mutate({ memberId: m.id, field: "breakfast_status", value: v })}
                      />
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[oklch(var(--lunch))]">
                        <Soup className="h-3 w-3" /> Lunch
                      </div>
                      <StatusToggle
                        status={lunchEnabled ? (rec?.lunch_status ?? "not_marked") : "not_marked"}
                        disabled={!lunchEnabled}
                        onChange={(v) => setMark.mutate({ memberId: m.id, field: "lunch_status", value: v })}
                      />
                    </div>
                    <div className="rounded-lg border border-border p-2">
                      <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[oklch(var(--dinner))]">
                        <Sandwich className="h-3 w-3" /> Dinner
                      </div>
                      <StatusToggle
                        status={dinnerEnabled ? (rec?.dinner_status ?? "not_marked") : "not_marked"}
                        disabled={!dinnerEnabled}
                        onChange={(v) => setMark.mutate({ memberId: m.id, field: "dinner_status", value: v })}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">No members found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-border p-3 ${tone}`}>
      <div className="text-xl font-bold leading-tight">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function StatusToggle({ status, disabled, onChange }: { status: Status; disabled?: boolean; onChange: (v: Status) => void }) {
  if (disabled) return <span className="text-xs text-muted-foreground">N/A</span>;
  const next: Status = status === "not_marked" ? "present" : status === "present" ? "absent" : "not_marked";
  return (
    <button
      onClick={() => onChange(next)}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
        status === "present" && "border-success/30 bg-success/10 text-success",
        status === "absent" && "border-destructive/30 bg-destructive/10 text-destructive",
        status === "not_marked" && "border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground hover:bg-muted",
      )}
    >
      {status === "present" && <><Check className="h-3.5 w-3.5" />Present</>}
      {status === "absent" && <><X className="h-3.5 w-3.5" />Absent</>}
      {status === "not_marked" && <><Minus className="h-3.5 w-3.5" />Mark</>}
    </button>
  );
}
