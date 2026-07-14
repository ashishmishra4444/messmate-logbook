-- 1. Clean up existing dummy data
DELETE FROM public.attendance;
DELETE FROM public.expenses;
DELETE FROM public.inventory_movements;
DELETE FROM public.inventory_items;
DELETE FROM public.members;

-- 2. Add user_id column with default auth.uid() to all tables
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_movements 
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Drop old public access policies
DROP POLICY IF EXISTS "Public access to members" ON public.members;
DROP POLICY IF EXISTS "Public access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public access to inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Public access to inventory_movements" ON public.inventory_movements;

-- 4. Create new User-Isolated access policies
CREATE POLICY "User isolated members" ON public.members FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User isolated attendance" ON public.attendance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User isolated expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User isolated inventory_items" ON public.inventory_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User isolated inventory_movements" ON public.inventory_movements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
