-- Create System Notifications Table
CREATE TYPE notification_type AS ENUM ('low_stock', 'pending_po', 'bill_due', 'guest_payment', 'inventory_warning', 'system_message');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    status notification_status DEFAULT 'unread' NOT NULL,
    link_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for system_notifications" ON public.system_notifications FOR ALL USING (true) WITH CHECK (true);

-- Create System Activities Table
CREATE TABLE IF NOT EXISTS public.system_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    module TEXT NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.system_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for system_activities" ON public.system_activities FOR ALL USING (true) WITH CHECK (true);
