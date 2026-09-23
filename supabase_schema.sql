-- ========================================================
-- Office Barista · Supabase Database Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New query -> Run
-- ========================================================

-- 1. Create the drink_orders table
CREATE TABLE IF NOT EXISTS public.drink_orders (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  drink TEXT NOT NULL,
  sugar_preference TEXT DEFAULT '',
  strength_preference TEXT DEFAULT '',
  custom_comment TEXT DEFAULT '',
  time TEXT NOT NULL,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For existing tables, add is_delivered column if it doesn't exist yet:
ALTER TABLE public.drink_orders ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.drink_orders ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for anonymous/public access (Office Pantry kiosk)
DROP POLICY IF EXISTS "Allow public read access to drink_orders" ON public.drink_orders;
CREATE POLICY "Allow public read access to drink_orders"
ON public.drink_orders
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert to drink_orders" ON public.drink_orders;
CREATE POLICY "Allow public insert to drink_orders"
ON public.drink_orders
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on drink_orders" ON public.drink_orders;
CREATE POLICY "Allow public update on drink_orders"
ON public.drink_orders
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow public delete from drink_orders" ON public.drink_orders;
CREATE POLICY "Allow public delete from drink_orders"
ON public.drink_orders
FOR DELETE
USING (true);

-- 4. Enable Supabase Realtime for instant live updates across devices
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.drink_orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
