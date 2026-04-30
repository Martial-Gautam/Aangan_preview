-- =============================================
-- Aangan — Claim Profile System Migration
-- =============================================
-- Run this in Supabase Dashboard → SQL Editor
-- This adds claim-related columns and constraints
-- =============================================

-- 1. Add contact fields to 'people' table for claim matching
ALTER TABLE people ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Add phone to 'profiles' table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Unique constraint: one user can only claim one person node
-- (user_id is nullable; this only enforces uniqueness where it's set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_user_id_unique
  ON people(user_id) WHERE user_id IS NOT NULL;

-- 4. Indexes for fast claim lookups
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone_number) WHERE phone_number IS NOT NULL;
