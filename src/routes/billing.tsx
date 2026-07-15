import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { 
  Receipt, Plus, FileText, CheckCircle2, AlertCircle, Clock, Search, Wallet, FileBarChart, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBillingCycles, useBillingRecords, useGenerateBillingCycle, useDeleteBillingCycle } from "@/lib/api-billing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing & Invoices — MessMate" }] }),
  component: BillingPage,
});

function BillingPage() {
  const queryClient = useQueryClient();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateData, setGenerateData] = useState({
    monthName: format(new Date(), "MMMM yyyy"),
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
    endDate: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd")
  });

  const { data: cycles, isLoading: loadingCycles } = useBillingCycles();
  const { data: records, isLoading: loadingRecords } = useBillingRecords(selectedCycleId || undefined);
  const generateCycle = useGenerateBillingCycle();
  const deleteCycle = useDeleteBillingCycle();

  // If no cycle selected and we have cycles, select the first one
  if (!selectedCycleId && cycles && cycles.length > 0) {
    setSelectedCycleId(cycles[0].id);
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    generateCycle.mutate(generateData, {
      onSuccess: () => {
        setIsGenerateOpen(false);
      }
    });
  };

  const handleMarkPaid = async (recordId: string) => {
    const { error } = await supabase
      .from("billing_records")
      .update({ status: "paid" })
      .eq("id", recordId);
      
    if (error) {
      toast.error("Failed to mark as paid");
    } else {
      toast.success("Invoice marked as paid");
      queryClient.invalidateQueries({ queryKey: ["billing-records"] });
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing & Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage monthly cycles and member payments.</p>
          </div>
          <Button onClick={() => setIsGenerateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Generate Cycle
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* CYCLES SIDEBAR */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Billing Cycles</h2>
            {loadingCycles ? (
              <div className="text-sm text-muted-foreground">Loading cycles...</div>
            ) : cycles?.length === 0 ? (
              <div className="text-sm text-muted-foreground">No cycles generated yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {cycles?.map(cycle => (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedCycleId(cycle.id)}
                    className={`text-left p-4 rounded-xl border transition-all relative group ${
                      selectedCycleId === cycle.id 
                        ? "bg-card border-indigo-500 shadow-sm ring-1 ring-indigo-500" 
                        : "bg-card/50 border-border hover:bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-semibold">{cycle.month_name}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this cycle? This will delete all generated invoices for this month.")) {
                            deleteCycle.mutate(cycle.id);
                            if (selectedCycleId === cycle.id) {
                              setSelectedCycleId(null);
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-1">
                      {format(new Date(cycle.start_date), "MMM d")} - {format(new Date(cycle.end_date), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className={
                        cycle.status === 'published' ? "text-green-600 bg-green-50" : 
                        cycle.status === 'generated' ? "text-blue-600 bg-blue-50" : "text-amber-600 bg-amber-50"
                      }>
                        {cycle.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{cycle.billing_records[0]?.count || 0} bills</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RECORDS AREA */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Cycle Invoices
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search member or invoice..." className="pl-8 h-8 text-sm" />
                  </div>
                </div>
              </div>

              {loadingRecords ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading records...</div>
              ) : records?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p>No invoices found for this cycle.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Meal Charges</TableHead>
                        <TableHead className="text-right">Arrears</TableHead>
                        <TableHead className="text-right">Total Payable</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records?.map((record) => (
                        <TableRow key={record.id} className="group">
                          <TableCell className="font-medium text-[13px]">{record.invoice_number}</TableCell>
                          <TableCell>
                            <div className="font-medium">{record.member_name}</div>
                            <div className="text-[11px] text-muted-foreground">Room {record.room_number}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              record.status === 'paid' ? "border-green-200 bg-green-50 text-green-700" :
                              record.status === 'overdue' ? "border-red-200 bg-red-50 text-red-700" :
                              "border-amber-200 bg-amber-50 text-amber-700"
                            }>
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px]">
                            ₹{record.meal_charges + record.guest_charges}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[13px] text-red-600">
                            {record.previous_balance > 0 ? `₹${record.previous_balance}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            ₹{record.total_amount}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {record.status !== 'paid' && (
                                <Button size="sm" variant="outline" onClick={() => handleMarkPaid(record.id)} className="h-7 text-[11px] hover:bg-green-50 hover:text-green-700 hover:border-green-200">
                                  Mark Paid
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-[11px]">View</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GENERATE DIALOG */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Billing Cycle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Month Name</Label>
              <Input 
                required 
                value={generateData.monthName} 
                onChange={e => setGenerateData({...generateData, monthName: e.target.value})} 
                placeholder="e.g. July 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  required 
                  value={generateData.startDate} 
                  onChange={e => setGenerateData({...generateData, startDate: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  required 
                  value={generateData.endDate} 
                  onChange={e => setGenerateData({...generateData, endDate: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-800 border border-amber-200 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Generating a cycle will lock in the prices, current meal counts, and guest charges for the selected period.</p>
            </div>

            <Button type="submit" disabled={generateCycle.isPending} className="w-full">
              {generateCycle.isPending ? "Generating..." : "Generate Invoices"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
