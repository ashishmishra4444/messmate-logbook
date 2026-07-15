import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePurchaseOrders } from "@/lib/api-procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/procurement-pos/")({
  head: () => ({ meta: [{ title: "Purchase Orders — MessMate" }] }),
  component: POsPage,
});

function POsPage() {
  const { data: pos, isLoading } = usePurchaseOrders();
  const [search, setSearch] = useState("");

  const filtered = pos?.filter(p => 
    p.po_number.toLowerCase().includes(search.toLowerCase()) || 
    p.vendor?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-500" />
              Purchase Orders
            </h1>
            <p className="text-sm text-muted-foreground">Create and track orders with your vendors.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Create PO
          </Button>
        </header>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search PO number or vendor..." 
                className="pl-8 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading POs...</div>
          ) : filtered?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p>No purchase orders found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(po => (
                  <TableRow key={po.id} className="group">
                    <TableCell className="font-medium text-[13px]">{po.po_number}</TableCell>
                    <TableCell className="text-[13px]">{po.vendor?.name}</TableCell>
                    <TableCell className="text-[13px]">{format(new Date(po.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        po.status === 'completed' ? "border-green-200 bg-green-50 text-green-700" :
                        po.status === 'approved' ? "border-blue-200 bg-blue-50 text-blue-700" :
                        po.status === 'cancelled' ? "border-red-200 bg-red-50 text-red-700" :
                        "border-amber-200 bg-amber-50 text-amber-700"
                      }>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-[13px]">₹{po.total_amount}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8" asChild>
                        <Link to={`/procurement-pos/${po.id}`}>
                          <Eye className="mr-2 h-4 w-4 text-muted-foreground" /> View
                        </Link>
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
