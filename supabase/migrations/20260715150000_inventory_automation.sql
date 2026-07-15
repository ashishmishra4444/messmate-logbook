-- MessMate v1.1 Inventory Automation Migration

-- 1. Extend movement_type enum
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'opening_stock';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'purchase';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'consumption';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'adjustment';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'waste';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'expiry';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'correction';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'transfer';

-- 2. Extend inventory_category enum
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'grocery';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'vegetable';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'dairy';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'meat';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'spices';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'cleaning';
ALTER TYPE inventory_category ADD VALUE IF NOT EXISTS 'others';

-- 3. Create new enums
DO $$ BEGIN
    CREATE TYPE po_status AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE supplier_payment_status AS ENUM ('pending', 'partial', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE inventory_unit AS ENUM ('kg', 'gram', 'litre', 'ml', 'packet', 'piece', 'box', 'bag', 'dozen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create Procurement Tables
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT,
  email TEXT,
  gst_number TEXT,
  address TEXT,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  payment_status supplier_payment_status NOT NULL DEFAULT 'pending',
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number TEXT NOT NULL UNIQUE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  status TEXT DEFAULT 'received',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  received_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  damaged_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  accepted_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Prepare schema for expiry tracking
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS batch_number TEXT;

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS batch_number TEXT;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

-- 7. Add basic policies (allow authenticated users full access for now)
CREATE POLICY "Enable all for authenticated users" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.goods_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.goods_receipt_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
