-- =============================================
-- Aangan — Level 3 Consent Graph Migration
-- =============================================
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- 1) Extend connection_requests for consent-based graph
ALTER TABLE public.connection_requests
  ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS relationship_type TEXT CHECK (relationship_type IN ('father', 'mother', 'sibling', 'spouse', 'child')),
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('direct', 'onboarding', 'suggestion')),
  ADD COLUMN IF NOT EXISTS initiated_by TEXT CHECK (initiated_by IN ('adder', 'matcher', 'suggester'));

-- 2) Backfill new columns from legacy fields
UPDATE public.connection_requests
SET
  from_user_id = COALESCE(from_user_id, sender_id),
  to_user_id = COALESCE(to_user_id, receiver_id),
  person_id = COALESCE(person_id, linked_person_id)
WHERE from_user_id IS NULL OR to_user_id IS NULL OR person_id IS NULL;

-- 3) Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_conn_req_from_user ON public.connection_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_conn_req_to_user ON public.connection_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_conn_req_type ON public.connection_requests(type);
CREATE INDEX IF NOT EXISTS idx_conn_req_status ON public.connection_requests(status);

-- 4) Create user_connections table
CREATE TABLE IF NOT EXISTS public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'relative',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Prevent duplicate connections (order in app code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_connections_unique_pair
  ON public.user_connections(user_id_1, user_id_2);

CREATE INDEX IF NOT EXISTS idx_user_connections_user_1
  ON public.user_connections(user_id_1);

CREATE INDEX IF NOT EXISTS idx_user_connections_user_2
  ON public.user_connections(user_id_2);

-- 6) Enable RLS and policies for user_connections
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their connections"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can insert their connections"
  ON public.user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
