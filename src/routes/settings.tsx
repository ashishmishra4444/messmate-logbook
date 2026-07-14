import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
const currentSubscriptionStatus = "Active";
const subscriptionStartDate = "27 June 2026";
const subscriptionExpiryDate = "27 June 2027";
const licenseId = "MM-SUB-1001";
const lastBackupDate = "27 June 2026";

function SettingsPage() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem("theme") === "dark";
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    try {
      const p = localStorage.getItem("messmate.profile");
      if (p) setProfile({ ...defaultProfile, ...JSON.parse(p) });
      const pr = localStorage.getItem("messmate.prefs");
      if (pr) setPrefs({ ...defaultPrefs, ...JSON.parse(pr) });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleTheme = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("theme", v ? "dark" : "light");
  };

  const saveProfile = () => {
    if (!profile.name.trim()) return toast.error("Name is required");
    localStorage.setItem("messmate.profile", JSON.stringify(profile));
    toast.success("Profile updated");
  };

  const savePrefs = (next: Prefs) => {
    setPrefs(next);
    localStorage.setItem("messmate.prefs", JSON.stringify(next));
  };

  const changePassword = () => {
    if (!pw.current || !pw.next) return toast.error("Fill current and new password");
    if (pw.next.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    toast.success("Password updated");
    setPw({ current: "", next: "", confirm: "" });
  };

  const logout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("messmate.profile");
    localStorage.removeItem("messmate.prefs");
    toast.success("Logged out successfully.");
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-w-0 overflow-x-hidden p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, security and preferences
        </p>
      </header>

      <Tabs defaultValue="profile" className="min-w-0 w-full">
        <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="software-information" className="gap-2">
            <Info className="h-4 w-4" />
            Software Information
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <div className="grid min-w-0 max-w-2xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Profile information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" icon={User}>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </Field>
              <Field label="Mess name" icon={Building2}>
                <Input
                  value={profile.messName}
                  onChange={(e) => setProfile({ ...profile, messName: e.target.value })}
                />
              </Field>
              <Field label="Email" icon={Mail}>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={profile.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={saveProfile} className="gap-2">
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-5">
          <div className="grid min-w-0 max-w-xl gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Change password</h2>
            <Field label="Current password">
              <Input
                type="password"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password">
                <Input
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={changePassword} className="gap-2">
                <Lock className="h-4 w-4" /> Update password
              </Button>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
              <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Sign out</h3>
              <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/70">
                End your current session on this device.
              </p>
              <Button variant="destructive" className="mt-3 gap-2" onClick={logout}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Notification preferences</h2>
            <div className="grid min-w-0 gap-3">
              <NotificationPrefCard
                title="Breakfast reminder"
                desc="Daily reminder before breakfast service."
                icon={Coffee}
                iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                checked={prefs.breakfastAlerts}
                onCheckedChange={(v) => savePrefs({ ...prefs, breakfastAlerts: v })}
                reminderTime={prefs.breakfastTime}
                onReminderTimeChange={(time) => savePrefs({ ...prefs, breakfastTime: time })}
              />
              <NotificationPrefCard
                title="Lunch reminder"
                desc="Daily reminder before lunch service."
                icon={Sun}
                iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300"
                checked={prefs.lunchAlerts}
                onCheckedChange={(v) => savePrefs({ ...prefs, lunchAlerts: v })}
                reminderTime={prefs.lunchTime}
                onReminderTimeChange={(time) => savePrefs({ ...prefs, lunchTime: time })}
              />
              <NotificationPrefCard
                title="Dinner reminder"
                desc="Daily reminder before dinner service."
                icon={Moon}
                iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
                checked={prefs.dinnerAlerts}
                onCheckedChange={(v) => savePrefs({ ...prefs, dinnerAlerts: v })}
                reminderTime={prefs.dinnerTime}
                onReminderTimeChange={(time) => savePrefs({ ...prefs, dinnerTime: time })}
              />
              <NotificationPrefCard
                title="Low stock alerts"
                desc="Notify when an inventory item drops below the minimum stock level."
                icon={Package}
                iconClassName="bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
                checked={prefs.lowStock}
                onCheckedChange={(v) => savePrefs({ ...prefs, lowStock: v })}
              />
              <NotificationPrefCard
                title="Weekly summary"
                desc="Receive a weekly attendance and meal summary."
                icon={StickyNote}
                iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
                checked={prefs.weeklyReport}
                onCheckedChange={(v) => savePrefs({ ...prefs, weeklyReport: v })}
              />
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-xl bg-primary/10 p-3 text-xs font-medium text-primary sm:p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0">
                You will receive notifications based on the above preferences.
              </p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <div className="grid min-w-0 max-w-xl gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {dark ? (
                  <Moon className="h-5 w-5 shrink-0" />
                ) : (
                  <Sun className="h-5 w-5 shrink-0" />
                )}
                <div className="min-w-0">
                  <Label className="text-base">Dark mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Switch the entire app to a darker theme.
                  </p>
                </div>
              </div>
              <Switch checked={dark} onCheckedChange={toggleTheme} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="software-information" className="mt-5">
          <div className="grid min-w-0 gap-5">
            <InfoCard
              title="Software Information"
              icon={Info}
              items={[
                { label: "Software Name", value: "MessMate" },
                { label: "Software Version", value: "v1.0.0" },
                { label: "Build Version", value: "Build 1001" },
                { label: "Release Date", value: "27 June 2026" },
                { label: "Company Name", value: "WebNxt" },
                { label: "Developed By", value: "WebNxt" },
              ]}
            />

            <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <SectionTitle title="SaaS Subscription" icon={ShieldCheck} />
              <div className="grid gap-4 lg:grid-cols-2">
                <OptionGroup
                  label="Plan Tier"
                  options={["Basic", "Pro", "Enterprise"]}
                  current={currentPlan}
                />
                <OptionGroup
                  label="Subscription Status"
                  options={["Active", "Expired", "Trial"]}
                  current={currentSubscriptionStatus}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoTile
                  icon={CalendarDays}
                  label="Subscription Start Date"
                  value={subscriptionStartDate}
                />
                <InfoTile
                  icon={CalendarDays}
                  label="Subscription Expiry Date"
                  value={subscriptionExpiryDate}
                />
                <InfoTile icon={Clock} label="Days Remaining" value={`${daysRemaining()} days`} />
                <InfoTile icon={FileBadge} label="License / Subscription ID" value={licenseId} />
              </div>
            </section>

            <InfoCard
              title="System Information"
              icon={Server}
              items={[
                { label: "Database Status", value: "Connected" },
                { label: "Database Version", value: "MySQL 8.0" },
                { label: "Current Logged-in User", value: profile.name || "Admin User" },
                { label: "Last Backup Date", value: lastBackupDate },
                { label: "Current Date & Time", value: formatDateTime(now) },
              ]}
            />

            <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <SectionTitle title="About MessMate" icon={CheckCircle2} />
              <p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">
                MessMate is a smart Mess Management System designed to manage members, attendance,
                inventory, expenses, billing, reports, backups, and daily mess operations.
              </p>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="min-w-0 text-base font-semibold">{title}</h2>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  items,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; value: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <SectionTitle title={title} icon={icon} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <InfoRow key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function OptionGroup({
  label,
  options,
  current,
}: {
  label: string;
  options: string[];
  current: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border p-4">
      <div className="mb-3 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === current;
          return (
            <span
              key={option}
              className={
                active
                  ? "rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
              }
            >
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-border p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 break-words text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function daysRemaining() {
  const today = new Date();
  const expiry = new Date(2027, 5, 27);
  const milliseconds = expiry.getTime() - today.getTime();
  return Math.max(0, Math.ceil(milliseconds / 86_400_000));
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
  "06:00 AM",
  "06:30 AM",
  "07:00 AM",
  "07:30 AM",
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
  "08:30 PM",
  "09:00 PM",
];

function NotificationPrefCard({
  title,
  desc,
  icon: Icon,
  iconClassName,
  checked,
  onCheckedChange,
  reminderTime,
  onReminderTimeChange,
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
                {reminderTimes.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
