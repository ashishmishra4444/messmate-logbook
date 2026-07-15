import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { usePurchaseOrder, useUpdatePurchaseOrderStatus, useCreateGoodsReceipt } from "@/lib/api-procurement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Package, Truck, Calendar, DollarSign, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/procurement-pos/$poId")({
  head: () => ({ meta: [{ title: "PO Details — MessMate" }] }),
  component: PODetailPage,
});

function PODetailPage() {
  const { poId } = useParams({ strict: false });
  const { data: po, isLoading } = usePurchaseOrder(poId as string);
  const updateStatus = useUpdatePurchaseOrderStatus();
  const createGRN = useCreateGoodsReceipt();
  const router = useRouter();

  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [receipts, setReceipts] = useState<Record<string, { accepted: number; damaged: number; rejected: number; remarks: string }>>({});

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading PO Details...</div>;
  if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found</div>;

  const handleStatusChange = (newStatus: any) => {
    updateStatus.mutate({ id: po.id, status: newStatus });
  };

  const handleGRNSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items = po.items.map((item: any) => ({
      po_item_id: item.id,
      item_id: item.item_id,
      received_quantity: (receipts[item.id]?.accepted || 0) + (receipts[item.id]?.damaged || 0) + (receipts[item.id]?.rejected || 0),
      accepted_quantity: receipts[item.id]?.accepted || 0,
      damaged_quantity: receipts[item.id]?.damaged || 0,
      notes: receipts[item.id]?.remarks || null
    })).filter((i: any) => i.received_quantity > 0);

    if (items.length === 0) return;

    createGRN.mutate({
      poId: po.id,
      grn: {
        grn_number: `GRN-${new Date().getTime().toString().slice(-6)}`,
        po_id: po.id,
        date: new Date().toISOString(),
        status: 'received'
      },
      items
    }, {
      onSuccess: () => {
        setGrnModalOpen(false);
      }
    });
  };

  // Timeline UI calculation
  const timelineStages = ['draft', 'submitted', 'approved', 'ordered', 'partially_received', 'completed'];
  const currentStageIndex = timelineStages.indexOf(po.status);

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.history.back()} className="h-10 w-10 bg-background border shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{po.po_number}</h1>
                <Badge variant="outline" className="bg-white uppercase text-[10px] tracking-wider">{po.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Vendor: <span className="font-semibold text-foreground">{po.vendor?.name}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {po.status === 'draft' && <Button onClick={() => handleStatusChange('submitted')} variant="outline">Submit for Approval</Button>}
            {po.status === 'submitted' && <Button onClick={() => handleStatusChange('approved')} className="bg-emerald-600 hover:bg-emerald-700">Approve PO</Button>}
            {po.status === 'approved' && <Button onClick={() => handleStatusChange('ordered')} className="bg-indigo-600 hover:bg-indigo-700">Mark as Ordered</Button>}
            {(po.status === 'ordered' || po.status === 'partially_received') && (
              <Dialog open={grnModalOpen} onOpenChange={setGrnModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700"><Truck className="mr-2 h-4 w-4" /> Receive Goods (GRN)</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-indigo-500" /> Goods Receipt Note</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleGRNSubmit} className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Ordered</TableHead>
                          <TableHead>Accepted Qty</TableHead>
                          <TableHead>Damaged</TableHead>
                          <TableHead>Rejected</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.inventory_item?.name} <span className="text-xs text-muted-foreground">({item.inventory_item?.unit})</span></TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Input type="number" min={0} max={item.quantity} className="w-24 h-8" value={receipts[item.id]?.accepted || ''} onChange={(e) => setReceipts({...receipts, [item.id]: {...receipts[item.id], accepted: Number(e.target.value)}})} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min={0} className="w-20 h-8" value={receipts[item.id]?.damaged || ''} onChange={(e) => setReceipts({...receipts, [item.id]: {...receipts[item.id], damaged: Number(e.target.value)}})} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" min={0} className="w-20 h-8" value={receipts[item.id]?.rejected || ''} onChange={(e) => setReceipts({...receipts, [item.id]: {...receipts[item.id], rejected: Number(e.target.value)}})} />
                            </TableCell>
                            <TableCell>
                              <Input className="w-full h-8" placeholder="Notes..." value={receipts[item.id]?.remarks || ''} onChange={(e) => setReceipts({...receipts, [item.id]: {...receipts[item.id], remarks: e.target.value}})} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                      <Button variant="outline" type="button" onClick={() => setGrnModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createGRN.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                        {createGRN.isPending ? "Processing..." : "Confirm Goods Receipt"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {po.status !== 'completed' && po.status !== 'cancelled' && <Button onClick={() => handleStatusChange('cancelled')} variant="destructive">Cancel PO</Button>}
          </div>
        </header>

        {/* Procurement Timeline */}
        <div className="mb-8 bg-card border border-border rounded-xl p-6 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px]">
            {['Draft', 'Submitted', 'Approved', 'Ordered', 'Receiving', 'Completed'].map((stage, idx) => {
              const isCompleted = currentStageIndex >= idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div key={stage} className="flex flex-col items-center relative z-10 w-full">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 bg-card transition-colors duration-300
                    ${isCompleted ? 'border-indigo-600 text-indigo-600' : 'border-muted text-muted-foreground'}
                    ${isCurrent ? 'bg-indigo-50 ring-4 ring-indigo-500/20' : ''}
                  `}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-2.5 w-2.5 rounded-full bg-current" />}
                  </div>
                  <span className={`mt-3 text-xs font-medium uppercase tracking-wider ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{stage}</span>
                  {idx < 5 && (
                    <div className={`absolute top-4 left-[50%] w-full h-0.5 -z-10 ${currentStageIndex > idx ? 'bg-indigo-600' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Ordered Items
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.inventory_item?.name} <span className="text-xs text-muted-foreground">({item.inventory_item?.unit})</span></TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.unit_price}</TableCell>
                      <TableCell className="text-right font-medium">₹{item.total_price}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/10 font-bold">
                    <TableCell colSpan={3} className="text-right uppercase text-xs tracking-wider text-muted-foreground">Total Value</TableCell>
                    <TableCell className="text-right text-lg text-indigo-600">₹{po.total_amount}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {po.receipts && po.receipts.length > 0 && (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Receipt History (GRNs)
                </div>
                <div className="p-0">
                  {po.receipts.map((grn: any) => (
                    <div key={grn.id} className="p-4 border-b last:border-0 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{grn.grn_number}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(grn.date), "PPP p")}</div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Processed</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2 mb-2"><Store className="h-4 w-4 text-muted-foreground" /> Vendor Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Vendor Name</span>
                  <span className="font-medium text-right">{po.vendor?.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Contact Person</span>
                  <span className="font-medium text-right">{po.vendor?.contact_person || 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Mobile</span>
                  <span className="font-medium text-right">{po.vendor?.mobile || 'N/A'}</span>
                </div>
                <Button variant="outline" className="w-full mt-2" asChild>
                  <Link to={`/procurement-vendors/${po.vendor_id}`}>View Vendor Profile</Link>
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Order Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Created On</span>
                  <span className="font-medium text-right">{format(new Date(po.created_at), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Order Date</span>
                  <span className="font-medium text-right">{format(new Date(po.date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Payment Status</span>
                  <Badge variant="outline" className="uppercase text-[10px]">{po.payment_status}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Ensure lucide icon Store is imported since it's used
import { Store } from "lucide-react";
