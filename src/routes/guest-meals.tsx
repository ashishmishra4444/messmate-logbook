import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Search, Coffee, MoreHorizontal, Receipt, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useGuestMeals, useAddGuestMeal, useUpdateGuestMeal, useDeleteGuestMeal, useMessSettings } from "@/lib/api-guests";
import { toast } from "sonner";

export const Route = createFileRoute("/guest-meals")({
  head: () => ({ meta: [{ title: "Guest Meals — MessMate" }] }),
  component: GuestMealsPage,
});

function GuestMealsPage() {
  const [dateFilter, setDateFilter] = useState("");
  const [mealFilter, setMealFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);

  const { data: guests, isLoading } = useGuestMeals({
    date: dateFilter,
    meal: mealFilter,
    status: statusFilter,
    search,
  });

  const totalGuests = guests?.length || 0;
  const totalRevenue = guests?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;
  const outstanding = guests?.filter(g => g.payment_status === 'unpaid').reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;

  return (
    <main className="flex-1 overflow-y-auto bg-muted/10">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Guest Meals</h1>
            <p className="text-sm text-muted-foreground">Manage walk-ins and member guests.</p>
          </div>
          <Button onClick={() => { setEditingGuest(null); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Guest
          </Button>
        </header>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="text-sm font-medium text-muted-foreground">Total Guests (Filtered)</div>
            <div className="mt-2 text-3xl font-bold">{totalGuests}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="mt-2 text-3xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="text-sm font-medium text-muted-foreground">Outstanding Payments</div>
            <div className="mt-2 text-3xl font-bold text-destructive">₹{outstanding.toFixed(2)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Input
            type="date"
            className="w-auto"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Select value={mealFilter} onValueChange={setMealFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Meal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meals</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Date</TableHead>
                <TableHead>Guest Name</TableHead>
                <TableHead>Meal</TableHead>
                <TableHead>Qty x Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading guests...</TableCell>
                </TableRow>
              ) : guests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Coffee className="h-8 w-8 mb-2 opacity-20" />
                      <p>No guest meals found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                guests?.map((guest) => (
                  <TableRow key={guest.id} className="transition-colors hover:bg-muted/20">
                    <TableCell className="font-medium">{format(new Date(guest.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div>{guest.guest_name}</div>
                      {guest.mobile && <div className="text-[11px] text-muted-foreground">{guest.mobile}</div>}
                    </TableCell>
                    <TableCell className="capitalize">{guest.meal}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {guest.quantity} × ₹{guest.unit_price}
                    </TableCell>
                    <TableCell className="font-semibold">₹{guest.total_amount}</TableCell>
                    <TableCell>
                      <Badge variant={guest.payment_status === 'paid' ? 'default' : 'destructive'}>
                        {guest.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="shadow-card-md">
                          <DropdownMenuItem onClick={() => { setEditingGuest(guest); setIsDialogOpen(true); }}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>Generate Receipt</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md rounded-xl shadow-card-md">
            <DialogHeader>
              <DialogTitle>{editingGuest ? "Edit Guest Meal" : "Add Guest Meal"}</DialogTitle>
            </DialogHeader>
            <GuestForm 
              initialData={editingGuest} 
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

function GuestForm({ initialData, onSuccess }: { initialData?: any; onSuccess: () => void }) {
  const { data: settings } = useMessSettings();
  const addMutation = useAddGuestMeal();
  const updateMutation = useUpdateGuestMeal();

  const [formData, setFormData] = useState({
    guest_name: initialData?.guest_name || "",
    mobile: initialData?.mobile || "",
    date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
    meal: initialData?.meal || "lunch",
    quantity: initialData?.quantity || 1,
    unit_price: initialData?.unit_price || 0,
    payment_status: initialData?.payment_status || "unpaid",
    payment_method: initialData?.payment_method || "cash",
    purpose: initialData?.purpose || "",
  });

  // Auto-update price when meal changes if not editing
  const handleMealChange = (val: string) => {
    let price = 0;
    if (settings) {
      if (val === 'breakfast') price = settings.breakfast_price;
      if (val === 'lunch') price = settings.lunch_price;
      if (val === 'dinner') price = settings.dinner_price;
    }
    setFormData(prev => ({ ...prev, meal: val, unit_price: price }));
  };

  // Initialize price on mount when settings load (only for new entries)
  useEffect(() => {
    if (!initialData && settings && formData.unit_price === 0) {
      handleMealChange(formData.meal);
    }
  }, [settings, initialData, formData.unit_price, formData.meal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest_name) return toast.error("Guest name is required");

    const payload = {
      ...formData,
      total_amount: formData.quantity * formData.unit_price
    };

    if (initialData) {
      updateMutation.mutate({ id: initialData.id, updates: payload }, { onSuccess });
    } else {
      addMutation.mutate(payload as any, { onSuccess });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label>Guest Name</Label>
        <Input 
          value={formData.guest_name} 
          onChange={e => setFormData(p => ({ ...p, guest_name: e.target.value }))} 
          placeholder="e.g. John Doe" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} 
          />
        </div>
        <div className="grid gap-2">
          <Label>Meal Type</Label>
          <Select value={formData.meal} onValueChange={handleMealChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Quantity</Label>
          <Input 
            type="number" 
            min="1" 
            value={formData.quantity} 
            onChange={e => setFormData(p => ({ ...p, quantity: Number(e.target.value) }))} 
          />
        </div>
        <div className="grid gap-2">
          <Label>Unit Price (₹)</Label>
          <Input 
            type="number" 
            value={formData.unit_price} 
            onChange={e => setFormData(p => ({ ...p, unit_price: Number(e.target.value) }))} 
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={formData.payment_status} onValueChange={(v: any) => setFormData(p => ({ ...p, payment_status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Total Amount</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-bold">
            ₹{(formData.quantity * formData.unit_price).toFixed(2)}
          </div>
        </div>
      </div>
      <div className="pt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit">{initialData ? "Update Guest" : "Add Guest"}</Button>
      </div>
    </form>
  );
}
