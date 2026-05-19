'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStream } from '@/lib/stream-provider';
import { StreamProvider } from '@/lib/stream-provider';
import BottomNav from '@/components/BottomNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Heart, MessageCircle, Send, Plus, Loader2, ArrowUp,
  Newspaper, MessagesSquare, Tag, Trash2
} from 'lucide-react';
import type { Channel as StreamChannel } from 'stream-chat';

// ─── Constants ───────────────────────────────────────────────

type PostType = 'post' | 'discussion';

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
  return (
    <StreamProvider>
      <FeedContent />
    </StreamProvider>
  );
}

// ─── Feed Content ────────────────────────────────────────────

function FeedContent() {
  const { user, session, loading: authLoading } = useAuth();
  const { chatClient, connecting: streamConnecting, error: streamError } = useStream();
  const router = useRouter();

  const [feedChannel, setFeedChannel] = useState<StreamChannel | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<PostType>('post');
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Create form
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createType, setCreateType] = useState<PostType>('post');
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('general');
  const [creating, setCreating] = useState(false);

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

  // Initialize feed channel
  useEffect(() => {
    if (!chatClient || !user) return;
    initFeedChannel();
  }, [chatClient, user]);

  // Reload on tab change
  useEffect(() => {
    if (feedChannel) loadPosts();
  }, [activeTab, feedChannel]);

  const initFeedChannel = async () => {
    if (!chatClient || !user) return;
    try {
      // Use a shared family feed channel
      const channel = chatClient.channel('messaging', 'family-feed', {
        name: 'Family Feed',
        members: [user.id],
      } as any);
      await channel.watch();
      setFeedChannel(channel);

      // Listen for new messages
      channel.on('message.new', () => loadPostsFromChannel(channel));
      channel.on('reaction.new', () => loadPostsFromChannel(channel));
      channel.on('reaction.deleted', () => loadPostsFromChannel(channel));
    } catch (err) {
      console.error('Failed to init feed channel:', err);
    }
  };

  const loadPosts = () => {
    if (feedChannel) loadPostsFromChannel(feedChannel);
  };

  const loadPostsFromChannel = async (channel: StreamChannel) => {
    setLoadingPosts(true);
    try {
      const allMessages = channel.state.messages || [];

      // Filter by type (stored in message extraData)
      const filtered = allMessages.filter((msg: any) => {
        const msgType = msg.post_type || 'post';
        return msgType === activeTab && !msg.parent_id; // Exclude replies
      });

      // Sort by newest first
      const sorted = [...filtered].reverse();
      setPosts(sorted);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // ─── Create Post ────────────────────────────────────

  const handleCreate = async () => {
    if (!feedChannel || !createContent.trim()) return;
    if (createType === 'discussion' && !createTitle.trim()) return;
    setCreating(true);
    try {
      await feedChannel.sendMessage({
        text: createContent.trim(),
        // Custom fields
        post_type: createType,
        post_title: createType === 'discussion' ? createTitle.trim() : undefined,
        post_category: createCategory,
      } as any);

      setShowCreateSheet(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateCategory('general');
      setActiveTab(createType);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setCreating(false);
    }
  };

  // ─── Like / Unlike ─────────────────────────────────

  const handleLike = async (msg: any) => {
    if (!feedChannel) return;
    try {
      const reactionType = activeTab === 'discussion' ? 'upvote' : 'love';
      const hasMyReaction = msg.own_reactions?.some((r: any) => r.type === reactionType);

      if (hasMyReaction) {
        await feedChannel.deleteReaction(msg.id, reactionType);
      } else {
        await feedChannel.sendReaction(msg.id, { type: reactionType });
      }
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  // ─── Comments (Thread Replies) ──────────────────────

  const openComments = async (msg: any) => {
    setSelectedMessage(msg);
    setShowCommentsSheet(true);
    setLoadingReplies(true);
    try {
      if (feedChannel) {
        const response = await feedChannel.getReplies(msg.id, { limit: 50 });
        setReplies(response.messages || []);
      }
    } catch (err) {
      console.error('Failed to load replies:', err);
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleAddComment = async () => {
    if (!feedChannel || !newComment.trim() || !selectedMessage) return;
    setSendingComment(true);
    try {
      const response = await feedChannel.sendMessage({
        text: newComment.trim(),
        parent_id: selectedMessage.id,
      });
      if (response.message) {
        setReplies(prev => [...prev, response.message]);
      }
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

  // ─── Delete Post ────────────────────────────────────

  const handleDelete = async (msgId: string) => {
    if (!chatClient) return;
    if (!confirm('Delete this post?')) return;
    try {
      await chatClient.deleteMessage(msgId);
      setPosts(prev => prev.filter(p => p.id !== msgId));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
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

  if (authLoading || streamConnecting) {
    return (
      <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
        <Loader2 size={24} className="text-[#355E3B] animate-spin" />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────

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

        {/* Posts */}
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
            posts.map((msg: any) => {
              const authorName = msg.user?.name || 'Family Member';
              const authorImage = msg.user?.image || null;
              const postTitle = msg.post_title;
              const postCategory = msg.post_category || 'general';
              const reactionType = activeTab === 'discussion' ? 'upvote' : 'love';
              const likeCount = getReactionCount(msg, reactionType);
              const liked = hasMyReaction(msg, reactionType);
              const replyCount = msg.reply_count || 0;

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
                    {activeTab === 'discussion' && postCategory && (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${CATEGORY_COLORS[postCategory] || CATEGORY_COLORS.general}`}>
                        {postCategory.replace('-', ' ')}
                      </span>
                    )}
                    {msg.user?.id === user?.id && (
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
                    <p className="text-sm text-[#2B2B2B] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center border-t border-[#C9A66B]/8 px-4 py-2.5">
                    {activeTab === 'discussion' ? (
                      <button
                        onClick={() => handleLike(msg)}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                          liked ? 'text-[#355E3B]' : 'text-[#5E5E5E]/60 hover:text-[#355E3B]'
                        }`}
                      >
                        <ArrowUp size={16} className={liked ? 'text-[#355E3B]' : ''} />
                        <span>{likeCount}</span>
                      </button>
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

          {createType === 'discussion' && (
            <input
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              placeholder="Discussion title..."
              className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40"
            />
          )}

          <textarea
            value={createContent}
            onChange={e => setCreateContent(e.target.value)}
            placeholder={createType === 'post' ? "What's on your mind?" : 'Share your thoughts...'}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/15 bg-[#EFE6D5]/30 text-sm mb-3 outline-none focus:border-[#355E3B]/30 placeholder:text-[#5E5E5E]/40 resize-none"
          />

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
            {loadingReplies ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="text-[#355E3B] animate-spin" />
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-[#5E5E5E] text-center py-6">No comments yet. Be the first!</p>
            ) : (
              replies.map((reply: any) => (
                <div key={reply.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#355E3B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {reply.user?.image ? (
                      <img src={reply.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-[#355E3B]">{getInitials(reply.user?.name || 'U')}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-[#2B2B2B]">{reply.user?.name || 'User'}</span>
                      <span className="text-[9px] text-[#5E5E5E]/50">{reply.created_at ? formatTime(reply.created_at) : ''}</span>
                    </div>
                    <p className="text-sm text-[#2B2B2B] mt-0.5 leading-relaxed">{reply.text}</p>
                  </div>
                </div>
              ))
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
