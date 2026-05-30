'use client';

import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { TopRightMenu } from '@/components/TopRightMenu';
import { uploadImageToCloudinaryViaApi } from '@/lib/cloudinary-upload';

const AlbumCosmos = lazy(() => import('@/components/AlbumCosmos'));
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Cake,
  Heart,
  ImagePlus,
  Images,
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
  imageUrls: string[];
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

type SharePerson = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
};

const MEMORY_PREFIX = '[[memory-image]]';
const TITLE_SEPARATOR = '::';
const QR_PLACEHOLDER = 'Camera QR scan will be added in the next update.';

const ALBUM_CATEGORIES: AlbumCategory[] = [
  // Memory Albums
  { key: 'family_trip', label: 'Family Trip', subtitle: 'Travel together', icon: MapPin, cardClass: 'glass-card', albumType: 'memory' },
  { key: 'family_visit', label: 'Family Visit', subtitle: 'Visiting relatives', icon: Home, cardClass: 'glass-card', albumType: 'memory' },
  { key: 'festivals', label: 'Festivals', subtitle: 'Diwali, Holi, Eid...', icon: Sparkles, cardClass: 'glass-card', albumType: 'memory' },
  { key: 'daily_life', label: 'Daily Life', subtitle: 'Everyday moments', icon: Sun, cardClass: 'glass-card', albumType: 'memory' },
  { key: 'milestones', label: 'Milestones', subtitle: 'First steps, achievements', icon: Trophy, cardClass: 'glass-card', albumType: 'memory' },
  { key: 'custom', label: 'Custom', subtitle: 'Your own category', icon: Plus, cardClass: 'glass-card', albumType: 'memory' },
  // Event Albums
  { key: 'birthday', label: 'Birthday', subtitle: 'Birthday celebrations', icon: Cake, cardClass: 'glass-card', albumType: 'event' },
  { key: 'wedding', label: 'Wedding', subtitle: 'Weddings & engagements', icon: Heart, cardClass: 'glass-card', albumType: 'event' },
  { key: 'anniversary', label: 'Anniversary', subtitle: 'Love milestones', icon: Gift, cardClass: 'glass-card', albumType: 'event' },
  { key: 'puja', label: 'Puja / Ceremony', subtitle: 'Religious & spiritual', icon: Flame, cardClass: 'glass-card', albumType: 'event' },
  { key: 'reunion', label: 'Family Reunion', subtitle: 'Getting together', icon: Users, cardClass: 'glass-card', albumType: 'event' },
  { key: 'graduation', label: 'Graduation', subtitle: 'Academic achievements', icon: GraduationCap, cardClass: 'glass-card', albumType: 'event' },
  { key: 'custom_event', label: 'Custom Event', subtitle: 'Your own event type', icon: Plus, cardClass: 'glass-card', albumType: 'event' },
];

