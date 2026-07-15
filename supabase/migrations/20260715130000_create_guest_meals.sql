CREATE TYPE public.payment_status AS ENUM ('paid', 'unpaid');

CREATE TABLE public.guest_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  mobile TEXT,
  date DATE NOT NULL,
  meal public.meal_type NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  purpose TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX guest_meals_date_idx ON public.guest_meals(date DESC);
CREATE INDEX guest_meals_host_idx ON public.guest_meals(host_member_id);
CREATE INDEX guest_meals_payment_idx ON public.guest_meals(payment_status);

-- RLS Policies
ALTER TABLE public.guest_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to guest meals" ON public.guest_meals FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_meals TO anon, authenticated;
GRANT ALL ON public.guest_meals TO service_role;

-- Settings table for meal pricing
CREATE TABLE public.mess_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakfast_price DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  lunch_price DECIMAL(10,2) NOT NULL DEFAULT 80.00,
  dinner_price DECIMAL(10,2) NOT NULL DEFAULT 80.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initialize settings
INSERT INTO public.mess_settings (id) VALUES (gen_random_uuid());

-- Settings RLS
ALTER TABLE public.mess_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to settings" ON public.mess_settings FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mess_settings TO anon, authenticated;
GRANT ALL ON public.mess_settings TO service_role;
