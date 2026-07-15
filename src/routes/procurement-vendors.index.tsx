import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useVendors, useCreateVendor } from "@/lib/api-procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, Plus, Search, Edit2, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/procurement-vendors/")({
  head: () => ({ meta: [{ title: "Vendors — MessMate" }] }),
  component: VendorsPage,
});

function VendorsPage() {
  const { data: vendors, isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    mobile: "",
    email: "",
    gst_number: "",
    address: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVendor.mutate(formData, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({ name: "", contact_person: "", mobile: "", email: "", gst_number: "", address: "" });
      }
    });
  };

  const filtered = vendors?.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.mobile?.includes(search));

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Store className="h-6 w-6 text-indigo-500" />
              Vendors
            </h1>
            <p className="text-sm text-muted-foreground">Manage your suppliers and procurement contacts.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" /> Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vendor Name *</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contact Person</Label>
                    <Input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mobile</Label>
                    <Input value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>GST Number</Label>
                    <Input value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <Button type="submit" disabled={createVendor.isPending} className="mt-4">
                  {createVendor.isPending ? "Saving..." : "Save Vendor"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search vendors..." 
                className="pl-8 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>
          ) : filtered?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Store className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p>No vendors found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Vendor Info</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(vendor => (
                  <TableRow key={vendor.id} className="group">
                    <TableCell>
                      <div className="font-medium">{vendor.name}</div>
                      <div className="text-[12px] text-muted-foreground">{vendor.address || 'No address'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[13px]">{vendor.contact_person || 'N/A'}</div>
                      <div className="text-[12px] text-muted-foreground">{vendor.mobile || vendor.email || ''}</div>
                    </TableCell>
                    <TableCell className="text-[13px]">{vendor.gst_number || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8"><Edit2 className="h-4 w-4 text-muted-foreground" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
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
