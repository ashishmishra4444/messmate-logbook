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
    <div className="min-w-0 overflow-x-hidden p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, security and preferences</p>
      </header>

      <Tabs defaultValue="profile" className="min-w-0 w-full">
        <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Sun className="h-4 w-4" />Appearance</TabsTrigger>
          <TabsTrigger value="software-information" className="gap-2"><Info className="h-4 w-4" />Software Information</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="mt-5">
          <div className="grid min-w-0 max-w-2xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Profile information</h2>
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
        <TabsContent value="security" className="mt-5">
          <div className="grid min-w-0 max-w-xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Change password</h2>
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
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
              <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Sign out</h3>
              <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/70">End your current session on this device.</p>
              <Button variant="destructive" className="mt-3 gap-2" onClick={logout}><LogOut className="h-4 w-4" /> Logout</Button>
            </div>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="mt-5">
          <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Notification preferences</h2>
            <div className="grid min-w-0 gap-3">
              <NotificationPrefCard title="Breakfast reminder" desc="Daily reminder before breakfast service."
                icon={Coffee} iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                checked={prefs.breakfastAlerts} onCheckedChange={(v) => savePrefs({ ...prefs, breakfastAlerts: v })}
                reminderTime={prefs.breakfastTime} onReminderTimeChange={(time) => savePrefs({ ...prefs, breakfastTime: time })} />
              <NotificationPrefCard title="Lunch reminder" desc="Daily reminder before lunch service."
                icon={Sun} iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300"
                checked={prefs.lunchAlerts} onCheckedChange={(v) => savePrefs({ ...prefs, lunchAlerts: v })}
                reminderTime={prefs.lunchTime} onReminderTimeChange={(time) => savePrefs({ ...prefs, lunchTime: time })} />
              <NotificationPrefCard title="Dinner reminder" desc="Daily reminder before dinner service."
                icon={Moon} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
                checked={prefs.dinnerAlerts} onCheckedChange={(v) => savePrefs({ ...prefs, dinnerAlerts: v })}
                reminderTime={prefs.dinnerTime} onReminderTimeChange={(time) => savePrefs({ ...prefs, dinnerTime: time })} />
              <NotificationPrefCard title="Low stock alerts" desc="Notify when an inventory item drops below minimum stock."
                icon={Package} iconClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
                checked={prefs.lowStock} onCheckedChange={(v) => savePrefs({ ...prefs, lowStock: v })} />
              <NotificationPrefCard title="Weekly summary" desc="Receive a weekly attendance and meal summary."
                icon={StickyNote} iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
                checked={prefs.weeklyReport} onCheckedChange={(v) => savePrefs({ ...prefs, weeklyReport: v })} />
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-xl bg-primary/10 p-3 text-xs font-medium text-primary sm:p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0">You will receive notifications based on the above preferences.</p>
            </div>
          </section>
        </TabsContent>

        {/* APPEARANCE TAB */}
        <TabsContent value="appearance" className="mt-5">
          <div className="grid min-w-0 max-w-xl gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
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
        <TabsContent value="software-information" className="mt-5">
          <div className="grid min-w-0 gap-5">

            {/* App identity banner */}
            <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/20">
                    <Utensils className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight">MessMate</h2>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">v1.0.0</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">Mess Management System · Build 1001</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Developed by <span className="font-semibold text-foreground">WebNxt</span>{" · "}Released 27 June 2026
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    <span className="text-xs font-semibold text-success dark:text-success">All systems operational</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Live usage stats */}
            <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <UsageStat icon={TrendingUp} label="Active Members" value={memberCount} suffix={`/ ${MAX_MEMBERS}`}
                color="text-blue-500" bgColor="bg-blue-500/10" progress={memberUsagePct} progressColor="bg-blue-500" />
              <UsageStat icon={Activity} label="Total Expenses"
                value={`₹${(liveStats?.totalExpenses ?? 0).toLocaleString("en-IN")}`}
                color="text-emerald-500" bgColor="bg-emerald-500/10" />
              <UsageStat icon={CheckCheck} label="Today's Attendance" value={liveStats?.todayAttendance ?? 0} suffix=" records"
                color="text-violet-500" bgColor="bg-violet-500/10" />
              <UsageStat icon={Package} label="Inventory Items" value={liveStats?.totalInventory ?? 0}
                badge={liveStats?.lowStockCount ? `${liveStats.lowStockCount} low stock` : undefined}
                badgeColor="text-amber-600 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400"
                color="text-amber-500" bgColor="bg-amber-500/10" />
            </section>

            {/* Subscription card */}
            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="min-w-0 text-base font-semibold">Subscription</h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                  <span className="text-[11px] font-semibold text-success dark:text-success">Active</span>
                </div>
              </div>

              {/* Plan tier selection display */}
              <div className="grid gap-4 sm:grid-cols-3">
                {(["Basic", "Pro", "Enterprise"] as const).map((plan) => {
                  const active = plan === currentPlan;
                  return (
                    <div key={plan} className={`relative rounded-xl border p-4 transition-all ${active ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card/50 opacity-50"}`}>
                      {active && (
                        <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Current</span>
                      )}
                      <div className="flex items-center gap-2">
                        {plan === "Basic" && <Zap className="h-4 w-4 text-muted-foreground" />}
                        {plan === "Pro" && <Star className="h-4 w-4 text-primary" />}
                        {plan === "Enterprise" && <Globe className="h-4 w-4 text-muted-foreground" />}
                        <span className={`text-sm font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{plan}</span>
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
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subscription period</span>
                  <span className="font-semibold text-foreground">{daysLeft} days remaining</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${subscriptionPct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
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
            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Server className="h-5 w-5" />
                </div>
                <h2 className="min-w-0 text-base font-semibold">System Information</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />Database Status
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex h-2 w-2 rounded-full ${dbConnected === null ? "bg-muted animate-pulse" : dbConnected ? "bg-success" : "bg-destructive"}`} />
                    <span className="text-sm font-semibold">
                      {dbConnected === null ? "Checking…" : dbConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" />Database
                  </div>
                  <div className="mt-2 text-sm font-semibold">Supabase PostgreSQL</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">v15 · Realtime enabled</div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5" />Logged-in User
                  </div>
                  <div className="mt-2 text-sm font-semibold">{profile.name || "Admin User"}</div>
                  <div className="mt-0.5 max-w-full truncate text-[11px] text-muted-foreground">{profile.email}</div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5" />Runtime
                  </div>
                  <div className="mt-2 text-sm font-semibold">React 19 · Vite</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">TanStack Router + Query</div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Wifi className="h-3.5 w-3.5" />Last Backup
                  </div>
                  <div className="mt-2 text-sm font-semibold">{lastBackupDate}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">Manual export via Backup &amp; Export</div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />Local Time
                  </div>
                  <div className="mt-2 text-sm font-semibold">{formatDateTime(now)}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">India Standard Time (UTC+5:30)</div>
                </div>
              </div>
            </section>

            {/* About + Changelog */}
            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h2 className="min-w-0 text-base font-semibold">About MessMate</h2>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
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

              <div className="rounded-xl border border-border bg-muted/30 p-4">
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
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
        )}
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </div>
      {progress !== undefined && progressColor && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">{progress}% of limit used</div>
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
    <div className="flex min-w-0 gap-3 rounded-xl border border-border p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`mt-1 break-all text-sm font-semibold ${mono ? "font-mono tracking-tight" : ""}`}>{value}</div>
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
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
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
    <div className="grid min-w-0 gap-4 rounded-xl border border-border bg-card/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="flex min-w-0 items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${iconClassName}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="break-words text-sm font-semibold">{title}</div>
          <div className="mt-1 break-words text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-8">
        {reminderTime && onReminderTimeChange ? (
          <div className="grid min-w-36 gap-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Reminder time</Label>
            <Select value={reminderTime} onValueChange={onReminderTimeChange}>
              <SelectTrigger className="h-10 w-36 rounded-lg bg-background text-xs font-medium">
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
