-- ============================================================
-- AANGAN — Production Migration
-- Run this in Supabase Dashboard → SQL Editor
-- Adds: media_attachments, albums, album_members, album_items,
--        invitations, message enhancements, post enhancements
-- ============================================================

-- ============================================
-- 1. MEDIA ATTACHMENTS (images/videos on posts)
-- ============================================
CREATE TABLE IF NOT EXISTS media_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'reel')),
  thumbnail_url TEXT,
  width INT,
  height INT,
  duration_seconds FLOAT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_attachments_post ON media_attachments(post_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_media_attachments_uploader ON media_attachments(uploader_id);

ALTER TABLE media_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media attachments" ON media_attachments
  FOR SELECT USING (true);
CREATE POLICY "Users can upload media" ON media_attachments
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Users can delete own media" ON media_attachments
  FOR DELETE USING (auth.uid() = uploader_id);

-- ============================================
-- 2. ALBUMS
-- ============================================
CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'others',
  cover_url TEXT,
  join_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_albums_owner ON albums(owner_id);
CREATE INDEX IF NOT EXISTS idx_albums_join_code ON albums(join_code) WHERE join_code IS NOT NULL;

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

-- Album owners can do everything
CREATE POLICY "Album owners can manage" ON albums
  FOR ALL USING (auth.uid() = owner_id);

-- Members can view albums they belong to
CREATE POLICY "Members can view albums" ON albums
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM album_members
      WHERE album_members.album_id = albums.id
      AND album_members.user_id = auth.uid()
    )
  );

-- Anyone can view public albums
CREATE POLICY "Public albums are visible" ON albums
  FOR SELECT USING (is_public = true);

-- ============================================
-- 3. ALBUM MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS album_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(album_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_album_members_user ON album_members(user_id);
CREATE INDEX IF NOT EXISTS idx_album_members_album ON album_members(album_id);

ALTER TABLE album_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view album membership" ON album_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM album_members am2
      WHERE am2.album_id = album_members.album_id
      AND am2.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can join albums" ON album_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave albums" ON album_members
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. ALBUM ITEMS (photos/videos in albums)
-- ============================================
CREATE TABLE IF NOT EXISTS album_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  thumbnail_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_items_album ON album_items(album_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_album_items_uploader ON album_items(uploader_id);

ALTER TABLE album_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Album members can view items" ON album_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM album_members
      WHERE album_members.album_id = album_items.album_id
      AND album_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Album members can add items" ON album_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM album_members
      WHERE album_members.album_id = album_items.album_id
      AND album_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own items" ON album_items
  FOR DELETE USING (auth.uid() = uploader_id);

-- ============================================
-- 5. INVITATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  invite_type TEXT DEFAULT 'family' CHECK (invite_type IN ('family', 'album')),
  target_album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  target_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  message TEXT,
  max_uses INT DEFAULT 1,
  use_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can manage invitations" ON invitations
  FOR ALL USING (auth.uid() = inviter_id);
CREATE POLICY "Anyone can read invitations by code" ON invitations
  FOR SELECT USING (true);

-- ============================================
-- 6. ENHANCE EXISTING TABLES
-- ============================================

-- Posts: add media_count for quick display
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_count INT DEFAULT 0;

-- Messages: add media support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- ============================================
-- 7. STORAGE BUCKETS
-- ============================================

-- Media bucket for post images/videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Albums bucket for album photos/videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'albums',
  'albums',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Users can upload media files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own media files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public media read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Users can delete own media files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for albums bucket
CREATE POLICY "Users can upload album files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own album files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public album read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'albums');

CREATE POLICY "Users can delete own album files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- DONE! All tables and policies created.
-- ============================================
