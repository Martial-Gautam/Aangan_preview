-- =============================================
-- Enable Supabase Realtime for connection_requests
-- =============================================
-- Run this in Supabase Dashboard → SQL Editor
-- This allows the client-side Realtime subscription
-- to receive INSERT/UPDATE events on connection_requests.
-- =============================================

-- Add connection_requests to the supabase_realtime publication
-- so that postgres_changes events are broadcast to clients.
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
