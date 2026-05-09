'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Heart, MessageCircle, Send, Plus, Loader2, ArrowUp,
  Newspaper, MessagesSquare, Tag, Trash2
} from 'lucide-react';

type PostType = 'post' | 'discussion';

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

function buildDummyPosts(type: PostType): Post[] {
  const now = Date.now();
  if (type === 'discussion') {
    return [
      {
        id: 'dummy-discussion-1',
        author_id: 'dummy-author-1',
        type: 'discussion',
        title: 'Who has old wedding albums from our grandparents?',
        content: 'I want to create a memory thread this weekend. If you have photos, please share them here.',
        category: 'memories',
        likes_count: 4,
        comments_count: 2,
        liked_by_me: false,
        created_at: new Date(now - 1000 * 60 * 60 * 7).toISOString(),
        author: { full_name: 'Aangan Demo', photo_url: null },
      },
      {
        id: 'dummy-discussion-2',
        author_id: 'dummy-author-2',
        type: 'discussion',
        title: 'Family gathering menu ideas',
        content: 'Let’s decide 5 dishes everyone likes. Add your top 2 suggestions.',
        category: 'general',
        likes_count: 6,
        comments_count: 3,
        liked_by_me: false,
        created_at: new Date(now - 1000 * 60 * 60 * 28).toISOString(),
        author: { full_name: 'Aangan Demo', photo_url: null },
      },
    ];
  }

  return [
    {
      id: 'dummy-post-1',
      author_id: 'dummy-author-3',
      type: 'post',
      title: 'Welcome to your Family Feed',
      content: 'This is a sample post so your feed never feels empty. Start posting stories and updates with your family.',
      category: 'general',
      likes_count: 8,
      comments_count: 2,
      liked_by_me: false,
      created_at: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      author: { full_name: 'Aangan Demo', photo_url: null },
    },
    {
      id: 'dummy-post-2',
      author_id: 'dummy-author-4',
      type: 'post',
      title: 'Memory of the week',
      content: 'Upload one childhood photo and write a short story. It is a great way to preserve family history.',
      category: 'memories',
      likes_count: 5,
      comments_count: 1,
      liked_by_me: false,
      created_at: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
      author: { full_name: 'Aangan Demo', photo_url: null },
    },
  ];
}

function buildDummyComments(postId: string): Comment[] {
  const now = Date.now();
  const shared = [
    {
      id: `${postId}-comment-1`,
      post_id: postId,
      author_id: 'dummy-author-c1',
      content: 'Love this idea. Let us do this every weekend.',
      created_at: new Date(now - 1000 * 60 * 40).toISOString(),
      author: { full_name: 'Aangan Demo', photo_url: null },
    },
    {
      id: `${postId}-comment-2`,
      post_id: postId,
      author_id: 'dummy-author-c2',
      content: 'I can share photos from our older albums too.',
      created_at: new Date(now - 1000 * 60 * 15).toISOString(),
      author: { full_name: 'Aangan Demo', photo_url: null },
    },
  ];
  return shared;
}

