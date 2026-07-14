import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Box,
  IndianRupee,
  AlertTriangle,
  ShieldAlert,
  Utensils,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — MessMate" }] }),
  component: InventoryPage,
});

type Category = "food" | "utensil" | "asset" | "all";
type MovementType = "stock_in" | "stock_out" | "damage" | "missing";

type Item = {
  id: string;
  name: string;
  category: "food" | "utensil" | "asset";
  subcategory: string | null;
  unit: string;
  total_qty: number;
  available_qty: number;
  damaged_qty: number;
  missing_qty: number;
  min_qty: number;
  unit_price: number;
};

type Movement = {
  id: string;
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  total_cost: number | null;
  supplier: string | null;
  used_by: string | null;
  purpose: string | null;
  occurred_at: string;
  inventory_items?: { name: string; category: string; unit: string } | null;
};

function InventoryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Category>("food");
  const [search, setSearch] = useState("");
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: Item | null }>({ open: false, item: null });
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; type: MovementType; item: Item | null }>({ open: false, type: "stock_in", item: null });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("inventory_items").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const { data: movements = [] } = useQuery<Movement[]>({
    queryKey: ["inventory_movements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inventory_movements")
        .select("*, inventory_items(name, category, unit)")
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
  });

  const stats = useMemo(() => {
    const total = items.reduce((a, i) => a + Number(i.total_qty), 0);
    const value = items.reduce((a, i) => a + Number(i.available_qty) * Number(i.unit_price), 0);
    const low = items.filter((i) => Number(i.available_qty) > 0 && Number(i.available_qty) <= Number(i.min_qty)).length;
    const out = items.filter((i) => Number(i.available_qty) <= 0).length;
    const assets = items.filter((i) => i.category !== "food").reduce((a, i) => a + Number(i.total_qty), 0);
    return { total, value, low, out, assets };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchTab = tab === "all" || i.category === tab;
      const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.subcategory ?? "").toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [items, tab, search]);

  const lowStockAlerts = useMemo(
    () => items.filter((i) => Number(i.available_qty) <= Number(i.min_qty)).slice(0, 6),
    [items],
  );

  const recentIn = movements.filter((m) => m.movement_type === "stock_in").slice(0, 5);
  const recentOut = movements.filter((m) => m.movement_type !== "stock_in").slice(0, 5);

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-enter flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Inventory</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Manage food stock, utensils, and other mess inventory</p>
          </div>
          <Button onClick={() => setItemDialog({ open: true, item: null })} className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold h-9 shadow-sm">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard icon={Box} label="Total Items" value={items.length} sub="All inventory items" tone="emerald" />
          <KpiCard icon={IndianRupee} label="Stock Value" value={`₹${stats.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} sub="Current inventory value" tone="sky" />
          <KpiCard icon={AlertTriangle} label="Low Stock" value={stats.low} sub="Below minimum level" tone="amber" />
          <KpiCard icon={ShieldAlert} label="Out of Stock" value={stats.out} sub="Needs attention" tone="rose" />
          <KpiCard icon={Utensils} label="Total Assets" value={stats.assets} sub="Utensils and assets" tone="violet" />
        </div>
      </header>

      <div className="grid flex-1 gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* MAIN */}
        <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 bg-card">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Category)}>
              <TabsList className="bg-secondary rounded-xl h-9">
                <TabsTrigger value="food" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm">Food Stock</TabsTrigger>
                <TabsTrigger value="utensil" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm">Utensils &amp; Assets</TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-[12px] data-[state=active]:bg-card data-[state=active]:shadow-sm">All Items</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="h-9 pl-9 rounded-xl bg-background text-[13px] border-input focus-visible:ring-primary text-foreground" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Item Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Available</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Damaged</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Missing</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unit</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((i) => {
                  const status = Number(i.available_qty) <= 0
                    ? { label: "Out of Stock", className: "bg-red-500/10 text-red-500 border border-red-500/20" }
                    : Number(i.available_qty) <= Number(i.min_qty)
                    ? { label: "Low Stock", className: "bg-amber-500/10 text-amber-500 border border-amber-500/20" }
                    : { label: "Good", className: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" };
                  return (
                    <tr key={i.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-[13px] font-medium text-foreground">{i.name}</td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground capitalize">{i.subcategory ?? i.category}</td>
                      <td className="px-4 py-3 text-right text-[13px] text-muted-foreground">{i.total_qty}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-emerald-500">{i.available_qty}</td>
                      <td className="px-4 py-3 text-right text-[13px] text-amber-500">{i.damaged_qty}</td>
                      <td className="px-4 py-3 text-right text-[13px] text-red-500">{i.missing_qty}</td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">{i.unit}</td>
                      <td className="px-4 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", status.className)}>{status.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => setItemDialog({ open: true, item: i })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500" onClick={() => { if (confirm(`Delete ${i.name}?`)) deleteItem.mutate(i.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                          <Box className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-[13px] font-medium text-foreground">No inventory items</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">Add some items or change your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SIDE */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-amber-500/10">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <h3 className="text-[13px] font-semibold text-foreground">Low Stock Alerts</h3>
            </div>
            <ul className="space-y-1.5">
              {lowStockAlerts.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 p-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{i.name}</div>
                    <div className="text-[11px] text-muted-foreground">{i.available_qty} {i.unit} left</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-500">Min: {i.min_qty}</span>
                </li>
              ))}
              {lowStockAlerts.length === 0 && (
                <li className="py-4 text-center text-[12px] text-muted-foreground/70">All items stocked up ✓</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={ArrowDownToLine} label="Stock In" desc="Add new stock" tone="bg-emerald-500/10 text-emerald-500 border-emerald-500/20" onClick={() => setMoveDialog({ open: true, type: "stock_in", item: items[0] ?? null })} />
              <QuickAction icon={ArrowUpFromLine} label="Stock Out" desc="Record usage" tone="bg-red-500/10 text-red-500 border-red-500/20" onClick={() => setMoveDialog({ open: true, type: "stock_out", item: items[0] ?? null })} />
              <QuickAction icon={ArrowUpFromLine} label="Damage" desc="Report damage" tone="bg-orange-500/10 text-orange-500 border-orange-500/20" onClick={() => setMoveDialog({ open: true, type: "damage", item: items[0] ?? null })} />
              <QuickAction icon={Wrench} label="Missing" desc="Report missing" tone="bg-amber-500/10 text-amber-500 border-amber-500/20" onClick={() => setMoveDialog({ open: true, type: "missing", item: items[0] ?? null })} />
            </div>
          </div>
        </aside>
      </div>

      {/* Recent movements */}
      <div className="grid gap-5 p-6 pt-0 lg:grid-cols-2">
        <RecentList title="Recent Stock In" icon={ArrowDownToLine} tone="text-emerald-500" rows={recentIn} columns={["Date", "Item", "Quantity", "Supplier", "Total Cost"]}
          render={(m) => [
            new Date(m.occurred_at).toLocaleDateString("en-GB"),
            m.inventory_items?.name ?? "—",
            `${m.quantity} ${m.inventory_items?.unit ?? ""}`,
            m.supplier ?? "—",
            m.total_cost != null ? `₹${m.total_cost}` : "—",
          ]} />
        <RecentList title="Recent Stock Out" icon={ArrowUpFromLine} tone="text-rose-500" rows={recentOut} columns={["Date", "Item", "Quantity Used", "Used By", "Purpose"]}
          render={(m) => [
            new Date(m.occurred_at).toLocaleDateString("en-GB"),
            m.inventory_items?.name ?? "—",
            `${m.quantity} ${m.inventory_items?.unit ?? ""}`,
            m.used_by ?? "—",
            m.purpose ?? String(m.movement_type).replace("_", " "),
          ]} />
      </div>

      <ItemDialog
        open={itemDialog.open}
        onOpenChange={(v) => setItemDialog({ open: v, item: v ? itemDialog.item : null })}
        item={itemDialog.item}
        onSaved={() => qc.invalidateQueries({ queryKey: ["inventory_items"] })}
      />
      <MovementDialog
        open={moveDialog.open}
        onOpenChange={(v) => setMoveDialog((s) => ({ ...s, open: v }))}
        type={moveDialog.type}
        items={items}
        defaultItem={moveDialog.item}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["inventory_items"] });
          qc.invalidateQueries({ queryKey: ["inventory_movements"] });
        }}
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub: string; tone: "emerald" | "sky" | "amber" | "rose" | "violet" }) {
  const map = {
    emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-500", border: "border-emerald-500/20" },
    sky:     { bg: "bg-sky-500/10",     icon: "text-sky-500",     border: "border-sky-500/20" },
    amber:   { bg: "bg-amber-500/10",   icon: "text-amber-500",   border: "border-amber-500/20" },
    rose:    { bg: "bg-red-500/10",     icon: "text-red-500",     border: "border-red-500/20" },
    violet:  { bg: "bg-violet-500/10",  icon: "text-violet-500",  border: "border-violet-500/20" },
  } as const;
  const t = map[tone];
  return (
    <div className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card card-hover cursor-default">
      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-transform duration-200 group-hover:scale-105", t.bg, t.border)}>
        <Icon className={cn("h-5 w-5", t.icon)} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-xl font-bold text-foreground">{value}</div>
        <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, tone, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; tone: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-start gap-2 rounded-xl border p-2.5 text-left transition-all duration-150 hover:shadow-sm hover:scale-[1.02] bg-card hover:bg-accent", tone)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold">{label}</div>
        <div className="truncate text-[10px] opacity-70">{desc}</div>
      </div>
    </button>
  );
}

function RecentList<T>({ title, icon: Icon, tone, rows, columns, render }: { title: string; icon: React.ComponentType<{ className?: string }>; tone: string; rows: T[]; columns: string[]; render: (row: T) => (string | number)[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-4 bg-card">
        <Icon className={cn("h-4 w-4", tone)} />
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-card/80 backdrop-blur-sm border-b border-border">
            <tr>{columns.map((c) => <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r, i) => {
              const cells = render(r);
              return <tr key={i} className="hover:bg-muted/50 transition-colors">{cells.map((c, j) => <td key={j} className="px-4 py-2.5 text-[13px] text-foreground">{c}</td>)}</tr>;
            })}
            {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-[13px] text-muted-foreground">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemDialog({ open, onOpenChange, item, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; item: Item | null; onSaved: () => void }) {
  const empty = { name: "", category: "utensil" as "food" | "utensil" | "asset", subcategory: "", unit: "Pieces", total_qty: 0, available_qty: 0, damaged_qty: 0, missing_qty: 0, min_qty: 0, unit_price: 0 };
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  // sync form when item changes
  useMemo(() => {
    if (item) {
      setForm({
        name: item.name,
        category: item.category,
        subcategory: item.subcategory ?? "",
        unit: item.unit,
        total_qty: Number(item.total_qty),
        available_qty: Number(item.available_qty),
        damaged_qty: Number(item.damaged_qty),
        missing_qty: Number(item.missing_qty),
        min_qty: Number(item.min_qty),
        unit_price: Number(item.unit_price),
      });
    } else {
      setForm(empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, open]);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = { ...form, subcategory: form.subcategory || null };
    const q = item
      ? (supabase as any).from("inventory_items").update(payload).eq("id", item.id)
      : (supabase as any).from("inventory_items").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(item ? "Item updated" : "Item added");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? "Edit Item" : "Add Inventory Item"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Item name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Item["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food Stock</SelectItem>
                  <SelectItem value="utensil">Utensil</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Subcategory</Label><Input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="e.g. Grains, Bowls" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Unit *</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Pieces, Kg, Litre" /></div>
            <div className="grid gap-1.5"><Label>Unit price (Rs)</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField label="Total qty" value={form.total_qty} onChange={(v) => setForm({ ...form, total_qty: v })} />
            <NumberField label="Available qty" value={form.available_qty} onChange={(v) => setForm({ ...form, available_qty: v })} />
            <NumberField label="Min qty (alert)" value={form.min_qty} onChange={(v) => setForm({ ...form, min_qty: v })} />
            <NumberField label="Damaged" value={form.damaged_qty} onChange={(v) => setForm({ ...form, damaged_qty: v })} />
            <NumberField label="Missing" value={form.missing_qty} onChange={(v) => setForm({ ...form, missing_qty: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : item ? "Save changes" : "Add item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function MovementDialog({ open, onOpenChange, type, items, defaultItem, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; type: MovementType; items: Item[]; defaultItem: Item | null; onSaved: () => void }) {
  const [itemId, setItemId] = useState<string>(defaultItem?.id ?? "");
  const [qty, setQty] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [supplier, setSupplier] = useState("");
  const [usedBy, setUsedBy] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    setItemId(defaultItem?.id ?? items[0]?.id ?? "");
    setQty(0); setCost(0); setSupplier(""); setUsedBy(""); setPurpose("");
    setDate(new Date().toISOString().slice(0, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  const title = type === "stock_in" ? "Stock In" : type === "stock_out" ? "Stock Out" : type === "damage" ? "Report Damage" : "Report Missing";

  const save = async () => {
    if (!itemId) return toast.error("Select an item");
    if (qty <= 0) return toast.error("Quantity must be greater than 0");
    setSaving(true);
    const item = items.find((i) => i.id === itemId)!;

    // Update item quantities
    let updates: Partial<Item> = {};
    if (type === "stock_in") {
      updates = { total_qty: Number(item.total_qty) + qty, available_qty: Number(item.available_qty) + qty };
    } else if (type === "stock_out") {
      updates = { available_qty: Math.max(0, Number(item.available_qty) - qty) };
    } else if (type === "damage") {
      updates = { damaged_qty: Number(item.damaged_qty) + qty, available_qty: Math.max(0, Number(item.available_qty) - qty) };
    } else if (type === "missing") {
      updates = { missing_qty: Number(item.missing_qty) + qty, available_qty: Math.max(0, Number(item.available_qty) - qty) };
    }

    const { error: e1 } = await (supabase as any).from("inventory_items").update(updates).eq("id", itemId);
    if (e1) { setSaving(false); return toast.error(e1.message); }

    const { error: e2 } = await (supabase as any).from("inventory_movements").insert({
      item_id: itemId,
      movement_type: type,
      quantity: qty,
      total_cost: type === "stock_in" ? cost || qty * Number(item.unit_price) : null,
      supplier: type === "stock_in" ? supplier || null : null,
      used_by: type !== "stock_in" ? usedBy || null : null,
      purpose: type !== "stock_in" ? purpose || null : null,
      occurred_at: date,
    });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success(`${title} recorded`);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Item *</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.available_qty} {i.unit})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Quantity *</Label><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
            <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          {type === "stock_in" ? (
            <>
              <div className="grid gap-1.5"><Label>Supplier</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Sharma Traders" /></div>
              <div className="grid gap-1.5"><Label>Total cost (Rs)</Label><Input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></div>
            </>
          ) : (
            <>
              <div className="grid gap-1.5"><Label>Used by</Label><Input value={usedBy} onChange={(e) => setUsedBy(e.target.value)} placeholder="Mess Staff" /></div>
              <div className="grid gap-1.5"><Label>Purpose</Label><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Lunch / Dinner / Maintenance" /></div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
