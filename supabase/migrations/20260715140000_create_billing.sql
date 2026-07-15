-- Enums for billing
CREATE TYPE public.billing_status AS ENUM ('draft', 'generated', 'published');
CREATE TYPE public.bill_status AS ENUM ('draft', 'pending', 'partially_paid', 'paid', 'cancelled', 'overdue');

-- Add 'online' to existing payment_method if not exists
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'online';

-- Billing Cycles Table
CREATE TABLE public.billing_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status public.billing_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing Records (Immutable Snapshots)
CREATE TABLE public.billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    billing_cycle_id UUID NOT NULL REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    
    -- Snapshotted member details
    member_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    meal_plan TEXT NOT NULL,
    mobile TEXT,
    
    -- Snapshotted settings
    breakfast_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    lunch_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    dinner_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    late_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Meal counts
    breakfast_count INT NOT NULL DEFAULT 0,
    lunch_count INT NOT NULL DEFAULT 0,
    dinner_count INT NOT NULL DEFAULT 0,
    total_meals INT NOT NULL DEFAULT 0,
    
    -- Financials
    meal_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    guest_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    extra_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    discounts DECIMAL(10,2) NOT NULL DEFAULT 0,
    previous_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    status public.bill_status NOT NULL DEFAULT 'draft',
    due_date DATE NOT NULL,
    generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    billing_record_id UUID NOT NULL REFERENCES public.billing_records(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing Audit Logs
CREATE TABLE public.billing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference_id UUID,
    notes TEXT
);

-- Alter mess_settings
ALTER TABLE public.mess_settings
ADD COLUMN billing_cycle_start_day INT NOT NULL DEFAULT 1,
ADD COLUMN billing_due_days INT NOT NULL DEFAULT 5,
ADD COLUMN late_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN tax_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN invoice_prefix TEXT NOT NULL DEFAULT 'MM',
ADD COLUMN invoice_notes TEXT NOT NULL DEFAULT 'Thank you for your prompt payment.';

-- Indexes
CREATE INDEX billing_cycles_month_idx ON public.billing_cycles(month_name);
CREATE INDEX billing_records_member_idx ON public.billing_records(member_id);
CREATE INDEX billing_records_cycle_idx ON public.billing_records(billing_cycle_id);
CREATE INDEX payments_member_idx ON public.payments(member_id);
CREATE INDEX payments_bill_idx ON public.payments(billing_record_id);
CREATE INDEX audit_logs_ref_idx ON public.billing_audit_logs(reference_id);

-- RLS
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access to billing cycles" ON public.billing_cycles FOR ALL USING (true);
CREATE POLICY "Public access to billing records" ON public.billing_records FOR ALL USING (true);
CREATE POLICY "Public access to payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Public access to audit logs" ON public.billing_audit_logs FOR ALL USING (true);
