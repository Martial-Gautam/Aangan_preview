-- =============================================
-- Aangan — Supabase Database Schema
-- =============================================
-- Run this in Supabase Dashboard → SQL Editor
-- Only run this if your tables don't already exist!
-- =============================================

-- 1. Create 'profiles' table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  photo_url TEXT,
  phone TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create 'people' table (family members in the tree)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  photo_url TEXT,
  email TEXT,
  phone_number TEXT,
  is_self BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create 'relationships' table (connections between people)
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  related_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('father', 'mother', 'sibling', 'spouse', 'child')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for Claim System
-- =============================================

-- Unique constraint: one user can only claim one person node
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_user_id_unique
  ON people(user_id) WHERE user_id IS NOT NULL;

-- Indexes for fast claim lookups
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone_number) WHERE phone_number IS NOT NULL;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/write their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- People: users can only manage people they own
CREATE POLICY "Users can view own people"
  ON people FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own people"
  ON people FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own people"
  ON people FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own people"
  ON people FOR DELETE
  USING (auth.uid() = owner_id);

-- Relationships: users can only manage their own relationships
CREATE POLICY "Users can view own relationships"
  ON relationships FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own relationships"
  ON relationships FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own relationships"
  ON relationships FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================
-- Storage Bucket for Avatars
-- =============================================
-- Create an 'avatars' bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to avatars
CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- =============================================
-- Auto-create profile on user signup (optional but recommended)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