export default function FeedPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<PostType>('post');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Create form
  const [createType, setCreateType] = useState<PostType>('post');
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('general');
  const [creating, setCreating] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/welcome'); return; }
    seedDemoSocial();
    fetchPosts(activeTab);
  }, [user, authLoading, activeTab, session?.access_token]);

  const seedDemoSocial = async () => {
    if (!user?.id || !session?.access_token) return;
    const storageKey = `aangan_demo_social_seeded_${user.id}`;
    const alreadySeeded = typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1';
    if (alreadySeeded) return;

    try {
      await fetch('/api/demo/seed-social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      localStorage.setItem(storageKey, '1');
    } catch (err) {
      console.error('Failed to seed demo social data:', err);
    }
  };

  const fetchPosts = async (type: PostType) => {
    if (!session?.access_token) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts/list?type=${type}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched = data.posts || [];
        setPosts(fetched.length > 0 ? fetched : buildDummyPosts(type));
      } else {
        setPosts(buildDummyPosts(type));
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setPosts(buildDummyPosts(type));
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLike = async (postId: string) => {
    const isDummyPost = postId.startsWith('dummy-');
    if (!session?.access_token) return;
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          liked_by_me: !p.liked_by_me,
          likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1,
        };
      }
      return p;
    }));

    if (isDummyPost) return;

    try {
      await fetch('/api/posts/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ post_id: postId }),
      });
    } catch (err) {
      console.error('Failed to like:', err);
      // Revert on error
      fetchPosts(activeTab);
    }
  };

  const handleCreate = async () => {
    if (!session?.access_token || !createContent.trim()) return;
    if (createType === 'discussion' && !createTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: createType,
          title: createType === 'discussion' ? createTitle.trim() : null,
          content: createContent.trim(),
          category: createCategory,
        }),
      });
      if (res.ok) {
        setShowCreateSheet(false);
        setCreateTitle('');
        setCreateContent('');
        setCreateCategory('general');
        setActiveTab(createType);
        fetchPosts(createType);
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (postId.startsWith('dummy-')) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      return;
    }
    if (!session?.access_token) return;
    if (!confirm('Delete this post?')) return;
    try {
      await fetch('/api/posts/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ post_id: postId }),
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const openComments = async (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentsSheet(true);
    setLoadingComments(true);
    if (postId.startsWith('dummy-')) {
      setComments(buildDummyComments(postId));
      setLoadingComments(false);
      return;
    }
    try {
      const res = await fetch(`/api/posts/comments?post_id=${postId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched = data.comments || [];
        setComments(fetched.length > 0 ? fetched : buildDummyComments(postId));
      } else {
        setComments(buildDummyComments(postId));
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setComments(buildDummyComments(postId));
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!session?.access_token || !newComment.trim() || !selectedPostId) return;
    if (selectedPostId.startsWith('dummy-')) {
      const dummyComment: Comment = {
        id: `dummy-local-${Date.now()}`,
        post_id: selectedPostId,
        author_id: user?.id || 'dummy-user',
        content: newComment.trim(),
        created_at: new Date().toISOString(),
        author: { full_name: 'You', photo_url: null },
      };
      setComments(prev => [...prev, dummyComment]);
      setNewComment('');
      setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, comments_count: p.comments_count + 1 } : p));
      return;
    }
    setSendingComment(true);
    try {
      const res = await fetch('/api/posts/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ post_id: selectedPostId, content: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, { ...data.comment, author: { full_name: 'You', photo_url: null } }]);
        setNewComment('');
        // Update comment count
        setPosts(prev => prev.map(p => p.id === selectedPostId ? { ...p, comments_count: p.comments_count + 1 } : p));
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#EFE6D5]/40 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-6 pt-12 pb-3 shadow-sm border-b border-[#C9A66B]/10">
          <h1 className="text-xl font-bold text-[#2B2B2B]">Family Feed</h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">Share stories, memories & discussions</p>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('post')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'post'
                  ? 'bg-[#355E3B] text-white shadow-md shadow-[#355E3B]/20'
                  : 'bg-[#EFE6D5]/60 text-[#5E5E5E] hover:bg-[#EFE6D5]'
              }`}
            >
              <Newspaper size={16} />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('discussion')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'discussion'
                  ? 'bg-[#355E3B] text-white shadow-md shadow-[#355E3B]/20'
                  : 'bg-[#EFE6D5]/60 text-[#5E5E5E] hover:bg-[#EFE6D5]'
              }`}
            >
              <MessagesSquare size={16} />
              Discussions
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="px-4 space-y-3 mt-4">
          {loadingPosts ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-[#355E3B] animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-[#FAF7F2] rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-[#C9A66B]/15">
              <div className="w-16 h-16 rounded-full bg-[#355E3B]/8 flex items-center justify-center mb-4">
                {activeTab === 'post' ? (
                  <Newspaper size={28} className="text-[#6E8B74]" />
                ) : (
                  <MessagesSquare size={28} className="text-[#6E8B74]" />
                )}
              </div>
              <h3 className="font-bold text-[#2B2B2B] mb-1">No {activeTab === 'post' ? 'posts' : 'discussions'} yet</h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Be the first to share something with your family!
              </p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-[#FAF7F2] rounded-2xl shadow-sm border border-[#C9A66B]/10 overflow-hidden">
                {/* Author Header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#355E3B] to-[#6E8B74] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {post.author.photo_url ? (
                      <img src={post.author.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">{getInitials(post.author.full_name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#2B2B2B] truncate">{post.author.full_name}</p>
                    <p className="text-[10px] text-[#5E5E5E]/60">{formatTime(post.created_at)}</p>
                  </div>
                  {post.type === 'discussion' && post.category && (
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${CATEGORY_COLORS[post.category] || CATEGORY_COLORS.general}`}>
                      {post.category.replace('-', ' ')}
                    </span>
                  )}
                  {post.author_id === user?.id && (
                    <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg hover:bg-[#6B2E2E]/8 transition-colors">
                      <Trash2 size={14} className="text-[#5E5E5E]/40" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  {post.title && (
                    <h3 className="text-base font-bold text-[#2B2B2B] mb-1.5">{post.title}</h3>
                  )}
                  <p className="text-sm text-[#2B2B2B] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Action Bar */}
                <div className="flex items-center border-t border-[#C9A66B]/8 px-4 py-2.5">
                  {activeTab === 'discussion' ? (
                    /* Reddit-style upvote */
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        post.liked_by_me ? 'text-[#355E3B]' : 'text-[#5E5E5E]/60 hover:text-[#355E3B]'
                      }`}
                    >
                      <ArrowUp size={16} className={post.liked_by_me ? 'text-[#355E3B]' : ''} />
                      <span>{post.likes_count}</span>
                    </button>
                  ) : (
                    /* Instagram-style heart */
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        post.liked_by_me ? 'text-[#B76E5D]' : 'text-[#5E5E5E]/60 hover:text-[#B76E5D]'
                      }`}
                    >
                      <Heart size={16} fill={post.liked_by_me ? '#B76E5D' : 'none'} />
                      <span>{post.likes_count}</span>
                    </button>
                  )}
                  <button
                    onClick={() => openComments(post.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#5E5E5E]/60 hover:text-[#355E3B] transition-colors ml-5"
                  >
                    <MessageCircle size={16} />
                    <span>{post.comments_count}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Create Button */}
        <div className="fixed bottom-20 right-4 z-30 sm:right-[calc(50%-12rem)]">
          <button
            onClick={() => { setCreateType(activeTab); setShowCreateSheet(true); }}
            className="w-14 h-14 bg-gradient-to-br from-[#355E3B] to-[#6E8B74] rounded-full flex items-center justify-center shadow-xl shadow-[#355E3B]/30 hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-90 transition-all"
          >
            <Plus size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Create Post Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Create {createType === 'post' ? 'Post' : 'Discussion'}</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <h2 className="text-lg font-bold text-[#2B2B2B] mb-4">
            {createType === 'post' ? '✍️ New Post' : '💬 New Discussion'}
          </h2>

          {/* Type toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCreateType('post')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                createType === 'post' ? 'bg-[#355E3B] text-white' : 'bg-[#EFE6D5]/60 text-[#5E5E5E]'
              }`}
            >
              Post
            </button>
            <button
              onClick={() => setCreateType('discussion')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                createType === 'discussion' ? 'bg-[#355E3B] text-white' : 'bg-[#EFE6D5]/60 text-[#5E5E5E]'
              }`}
            >
              Discussion
            </button>
          </div>

          {/* Title (discussions only) */}
          {createType === 'discussion' && (
            <input
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              placeholder="Discussion title..."
              className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40"
            />
          )}

          {/* Content */}
          <textarea
            value={createContent}
            onChange={e => setCreateContent(e.target.value)}
            placeholder={createType === 'post' ? "What's on your mind?" : 'Share your thoughts...'}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40 resize-none"
          />

          {/* Category (discussions only) */}
          {createType === 'discussion' && (
            <div className="mb-4">
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
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="text-[#355E3B] animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[#5E5E5E] text-center py-6">No comments yet. Be the first!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#355E3B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {comment.author.photo_url ? (
                      <img src={comment.author.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-[#355E3B]">{getInitials(comment.author.full_name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[#2B2B2B]">{comment.author.full_name}</span>
                      <span className="text-[9px] text-[#5E5E5E]/50">{formatTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-[#2B2B2B] mt-0.5 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
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
