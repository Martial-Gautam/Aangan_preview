'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Cake,
  Heart,
  ImagePlus,
  Loader2,
  Plus,
  QrCode,
  ScanLine,
  Sparkles,
  UploadCloud,
  Users,
  MapPin,
  Home,
  Sun,
  Trophy,
  Gift,
  Flame,
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
  | 'family_trip'
  | 'family_visit'
  | 'festivals'
  | 'daily_life'
  | 'milestones'
  | 'custom'
  | 'birthday'
  | 'wedding'
  | 'anniversary'
  | 'puja'
  | 'reunion'
  | 'graduation'
  | 'custom_event';

type AlbumCategory = {
  key: AlbumCategoryKey;
  label: string;
  subtitle: string;
  icon: typeof Camera;
  cardClass: string;
  albumType: 'memory' | 'event';
};

const MEMORY_PREFIX = '[[memory-image]]';
const TITLE_SEPARATOR = '::';
const QR_PLACEHOLDER = 'Camera QR scan will be added in the next update.';

const ALBUM_CATEGORIES: AlbumCategory[] = [
  // Memory Albums
  { key: 'family_trip', label: 'Family Trip', subtitle: 'Travel together', icon: MapPin, cardClass: 'bg-[#FAF7F2] border-[#355E3B]/20', albumType: 'memory' },
  { key: 'family_visit', label: 'Family Visit', subtitle: 'Visiting relatives', icon: Home, cardClass: 'bg-[#FAF7F2] border-[#8B5E3C]/20', albumType: 'memory' },
  { key: 'festivals', label: 'Festivals', subtitle: 'Diwali, Holi, Eid...', icon: Sparkles, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20', albumType: 'memory' },
  { key: 'daily_life', label: 'Daily Life', subtitle: 'Everyday moments', icon: Sun, cardClass: 'bg-[#FAF7F2] border-[#6E8B74]/20', albumType: 'memory' },
  { key: 'milestones', label: 'Milestones', subtitle: 'First steps, achievements', icon: Trophy, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20', albumType: 'memory' },
  { key: 'custom', label: 'Custom', subtitle: 'Your own category', icon: Plus, cardClass: 'bg-[#FAF7F2] border-[#5E5E5E]/15', albumType: 'memory' },
  // Event Albums
  { key: 'birthday', label: 'Birthday', subtitle: 'Birthday celebrations', icon: Cake, cardClass: 'bg-[#FAF7F2] border-[#B76E5D]/20', albumType: 'event' },
  { key: 'wedding', label: 'Wedding', subtitle: 'Weddings & engagements', icon: Heart, cardClass: 'bg-[#FAF7F2] border-[#B76E5D]/20', albumType: 'event' },
  { key: 'anniversary', label: 'Anniversary', subtitle: 'Love milestones', icon: Gift, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20', albumType: 'event' },
  { key: 'puja', label: 'Puja / Ceremony', subtitle: 'Religious & spiritual', icon: Flame, cardClass: 'bg-[#FAF7F2] border-[#C9A66B]/20', albumType: 'event' },
  { key: 'reunion', label: 'Family Reunion', subtitle: 'Getting together', icon: Users, cardClass: 'bg-[#FAF7F2] border-[#355E3B]/20', albumType: 'event' },
  { key: 'graduation', label: 'Graduation', subtitle: 'Academic achievements', icon: GraduationCap, cardClass: 'bg-[#FAF7F2] border-[#6E8B74]/20', albumType: 'event' },
  { key: 'custom_event', label: 'Custom Event', subtitle: 'Your own event type', icon: Plus, cardClass: 'bg-[#FAF7F2] border-[#5E5E5E]/15', albumType: 'event' },
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
  if (!rawTitle) return { category: 'custom', title: 'Untitled Memory' };

  const splitIndex = rawTitle.indexOf(TITLE_SEPARATOR);
  if (splitIndex === -1) {
    return { category: 'custom', title: rawTitle.trim() || 'Untitled Memory' };
  }

  const rawCategory = rawTitle.slice(0, splitIndex).trim().toLowerCase();
  const contentTitle = rawTitle.slice(splitIndex + TITLE_SEPARATOR.length).trim();
  const exists = ALBUM_CATEGORIES.some((c) => c.key === rawCategory);
  const category = exists ? (rawCategory as AlbumCategoryKey) : 'custom';

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
  const [albumTypeFilter, setAlbumTypeFilter] = useState<'memory' | 'event'>('memory');
  const [activeCategory, setActiveCategory] = useState<AlbumCategoryKey>('family_trip');
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

  const filteredAlbumCategories = useMemo(
    () => ALBUM_CATEGORIES.filter(c => c.albumType === albumTypeFilter),
    [albumTypeFilter]
  );

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

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, photo, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
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
    setActiveCategory('family_trip');
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
              {/* ── Mini Calendar ── */}
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const today = now.getDate();
                const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // Days with memories (from memoryCards)
                const memoryDays = new Set<number>();
                memoryCards.forEach(m => {
                  const d = new Date(m.created_at);
                  if (d.getMonth() === month && d.getFullYear() === year) {
                    memoryDays.add(d.getDate());
                  }
                });

                const blanks = Array.from({ length: firstDay }, (_, i) => i);
                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                return (
                  <div className="bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-[#2B2B2B] mb-3 flex items-center gap-2">
                      <CalendarDays size={16} className="text-[#C9A66B]" />
                      {monthName}
                    </h3>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <span key={`h-${i}`} className="text-[9px] font-bold text-[#5E5E5E]/50 py-1">{d}</span>
                      ))}
                      {blanks.map(i => <span key={`b-${i}`} />)}
                      {days.map(day => {
                        const isToday = day === today;
                        const hasMemory = memoryDays.has(day);
                        return (
                          <div
                            key={day}
                            className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                              isToday
                                ? 'bg-[#355E3B] text-white font-bold shadow-md'
                                : hasMemory
                                ? 'bg-[#C9A66B]/15 text-[#8B5E3C] font-semibold'
                                : 'text-[#2B2B2B]/70'
                            }`}
                          >
                            {day}
                            {hasMemory && !isToday && (
                              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#C9A66B]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Upcoming Moments Bar ── */}
              <div className="bg-gradient-to-r from-[#C9A66B]/10 to-[#EFE6D5]/60 rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#2B2B2B] mb-2 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#C9A66B]" />
                  Upcoming Moments
                </h3>
                <div className="space-y-2">
                  {memoryCards.length > 0 ? (
                    <p className="text-xs text-[#5E5E5E]">
                      📸 <span className="font-semibold text-[#355E3B]">{memoryCards.length}</span> {memoryCards.length === 1 ? 'memory' : 'memories'} captured so far
                    </p>
                  ) : null}
                  <p className="text-xs text-[#5E5E5E]">
                    🎂 Add family birthdays in member profiles to see them here
                  </p>
                  <p className="text-xs text-[#5E5E5E]">
                    🔔 Event invitations will appear here when shared via the app
                  </p>
                </div>
              </div>

              {/* ── Album Buttons ── */}
              <button
                type="button"
                onClick={() => {
                  setAlbumTypeFilter('memory');
                  setActiveCategory('family_trip');
                  setMode('albums');
                }}
                className="w-full text-left bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#355E3B]/10 text-[#355E3B] flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2B2B2B]">Memory Albums</p>
                    <p className="text-xs text-[#5E5E5E] mt-1">Family trips, visits, festivals, daily moments & milestones.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAlbumTypeFilter('event');
                  setActiveCategory('birthday');
                  setMode('albums');
                }}
                className="w-full text-left bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/16 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#C9A66B]/18 text-[#8B5E3C] flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#2B2B2B]">Event Albums</p>
                    <p className="text-xs text-[#5E5E5E] mt-1">Birthdays, pujas, weddings, anniversaries & celebrations.</p>
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
              {/* Album type header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#2B2B2B]">
                  {albumTypeFilter === 'memory' ? '📸 Memory Albums' : '🎉 Event Albums'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const newType = albumTypeFilter === 'memory' ? 'event' : 'memory';
                    setAlbumTypeFilter(newType);
                    setActiveCategory(newType === 'memory' ? 'family_trip' : 'birthday');
                  }}
                  className="text-xs font-semibold text-[#355E3B] bg-[#355E3B]/8 px-3 py-1.5 rounded-full"
                >
                  Switch to {albumTypeFilter === 'memory' ? 'Events' : 'Memories'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredAlbumCategories.map((category) => {
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
