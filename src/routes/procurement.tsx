import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Truck, Wallet, AlertTriangle, TrendingDown, Store, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth } from "date-fns";

export const Route = createFileRoute("/procurement")({
  head: () => ({ meta: [{ title: "Procurement Dashboard — MessMate" }] }),
  component: ProcurementDashboard,
});

function ProcurementDashboard() {
  const { data: pos = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("*, vendor:vendors(name)").order("created_at", { ascending: false });
      return data || [];
    }
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_items").select("*");
      return data || [];
    }
  });

  const { data: grns = [] } = useQuery({
    queryKey: ["goods_receipts"],
    queryFn: async () => {
      const { data } = await supabase.from("goods_receipts").select("*");
      return data || [];
    }
  });

  const pendingPOs = pos.filter(p => p.status === "draft" || p.status === "submitted" || p.status === "approved" || p.status === "ordered").length;
  
  const today = new Date().toISOString().split("T")[0];
  const todaysDeliveries = grns.filter(g => g.date.startsWith(today)).length;
  
  const thisMonth = startOfMonth(new Date());
  const monthlyPurchases = pos
    .filter(p => new Date(p.date) >= thisMonth && p.status !== "cancelled")
    .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const lowStockItems = inventory.filter(i => Number(i.available_qty) < Number(i.min_qty));

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Procurement Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage vendors, purchase orders, and receiving.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/procurement-vendors">
              <Button variant="outline"><Store className="mr-2 h-4 w-4" /> Vendors</Button>
            </Link>
            <Link to="/procurement-pos">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <FileText className="mr-2 h-4 w-4" /> Purchase Orders
              </Button>
            </Link>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4 text-indigo-500" /> Pending POs
            </div>
            <div className="mt-2 text-3xl font-bold">{pendingPOs}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Truck className="h-4 w-4 text-green-500" /> Today's Deliveries
            </div>
            <div className="mt-2 text-3xl font-bold">{todaysDeliveries}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4 text-blue-500" /> Monthly Purchases
            </div>
            <div className="mt-2 text-3xl font-bold">₹{monthlyPurchases.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-amber-500" /> Low Stock Items
            </div>
            <div className="mt-2 text-3xl font-bold">{lowStockItems.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Action Required (Low/Out of Stock)
              </h3>
            </div>
            <div className="p-0">
              {lowStockItems.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No immediate actions required. Stock levels are healthy.
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {lowStockItems.slice(0, 5).map(item => (
                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="font-medium text-[14px]">{item.name}</div>
                        <div className="text-[12px] text-muted-foreground mt-0.5">
                          <span className="text-red-500 font-semibold">{item.available_qty} {item.unit}</span> left (Min: {item.min_qty})
                        </div>
                      </div>
                      <Link to="/inventory">
                        <Button variant="outline" size="sm" className="text-[12px] h-8">
                          Reorder <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Recent Procurement Activity
              </h3>
            </div>
            <div className="p-0">
              {pos.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No recent activity.
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {pos.slice(0, 5).map(po => (
                    <li key={po.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="font-medium text-[14px]">{po.po_number}</div>
                        <div className="text-[12px] text-muted-foreground mt-0.5">
                          {po.vendor?.name} • {format(new Date(po.date), "MMM d")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[13px]">₹{po.total_amount}</div>
                        <div className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${po.status === 'completed' ? 'text-green-600' : 'text-indigo-500'}`}>
                          {po.status}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
