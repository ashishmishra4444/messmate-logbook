import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileBarChart,
  Utensils,
  Settings,
  Database,
  ChefHat,
  Boxes,
  LogOut,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const items = [
  { title: "Dashboard",    url: "/dashboard",    icon: LayoutDashboard },
  { title: "Members",      url: "/members",      icon: Users },
  { title: "Attendance",   url: "/attendance",   icon: ClipboardCheck },
  { title: "Expense",      url: "/expense",      icon: Wallet },
  { title: "Inventory",    url: "/inventory",    icon: Boxes },
  { title: "Reports",      url: "/reports",      icon: FileBarChart },
  { title: "Meal Summary", url: "/meal-summary", icon: Utensils },
  { title: "Settings",     url: "/settings",     icon: Settings },
  { title: "Backup & Export", url: "/backup",    icon: Database },
];

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const isActive = (url: string) =>
    pathname === url || (url === "/members" && pathname === "/");

  const { data: profile } = useQuery({
    queryKey: ["sidebar-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return data || { name: "Admin User", mess_name: "Mess Manager" };
    },
  });

  const initials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AU";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out from Supabase:", e);
    }
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("theme");
    localStorage.removeItem("messmate.profile");
    localStorage.removeItem("messmate.prefs");
    toast.success("Logged out successfully.");
    router.navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      {/* ── Brand Header ─────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/30">
            <ChefHat className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-bold tracking-tight text-white">MessMate</div>
            <div className="text-[11px] text-sidebar-foreground/50 truncate">
              {profile?.mess_name || "Mess Manager"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav Items ─────────────────────────────────── */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={[
                        "group relative h-9 rounded-lg text-[13px] font-medium transition-all duration-200 overflow-hidden",
                        active
                          ? "bg-gradient-to-r from-[#5B5CEB] to-[#6F72FF] text-white shadow-md shadow-[#5B5CEB]/25"
                          : "text-[#A9B4C8] bg-transparent hover:bg-[#5B5CEB]/10 hover:text-white",
                      ].join(" ")}
                    >
                      <Link to={item.url} onClick={() => setOpenMobile(false)} className="flex items-center gap-2 relative z-10 w-full h-full px-2">
                        {active && (
                          <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-sm bg-white/60 shadow-[1px_0_4px_rgba(255,255,255,0.3)]"></div>
                        )}
                        <div className={`grid place-items-center w-6 h-6 transition-all duration-200 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:rounded-full ${active ? 'group-data-[collapsible=icon]:bg-[#5B5CEB] group-data-[collapsible=icon]:shadow-md' : 'group-hover:group-data-[collapsible=icon]:scale-110'}`}>
                          <item.icon
                            style={{ width: 16, height: 16 }}
                            className={[
                              "shrink-0 transition-colors duration-200",
                              active ? "text-white" : "text-[#8D98AB] group-hover:text-[#5B5CEB]",
                            ].join(" ")}
                          />
                        </div>
                        <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Logout with confirmation */}
              <SidebarMenuItem className="mt-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Logout"
                      className="h-9 rounded-lg text-[13px] font-medium text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-150"
                    >
                      <LogOut style={{ width: 16, height: 16 }} className="opacity-70" />
                      <span>Logout</span>
                    </SidebarMenuButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign out of MessMate?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll be returned to the login page. Local preferences will be cleared.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sign out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Profile Footer ────────────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/20">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <div className="truncate text-[13px] font-medium text-sidebar-foreground">
                  {profile?.name || "Admin User"}
                </div>
                <div className="truncate text-[11px] text-sidebar-foreground/40">
                  Mess Administrator
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              {profile?.mess_name || "Mess Manager"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-500 focus:text-rose-600 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
