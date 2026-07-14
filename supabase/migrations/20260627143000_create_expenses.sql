DO $$ BEGIN
  CREATE TYPE public.expense_category AS ENUM (
    'grocery',
    'staff_salary',
    'electricity_bill',
    'water_bill',
    'gas_cylinder',
    'maintenance',
    'cleaning',
    'utensils',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'upi',
    'bank_transfer',
    'card'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category public.expense_category NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method public.payment_method NOT NULL,
  added_by text NOT NULL DEFAULT 'Admin User',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses (category);
CREATE INDEX IF NOT EXISTS expenses_payment_method_idx ON public.expenses (payment_method);
CREATE INDEX IF NOT EXISTS expenses_search_idx ON public.expenses (lower(title), lower(added_by));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
