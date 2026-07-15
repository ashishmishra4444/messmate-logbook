-- Add Vendor Mapping & Reorder parameters to inventory_items

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS primary_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS secondary_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_purchase_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS safety_stock NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_daily_consumption NUMERIC(10,2) DEFAULT 0;
