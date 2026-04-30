-- =============================================
-- Aangan — Network Graph Migration
-- =============================================
-- Run this in Supabase Dashboard → SQL Editor
-- Drops unique constraint and creates connection requests
-- =============================================

-- 1. Drop the unique index that prevents multiple trees from linking to the same user
DROP INDEX IF EXISTS public.idx_people_user_id_unique;

-- 2. Create connection_requests table
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_email TEXT,
  receiver_phone TEXT,
  linked_person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_conn_req_receiver_id ON public.connection_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_conn_req_receiver_email ON public.connection_requests(receiver_email);
CREATE INDEX IF NOT EXISTS idx_conn_req_receiver_phone ON public.connection_requests(receiver_phone);
CREATE INDEX IF NOT EXISTS idx_conn_req_sender_id ON public.connection_requests(sender_id);

-- 4. Enable RLS
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can read requests they sent"
  ON public.connection_requests FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can read requests they received"
  ON public.connection_requests FOR SELECT
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can insert requests"
  ON public.connection_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received requests"
  ON public.connection_requests FOR UPDATE
  USING (auth.uid() = receiver_id);
