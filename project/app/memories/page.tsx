'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Baby,
  Briefcase,
  CalendarDays,
  Camera,
  Dog,
  Dumbbell,
  Heart,
  ImagePlus,
  Loader2,
  Plus,
  QrCode,
  ScanLine,
  Sparkles,
  UploadCloud,
  User,
  Users,
  Palette,
  GraduationCap,
} from 'lucide-react';

type MemoryPost = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  author: { full_name: string; photo_url: string | null };
};

type ParsedMemory = {
  imageUrl: string;
  caption: string;
};

type AlbumMode = 'choose' | 'join' | 'albums';

type AlbumCategoryKey =
  | 'children'
  | 'couple'
  | 'pet'
  | 'friends'
  | 'individual'
  | 'work'
  | 'family'
  | 'class'
  | 'team'
  | 'hobby'
  | 'others';

type AlbumCategory = {
  key: AlbumCategoryKey;
  label: string;
  subtitle: string;
  icon: typeof Baby;
  cardClass: string;
};

const MEMORY_PREFIX = '[[memory-image]]';
const TITLE_SEPARATOR = '::';
const QR_PLACEHOLDER = 'Camera QR scan will be added in the next update.';

const ALBUM_CATEGORIES: AlbumCategory[] = [
  { key: 'children', label: 'Children', subtitle: 'Kids milestones', icon: Baby, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20' },
  { key: 'couple', label: 'Couple', subtitle: 'Together moments', icon: Heart, cardClass: 'bg-[#FAF7F2] border-[#B76E5D]/20' },
  { key: 'pet', label: 'Pet', subtitle: 'Pet stories', icon: Dog, cardClass: 'bg-[#FAF7F2] border-[#6E8B74]/20' },
  { key: 'friends', label: 'Friends', subtitle: 'Hangout memories', icon: Users, cardClass: 'bg-[#FAF7F2] border-[#8B5E3C]/20' },
  { key: 'individual', label: 'Individual', subtitle: 'Personal moments', icon: User, cardClass: 'bg-[#FAF7F2] border-[#6E8B74]/20' },
  { key: 'work', label: 'Work', subtitle: 'Project highlights', icon: Briefcase, cardClass: 'bg-[#FAF7F2] border-[#355E3B]/20' },
  { key: 'family', label: 'Family', subtitle: 'Family events', icon: Users, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20' },
  { key: 'class', label: 'Class', subtitle: 'School memories', icon: GraduationCap, cardClass: 'bg-[#FAF7F2] border-[#6E8B74]/20' },
  { key: 'team', label: 'Team', subtitle: 'Sports moments', icon: Dumbbell, cardClass: 'bg-[#FAF7F2] border-[#355E3B]/20' },
  { key: 'hobby', label: 'Hobby', subtitle: 'Creative time', icon: Palette, cardClass: 'bg-[#FAF7F2] border-[#8B5E3C]/20' },
  { key: 'others', label: 'Others', subtitle: 'More memories', icon: Plus, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20' },
];

function parseMemoryContent(content: string): ParsedMemory | null {
  if (!content.startsWith(MEMORY_PREFIX)) return null;
  const payload = content.slice(MEMORY_PREFIX.length).trimStart();
  const firstNewLine = payload.indexOf('\n');
  if (firstNewLine === -1) return null;
  const imageUrl = payload.slice(0, firstNewLine).trim();
  const caption = payload.slice(firstNewLine + 1).trim();
  if (!imageUrl) return null;
  return { imageUrl, caption };
}

function parseMemoryTitle(rawTitle: string | null): { category: AlbumCategoryKey; title: string } {
  if (!rawTitle) return { category: 'others', title: 'Untitled Memory' };

  const splitIndex = rawTitle.indexOf(TITLE_SEPARATOR);
  if (splitIndex === -1) {
    return { category: 'others', title: rawTitle.trim() || 'Untitled Memory' };
  }

  const rawCategory = rawTitle.slice(0, splitIndex).trim().toLowerCase();
  const contentTitle = rawTitle.slice(splitIndex + TITLE_SEPARATOR.length).trim();
  const exists = ALBUM_CATEGORIES.some((c) => c.key === rawCategory);
  const category = exists ? (rawCategory as AlbumCategoryKey) : 'others';

  return {
    category,
    title: contentTitle || 'Untitled Memory',
  };
}

function buildMemoryTitle(category: AlbumCategoryKey, title: string) {
  return `${category}${TITLE_SEPARATOR}${title.trim()}`;
}

export default function MemoriesPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);

  const [mode, setMode] = useState<AlbumMode>('choose');
  const [activeCategory, setActiveCategory] = useState<AlbumCategoryKey>('family');
  const [showCreate, setShowCreate] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/welcome');
      return;
    }
    fetchMemories();
  }, [authLoading, user]);

  useEffect(() => {
    if (previewUrl) {
      return () => URL.revokeObjectURL(previewUrl);
    }
    return undefined;
  }, [previewUrl]);

  const fetchMemories = async () => {
    if (!session?.access_token) return;
    setLoadingMemories(true);
    try {
      const res = await fetch('/api/posts/list?type=post&category=memories', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.posts || []);
      } else {
        setMemories([]);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
      setMemories([]);
    } finally {
      setLoadingMemories(false);
    }
  };

  const memoryCards = useMemo(
    () =>
      memories
        .map((m) => {
          const parsed = parseMemoryContent(m.content);
          if (!parsed) return null;
          const parsedTitle = parseMemoryTitle(m.title);

          return {
            ...m,
            imageUrl: parsed.imageUrl,
            caption: parsed.caption,
            cleanTitle: parsedTitle.title,
            albumCategory: parsedTitle.category,
          };
        })
        .filter(Boolean) as Array<
        MemoryPost & {
          imageUrl: string;
          caption: string;
          cleanTitle: string;
          albumCategory: AlbumCategoryKey;
        }
      >,
    [memories]
  );

  const filteredMemories = useMemo(
    () => memoryCards.filter((m) => m.albumCategory === activeCategory),
    [memoryCards, activeCategory]
  );

  const countsByCategory = useMemo(() => {
    const counts = ALBUM_CATEGORIES.reduce((acc, category) => {
      acc[category.key] = 0;
      return acc;
    }, {} as Record<AlbumCategoryKey, number>);

    for (const memory of memoryCards) {
      counts[memory.albumCategory] += 1;
    }

    return counts;
  }, [memoryCards]);

  const activeCategoryMeta = useMemo(
    () => ALBUM_CATEGORIES.find((c) => c.key === activeCategory) || ALBUM_CATEGORIES[0],
    [activeCategory]
  );

  const handlePhotoChange = (file: File | null) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setEventTitle('');
    setCaption('');
    setPhoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setError('');
  };

  const handleCreateMemory = async () => {
    if (!user || !session?.access_token) return;
    if (!eventTitle.trim()) {
      setError('Please add a memory title.');
      return;
    }
    if (!photo) {
      setError('Please upload a photo.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const ext = photo.name.split('.').pop() || 'jpg';
      const safeExt = ext.toLowerCase();
      const filePath = `${user.id}/memories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, photo, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const imageUrl = urlData.publicUrl;
      const packedContent = `${MEMORY_PREFIX}${imageUrl}\n${caption.trim()}`;

      const createRes = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'post',
          title: buildMemoryTitle(activeCategory, eventTitle.trim()),
          content: packedContent,
          category: 'memories',
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create memory');
      }

      setShowCreate(false);
      resetForm();
      await fetchMemories();
      setMode('albums');
    } catch (err) {
      console.error('Failed to create memory:', err);
      setError(err instanceof Error ? err.message : 'Failed to create memory');
    } finally {
      setUploading(false);
    }
  };

  const handleJoinAlbum = () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter album code.');
      return;
    }
    setJoinError('');
    setMode('albums');
    setActiveCategory('family');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFE6D5]/45 via-[#FAF7F2] to-[#EFE6D5]/40 pb-24">
      <div className="max-w-sm mx-auto">
        <div className="bg-[#FAF7F2] px-5 pt-11 pb-4 shadow-sm border-b border-[#C9A66B]/12">
          <div className="flex items-center gap-2">
            {mode !== 'choose' && (
              <button
                type="button"
                onClick={() => {
                  if (mode === 'join') setMode('choose');
                  if (mode === 'albums') setMode('choose');
                }}
                className="w-8 h-8 rounded-full bg-[#355E3B]/8 text-[#355E3B] flex items-center justify-center"
              >
                <ArrowLeft size={17} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#2B2B2B]">Shared Memory</h1>
              <p className="text-xs text-[#5E5E5E] mt-0.5">
                {mode === 'choose' && 'Capture and organize family moments'}
                {mode === 'join' && 'Join an existing shared album'}
                {mode === 'albums' && 'Browse memories by album type'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMode('albums');
                  setActiveCategory('family');
                }}
                className="w-full text-left bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#355E3B]/10 text-[#355E3B] flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2B2B2B]">Create Memory Album</p>
                    <p className="text-xs text-[#5E5E5E] mt-1">Save family photos into categories like Family, Kids, Friends and more.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('albums');
                  setActiveCategory('others');
                }}
                className="w-full text-left bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#C9A66B]/18 text-[#8B5E3C] flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2B2B2B]">Create Event Album</p>
                    <p className="text-xs text-[#5E5E5E] mt-1">Wedding, birthday, puja, trip and celebration galleries in one place.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('join');
                  setJoinError('');
                }}
                className="w-full text-left bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#6E8B74]/13 text-[#355E3B] flex items-center justify-center">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2B2B2B]">Join Existing Album</p>
                    <p className="text-xs text-[#5E5E5E] mt-1">Use album code or QR from family to join their shared memories.</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-3">
              <div className="bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#2B2B2B]">Album Code</p>
                <input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="Enter album code"
                  className="mt-2 w-full rounded-xl border border-[#C9A66B]/24 bg-white/80 px-3 py-2.5 text-sm text-[#2B2B2B] placeholder:text-[#5E5E5E]/55 outline-none focus:border-[#355E3B]/35"
                />
              </div>

              <div className="bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#2B2B2B]">Scan QR</p>
                <button
                  type="button"
                  onClick={() => setJoinError(QR_PLACEHOLDER)}
                  className="mt-2 w-full rounded-xl border border-dashed border-[#C9A66B]/30 bg-white/75 px-3 py-5 text-[#355E3B] flex items-center justify-center gap-2"
                >
                  <ScanLine size={18} />
                  <span className="text-sm font-medium">Scan album QR code</span>
                </button>
              </div>

              {joinError && (
                <p className="text-xs text-[#6B2E2E] bg-[#6B2E2E]/8 border border-[#6B2E2E]/15 rounded-lg px-2.5 py-2">
                  {joinError}
                </p>
              )}

              <button
                type="button"
                onClick={handleJoinAlbum}
                className="w-full py-2.5 rounded-xl bg-[#355E3B] text-white text-sm font-semibold hover:bg-[#2d5033]"
              >
                Continue
              </button>
            </div>
          )}

          {mode === 'albums' && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                {ALBUM_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const active = activeCategory === category.key;
                  return (
                    <button
                      type="button"
                      key={category.key}
                      onClick={() => setActiveCategory(category.key)}
                      className={`${category.cardClass} relative rounded-2xl border p-3 text-left shadow-sm transition ${
                        active ? 'ring-2 ring-[#355E3B]/25 border-[#355E3B]/30' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/80 border border-[#C9A66B]/20 text-[#355E3B] flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <p className="mt-3 text-sm font-bold text-[#2B2B2B]">{category.label}</p>
                      <p className="text-[11px] text-[#5E5E5E] mt-0.5">{countsByCategory[category.key]} memories</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#2B2B2B]">{activeCategoryMeta.label} Memories</h2>
                    <p className="text-[11px] text-[#5E5E5E]">{activeCategoryMeta.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-[#355E3B] to-[#6E8B74] text-white flex items-center justify-center shadow-md"
                  >
                    <ImagePlus size={17} />
                  </button>
                </div>

                {loadingMemories ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={22} className="text-[#355E3B] animate-spin" />
                  </div>
                ) : filteredMemories.length === 0 ? (
                  <div className="text-center py-7 px-3 rounded-xl border border-dashed border-[#C9A66B]/30 bg-white/55">
                    <Camera size={24} className="mx-auto text-[#6E8B74]" />
                    <p className="mt-2 text-sm font-semibold text-[#2B2B2B]">No memories yet</p>
                    <p className="text-xs text-[#5E5E5E] mt-1">Add your first photo in {activeCategoryMeta.label.toLowerCase()} album.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredMemories.map((memory) => (
                      <article key={memory.id} className="bg-white rounded-xl overflow-hidden border border-[#C9A66B]/15">
                        <img src={memory.imageUrl} alt={memory.cleanTitle} className="w-full h-28 object-cover" />
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-[#2B2B2B] line-clamp-1">{memory.cleanTitle}</p>
                          {memory.caption && <p className="text-[11px] text-[#5E5E5E] mt-1 line-clamp-2">{memory.caption}</p>}
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#5E5E5E]/70">
                            <CalendarDays size={11} />
                            <span>{new Date(memory.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center px-4">
            <div className="w-full max-w-sm bg-[#FAF7F2] rounded-3xl border border-[#C9A66B]/15 p-5 mb-4 sm:mb-0">
              <h3 className="text-lg font-bold text-[#2B2B2B]">Add Memory</h3>
              <p className="text-xs text-[#5E5E5E] mt-0.5">Album: {activeCategoryMeta.label}</p>

              <div className="space-y-3 mt-3">
                <input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Memory title"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9A66B]/20 bg-white/80 text-sm outline-none focus:border-[#355E3B]/35"
                />
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption (optional)"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C9A66B]/20 bg-white/80 text-sm outline-none resize-none focus:border-[#355E3B]/35"
                />
                <label className="w-full rounded-xl border border-dashed border-[#C9A66B]/35 px-3.5 py-3 text-sm text-[#5E5E5E] flex items-center gap-2 cursor-pointer hover:bg-[#EFE6D5]/45">
                  <UploadCloud size={16} className="text-[#355E3B]" />
                  {photo ? photo.name : 'Upload memory photo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                  />
                </label>
                {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-[#C9A66B]/15" />}
                {error && (
                  <p className="text-xs text-[#6B2E2E] bg-[#6B2E2E]/8 border border-[#6B2E2E]/15 rounded-lg px-2.5 py-2">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCreateMemory}
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-[#355E3B] text-white text-sm font-semibold hover:bg-[#2d5033] disabled:opacity-50"
                >
                  {uploading ? 'Saving...' : 'Share Memory'}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#EFE6D5]/70 text-[#5E5E5E] text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
