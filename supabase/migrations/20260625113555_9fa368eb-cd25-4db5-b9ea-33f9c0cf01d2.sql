
-- 1. Add ID proof fields to members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS id_proof_type text,
  ADD COLUMN IF NOT EXISTS id_proof_number text;

-- 2. Rooms table (predefined room list; occupied rooms hidden in Add Member)
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL UNIQUE,
  capacity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);

-- Seed rooms 101-130
INSERT INTO public.rooms (room_number, capacity)
SELECT n::text, 1 FROM generate_series(101, 130) n
ON CONFLICT (room_number) DO NOTHING;

-- 3. Inventory
DO $$ BEGIN
  CREATE TYPE public.inventory_category AS ENUM ('food', 'utensil', 'asset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.inventory_category NOT NULL DEFAULT 'utensil',
  subcategory text,
  unit text NOT NULL DEFAULT 'Pieces',
  total_qty numeric NOT NULL DEFAULT 0,
  available_qty numeric NOT NULL DEFAULT 0,
  damaged_qty numeric NOT NULL DEFAULT 0,
  missing_qty numeric NOT NULL DEFAULT 0,
  min_qty numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO anon, authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

DO $$ BEGIN
  CREATE TYPE public.movement_type AS ENUM ('stock_in', 'stock_out', 'damage', 'missing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type public.movement_type NOT NULL,
  quantity numeric NOT NULL,
  total_cost numeric,
  supplier text,
  used_by text,
  purpose text,
  notes text,
  occurred_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO anon, authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to inventory_movements" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);

-- Seed a starter inventory
INSERT INTO public.inventory_items (name, category, subcategory, unit, total_qty, available_qty, damaged_qty, missing_qty, min_qty, unit_price) VALUES
  ('Steel Plates', 'utensil', 'Plates', 'Pieces', 200, 190, 5, 5, 20, 50),
  ('Glasses', 'utensil', 'Glasses', 'Pieces', 120, 112, 4, 4, 15, 25),
  ('Katoras (Bowls)', 'utensil', 'Bowls', 'Pieces', 160, 140, 6, 4, 20, 30),
  ('Spoons', 'utensil', 'Spoons', 'Pieces', 250, 240, 5, 5, 30, 10),
  ('Trays', 'utensil', 'Trays', 'Pieces', 30, 28, 1, 1, 5, 120),
  ('Water Jugs', 'asset', 'Water Jugs', 'Pieces', 10, 9, 0, 1, 2, 180),
  ('Cooking Pots', 'asset', 'Pots', 'Pieces', 8, 7, 1, 0, 2, 450),
  ('Gas Cylinders', 'asset', 'Gas Cylinders', 'Pieces', 5, 4, 0, 1, 2, 1100),
  ('Rice (Basmati)', 'food', 'Grains', 'Kg', 80, 60, 0, 0, 15, 95),
  ('Wheat Flour', 'food', 'Grains', 'Kg', 100, 70, 0, 0, 20, 45),
  ('Cooking Oil', 'food', 'Oil', 'Litre', 40, 25, 0, 0, 10, 140),
  ('Dal (Toor)', 'food', 'Pulses', 'Kg', 30, 18, 0, 0, 8, 130)
ON CONFLICT DO NOTHING;
