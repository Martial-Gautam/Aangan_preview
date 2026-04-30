import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client using service role key.
// This bypasses RLS — use ONLY in API routes for cross-owner queries (e.g. claim checks).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