function parseMemoryContent(content: string): ParsedMemory | null {
  if (!content.startsWith(MEMORY_PREFIX)) return null;
  const lines = content.split('\n');
  const imageUrls: string[] = [];
  const captionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(MEMORY_PREFIX)) {
      const url = trimmed.slice(MEMORY_PREFIX.length).trim();
      if (url) imageUrls.push(url);
    } else if (trimmed) {
      captionLines.push(trimmed);
    }
  }

  if (imageUrls.length === 0) return null;
  return { imageUrls, caption: captionLines.join('\n') };
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

  const [mode, setMode] = useState<AlbumMode>('choose');
  const [albumTypeFilter, setAlbumTypeFilter] = useState<'memory' | 'event'>('memory');
  const [activeCategory, setActiveCategory] = useState<AlbumCategoryKey>('family_trip');
  const [showCreate, setShowCreate] = useState(false);

  const [eventTitle, setEventTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [audienceDegree, setAudienceDegree] = useState<string[]>(['All']);
  const [audienceSide, setAudienceSide] = useState<string[]>(['All']);
  const [includeUserIds, setIncludeUserIds] = useState<string[]>([]);
  const [excludeUserIds, setExcludeUserIds] = useState<string[]>([]);

  // Album cosmos viewer state
  const [selectedMemory, setSelectedMemory] = useState<{
    imageUrls: string[];
    title: string;
    caption: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/welcome');
      return;
    }
  }, [authLoading, user, router]);

  const memoriesQueryKey = ['memories', user?.id];
  const sharePeopleQueryKey = ['share-people', user?.id];

  const { data: memories = [], isLoading: loadingMemories, refetch: refetchMemories } = useQuery<MemoryPost[]>({
    queryKey: memoriesQueryKey,
    enabled: Boolean(session?.access_token && user?.id),
    queryFn: async () => {
      const res = await fetch('/api/posts/list?type=post&category=memories', {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (!res.ok) return [] as MemoryPost[];
      const data = await res.json();
      return (data.posts || []) as MemoryPost[];
    },
  });

  const { data: sharePeople = [] } = useQuery<SharePerson[]>({
    queryKey: sharePeopleQueryKey,
    enabled: Boolean(session?.access_token && user?.id),
    queryFn: async () => {
      const res = await fetch('/api/tree/full', {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (!res.ok) return [] as SharePerson[];
      const data = await res.json();
      const nodes = data.nodes || [];

      const byUser = new Map<string, SharePerson>();
      for (const node of nodes) {
        const userId = node.user_id || (node.is_self ? node.owner_id : null);
        if (!userId || userId === user?.id || byUser.has(userId)) continue;
        byUser.set(userId, {
          user_id: userId,
          full_name: node.full_name || 'Relative',
          photo_url: node.photo_url || null,
        });
      }

      return Array.from(byUser.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);


  const memoryCards = useMemo(
    () =>
      memories
        .map((m: MemoryPost) => {
          const parsed = parseMemoryContent(m.content);
          if (!parsed) return null;
          const parsedTitle = parseMemoryTitle(m.title);

          return {
            ...m,
            imageUrls: parsed.imageUrls,
            caption: parsed.caption,
            cleanTitle: parsedTitle.title,
            albumCategory: parsedTitle.category,
          };
        })
        .filter(Boolean) as Array<
        MemoryPost & {
          imageUrls: string[];
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

  const handlePhotosChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));

    setPhotos(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetForm = () => {
    setEventTitle('');
    setCaption('');
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPhotos([]);
    setPreviewUrls([]);
    setUploadProgress(null);
    setError('');
    setAudienceDegree(['All']);
    setAudienceSide(['All']);
    setIncludeUserIds([]);
    setExcludeUserIds([]);
  };

  const handleCreateMemory = async () => {
    if (!user || !session?.access_token) return;
    if (!eventTitle.trim()) {
      setError('Please add a memory title.');
      return;
    }
    if (photos.length === 0) {
      setError('Please upload at least one photo.');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress({ done: 0, total: photos.length });
    try {
      // Upload all photos sequentially
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setUploadProgress({ done: i, total: photos.length });
        const url = await uploadImageToCloudinaryViaApi(photos[i], session.access_token, 'memories');
        uploadedUrls.push(url);
      }
      setUploadProgress({ done: photos.length, total: photos.length });

      // Pack content: each image URL on its own line with prefix, caption at end
      const imageLines = uploadedUrls.map(url => `${MEMORY_PREFIX}${url}`);
      const packedContent = caption.trim()
        ? [...imageLines, caption.trim()].join('\n')
        : imageLines.join('\n');

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
          audience_degrees: audienceDegree,
          audience_sides: audienceSide,
          include_user_ids: includeUserIds,
          exclude_user_ids: excludeUserIds,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create memory');
      }

      setShowCreate(false);
      resetForm();
      await refetchMemories();
      setMode('albums');
    } catch (err) {
      console.error('Failed to create memory:', err);
      setError(err instanceof Error ? err.message : 'Failed to create memory');
    } finally {
      setUploading(false);
      setUploadProgress(null);
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
    <div className="min-h-screen pb-24 animate-pageEnter" style={{ background: 'transparent' }}>
      <div className="max-w-sm mx-auto">
        <div className="glass-header px-5 pt-11 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {mode !== 'choose' && (
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'join') setMode('choose');
                    if (mode === 'albums') setMode('choose');
                  }}
                  className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md text-gray-500 flex items-center justify-center"
                >
                  <ArrowLeft size={17} />
                </button>
              )}
              <div>
                <h1 className="screen-title text-xl text-gray-900">Shared Memory</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {mode === 'choose' && 'Capture and organize family moments'}
                  {mode === 'join' && 'Join an existing shared album'}
                  {mode === 'albums' && 'Browse memories by album type'}
                </p>
              </div>
            </div>
            <TopRightMenu />
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
                  <div className="glass-card rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <CalendarDays size={16} className="text-[#2A4365]" />
                      {monthName}
                    </h3>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <span key={`h-${i}`} className="text-[9px] font-bold text-gray-400 py-1">{d}</span>
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
                                ? 'bg-[#2A4365] text-white font-bold shadow-md'
                                : hasMemory
                                ? 'bg-[#2A4365]/10 text-[#2A4365] font-semibold'
                                : 'text-gray-600'
                            }`}
                          >
                            {day}
                            {hasMemory && !isToday && (
                              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2A4365]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Upcoming Moments Bar ── */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#2A4365]" />
                  Upcoming Moments
                </h3>
                <div className="space-y-2">
                  {memoryCards.length > 0 ? (
                    <p className="text-xs text-gray-500">
                        <span className="font-semibold text-[#2A4365]">{memoryCards.length}</span> {memoryCards.length === 1 ? 'memory' : 'memories'} captured so far
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-500">
                    Add family birthdays in member profiles to see them here
                  </p>
                  <p className="text-xs text-gray-500">
                    Event invitations will appear here when shared via the app
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
                className="w-full text-left glass-card rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#2A4365]/10 text-[#2A4365] flex items-center justify-center">
                    <Camera size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">Memory Albums</p>
                    <p className="text-xs text-gray-500 mt-1">Family trips, visits, festivals, daily moments & milestones.</p>
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
                className="w-full text-left glass-card rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#2A4365]/10 text-[#2A4365] flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">Event Albums</p>
                    <p className="text-xs text-gray-500 mt-1">Birthdays, pujas, weddings, anniversaries & celebrations.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('join');
                  setJoinError('');
                }}
                className="w-full text-left glass-card rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#2A4365]/10 text-[#2A4365] flex items-center justify-center">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">Join Existing Album</p>
                    <p className="text-xs text-gray-500 mt-1">Use album code or QR from family to join their shared memories.</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-3">
              <div className="glass-card rounded-2xl p-4">
                <p className="text-sm font-semibold text-gray-900">Album Code</p>
                <input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="Enter album code"
                  className="mt-2 w-full rounded-xl glass-input px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#2A4365]/20"
                />
              </div>

              <div className="glass-card rounded-2xl p-4">
                <p className="text-sm font-semibold text-gray-900">Scan QR</p>
                <button
                  type="button"
                  onClick={() => setJoinError(QR_PLACEHOLDER)}
                  className="mt-2 w-full rounded-xl border border-dashed border-gray-300 bg-white/50 backdrop-blur-md px-3 py-5 text-[#2A4365] flex items-center justify-center gap-2"
                >
                  <ScanLine size={18} />
                  <span className="text-sm font-medium">Scan album QR code</span>
                </button>
              </div>

              {joinError && (
                <p className="text-xs text-red-600 bg-red-500/8 border border-red-500/15 rounded-lg px-2.5 py-2">
                  {joinError}
                </p>
              )}

              <button
                type="button"
                onClick={handleJoinAlbum}
                className="w-full py-2.5 rounded-xl bg-[#2A4365] text-white text-sm font-semibold hover:bg-[#2A4365]/90"
              >
                Continue
              </button>
            </div>
          )}

          {mode === 'albums' && (
            <div>
              {/* Album type header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">
                  {albumTypeFilter === 'memory' ? 'Memory Albums' : 'Event Albums'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const newType = albumTypeFilter === 'memory' ? 'event' : 'memory';
                    setAlbumTypeFilter(newType);
                    setActiveCategory(newType === 'memory' ? 'family_trip' : 'birthday');
                  }}
                  className="text-xs font-semibold text-[#2A4365] bg-[#2A4365]/8 px-3 py-1.5 rounded-full"
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
                      className={`${category.cardClass} relative rounded-2xl p-3 text-left transition ${
                        active ? 'ring-2 ring-[#2A4365]/25 border-[#2A4365]/30' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/60 backdrop-blur-md border border-white/30 text-[#2A4365] flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <p className="mt-3 text-sm font-bold text-gray-900">{category.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{countsByCategory[category.key]} memories</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 glass-card rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{activeCategoryMeta.label} Memories</h2>
                    <p className="text-[11px] text-gray-500">{activeCategoryMeta.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="w-9 h-9 rounded-full bg-[#2A4365] text-white flex items-center justify-center shadow-md"
                  >
                    <ImagePlus size={17} />
                  </button>
                </div>

                {loadingMemories ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={22} className="text-[#2A4365] animate-spin" />
                  </div>
                ) : filteredMemories.length === 0 ? (
                  <div className="text-center py-7 px-3 rounded-xl border border-dashed border-gray-300 bg-white/40 backdrop-blur-md">
                    <Camera size={24} className="mx-auto text-gray-400" />
                    <p className="mt-2 text-sm font-semibold text-gray-900">No memories yet</p>
                    <p className="text-xs text-gray-500 mt-1">Add your first photo in {activeCategoryMeta.label.toLowerCase()} album.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredMemories.map((memory) => (
                      <article
                        key={memory.id}
                        className="glass-card rounded-xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
                        onClick={() => setSelectedMemory({
                          imageUrls: memory.imageUrls,
                          title: memory.cleanTitle,
                          caption: memory.caption,
                        })}
                      >
                        <div className="relative">
                          <img src={memory.imageUrls[0]} alt={memory.cleanTitle} className="w-full h-28 object-cover" />
                          {memory.imageUrls.length > 1 && (
                            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Images size={10} />
                              {memory.imageUrls.length}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-bold text-gray-900 line-clamp-1">{memory.cleanTitle}</p>
                          {memory.caption && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{memory.caption}</p>}
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
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
          <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center">
            <div className="w-full max-w-sm bg-white/80 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-white/30 max-h-[90vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {/* Fixed header */}
              <div className="px-5 pt-5 pb-2 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900">Add Memory</h3>
                <p className="text-xs text-gray-500 mt-0.5">Album: {activeCategoryMeta.label}</p>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 pb-2">
                <div className="space-y-3">
                  <input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Memory title"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm outline-none focus:ring-1 focus:ring-[#2A4365]/20"
                  />
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Caption (optional)"
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm outline-none resize-none focus:ring-1 focus:ring-[#2A4365]/20"
                  />
                  <label className="w-full rounded-xl border border-dashed border-gray-300 px-3.5 py-3 text-sm text-gray-500 flex items-center gap-2 cursor-pointer hover:bg-white/40">
                    <UploadCloud size={16} className="text-[#2A4365]" />
                    {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Upload memory photos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotosChange(e.target.files)}
                    />
                  </label>
                  {previewUrls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative flex-shrink-0">
                          <img src={url} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200/30" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audience Picker */}
                  <div className="pt-1">
                    <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Users size={13} className="text-[#2A4365]" /> Share With
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Column 1: Degree */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Degree</p>
                        {['1st Degree', '2nd Degree', '3rd+ Degree', 'All'].map(deg => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setAudienceDegree(prev =>
                              prev.includes(deg) ? prev.filter(d => d !== deg) : [...prev, deg]
                            )}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              audienceDegree.includes(deg)
                                ? 'bg-[#2A4365] text-white shadow-sm'
                                : 'glass-input text-gray-900 hover:bg-white/60'
                            }`}
                          >
                            {deg}
                          </button>
                        ))}
                      </div>
                      {/* Column 2: Side */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Side</p>
                        {['Maternal', 'Paternal', 'In-Laws', 'Spouse', 'All'].map(side => (
                          <button
                            key={side}
                            type="button"
                            onClick={() => setAudienceSide(prev =>
                              prev.includes(side) ? prev.filter(s => s !== side) : [...prev, side]
                            )}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              audienceSide.includes(side)
                                ? 'bg-[#2A4365] text-white shadow-sm'
                                : 'glass-input text-gray-900 hover:bg-white/60'
                            }`}
                          >
                            {side}
                          </button>
                        ))}
                      </div>
                    </div>
                    {sharePeople.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Individuals</p>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          {sharePeople.map((person: SharePerson) => (
                            <div key={person.user_id} className="rounded-lg border border-gray-200/60 bg-white/55 px-2.5 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#2A4365]/10 overflow-hidden flex items-center justify-center">
                                  {person.photo_url ? (
                                    <img src={person.photo_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Users size={12} className="text-[#2A4365]/70" />
                                  )}
                                </div>
                                <p className="text-xs font-medium text-gray-800 flex-1 truncate">{person.full_name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIncludeUserIds((prev) =>
                                      prev.includes(person.user_id) ? prev.filter((id) => id !== person.user_id) : [...prev, person.user_id]
                                    );
                                    setExcludeUserIds((prev) => prev.filter((id) => id !== person.user_id));
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                                    includeUserIds.includes(person.user_id) ? 'bg-[#2A4365] text-white' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  Include
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExcludeUserIds((prev) =>
                                      prev.includes(person.user_id) ? prev.filter((id) => id !== person.user_id) : [...prev, person.user_id]
                                    );
                                    setIncludeUserIds((prev) => prev.filter((id) => id !== person.user_id));
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                                    excludeUserIds.includes(person.user_id) ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  Exclude
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-500/8 border border-red-500/15 rounded-lg px-2.5 py-2">
                      {error}
                    </p>
                  )}
                </div>
              </div>

              {/* Fixed footer buttons */}
              <div className="px-5 pt-2 pb-4 flex gap-2 flex-shrink-0 border-t border-gray-200/30">
                <button
                  onClick={handleCreateMemory}
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-[#2A4365] text-white text-sm font-semibold hover:bg-[#2A4365]/90 disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {uploading
                    ? uploadProgress
                      ? `Uploading ${uploadProgress.done}/${uploadProgress.total}...`
                      : 'Saving...'
                    : 'Share Memory'}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/40 backdrop-blur-md text-gray-500 text-sm font-semibold hover:bg-white/60 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Album Cosmos 3D Viewer */}
        {selectedMemory && (
          <Suspense fallback={
            <div className="fixed inset-0 z-60 bg-[#060b16] flex items-center justify-center">
              <Loader2 size={28} className="text-[#10B981] animate-spin" />
            </div>
          }>
            <AlbumCosmos
              imageUrls={selectedMemory.imageUrls}
              title={selectedMemory.title}
              caption={selectedMemory.caption}
              onBack={() => setSelectedMemory(null)}
            />
          </Suspense>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
