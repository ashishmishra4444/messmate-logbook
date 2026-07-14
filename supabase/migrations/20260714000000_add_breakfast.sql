-- 1. Extend the meal_plan enum to support breakfast and combinations
ALTER TYPE public.meal_plan ADD VALUE IF NOT EXISTS 'breakfast';
ALTER TYPE public.meal_plan ADD VALUE IF NOT EXISTS 'breakfast_lunch';
ALTER TYPE public.meal_plan ADD VALUE IF NOT EXISTS 'breakfast_dinner';
ALTER TYPE public.meal_plan ADD VALUE IF NOT EXISTS 'all';

-- 2. Add breakfast_status to the attendance table
ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS breakfast_status public.attendance_status NOT NULL DEFAULT 'not_marked';
