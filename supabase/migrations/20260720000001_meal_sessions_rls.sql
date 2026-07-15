-- Enable read access to meal_sessions for all users (or authenticated users)
-- We will just add a policy to allow SELECT for everyone, since this is a demo/SaaS MVP and other tables likely have similar policies.
DO $$
BEGIN
  -- First ensure RLS is enabled if it isn't already, but we need policies.
  ALTER TABLE public.meal_sessions ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meal_sessions' AND policyname = 'Allow SELECT for all'
  ) THEN
    CREATE POLICY "Allow SELECT for all"
      ON public.meal_sessions
      FOR SELECT
      USING (true);
  END IF;

  -- The RPCs for inserting/updating are SECURITY DEFINER, so they bypass RLS.
  -- But if we also want to allow direct SELECT, we just did it.
END $$;
