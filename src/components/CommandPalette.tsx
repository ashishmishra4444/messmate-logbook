import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, Users, Package, Wallet, FileText, Settings, Plus, LayoutDashboard, Utensils } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/" }))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/members" }))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Members</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/inventory" }))}>
            <Package className="mr-2 h-4 w-4" />
            <span>Inventory</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/procurement" }))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Procurement</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/billing" }))}>
            <Wallet className="mr-2 h-4 w-4" />
            <span>Billing & Invoices</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/settings" }))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/members" }))}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create New Member</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/procurement" }))}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create Purchase Order</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.navigate({ to: "/guest-meals" }))}>
            <Utensils className="mr-2 h-4 w-4" />
            <span>Log Guest Meal</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
