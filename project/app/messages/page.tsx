'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Send, Search, MessageCircle, Loader2 } from 'lucide-react';
import { StreamChat } from 'stream-chat';
import type { Channel as StreamChannel } from 'stream-chat';
import { getConnectedStreamClient } from '@/lib/stream-client';

// ─── Types ───────────────────────────────────────────────────

interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_photo: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface RelativeCandidate {
  person_id: string;
  full_name: string;
  photo_url: string | null;
  user_id: string | null;
}


// ─── Main Export ─────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
          <Loader2 size={24} className="text-[#2A4365] animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

// ─── Messages Content ────────────────────────────────────────

function MessagesContent() {
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatPartnerId = searchParams.get('to');
  const chatPartnerNameParam = searchParams.get('name');
  const chatPartnerPhotoParam = searchParams.get('photo');

  const conversationsCacheKey = useMemo(() => ['messages', 'conversations', user?.id], [user?.id]);
  const relativesCacheKey = useMemo(() => ['messages', 'relatives', user?.id], [user?.id]);

  // Stream state
  const [streamClient, setStreamClient] = useState<StreamChat | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [useStream, setUseStream] = useState(true); // true = try Stream, false = Supabase fallback

  // Shared state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);
  const [chatPartner, setChatPartner] = useState<{ name: string; photo: string | null } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [relatives, setRelatives] = useState<RelativeCandidate[]>([]);
  const [relativesLoading, setRelativesLoading] = useState(false);
  const [resolvingRelativeId, setResolvingRelativeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.replace('/welcome');
  }, [authLoading, user]);

  // ─── Try Stream, fallback to Supabase ───────────────

  useEffect(() => {
    if (chatPartnerId) return;
    const cachedConversations = queryClient.getQueryData<Conversation[]>(conversationsCacheKey);
    if (cachedConversations && cachedConversations.length > 0) {
      setConversations(cachedConversations);
      setLoading(false);
    }

    const cachedRelatives = queryClient.getQueryData<RelativeCandidate[]>(relativesCacheKey);
    if (cachedRelatives && cachedRelatives.length > 0) {
      setRelatives(cachedRelatives);
    }
  }, [chatPartnerId, conversationsCacheKey, queryClient, relativesCacheKey]);

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    initStream();
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    fetchRelatives();
  }, [user?.id, session?.access_token]);

  // Load data once we know which backend to use
  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    // Wait until stream attempt finishes
    if (useStream && !streamReady) return;

    if (chatPartnerId) {
      if (useStream && streamClient) {
        openStreamChat(chatPartnerId);
      } else {
        fetchSupabaseThread(chatPartnerId);
      }
    } else {
      if (useStream && streamClient) {
        loadStreamChannels();
      } else {
        fetchSupabaseConversations();
      }
    }
  }, [user?.id, streamReady, useStream, chatPartnerId]);

  useEffect(() => {
    if (!chatPartnerId) return;
    if (!chatPartnerNameParam && !chatPartnerPhotoParam) return;
    setChatPartner({
      name: chatPartnerNameParam || 'Family Member',
      photo: chatPartnerPhotoParam || null,
    });
  }, [chatPartnerId, chatPartnerNameParam, chatPartnerPhotoParam]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for Supabase messages
  useEffect(() => {
    if (useStream || !chatPartnerId || !session?.access_token) return;
    const interval = setInterval(() => fetchSupabaseThread(chatPartnerId, true), 5000);
    return () => clearInterval(interval);
  }, [useStream, chatPartnerId, session]);

  // ─── Stream Init ────────────────────────────────────

  const initStream = async () => {
    try {
      const { client } = await getConnectedStreamClient(session!.access_token);
      setStreamClient(client);
      setStreamReady(true);
      setUseStream(true);
      console.log('Stream connected');
    } catch (err) {
      console.warn('Stream unavailable, using Supabase fallback:', err);
      setUseStream(false);
      setStreamReady(true); // mark as "done trying"
    }
  };

  // ─── Stream Methods ─────────────────────────────────

  const loadStreamChannels = async () => {
    if (!streamClient || !user) return;
    if (conversations.length === 0) setLoading(true);
    try {
      const filter = { type: 'messaging' as const, members: { $in: [user.id] } };
      const sort = [{ last_message_at: -1 as const }];
      const result = await streamClient.queryChannels(filter, sort, { limit: 30 });

      const convos: Conversation[] = result
      .filter((ch) => ch.id !== 'family-feed')
      .map((ch) => {
        const members = Object.values(ch.state.members);
        const other = members.find(m => m.user_id !== user.id);
        if (!other?.user_id) return null;
        const lastMsg = ch.state.messages[ch.state.messages.length - 1];
        return {
          partner_id: other?.user_id || '',
          partner_name: other?.user?.name || 'Unknown',
          partner_photo: (other?.user?.image as string) || null,
          last_message: lastMsg?.text || 'No messages yet',
          last_message_time: lastMsg?.created_at?.toString() || new Date().toISOString(),
          unread_count: ch.countUnread(),
        };
      })
      .filter((c): c is Conversation => Boolean(c));
      setConversations(convos);
      queryClient.setQueryData(conversationsCacheKey, convos);
    } catch { setConversations([]); }
    finally { setLoading(false); }
  };

  const openStreamChat = async (partnerId: string) => {
    if (!streamClient || !user) return;
    setLoading(true);
    try {
      const channelId = [user.id, partnerId].sort().join('--');
      const channel = streamClient.channel('messaging', channelId, {
        members: [user.id, partnerId],
      } as any);
      await channel.watch();
      setActiveChannel(channel);

      const members = Object.values(channel.state.members);
      const partner = members.find(m => m.user_id !== user.id);
      setChatPartner({
        name: partner?.user?.name || 'Family Member',
        photo: (partner?.user?.image as string) || null,
      });
      setMessages(channel.state.messages || []);
      await channel.markRead();

      channel.on('message.new', (event) => {
        if (event.message) setMessages(prev => [...prev, event.message!]);
      });
    } catch (err) {
      console.error('Stream chat failed:', err);
      setUseStream(false);
      setActiveChannel(null);
      await fetchSupabaseThread(partnerId);
    } finally { setLoading(false); }
  };

  const sendStreamMessage = async () => {
    if (!activeChannel || !newMessage.trim()) return;
    setSending(true);
    try {
      await activeChannel.sendMessage({ text: newMessage.trim() });
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) { console.error('Send failed:', err); }
    finally { setSending(false); }
  };

  // ─── Supabase Fallback Methods ──────────────────────

  const fetchSupabaseConversations = async () => {
    if (!session?.access_token || !user?.id) return;
    if (conversations.length === 0) setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const nextConversations = data.conversations || [];
        setConversations(nextConversations);
        queryClient.setQueryData(conversationsCacheKey, nextConversations);
      } else { setConversations([]); }
    } catch { setConversations([]); }
    finally { setLoading(false); }
  };

  const fetchRelatives = async () => {
    if (!session?.access_token || !user?.id) return;
    setRelativesLoading(true);
    try {
      const res = await fetch('/api/tree/full', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setRelatives([]);
        return;
      }

      const data = await res.json();
      const nodes = (data.nodes || []) as Array<{
        id: string;
        full_name: string;
        photo_url: string | null;
        user_id: string | null;
        is_self: boolean;
      }>;
      const selfId = data.self_person_id as string | null;

      const family = nodes
        .filter((node) => !node.is_self && node.id !== selfId && node.full_name?.trim())
        .map((node) => ({
          person_id: node.id,
          full_name: node.full_name,
          photo_url: node.photo_url ?? null,
          user_id: node.user_id ?? null,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setRelatives(family);
      queryClient.setQueryData(relativesCacheKey, family);
    } catch (err) {
      console.error('Failed to fetch relatives for search:', err);
      setRelatives([]);
    } finally {
      setRelativesLoading(false);
    }
  };

  const openConversation = (partnerId: string, partnerName?: string, partnerPhoto?: string | null) => {
    const params = new URLSearchParams({ to: partnerId });
    if (partnerName) params.set('name', partnerName);
    if (partnerPhoto) params.set('photo', partnerPhoto);
    router.push(`/messages?${params.toString()}`);
  };

  const resolveRelativeTarget = async (relative: RelativeCandidate): Promise<string | null> => {
    if (!session?.access_token) return null;
    try {
      const res = await fetch(`/api/messages/resolve-target?person_id=${relative.person_id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.target_user_id || null;
    } catch (err) {
      console.error('Failed to resolve relative chat target:', err);
      return null;
    }
  };

  const handleRelativeSelect = async (relative: RelativeCandidate) => {
    const directTargetId = relative.user_id;
    if (directTargetId) {
      openConversation(directTargetId, relative.full_name, relative.photo_url);
      return;
    }

    setResolvingRelativeId(relative.person_id);
    const resolvedTargetId = await resolveRelativeTarget(relative);
    setResolvingRelativeId(null);

    if (resolvedTargetId) {
      openConversation(resolvedTargetId, relative.full_name, relative.photo_url);
      return;
    }

    alert(`${relative.full_name} is not available for chat yet.`);
  };

  const fetchSupabaseThread = async (partnerId: string, silent = false) => {
    if (!session?.access_token || !user?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/messages/thread?partner_id=${partnerId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
      if (!chatPartner) {
        const convRes = await fetch('/api/messages/conversations', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          const match = (convData.conversations || []).find((c: Conversation) => c.partner_id === partnerId);
          setChatPartner(match ? { name: match.partner_name, photo: match.partner_photo } : { name: 'Family Member', photo: null });
        }
      }
    } catch (err) { console.error('Fetch thread failed:', err); }
    finally { if (!silent) setLoading(false); }
  };

  const sendSupabaseMessage = async () => {
    if (!newMessage.trim() || !chatPartnerId || !session?.access_token) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ receiver_id: chatPartnerId, content: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        inputRef.current?.focus();
      }
    } catch (err) { console.error('Send failed:', err); }
    finally { setSending(false); }
  };

  // ─── Unified Send ───────────────────────────────────

  const handleSend = () => {
    if (useStream && streamClient) sendStreamMessage();
    else sendSupabaseMessage();
  };

  // ─── Helpers ────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ─── Loading State ──────────────────────────────────

  const waitingForBackendBootstrap =
    !streamReady &&
    useStream &&
    (chatPartnerId ? messages.length === 0 : conversations.length === 0);

  if (authLoading || waitingForBackendBootstrap) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <div className="max-w-sm mx-auto">
          <div className="glass-header px-6 pt-14 pb-4">
            <div className="skeleton w-28 h-5 mb-1" />
            <div className="skeleton w-20 h-3" />
          </div>
          <div className="px-4 pt-4 space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl glass-card">
                <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton w-24 h-2.5" />
                  <div className="skeleton w-36 h-2" />
                </div>
                <div className="skeleton w-10 h-2" />
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ═══════════ CHAT VIEW ═══════════
  if (chatPartnerId) {
    // Normalize messages for both backends
    const normalizedMessages = messages.map((msg: any) => ({
      id: msg.id,
      isMine: useStream ? msg.user?.id === user?.id : msg.sender_id === user?.id,
      text: useStream ? msg.text : msg.content,
      created_at: msg.created_at,
    }));

    return (
      <div className="h-screen flex justify-center" style={{ background: 'transparent' }}>
        <div className="h-full w-full max-w-sm flex flex-col">
          {/* Chat Header */}
          <div className="glass-header px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => router.push('/messages')}
              className="w-9 h-9 rounded-xl bg-white/40 backdrop-blur-md flex items-center justify-center hover:bg-white/60 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#2A4365] flex items-center justify-center overflow-hidden flex-shrink-0">
              {chatPartner?.photo ? (
                <img src={chatPartner.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{chatPartner ? getInitials(chatPartner.name) : '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{chatPartner?.name || 'Loading...'}</p>
              <p className="text-[10px] text-gray-400 font-medium">
                Family member
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="text-[#2A4365] animate-spin" />
              </div>
            ) : normalizedMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#2A4365]/8 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={28} className="text-[#2A4365]/40" />
                  </div>
                  <p className="text-sm text-gray-500">Say hello to start the conversation!</p>
                </div>
              </div>
            ) : (
              <>
                {normalizedMessages.map((msg, i) => {
                  const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : '';
                  const prevDate = i > 0 && normalizedMessages[i - 1].created_at ? new Date(normalizedMessages[i - 1].created_at).toDateString() : '';
                  const showDate = i === 0 || msgDate !== prevDate;

                  return (
                    <div key={msg.id}>
                      {showDate && msg.created_at && (
                        <div className="flex justify-center my-3">
                          <span className="meta-text text-gray-400 bg-white/60 backdrop-blur-md px-3 py-1 rounded-full border border-gray-200/30">
                            {getDateLabel(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
                        <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                          msg.isMine
                            ? 'bg-[#2A4365] text-white rounded-br-md'
                            : 'bg-white/60 backdrop-blur-md text-gray-900 border border-gray-200/30 rounded-bl-md'
                        }`}>
                          <p className="chat-message">{msg.text}</p>
                          {msg.created_at && (
                            <p className={`meta-text mt-1 ${msg.isMine ? 'text-white/50' : 'text-gray-400'} text-right`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="glass-header px-4 py-3 flex items-center gap-2 flex-shrink-0 !border-t !border-b-0 border-gray-200/30" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <input
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-sm outline-none placeholder:text-gray-400 text-gray-900 focus:ring-1 focus:ring-[#2A4365]/20 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 rounded-xl bg-[#2A4365] flex items-center justify-center hover:bg-[#2A4365]/90 transition-colors disabled:opacity-40 active:scale-95"
            >
              {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ INBOX VIEW ═══════════
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredConvos = conversations.filter((c) =>
    c.partner_name.toLowerCase().includes(normalizedQuery)
  );
  const conversationPartnerIds = new Set(filteredConvos.map((c) => c.partner_id));
  const relativeMatches = normalizedQuery.length > 0
    ? relatives.filter((relative) => {
        if (!relative.full_name.toLowerCase().includes(normalizedQuery)) return false;
        if (relative.user_id && conversationPartnerIds.has(relative.user_id)) return false;
        return true;
      })
    : [];

  return (
    <div className="min-h-screen pb-24 animate-pageEnter" style={{ background: 'transparent' }}>
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="glass-header px-6 pt-12 pb-4">
          <h1 className="screen-title text-xl text-gray-900">Messages</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Chat with your family members
          </p>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2">
          <div className="glass-input rounded-xl flex items-center px-3.5 py-2.5 gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
            />
          </div>
          {normalizedQuery && relativesLoading && (
            <p className="text-[11px] text-gray-400 mt-1.5 px-1">Searching relatives...</p>
          )}
        </div>

        {/* Conversations */}
        <div className="px-4 space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-[#2A4365] animate-spin" />
            </div>
          ) : filteredConvos.length === 0 && relativeMatches.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#2A4365]/8 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-[#2A4365]/40" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">
                {normalizedQuery ? 'No matches found' : 'No messages yet'}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {normalizedQuery
                  ? 'Try another name to find a conversation or relative.'
                  : 'Tap on a family member in your tree and select "Send Message" to start chatting.'}
              </p>
            </div>
          ) : (
            <>
              {filteredConvos.length > 0 && (
                <div className="space-y-2">
                  {relativeMatches.length > 0 && (
                    <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                      Conversations
                    </p>
                  )}
                  {filteredConvos.map((conv) => (
                    <button
                      key={conv.partner_id}
                      onClick={() => openConversation(conv.partner_id, conv.partner_name, conv.partner_photo)}
                      className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:bg-white/70 transition-colors text-left active:scale-[0.99]"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#2A4365] flex items-center justify-center overflow-hidden">
                          {conv.partner_photo ? (
                            <img src={conv.partner_photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">{getInitials(conv.partner_name)}</span>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#2A4365] rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold' : 'font-semibold'} text-gray-900`}>
                            {conv.partner_name}
                          </p>
                          <span className={`meta-text flex-shrink-0 ml-2 ${conv.unread_count > 0 ? 'text-[#2A4365]' : 'text-gray-400'}`}>
                            {formatTime(conv.last_message_time)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                          {conv.last_message}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {relativeMatches.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Relatives
                  </p>
                  {relativeMatches.map((relative) => (
                    <button
                      key={relative.person_id}
                      onClick={() => handleRelativeSelect(relative)}
                      disabled={resolvingRelativeId === relative.person_id}
                      className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 hover:bg-white/70 transition-colors text-left active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#2A4365] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {relative.photo_url ? (
                          <img src={relative.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">{getInitials(relative.full_name)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{relative.full_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {resolvingRelativeId === relative.person_id
                            ? 'Resolving chat...'
                            : (relative.user_id ? 'Start conversation' : 'Find and start conversation')}
                        </p>
                      </div>
                      {resolvingRelativeId === relative.person_id && (
                        <Loader2 size={14} className="text-[#2A4365] animate-spin flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
