import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Database, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";
import { downloadCSV } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Member = SupabaseDatabase["public"]["Tables"]["members"]["Row"];
type AttendanceExportRow = {
  date: string;
  lunch_status: string;
  dinner_status: string;
  remarks: string | null;
  member_id: string | null;
  members: {
    name: string;
    room_number: string;
  } | null;
};

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "Backup & Export — MessMate" }] }),
  component: BackupPage,
});

function BackupPage() {
  const exportMembers = async () => {
    const { data, error } = await supabase.from("members").select("*");
    if (error) return toast.error(error.message);
    const rows: (string | Date)[][] = [["Name", "Mobile", "Room", "Plan", "Join Date"]];
    ((data ?? []) as Member[]).filter(isValidMember).forEach((m) => {
      rows.push([
        m.name.trim(),
        String(m.mobile).trim(),
        m.room_number.trim(),
        m.meal_plan,
        parseJoinDate(m.join_date),
      ]);
    });
    downloadMembersExcel(`messmate-members-${new Date().toISOString().slice(0, 10)}.xlsx`, rows);
  };
  const exportAttendance = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("date, breakfast_status, lunch_status, dinner_status, remarks, member_id, members(name, room_number)");
    if (error) return toast.error(error.message);
    const rows: (string | number)[][] = [
      ["Date", "Member", "Room", "Breakfast", "Lunch", "Dinner", "Remarks"],
    ];
    ((data ?? []) as any[]).forEach((r) => {
      rows.push([
        r.date,
        r.members?.name ?? "",
        r.members?.room_number ?? "",
        r.breakfast_status || "not_marked",
        r.lunch_status,
        r.dinner_status,
        r.remarks ?? "",
      ]);
    });
    downloadCSV(`messmate-attendance-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };
  return (
    <div className="page-enter min-h-screen p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Backup &amp; Export</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Download a copy of your mess data anytime.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div className="group rounded-2xl border border-border bg-card p-6 shadow-card card-hover">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-500" />
          </div>
          <h2 className="mt-4 text-[14px] font-semibold text-foreground">Members List</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Export the full members list as an Excel file.</p>
          <Button className="mt-5 gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 text-[13px] h-9" onClick={exportMembers}>
            <FileDown className="h-4 w-4" /> Download Excel
          </Button>
        </div>

        <div className="group rounded-2xl border border-border bg-card p-6 shadow-card card-hover">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="mt-4 text-[14px] font-semibold text-foreground">Attendance Records</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Export all attendance records as a CSV file.</p>
          <Button className="mt-5 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 text-[13px] h-9" onClick={exportAttendance}>
            <FileDown className="h-4 w-4" /> Download CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

function isValidMember(member: Member) {
  return Boolean(member.name?.trim() && member.mobile?.trim() && member.room_number?.trim());
}

function parseJoinDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day);
}

function downloadMembersExcel(filename: string, rows: (string | Date)[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  worksheet["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const mobileCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 1 })];
    if (mobileCell) {
      mobileCell.t = "s";
      mobileCell.v = String(mobileCell.v);
      mobileCell.z = "@";
    }

    const joinDateCell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: 4 })];
    if (joinDateCell) {
      joinDateCell.z = "yyyy-mm-dd";
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
  XLSX.writeFile(workbook, filename, { compression: true });
}
