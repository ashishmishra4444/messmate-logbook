-- Create device_health table for tracking scanner devices
CREATE TABLE IF NOT EXISTS public.device_health (
  device_id TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  battery_level INT,
  pending_queue_size INT NOT NULL DEFAULT 0,
  network_status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for device_health
ALTER TABLE public.device_health ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view device health
CREATE POLICY "Public read access for device health" ON public.device_health FOR SELECT USING (true);
-- Allow anon/authenticated to update/insert their own heartbeat
CREATE POLICY "Public insert access for device health" ON public.device_health FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for device health" ON public.device_health FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Realtime for attendance and device_health
BEGIN;
  -- Drop publication if it exists to recreate safely
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_health;
