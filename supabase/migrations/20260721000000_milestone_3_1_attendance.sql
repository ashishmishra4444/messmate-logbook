-- Create ENUMs for Auth Methods and Scanner Status
CREATE TYPE public.auth_method_type AS ENUM ('qr', 'manual', 'nfc', 'rfid', 'biometric', 'emergency');
CREATE TYPE public.scanner_status AS ENUM ('online', 'offline', 'maintenance');

-- Create scanner_devices table
CREATE TABLE IF NOT EXISTS public.scanner_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scanner_name TEXT NOT NULL,
    location TEXT NOT NULL,
    device_type TEXT NOT NULL,
    registered_by UUID REFERENCES auth.users(id),
    last_seen TIMESTAMPTZ,
    status public.scanner_status DEFAULT 'offline'::public.scanner_status,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: The attendance table does not exist in the prior schema definitions, 
-- or if it does, we need to alter it. 
-- Wait, 'attendance' might exist from older milestones. Let me alter the table if it exists,
-- otherwise create it. 

-- Alter attendance table to add Milestone 3 columns securely
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS meal_session_id UUID, -- references meal_sessions(id)
ADD COLUMN IF NOT EXISTS meal_type public.meal_plan, -- 'breakfast', 'lunch', 'dinner'
ADD COLUMN IF NOT EXISTS auth_method public.auth_method_type DEFAULT 'qr'::public.auth_method_type,
ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS override_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS scanner_device_id UUID REFERENCES public.scanner_devices(id),
ADD COLUMN IF NOT EXISTS scanner_name TEXT;

-- Enforce Unique constraint: One meal session per member
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'attendance_member_session_unique'
    ) THEN
        ALTER TABLE public.attendance 
        ADD CONSTRAINT attendance_member_session_unique UNIQUE (member_id, meal_session_id);
    END IF;
END $$;

-- Create Index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_attendance_session_member ON public.attendance(meal_session_id, member_id);

-- Create RPC for inserting manual override attendance
CREATE OR REPLACE FUNCTION public.record_attendance_override(
    p_member_id UUID,
    p_meal_session_id UUID,
    p_reason TEXT,
    p_admin_id UUID
) RETURNS void AS $$
BEGIN
    INSERT INTO public.attendance (
        member_id,
        meal_session_id,
        auth_method,
        scanned_at,
        override_reason,
        override_by
    ) VALUES (
        p_member_id,
        p_meal_session_id,
        'manual',
        now(),
        p_reason,
        p_admin_id
    ) ON CONFLICT ON CONSTRAINT attendance_member_session_unique DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
