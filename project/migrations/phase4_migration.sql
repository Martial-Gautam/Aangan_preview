-- ============================================================
-- PHASE 4 MIGRATION — The Universal Tree Vision
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 4.1 — Enable pg_trgm for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4.1 — Smart Merge Suggestions table
CREATE TABLE IF NOT EXISTS merge_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id_1 UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_id_2 UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  confidence FLOAT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup of pending suggestions
CREATE INDEX IF NOT EXISTS idx_merge_suggestions_status
  ON merge_suggestions(status);

-- Prevent duplicate suggestions (same pair in either direction)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merge_suggestions_pair
  ON merge_suggestions (
    LEAST(person_id_1, person_id_2),
    GREATEST(person_id_1, person_id_2)
  );

-- 4.4 — Add optional birthplace column to people
ALTER TABLE people ADD COLUMN IF NOT EXISTS birthplace TEXT;

-- RLS policies for merge_suggestions
ALTER TABLE merge_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can see merge suggestions involving people in their tree
CREATE POLICY "Users can view their merge suggestions"
  ON merge_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM people
      WHERE people.id = merge_suggestions.person_id_1
        AND people.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM people
      WHERE people.id = merge_suggestions.person_id_2
        AND people.owner_id = auth.uid()
    )
  );

-- Service role can insert/update (via API routes)
-- No INSERT/UPDATE policies needed for normal users — API routes use service role key
