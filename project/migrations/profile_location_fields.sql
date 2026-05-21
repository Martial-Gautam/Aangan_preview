-- Add profile location fields for "Relatives Around Me"
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_location_city_lower
  ON public.profiles (LOWER(location_city))
  WHERE location_city IS NOT NULL;
