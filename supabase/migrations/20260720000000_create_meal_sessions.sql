-- Migration: 20260720000000_create_meal_sessions.sql (idempotent)

-----------------------------------------------------------------
-- 1. ENUM types (guarded)
-----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_session_status') THEN
    CREATE TYPE public.meal_session_status AS ENUM (
      'Upcoming',
      'Active',
      'Closing',
      'Closed',
      'Archived'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type') THEN
    CREATE TYPE public.meal_type AS ENUM (
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snack'
    );
  END IF;
END $$;

-----------------------------------------------------------------
-- 2. Table (guarded)
-----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  meal_type          public.meal_type NOT NULL,
  session_date       date NOT NULL,               -- UTC date
  start_time         timestamptz NOT NULL,        -- stored in UTC
  end_time           timestamptz NOT NULL,
  expected_count     int,
  max_capacity       int,
  current_attendance int NOT NULL DEFAULT 0,
  status             public.meal_session_status NOT NULL DEFAULT 'Upcoming',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-----------------------------------------------------------------
-- 3. Indexes (guarded)
-----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'meal_sessions'
      AND indexname  = 'idx_meal_sessions_session_date'
  ) THEN
    CREATE INDEX idx_meal_sessions_session_date
      ON public.meal_sessions (session_date);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'meal_sessions'
      AND indexname  = 'idx_meal_sessions_status'
  ) THEN
    CREATE INDEX idx_meal_sessions_status
      ON public.meal_sessions (status);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'meal_sessions'
      AND indexname  = 'idx_meal_sessions_date_status'
  ) THEN
    CREATE INDEX idx_meal_sessions_date_status
      ON public.meal_sessions (session_date, status);
  END IF;
END $$;

-----------------------------------------------------------------
-- 4. Overlap exclusion constraint (guarded)
-----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- required for GIST exclusion

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meal_sessions_no_overlap'
  ) THEN
    ALTER TABLE public.meal_sessions
      ADD CONSTRAINT meal_sessions_no_overlap EXCLUDE USING GIST (
        session_date WITH =,
        meal_type   WITH =,
        tstzrange(start_time, end_time) WITH &&
      );
  END IF;
END $$;

-----------------------------------------------------------------
-- 5. updated_at trigger (guarded)
-----------------------------------------------------------------
-- trigger function (CREATE OR REPLACE is already idempotent)
CREATE OR REPLACE FUNCTION public.set_meal_sessions_updated_at()
RETURNS trigger AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- trigger itself (guarded via a tiny DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_meal_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_meal_sessions_updated_at
      BEFORE UPDATE ON public.meal_sessions
      FOR EACH ROW EXECUTE FUNCTION public.set_meal_sessions_updated_at();
  END IF;
END $$;

-----------------------------------------------------------------
-- 6. RPC functions (CREATE OR REPLACE – automatically idempotent)
-----------------------------------------------------------------
-- Create a meal session
CREATE OR REPLACE FUNCTION public.create_meal_session(
    p_name          text,
    p_meal_type     public.meal_type,
    p_session_date  date,
    p_start_time    timestamptz,
    p_end_time      timestamptz,
    p_expected_count int,
    p_max_capacity   int
) RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.meal_sessions
    (name, meal_type, session_date, start_time, end_time,
     expected_count, max_capacity)
  VALUES
    (p_name, p_meal_type, p_session_date, p_start_time, p_end_time,
     p_expected_count, p_max_capacity)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update a meal session (partial updates allowed)
CREATE OR REPLACE FUNCTION public.update_meal_session(
    p_id            uuid,
    p_name          text          DEFAULT NULL,
    p_meal_type     public.meal_type DEFAULT NULL,
    p_start_time    timestamptz   DEFAULT NULL,
    p_end_time      timestamptz   DEFAULT NULL,
    p_expected_count int          DEFAULT NULL,
    p_max_capacity   int          DEFAULT NULL,
    p_status        public.meal_session_status DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.meal_sessions SET
    name               = COALESCE(p_name, name),
    meal_type          = COALESCE(p_meal_type, meal_type),
    start_time         = COALESCE(p_start_time, start_time),
    end_time           = COALESCE(p_end_time, end_time),
    expected_count     = COALESCE(p_expected_count, expected_count),
    max_capacity       = COALESCE(p_max_capacity, max_capacity),
    status             = COALESCE(p_status, status)
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment attendance (checks max_capacity)
CREATE OR REPLACE FUNCTION public.increment_attendance(p_id uuid) RETURNS void AS $$
DECLARE
  v_current int;
  v_max     int;
BEGIN
  SELECT current_attendance, max_capacity
    INTO v_current, v_max
    FROM public.meal_sessions
    WHERE id = p_id
    FOR UPDATE;

  IF v_max IS NOT NULL AND v_current >= v_max THEN
    RAISE EXCEPTION 'Maximum capacity reached for meal session %', p_id;
  END IF;

  UPDATE public.meal_sessions
     SET current_attendance = current_attendance + 1
   WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement attendance
CREATE OR REPLACE FUNCTION public.decrement_attendance(p_id uuid) RETURNS void AS $$
BEGIN
  UPDATE public.meal_sessions
     SET current_attendance = GREATEST(current_attendance - 1, 0)
   WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soft‑delete / archive a meal session
CREATE OR REPLACE FUNCTION public.archive_meal_session(p_id uuid) RETURNS void AS $$
BEGIN
  UPDATE public.meal_sessions
     SET status = 'Archived'
   WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
