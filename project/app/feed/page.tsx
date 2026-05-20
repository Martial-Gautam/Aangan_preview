'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Heart, MessageCircle, Send, Plus, Loader2, ArrowUp, ArrowDown,
  Newspaper, MessagesSquare, Tag, Trash2, Image, Film, Mail, Users,
  Eye, EyeOff, Sparkles, TrendingUp, Camera
} from 'lucide-react';
import { StreamChat } from 'stream-chat';
import type { Channel as StreamChannel } from 'stream-chat';

// ─── Constants ───────────────────────────────────────────────

type PostType = 'post' | 'discussion';
type ContentType = 'post' | 'image' | 'reel' | 'invitation';

const CONTENT_TYPES: { key: ContentType; label: string; icon: typeof Newspaper }[] = [
  { key: 'post', label: 'Posts', icon: Newspaper },
  { key: 'image', label: 'Images', icon: Image },
  { key: 'reel', label: 'Reels', icon: Film },
  { key: 'invitation', label: 'Invites', icon: Mail },
];

interface Post {
  id: string;
  author_id: string;
  type: PostType;
  title: string | null;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  created_at: string;
  author: { id?: string; full_name: string; photo_url: string | null };
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { full_name: string; photo_url: string | null };
}

const CATEGORIES = ['general', 'family-news', 'memories', 'question', 'celebration'];
const CATEGORY_COLORS: Record<string, string> = {
  'general': 'bg-[#6E8B74]/10 text-[#6E8B74]',
  'family-news': 'bg-[#355E3B]/10 text-[#355E3B]',
  'memories': 'bg-[#C9A66B]/15 text-[#8B5E3C]',
  'question': 'bg-[#B76E5D]/10 text-[#B76E5D]',
  'celebration': 'bg-[#C9A66B]/15 text-[#C9A66B]',
};

// ─── Main Export ─────────────────────────────────────────────

export default function FeedPage() {
  return <FeedContent />;
}

// ─── Feed Content ────────────────────────────────────────────

