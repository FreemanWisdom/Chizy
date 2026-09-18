-- =============================================================
-- CHIZY — site_settings table
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Create the key/value settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- 2. Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 3. Anyone can read settings (storefront needs the background path)
CREATE POLICY "Anyone can read site_settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- 4. Only authenticated users who exist in admin_profiles can insert
CREATE POLICY "Admins can insert site_settings"
  ON public.site_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- 5. Only authenticated admins can update
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- 6. Only authenticated admins can delete
CREATE POLICY "Admins can delete site_settings"
  ON public.site_settings
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE user_id = auth.uid()
    )
  );
