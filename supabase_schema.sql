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

-- 5. Store browser push subscriptions for background order notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_order_push_subscription(
  subscription_endpoint TEXT,
  subscription_p256dh TEXT,
  subscription_auth TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.push_subscriptions (endpoint, p256dh, auth)
  VALUES (subscription_endpoint, subscription_p256dh, subscription_auth)
  ON CONFLICT (endpoint) DO UPDATE
  SET p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      created_at = NOW();
$$;

REVOKE ALL ON FUNCTION public.register_order_push_subscription(TEXT, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_order_push_subscription(TEXT, TEXT, TEXT)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.unregister_order_push_subscription(
  subscription_endpoint TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_subscriptions
  WHERE endpoint = subscription_endpoint;
$$;

REVOKE ALL ON FUNCTION public.unregister_order_push_subscription(TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_order_push_subscription(TEXT)
TO anon, authenticated;
