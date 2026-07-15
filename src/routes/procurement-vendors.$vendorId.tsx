import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Store, FileText, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/procurement-vendors/$vendorId")({
  head: () => ({ meta: [{ title: "Vendor Profile — MessMate" }] }),
  component: VendorProfilePage,
});

function VendorProfilePage() {
  const { vendorId } = useParams({ strict: false });
  const router = useRouter();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendors", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(`
          *,
          purchase_orders (
            *,
            receipts:goods_receipts(*)
          )
        `)
        .eq("id", vendorId as string)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading Vendor...</div>;
  if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found</div>;

  const pos = vendor.purchase_orders || [];
  const completedPOs = pos.filter((po: any) => po.status === 'completed');
  const outstandingPOs = pos.filter((po: any) => !['completed', 'cancelled', 'draft'].includes(po.status));
  
  // Calculate average delivery time (days from PO date to GRN date)
  let totalDeliveryDays = 0;
  let deliveryCount = 0;
  completedPOs.forEach((po: any) => {
    if (po.receipts && po.receipts.length > 0) {
      const poDate = new Date(po.date).getTime();
      const grnDate = new Date(po.receipts[0].date).getTime();
      const diffDays = Math.ceil((grnDate - poDate) / (1000 * 3600 * 24));
      if (diffDays >= 0) {
        totalDeliveryDays += diffDays;
        deliveryCount++;
      }
    }
  });
  const avgDeliveryTime = deliveryCount > 0 ? (totalDeliveryDays / deliveryCount).toFixed(1) : 'N/A';

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="h-10 w-10 bg-background border shadow-sm mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6 text-indigo-500" />
                <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> GST: {vendor.gst_number || 'N/A'}</span>
                <span>•</span>
                <span>Contact: {vendor.contact_person || 'N/A'} ({vendor.mobile || 'No Mobile'})</span>
                <span>•</span>
                <span>Email: {vendor.email || 'N/A'}</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Address: {vendor.address || 'N/A'}
              </div>
            </div>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Edit Profile</Button>
        </header>

        {/* Performance Analytics */}
        <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" /> Vendor Performance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" /> Avg Delivery Time
            </div>
            <div className="mt-2 text-3xl font-bold">{avgDeliveryTime} <span className="text-lg font-normal text-muted-foreground">days</span></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed Orders
            </div>
            <div className="mt-2 text-3xl font-bold">{completedPOs.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-indigo-500" /> Outstanding POs
            </div>
            <div className="mt-2 text-3xl font-bold">{outstandingPOs.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Store className="h-4 w-4 text-blue-500" /> Total Purchases
            </div>
            <div className="mt-2 text-3xl font-bold">{pos.length}</div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Purchase History
          </div>
          {pos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No purchase orders found for this vendor.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{format(new Date(po.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        po.status === 'completed' ? "border-green-200 bg-green-50 text-green-700" :
                        po.status === 'cancelled' ? "border-red-200 bg-red-50 text-red-700" :
                        "border-amber-200 bg-amber-50 text-amber-700"
                      }>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>₹{po.total_amount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/procurement-pos/${po.id}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </main>
  );
}
