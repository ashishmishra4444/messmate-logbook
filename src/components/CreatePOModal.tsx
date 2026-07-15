import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors, useCreatePurchaseOrder } from "@/lib/api-procurement";
import { Package, TrendingUp, DollarSign, History } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type CreatePOModalProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: any; // Using any for fast iteration, but should match Inventory Item with vendor fields
};

export function CreatePOModal({ open, onOpenChange, item }: CreatePOModalProps) {
  const { data: vendors } = useVendors();
  const createPO = useCreatePurchaseOrder();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState<string>("");
  const [vendorId, setVendorId] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");

  // Calculate Suggested Quantity
  const suggestedQty = useMemo(() => {
    if (!item) return 0;
    const avgConsumption = item.avg_daily_consumption || 1;
    const leadTime = item.lead_time_days || 3;
    const safetyStock = item.safety_stock || 0;
    
    // Formula: (Avg Daily * Lead Time) + Safety Stock - Available
    // Example: (2 * 5) + 10 - 5 = 15
    const calc = (avgConsumption * leadTime) + safetyStock - Number(item.available_qty);
    // If calc is negative, suggest ordering at least enough to reach min_qty
    const minNeeded = Number(item.min_qty) - Number(item.available_qty);
    return Math.max(calc, minNeeded, 0);
  }, [item]);

  // Set defaults when modal opens
  useMemo(() => {
    if (open && item) {
      setQuantity(suggestedQty.toString());
      setVendorId(item.primary_vendor_id || item.last_purchase_vendor_id || "");
      setUnitPrice(item.unit_price?.toString() || "");
    }
  }, [open, item, suggestedQty]);

  const estimatedCost = Number(quantity || 0) * Number(unitPrice || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !vendorId) return;

    createPO.mutate({
      po: {
        po_number: `PO-${new Date().getTime().toString().slice(-6)}`,
        vendor_id: vendorId,
        date: new Date().toISOString(),
        total_amount: estimatedCost,
        status: "draft",
      },
      items: [{
        item_id: item.id,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        total_price: estimatedCost
      }]
    }, {
      onSuccess: (data) => {
        onOpenChange(false);
        navigate({ to: `/procurement-pos/${data.id}` });
      }
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" />
            Create Purchase Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5 py-4">
          
          <div className="rounded-lg bg-muted/30 p-4 border border-border">
            <div className="font-semibold text-[15px] mb-1">{item.name}</div>
            <div className="flex gap-4 text-[13px] text-muted-foreground">
              <span>Current Stock: <strong className="text-red-500">{item.available_qty} {item.unit}</strong></span>
              <span>Min Stock: <strong>{item.min_qty}</strong></span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="flex justify-between">
              <span>Order Quantity ({item.unit})</span>
              <span className="text-indigo-500 flex items-center gap-1 text-[11px] font-medium">
                <TrendingUp className="h-3 w-3" /> Suggested: {suggestedQty}
              </span>
            </Label>
            <Input 
              type="number" 
              required 
              min={1} 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
            />
            <div className="text-[11px] text-muted-foreground bg-amber-500/10 text-amber-600 p-2 rounded-md border border-amber-500/20 mt-1">
              Calculated using: (Avg Consumption {item.avg_daily_consumption || 1}/day × Lead Time {item.lead_time_days || 3} days) + Safety {item.safety_stock || 0}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Vendor</Label>
            <Select required value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors?.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} 
                    {v.id === item.primary_vendor_id && " (Primary)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="flex justify-between">
              <span>Unit Price (₹)</span>
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <History className="h-3 w-3" /> Last Price: ₹{item.unit_price}
              </span>
            </Label>
            <Input 
              type="number" 
              required 
              min={0}
              step="0.01"
              value={unitPrice} 
              onChange={e => setUnitPrice(e.target.value)} 
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
            <span className="font-medium text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Estimated Cost
            </span>
            <span className="text-lg font-bold">₹{estimatedCost.toFixed(2)}</span>
          </div>

          <Button type="submit" disabled={createPO.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {createPO.isPending ? "Generating..." : "Generate Purchase Order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
