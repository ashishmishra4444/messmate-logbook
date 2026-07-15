import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

// ==============================
// VENDORS
// ==============================

export function useVendors() {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: Database["public"]["Tables"]["vendors"]["Insert"]) => {
      const { data, error } = await supabase
        .from("vendors")
        .insert(vendor)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
    },
    onError: (err) => {
      toast.error(`Failed to create vendor: ${err.message}`);
    }
  });
}

// ==============================
// PURCHASE ORDERS
// ==============================

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendors(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseOrder(poId: string) {
  return useQuery({
    queryKey: ["purchase-orders", poId],
    queryFn: async () => {
      if (!poId) return null;
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          vendor:vendors(*),
          items:purchase_order_items(
            *,
            inventory_item:inventory_items(name, unit)
          ),
          receipts:goods_receipts(*)
        `)
        .eq("id", poId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!poId,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      po: Database["public"]["Tables"]["purchase_orders"]["Insert"];
      items: Database["public"]["Tables"]["purchase_order_items"]["Insert"][];
    }) => {
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert(payload.po)
        .select()
        .single();
      
      if (poError) throw poError;

      const itemsToInsert = payload.items.map(item => ({
        ...item,
        po_id: po.id
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback PO if items fail
        await supabase.from("purchase_orders").delete().eq("id", po.id);
        throw itemsError;
      }

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase Order created successfully");
    },
    onError: (err) => {
      toast.error(`Failed to create PO: ${err.message}`);
    }
  });
}

export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Database["public"]["Enums"]["po_status"] }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", variables.id] });
      toast.success("PO Status updated");
    },
    onError: (err) => {
      toast.error(`Failed to update status: ${err.message}`);
    }
  });
}

// ==============================
// GOODS RECEIPTS & LEDGER LOGIC
// ==============================

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: {
      grn: Database["public"]["Tables"]["goods_receipts"]["Insert"];
      items: Database["public"]["Tables"]["goods_receipt_items"]["Insert"][];
      poId: string;
    }) => {
      // 1. Create GRN
      const { data: grn, error: grnError } = await supabase
        .from("goods_receipts")
        .insert(payload.grn)
        .select()
        .single();
        
      if (grnError) throw grnError;

      const grnItems = payload.items.map(item => ({ ...item, grn_id: grn.id }));
      const { data: insertedItems, error: itemsError } = await supabase
        .from("goods_receipt_items")
        .insert(grnItems)
        .select();

      if (itemsError) throw itemsError;

      // 2. Automate Stock Ledger & Inventory Update
      // Get the current user for ledger
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      for (const item of insertedItems) {
        if (item.accepted_quantity > 0) {
          // Increment available_qty in inventory_items
          // First, get current qty to ensure safe increment (ideally via RPC, but we'll do it sequentially here)
          const { data: currentInv } = await supabase
            .from("inventory_items")
            .select("available_qty")
            .eq("id", item.item_id)
            .single();
            
          if (currentInv) {
            await supabase.from("inventory_items").update({
              available_qty: currentInv.available_qty + item.accepted_quantity
            }).eq("id", item.item_id);
          }

          // Create ledger entry (Purchase)
          if (userId) {
            await supabase.from("inventory_movements").insert({
              item_id: item.item_id,
              user_id: userId,
              quantity: item.accepted_quantity,
              movement_type: "purchase",
              purpose: `GRN: ${grn.grn_number}`,
              notes: `Received from PO ${payload.poId}`,
              occurred_at: grn.date
            });
          }
        }
      }

      // 3. Update PO Status to partially_received or received
      const totalOrdered = payload.items.reduce((sum, item) => sum + (item.received_quantity || 0), 0);
      const { data: poItems } = await supabase.from("purchase_order_items").select("quantity").eq("po_id", payload.poId);
      const originalTotalOrdered = poItems?.reduce((sum, item) => sum + item.quantity, 0) || totalOrdered;
      
      const statusToSet = totalOrdered >= originalTotalOrdered ? 'completed' : 'partially_received';

      await supabase.from("purchase_orders").update({ status: statusToSet }).eq("id", payload.poId);

      return grn;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", variables.poId] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Goods Receipt processed. Stock Ledger updated automatically!");
    },
    onError: (err) => {
      toast.error(`Failed to process GRN: ${err.message}`);
    }
  });
}
