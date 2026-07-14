import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Building2,
  Coffee,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileBadge,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Package,
  Save,
  Server,
  ShieldCheck,
  StickyNote,
  Sun,
  User,
  Utensils,
  TrendingUp,
  Activity,
  Zap,
  Database,
  Globe,
  ArrowUpRight,
  Cpu,
  HardDrive,
  Wifi,
  CheckCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — MessMate" }] }),
  component: SettingsPage,
});

type Profile = { name: string; email: string; phone: string; messName: string };
type Prefs = {
  breakfastAlerts: boolean;
  lunchAlerts: boolean;
  dinnerAlerts: boolean;
  lowStock: boolean;
  weeklyReport: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
};

const defaultProfile: Profile = {
  name: "Admin User",
  email: "admin@messmate.app",
  phone: "",
  messName: "MessMate Kitchen",
};
const defaultPrefs: Prefs = {
  breakfastAlerts: true,
  lunchAlerts: true,
  dinnerAlerts: true,
  lowStock: true,
  weeklyReport: false,
  breakfastTime: "08:00 AM",
  lunchTime: "12:00 PM",
  dinnerTime: "08:00 PM",
};
const currentPlan = "Pro";
const subscriptionStartDate = "27 June 2026";
const subscriptionExpiryDate = "27 June 2027";
const licenseId = "MM-SUB-1001";
const lastBackupDate = "27 June 2026";
const MAX_MEMBERS = 500;

