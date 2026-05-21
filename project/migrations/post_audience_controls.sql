-- ============================================================
-- AANGAN — Post Audience Controls
-- Adds degree/side/user include-exclude controls for posts visibility.
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS audience_degrees TEXT[] DEFAULT ARRAY['all']::TEXT[],
  ADD COLUMN IF NOT EXISTS audience_sides TEXT[] DEFAULT ARRAY['all']::TEXT[],
  ADD COLUMN IF NOT EXISTS include_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS exclude_user_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_posts_audience_degrees ON public.posts USING GIN (audience_degrees);
CREATE INDEX IF NOT EXISTS idx_posts_audience_sides ON public.posts USING GIN (audience_sides);
CREATE INDEX IF NOT EXISTS idx_posts_include_user_ids ON public.posts USING GIN (include_user_ids);
CREATE INDEX IF NOT EXISTS idx_posts_exclude_user_ids ON public.posts USING GIN (exclude_user_ids);