function FeedContent() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [useStreamBackend, setUseStreamBackend] = useState(true);

  const [feedChannel, setFeedChannel] = useState<StreamChannel | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<PostType>('post');
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Create form
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createType, setCreateType] = useState<PostType>('post');
  const [createContentType, setCreateContentType] = useState<ContentType>('post');
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('general');
  const [creating, setCreating] = useState(false);
  const [audienceDegree, setAudienceDegree] = useState<string[]>(['All']);
  const [audienceSide, setAudienceSide] = useState<string[]>(['All']);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Feed sections
  const [feedSection, setFeedSection] = useState<'stories' | 'community'>('stories');
  const [activeContentType, setActiveContentType] = useState<ContentType>('post');

  // Comments
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.replace('/welcome');
  }, [authLoading, user]);

  // Init: try Stream, fallback to Supabase
  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    initBackend();
  }, [user?.id, session?.access_token]);

  // Reload on tab change
  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    if (useStreamBackend && feedChannel) loadStreamPosts();
    else if (!useStreamBackend) fetchSupabasePosts(activeTab);
  }, [activeTab, feedChannel, useStreamBackend]);

  const [streamClient, setStreamClient] = useState<StreamChat | null>(null);

  const initBackend = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (!apiKey) throw new Error('No key');

      const res = await fetch('/api/stream/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (!res.ok) throw new Error('Token failed');

      const { token, userId, userName, userImage } = await res.json();
      const client = StreamChat.getInstance(apiKey);
      await client.connectUser({ id: userId, name: userName, image: userImage || undefined }, token);
      setStreamClient(client);

      const channel = client.channel('messaging', 'family-feed', {
        name: 'Family Feed', members: [userId],
      } as any);
      await channel.watch();
      setFeedChannel(channel);
      setUseStreamBackend(true);

      channel.on('message.new', () => loadPostsFromChannel(channel));
      channel.on('reaction.new', () => loadPostsFromChannel(channel));
      channel.on('reaction.deleted', () => loadPostsFromChannel(channel));
    } catch (err) {
      console.warn('⚠️ Stream unavailable for feed, using Supabase:', err);
      setUseStreamBackend(false);
      fetchSupabasePosts(activeTab);
    }
  };

  // ─── Stream Methods ─────────────────────────────────

  const loadStreamPosts = () => { if (feedChannel) loadPostsFromChannel(feedChannel); };

  const loadPostsFromChannel = async (channel: StreamChannel) => {
    setLoadingPosts(true);
    try {
      const all = channel.state.messages || [];
      const filtered = all.filter((m: any) => (m.post_type || 'post') === activeTab && !m.parent_id);
      setPosts([...filtered].reverse());
    } catch { setPosts([]); }
    finally { setLoadingPosts(false); }
  };

  // ─── Supabase Fallback Methods ──────────────────────

  const fetchSupabasePosts = async (type: PostType) => {
    if (!session?.access_token) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts/list?type=${type}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      } else { setPosts([]); }
    } catch { setPosts([]); }
    finally { setLoadingPosts(false); }
  };

  // ─── Create Post (both backends) ────────────────────

  const handleCreate = async () => {
    if (!createContent.trim()) return;
    if (createType === 'discussion' && !createTitle.trim()) return;
    setCreating(true);
    try {
      if (useStreamBackend && feedChannel) {
        await feedChannel.sendMessage({
          text: createContent.trim(),
          post_type: createType,
          post_title: createType === 'discussion' ? createTitle.trim() : undefined,
          post_category: createCategory,
        } as any);
      } else {
        await fetch('/api/posts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
          body: JSON.stringify({
            type: createType,
            title: createType === 'discussion' ? createTitle.trim() : null,
            content: createContent.trim(),
            category: createCategory,
          }),
        });
      }
      setShowCreateSheet(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateCategory('general');
      setActiveTab(createType);
      if (!useStreamBackend) fetchSupabasePosts(createType);
    } catch (err) { console.error('Create failed:', err); }
    finally { setCreating(false); }
  };

  // ─── Like (both backends) ──────────────────────────

  const handleLike = async (post: any) => {
    if (useStreamBackend && feedChannel) {
      try {
        const rt = feedSection === 'community' ? 'upvote' : 'love';
        const has = post.own_reactions?.some((r: any) => r.type === rt);
        if (has) await feedChannel.deleteReaction(post.id, rt);
        else await feedChannel.sendReaction(post.id, { type: rt });
      } catch {}
    } else {
      // Optimistic update
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p));
      try {
        await fetch('/api/posts/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
          body: JSON.stringify({ post_id: post.id }),
        });
      } catch { fetchSupabasePosts(activeTab); }
    }
  };

  // ─── Comments (both backends) ──────────────────────

  const openComments = async (post: any) => {
    setSelectedMessage(post);
    setShowCommentsSheet(true);
    setLoadingReplies(true);
    try {
      if (useStreamBackend && feedChannel) {
        const response = await feedChannel.getReplies(post.id, { limit: 50 });
        setReplies(response.messages || []);
      } else {
        const res = await fetch(`/api/posts/comments?post_id=${post.id}`, {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        });
        if (res.ok) { const d = await res.json(); setReplies(d.comments || []); }
        else setReplies([]);
      }
    } catch { setReplies([]); }
    finally { setLoadingReplies(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedMessage) return;
    setSendingComment(true);
    try {
      if (useStreamBackend && feedChannel) {
        const response = await feedChannel.sendMessage({ text: newComment.trim(), parent_id: selectedMessage.id });
        if (response.message) setReplies(prev => [...prev, response.message]);
      } else {
        const res = await fetch('/api/posts/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
          body: JSON.stringify({ post_id: selectedMessage.id, content: newComment.trim() }),
        });
        if (res.ok) {
          const d = await res.json();
          setReplies(prev => [...prev, { ...d.comment, author: { full_name: 'You', photo_url: null } }]);
          setPosts(prev => prev.map(p => p.id === selectedMessage.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        }
      }
      setNewComment('');
    } catch (err) { console.error('Comment failed:', err); }
    finally { setSendingComment(false); }
  };

  // ─── Delete (both backends) ─────────────────────────

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      if (useStreamBackend && streamClient) {
        await streamClient.deleteMessage(postId);
      } else {
        await fetch('/api/posts/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
          body: JSON.stringify({ post_id: postId }),
        });
      }
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error('Delete failed:', err); }
  };

  // ─── Helpers ────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getReactionCount = (msg: any, type: string) => {
    return msg.reaction_counts?.[type] || 0;
  };

  const hasMyReaction = (msg: any, type: string) => {
    return msg.own_reactions?.some((r: any) => r.type === type) || false;
  };

  // ─── Loading ────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
        <Loader2 size={24} className="text-[#355E3B] animate-spin" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#EFE6D5]/40 pb-24 animate-pageEnter">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-5 pt-12 pb-3 shadow-sm border-b border-[#C9A66B]/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-[#2B2B2B]">Feed</h1>
              <p className="text-[10px] text-[#5E5E5E]/60 font-medium">Share with your family</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-[#5E5E5E]/40 uppercase tracking-wider">Section</span>
            </div>
          </div>

          {/* Two-Section Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setFeedSection('stories'); setActiveTab('post'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                feedSection === 'stories'
                  ? 'bg-gradient-to-r from-[#355E3B] to-[#4a7a52] text-white shadow-lg shadow-[#355E3B]/20'
                  : 'bg-[#EFE6D5]/60 text-[#5E5E5E] hover:bg-[#EFE6D5]'
              }`}
            >
              <Camera size={15} />
              Stories
            </button>
            <button
              onClick={() => { setFeedSection('community'); setActiveTab('post'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                feedSection === 'community'
                  ? 'bg-gradient-to-r from-[#C9A66B] to-[#8B5E3C] text-white shadow-lg shadow-[#C9A66B]/20'
                  : 'bg-[#EFE6D5]/60 text-[#5E5E5E] hover:bg-[#EFE6D5]'
              }`}
            >
              <MessagesSquare size={15} />
              Community
            </button>
          </div>

          {/* Sub-tabs for Stories section */}
          {feedSection === 'stories' && (
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {CONTENT_TYPES.map(ct => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.key}
                    onClick={() => setActiveContentType(ct.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      activeContentType === ct.key
                        ? 'bg-[#355E3B]/10 text-[#355E3B] border border-[#355E3B]/20'
                        : 'text-[#5E5E5E]/60 hover:text-[#5E5E5E]'
                    }`}
                  >
                    <Icon size={12} />
                    {ct.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-tabs for Community section */}
          {feedSection === 'community' && (
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCreateCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-all whitespace-nowrap flex-shrink-0 ${
                    createCategory === cat
                      ? CATEGORY_COLORS[cat] + ' border border-current/10'
                      : 'text-[#5E5E5E]/60 hover:text-[#5E5E5E]'
                  }`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Posts */}
        <div className="px-4 space-y-3 mt-4">
          {loadingPosts ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#C9A66B]/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton w-24 h-2.5" />
                      <div className="skeleton w-14 h-2" />
                    </div>
                  </div>
                  <div className="skeleton w-full h-2.5" />
                  <div className="skeleton w-3/4 h-2.5" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-[#FAF7F2] rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-[#C9A66B]/15">
              <div className="w-16 h-16 rounded-full bg-[#355E3B]/8 flex items-center justify-center mb-4">
                {feedSection === 'stories' ? (
                  <Camera size={28} className="text-[#6E8B74]" />
                ) : (
                  <MessagesSquare size={28} className="text-[#6E8B74]" />
                )}
              </div>
              <h3 className="font-bold text-[#2B2B2B] mb-1">
                No {feedSection === 'stories' ? 'stories' : 'posts'} yet
              </h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Be the first to share something with your family!
              </p>
            </div>
          ) : (
            posts.map((msg: any) => {
              // Normalize across both backends
              const authorName = useStreamBackend ? (msg.user?.name || 'Family Member') : (msg.author?.full_name || 'Family Member');
              const authorImage = useStreamBackend ? (msg.user?.image || null) : (msg.author?.photo_url || null);
              const authorId = useStreamBackend ? msg.user?.id : msg.author_id;
              const postTitle = useStreamBackend ? msg.post_title : msg.title;
              const postText = useStreamBackend ? msg.text : msg.content;
              const postCategory = useStreamBackend ? (msg.post_category || 'general') : (msg.category || 'general');
              const reactionType = feedSection === 'community' ? 'upvote' : 'love';
              const likeCount = useStreamBackend ? getReactionCount(msg, reactionType) : (msg.likes_count || 0);
              const liked = useStreamBackend ? hasMyReaction(msg, reactionType) : (msg.liked_by_me || false);
              const replyCount = useStreamBackend ? (msg.reply_count || 0) : (msg.comments_count || 0);

              return (
                <div key={msg.id} className="bg-[#FAF7F2] rounded-2xl shadow-sm border border-[#C9A66B]/10 overflow-hidden">
                  {/* Author */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#355E3B] to-[#6E8B74] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {authorImage ? (
                        <img src={authorImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{getInitials(authorName)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#2B2B2B] truncate">{authorName}</p>
                      <p className="text-[10px] text-[#5E5E5E]/60">{msg.created_at ? formatTime(msg.created_at) : ''}</p>
                    </div>
                    {feedSection === 'community' && postCategory && (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${CATEGORY_COLORS[postCategory] || CATEGORY_COLORS.general}`}>
                        {postCategory.replace('-', ' ')}
                      </span>
                    )}
                    {authorId === user?.id && (
                      <button onClick={() => handleDelete(msg.id)} className="p-1.5 rounded-lg hover:bg-[#6B2E2E]/8 transition-colors">
                        <Trash2 size={14} className="text-[#5E5E5E]/40" />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="px-4 pb-3">
                    {postTitle && (
                      <h3 className="text-base font-bold text-[#2B2B2B] mb-1.5">{postTitle}</h3>
                    )}
                    <p className="text-sm text-[#2B2B2B] leading-relaxed whitespace-pre-wrap">{postText}</p>
                  </div>

                    {/* Actions — different per section */}
                  <div className="flex items-center border-t border-[#C9A66B]/8 px-4 py-2.5">
                    {feedSection === 'community' ? (
                      <>
                        <button
                          onClick={() => handleLike(msg)}
                          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                            liked ? 'text-[#355E3B]' : 'text-[#5E5E5E]/60 hover:text-[#355E3B]'
                          }`}
                        >
                          <ArrowUp size={16} className={liked ? 'text-[#355E3B]' : ''} />
                          <span>{likeCount}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-[#5E5E5E]/40 ml-1 transition-colors hover:text-[#5E5E5E]">
                          <ArrowDown size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleLike(msg)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                          liked ? 'text-[#B76E5D]' : 'text-[#5E5E5E]/60 hover:text-[#B76E5D]'
                        }`}
                      >
                        <Heart size={16} fill={liked ? '#B76E5D' : 'none'} />
                        <span>{likeCount}</span>
                      </button>
                    )}
                    <button
                      onClick={() => openComments(msg)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#5E5E5E]/60 hover:text-[#355E3B] transition-colors ml-5"
                    >
                      <MessageCircle size={16} />
                      <span>{replyCount}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-20 right-4 z-30 sm:right-[calc(50%-12rem)]">
          <button
            onClick={() => { setCreateType(activeTab); setShowCreateSheet(true); }}
            className="w-14 h-14 bg-gradient-to-br from-[#355E3B] to-[#6E8B74] rounded-full flex items-center justify-center shadow-xl shadow-[#355E3B]/30 hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-90 transition-all"
          >
            <Plus size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Create Content</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#2B2B2B]">✨ Create</h2>
            {/* Anonymous toggle — Community only */}
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                isAnonymous
                  ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] border border-[#8B5E3C]/20'
                  : 'bg-[#EFE6D5]/60 text-[#5E5E5E]/60'
              }`}
            >
              {isAnonymous ? <EyeOff size={12} /> : <Eye size={12} />}
              {isAnonymous ? 'Anonymous' : 'Visible'}
            </button>
          </div>

          {/* Content Type Selector */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-[#5E5E5E] uppercase tracking-wide mb-1.5">Type</p>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {CONTENT_TYPES.map(ct => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.key}
                    onClick={() => setCreateContentType(ct.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      createContentType === ct.key
                        ? 'bg-[#355E3B] text-white'
                        : 'bg-[#EFE6D5]/60 text-[#5E5E5E]'
                    }`}
                  >
                    <Icon size={13} />
                    {ct.label}
                  </button>
                );
              })}
              <button
                onClick={() => setCreateType(createType === 'discussion' ? 'post' : 'discussion')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  createType === 'discussion'
                    ? 'bg-[#C9A66B] text-white'
                    : 'bg-[#EFE6D5]/60 text-[#5E5E5E]'
                }`}
              >
                <MessagesSquare size={13} />
                Discussion
              </button>
            </div>
          </div>

          {createType === 'discussion' && (
            <input
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              placeholder="Discussion title..."
              className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40"
            />
          )}

          {createContentType === 'invitation' && (
            <input
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              placeholder="Event name..."
              className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40"
            />
          )}

          <textarea
            value={createContent}
            onChange={e => setCreateContent(e.target.value)}
            placeholder={
              createContentType === 'invitation' ? 'Add invitation details...'
              : createContentType === 'reel' ? 'Add a caption for your reel...'
              : createContentType === 'image' ? 'Describe your photo...'
              : createType === 'discussion' ? 'Share your thoughts...'
              : "What's on your mind?"
            }
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40 resize-none"
          />

          {createType === 'discussion' && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-[#5E5E5E] mb-2 flex items-center gap-1">
                <Tag size={12} /> Category
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCreateCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                      createCategory === cat
                        ? 'bg-[#355E3B] text-white'
                        : 'bg-[#EFE6D5]/60 text-[#5E5E5E] hover:bg-[#EFE6D5]'
                    }`}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Audience Picker */}
          <div className="mb-4">
            <p className="text-xs font-bold text-[#2B2B2B] mb-2 flex items-center gap-1.5">
              <Users size={13} className="text-[#355E3B]" /> Share With
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Column 1: Degree */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-[#5E5E5E] uppercase tracking-wide">Degree</p>
                {['1st Degree', '2nd Degree', '3rd+ Degree', 'All'].map(deg => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setAudienceDegree(prev =>
                      prev.includes(deg) ? prev.filter(d => d !== deg) : [...prev, deg]
                    )}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      audienceDegree.includes(deg)
                        ? 'bg-[#355E3B] text-white shadow-sm'
                        : 'bg-white border border-[#C9A66B]/15 text-[#2B2B2B] hover:bg-[#EFE6D5]/50'
                    }`}
                  >
                    {deg}
                  </button>
                ))}
              </div>
              {/* Column 2: Side */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-[#5E5E5E] uppercase tracking-wide">Side</p>
                {['Maternal', 'Paternal', 'In-Laws', 'Spouse', 'All'].map(side => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setAudienceSide(prev =>
                      prev.includes(side) ? prev.filter(s => s !== side) : [...prev, side]
                    )}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      audienceSide.includes(side)
                        ? 'bg-[#C9A66B] text-white shadow-sm'
                        : 'bg-white border border-[#C9A66B]/15 text-[#2B2B2B] hover:bg-[#EFE6D5]/50'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !createContent.trim() || (createType === 'discussion' && !createTitle.trim())}
            className="w-full py-3.5 bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white rounded-2xl text-sm font-bold hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] transition-all shadow-lg shadow-[#355E3B]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {creating ? 'Posting...' : 'Publish'}
          </button>
        </SheetContent>
      </Sheet>

      {/* Comments Sheet */}
      <Sheet open={showCommentsSheet} onOpenChange={setShowCommentsSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-6 pt-4 max-h-[80vh] flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <h2 className="text-base font-bold text-[#2B2B2B] mb-3">💬 Comments</h2>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
            {loadingReplies ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="text-[#355E3B] animate-spin" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-[#5E5E5E] text-center py-6">No comments yet. Be the first!</p>
            ) : (
              replies.map((reply: any) => {
                const rName = useStreamBackend ? (reply.user?.name || 'User') : (reply.author?.full_name || 'User');
                const rImage = useStreamBackend ? (reply.user?.image || null) : (reply.author?.photo_url || null);
                const rText = useStreamBackend ? reply.text : reply.content;
                return (
                <div key={reply.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#355E3B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {rImage ? (
                      <img src={rImage} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-[#355E3B]">{getInitials(rName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[#2B2B2B]">{rName}</span>
                      <span className="text-[9px] text-[#5E5E5E]/50">{reply.created_at ? formatTime(reply.created_at) : ''}</span>
                    </div>
                    <p className="text-sm text-[#2B2B2B] mt-0.5 leading-relaxed">{rText}</p>
                  </div>
                </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#EFE6D5]/50 border border-[#C9A66B]/15 text-sm outline-none placeholder:text-[#5E5E5E]/40 text-[#2B2B2B] focus:border-[#355E3B]/30"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || sendingComment}
              className="w-9 h-9 rounded-xl bg-[#355E3B] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
            >
              {sendingComment ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <Send size={14} className="text-white" />
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