function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [dark, setDark] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [now, setNow] = useState(() => new Date());
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  const { data: dbData } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return { user, profile: data };
    },
  });

  const { data: liveStats } = useQuery({
    queryKey: ["settings-live-stats"],
    queryFn: async () => {
      const [membersRes, expensesRes, attendanceRes, inventoryRes] = await Promise.all([
        supabase.from("members").select("id, meal_plan", { count: "exact" }),
        supabase.from("expenses").select("amount"),
        supabase.from("attendance").select("id", { count: "exact" }).eq("date", new Date().toISOString().split("T")[0]),
        supabase.from("inventory_items").select("id, quantity, min_stock", { count: "exact" }),
      ]);

      const members = membersRes.data ?? [];
      const totalExpenses = (expensesRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const lowStockCount = (inventoryRes.data ?? []).filter((i: any) => Number(i.quantity) <= Number(i.min_stock)).length;

      return {
        totalMembers: membersRes.count ?? members.length,
        totalExpenses,
        todayAttendance: attendanceRes.count ?? 0,
        totalInventory: inventoryRes.count ?? 0,
        lowStockCount,
      };
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (dbData) {
      if (dbData.profile) {
        setProfile({
          name: dbData.profile.name,
          email: dbData.user.email || "",
          phone: dbData.profile.phone || "",
          messName: dbData.profile.mess_name || "",
        });
        setPrefs({
          breakfastAlerts: dbData.profile.breakfast_alerts,
          lunchAlerts: dbData.profile.lunch_alerts,
          dinnerAlerts: dbData.profile.dinner_alerts,
          lowStock: dbData.profile.low_stock_alerts,
          weeklyReport: dbData.profile.weekly_report_alerts,
          breakfastTime: dbData.profile.breakfast_time,
          lunchTime: dbData.profile.lunch_time,
          dinnerTime: dbData.profile.dinner_time,
        });
      } else {
        setProfile(prev => ({ ...prev, email: dbData.user.email || "" }));
      }
    }
  }, [dbData]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("theme") === "dark";
      setDark(v);
      document.documentElement.classList.toggle("dark", v);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.from("profiles").select("id").limit(1)
      .then(({ error }) => setDbConnected(!error))
      .catch(() => setDbConnected(false));
  }, []);

  const toggleTheme = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("theme", v ? "dark" : "light");
  };

  const saveProfile = async () => {
    if (!profile.name.trim()) return toast.error("Name is required");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: profile.name.trim(),
        phone: profile.phone,
        mess_name: profile.messName.trim(),
      });
      if (error) throw error;
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["settings-profile"] });
      qc.invalidateQueries({ queryKey: ["sidebar-profile"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        breakfast_alerts: next.breakfastAlerts,
        lunch_alerts: next.lunchAlerts,
        dinner_alerts: next.dinnerAlerts,
        low_stock_alerts: next.lowStock,
        weekly_report_alerts: next.weeklyReport,
        breakfast_time: next.breakfastTime,
        lunch_time: next.lunchTime,
        dinner_time: next.dinnerTime,
      });
      if (error) throw error;
      toast.success("Preferences updated");
      qc.invalidateQueries({ queryKey: ["settings-profile"] });
      qc.invalidateQueries({ queryKey: ["sidebar-profile"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update preferences");
    }
  };

  const changePassword = async () => {
    if (!pw.next) return toast.error("Enter new password");
    if (pw.next.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
      toast.success("Password updated");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    }
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("messmate.profile");
    localStorage.removeItem("messmate.prefs");
    toast.success("Logged out successfully.");
    router.navigate({ to: "/login" });
  };

  const memberCount = liveStats?.totalMembers ?? 0;
  const memberUsagePct = Math.min(100, Math.round((memberCount / MAX_MEMBERS) * 100));
  const daysLeft = daysRemaining();
  const subscriptionPct = Math.round(((365 - daysLeft) / 365) * 100);

  return (
    <div className="page-enter min-w-0 overflow-x-hidden p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your profile, security and preferences</p>
      </header>

      <Tabs defaultValue="profile" className="min-w-0 w-full">
        <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1 bg-muted rounded-xl p-1">
          <TabsTrigger value="profile" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"><Lock className="h-3.5 w-3.5" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"><Sun className="h-3.5 w-3.5" />Appearance</TabsTrigger>
          <TabsTrigger value="software-information" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"><Info className="h-3.5 w-3.5" />Software Information</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid min-w-0 max-w-2xl gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-[14px] font-semibold text-foreground">Profile information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" icon={User}>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </Field>
              <Field label="Mess name" icon={Building2}>
                <Input value={profile.messName} onChange={(e) => setProfile({ ...profile, messName: e.target.value })} />
              </Field>
              <Field label="Email" icon={Mail}>
                <Input type="email" value={profile.email} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
              </Field>
              <Field label="Phone">
                <Input value={profile.phone} inputMode="numeric" maxLength={10}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={saveProfile} className="gap-2"><Save className="h-4 w-4" /> Save changes</Button>
            </div>
          </div>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="mt-6">
          <div className="grid min-w-0 max-w-xl gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-[14px] font-semibold text-foreground">Change password</h2>
            <Field label="Current password">
              <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password">
                <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </Field>
              <Field label="Confirm new password">
                <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={changePassword} className="gap-2"><Lock className="h-4 w-4" /> Update password</Button>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
              <h3 className="text-sm font-semibold text-rose-500">Sign out</h3>
              <p className="mt-1 text-xs text-rose-500/80">End your current session on this device.</p>
              <Button variant="destructive" className="mt-3 gap-2" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button>
            </div>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="mt-6">
          <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-[14px] font-semibold text-foreground">Notification preferences</h2>
            <div className="grid min-w-0 gap-3">
              <NotificationPrefCard title="Breakfast reminder" desc="Daily reminder before breakfast service."
                icon={Coffee} iconClassName="bg-emerald-500/10 text-emerald-500"
                checked={prefs.breakfastAlerts} onCheckedChange={(v) => savePrefs({ ...prefs, breakfastAlerts: v })}
                reminderTime={prefs.breakfastTime} onReminderTimeChange={(time) => savePrefs({ ...prefs, breakfastTime: time })} />
              <NotificationPrefCard title="Lunch reminder" desc="Daily reminder before lunch service."
                icon={Sun} iconClassName="bg-sky-500/10 text-sky-500"
                checked={prefs.lunchAlerts} onCheckedChange={(v) => savePrefs({ ...prefs, lunchAlerts: v })}
                reminderTime={prefs.lunchTime} onReminderTimeChange={(time) => savePrefs({ ...prefs, lunchTime: time })} />
              <NotificationPrefCard title="Dinner reminder" desc="Daily reminder before dinner service."
                icon={Moon} iconClassName="bg-amber-500/10 text-amber-500"
                checked={prefs.dinnerAlerts} onCheckedChange={(v) => savePrefs({ ...prefs, dinnerAlerts: v })}
                reminderTime={prefs.dinnerTime} onReminderTimeChange={(time) => savePrefs({ ...prefs, dinnerTime: time })} />
              <NotificationPrefCard title="Low stock alerts" desc="Notify when an inventory item drops below minimum stock."
                icon={Package} iconClassName="bg-rose-500/10 text-rose-500"
                checked={prefs.lowStock} onCheckedChange={(v) => savePrefs({ ...prefs, lowStock: v })} />
              <NotificationPrefCard title="Weekly summary" desc="Receive a weekly attendance and meal summary."
                icon={StickyNote} iconClassName="bg-violet-500/10 text-violet-500"
                checked={prefs.weeklyReport} onCheckedChange={(v) => savePrefs({ ...prefs, weeklyReport: v })} />
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-xl bg-primary/10 p-3 text-xs font-medium text-primary sm:p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0">You will receive notifications based on the above preferences.</p>
            </div>
          </section>
        </TabsContent>

        {/* APPEARANCE TAB */}
        <TabsContent value="appearance" className="mt-6">
          <div className="grid min-w-0 max-w-xl gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-[14px] font-semibold text-foreground">Theme</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {dark ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />}
                <div className="min-w-0">
                  <Label className="text-base">Dark mode</Label>
                  <p className="text-xs text-muted-foreground">Switch the entire app to a darker theme.</p>
                </div>
              </div>
              <Switch checked={dark} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </TabsContent>

        {/* SOFTWARE INFORMATION TAB */}
        <TabsContent value="software-information" className="mt-6">
          <div className="grid min-w-0 gap-5">

            {/* App identity banner */}
            <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-sm border border-indigo-500/20">
                    <Utensils className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight text-foreground">MessMate</h2>
                      <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-500 border border-indigo-500/20">v1.0.0</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">Mess Management System · Build 1001</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      Developed by <span className="font-semibold text-foreground">WebNxt</span>{" · "}Released 27 June 2026
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[12px] font-semibold text-emerald-500">All systems operational</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Live usage stats */}
            <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <UsageStat icon={TrendingUp} label="Active Members" value={memberCount} suffix={`/ ${MAX_MEMBERS}`}
                color="text-blue-500" bgColor="bg-blue-500/10 border-blue-500/20" progress={memberUsagePct} progressColor="bg-blue-500" />
              <UsageStat icon={Activity} label="Total Expenses"
                value={`₹${(liveStats?.totalExpenses ?? 0).toLocaleString("en-IN")}`}
                color="text-emerald-500" bgColor="bg-emerald-500/10 border-emerald-500/20" />
              <UsageStat icon={CheckCheck} label="Today's Attendance" value={liveStats?.todayAttendance ?? 0} suffix=" records"
                color="text-violet-500" bgColor="bg-violet-500/10 border-violet-500/20" />
              <UsageStat icon={Package} label="Inventory Items" value={liveStats?.totalInventory ?? 0}
                badge={liveStats?.lowStockCount ? `${liveStats.lowStockCount} low stock` : undefined}
                badgeColor="text-amber-500 bg-amber-500/10 border-amber-500/20"
                color="text-amber-500" bgColor="bg-amber-500/10 border-amber-500/20" />
            </section>

            {/* Subscription card */}
            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="min-w-0 text-[14px] font-semibold text-foreground">Subscription</h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-500">Active</span>
                </div>
              </div>

              {/* Plan tier selection display */}
              <div className="grid gap-4 sm:grid-cols-3">
                {(["Basic", "Pro", "Enterprise"] as const).map((plan) => {
                  const active = plan === currentPlan;
                  return (
                    <div key={plan} className={`relative rounded-xl border p-4 transition-all ${active ? "border-indigo-500/20 bg-indigo-500/10 shadow-sm" : "border-border bg-secondary/30 opacity-60"}`}>
                      {active && (
                        <span className="absolute right-3 top-3 rounded-full bg-indigo-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Current</span>
                      )}
                      <div className="flex items-center gap-2">
                        {plan === "Basic" && <Zap className="h-4 w-4 text-muted-foreground/50" />}
                        {plan === "Pro" && <Star className="h-4 w-4 text-indigo-500" />}
                        {plan === "Enterprise" && <Globe className="h-4 w-4 text-muted-foreground/50" />}
                        <span className={`text-[13px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{plan}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {plan === "Basic" && "Up to 100 members"}
                        {plan === "Pro" && "Up to 500 members"}
                        {plan === "Enterprise" && "Unlimited members"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Subscription timeline bar */}
              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Subscription period</span>
                  <span className="text-indigo-500">{daysLeft} days remaining</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${subscriptionPct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground/60">
                  <span>{subscriptionStartDate}</span>
                  <span>{subscriptionExpiryDate}</span>
                </div>
              </div>

              {/* Info tiles */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoTile icon={CalendarDays} label="Start Date" value={subscriptionStartDate} />
                <InfoTile icon={CalendarDays} label="Expiry Date" value={subscriptionExpiryDate} />
                <InfoTile icon={Clock} label="Days Remaining" value={`${daysLeft} days`} />
                <InfoTile icon={FileBadge} label="License ID" value={licenseId} mono />
              </div>
            </section>

            {/* System information */}
            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                  <Server className="h-5 w-5" />
                </div>
                <h2 className="min-w-0 text-[14px] font-semibold text-foreground">System Information</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />Database Status
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 rounded-full ${dbConnected === null ? "bg-muted-foreground/30 animate-pulse" : dbConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-[13px] font-semibold text-foreground">
                      {dbConnected === null ? "Checking…" : dbConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" />Database
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">Supabase PostgreSQL</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/70">v15 · Realtime enabled</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" />Logged-in User
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">{profile.name || "Admin User"}</div>
                  <div className="mt-0.5 max-w-full truncate text-[11px] text-muted-foreground/70">{profile.email}</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5" />Runtime
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">React 19 · Vite</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/70">TanStack Router + Query</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wifi className="h-3.5 w-3.5" />Last Backup
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">{lastBackupDate}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/70">Manual export via Backup &amp; Export</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />Local Time
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">{formatDateTime(now)}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/70">India Standard Time (UTC+5:30)</div>
                </div>
              </div>
            </section>

            {/* About + Changelog */}
            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-6 shadow-card lg:grid-cols-[1fr_300px]">
              <div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h2 className="min-w-0 text-[14px] font-semibold text-foreground">About MessMate</h2>
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  MessMate is a purpose-built SaaS application for hostel and mess operators. It consolidates
                  daily attendance tracking, meal plan management, expense accounting, inventory control,
                  and business reporting into a single streamlined dashboard — replacing manual registers
                  with a reliable, real-time digital logbook.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {[
                    "Multi-tenant manager accounts",
                    "3-meal attendance tracking",
                    "Real-time inventory alerts",
                    "Expense categorization",
                    "PDF & CSV export",
                    "Role-based access (coming soon)",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCheck className="h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Changelog</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="grid gap-3">
                  {[
                    { ver: "v1.0.0", date: "27 Jun 2026", note: "Initial release" },
                    { ver: "v1.0.1", date: "Coming soon", note: "Role-based access" },
                    { ver: "v1.1.0", date: "Planned", note: "Mobile app (Android)" },
                  ].map((item) => (
                    <div key={item.ver} className="flex items-start gap-3">
                      <span className="mt-0.5 min-w-[46px] rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{item.ver}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium leading-none">{item.note}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{item.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Sub-components ─── */

function UsageStat({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  bgColor,
  progress,
  progressColor,
  badge,
  badgeColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  bgColor: string;
  progress?: number;
  progressColor?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {badge && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${badgeColor}`}>{badge}</span>
        )}
      </div>
      <div>
        <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
          {suffix && <span className="text-[12px] text-muted-foreground">{suffix}</span>}
        </div>
      </div>
      {progress !== undefined && progressColor && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mt-2">
            <div className={`h-full rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">{progress}% of limit used</div>
        </div>
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border p-4 bg-secondary/50">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 break-all text-[13px] font-semibold text-foreground ${mono ? "font-mono tracking-tight" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function daysRemaining() {
  const today = new Date();
  const expiry = new Date(2027, 5, 27);
  return Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000));
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </Label>
      {children}
    </div>
  );
}

const reminderTimes = [
  "06:00 AM","06:30 AM","07:00 AM","07:30 AM","08:00 AM","08:30 AM","09:00 AM",
  "11:30 AM","12:00 PM","12:30 PM","01:00 PM",
  "07:00 PM","07:30 PM","08:00 PM","08:30 PM","09:00 PM",
];

function NotificationPrefCard({
  title, desc, icon: Icon, iconClassName, checked, onCheckedChange, reminderTime, onReminderTimeChange,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  reminderTime?: string;
  onReminderTimeChange?: (time: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-4 rounded-xl border border-border bg-card shadow-sm p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="flex min-w-0 items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="break-words text-[14px] font-semibold text-foreground">{title}</div>
          <div className="mt-1 break-words text-[13px] text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-8">
        {reminderTime && onReminderTimeChange ? (
          <div className="grid min-w-36 gap-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Reminder time</Label>
            <Select value={reminderTime} onValueChange={onReminderTimeChange}>
              <SelectTrigger className="h-10 w-36 rounded-lg bg-background text-[13px] font-medium border-input text-foreground">
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Select time" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {reminderTimes.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
