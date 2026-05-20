'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Send, Search, MessageCircle, Loader2 } from 'lucide-react';
import { StreamChat } from 'stream-chat';
import type { Channel as StreamChannel } from 'stream-chat';

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

// ─── Main Export ─────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
          <Loader2 size={24} className="text-[#355E3B] animate-spin" />
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatPartnerId = searchParams.get('to');

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.replace('/welcome');
  }, [authLoading, user]);

  // ─── Try Stream, fallback to Supabase ───────────────

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;
    initStream();
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
      const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
      if (!apiKey) throw new Error('No Stream API key');

      const res = await fetch('/api/stream/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });

      if (!res.ok) throw new Error(`Token failed: ${res.status}`);

      const { token, userId, userName, userImage } = await res.json();
      const client = StreamChat.getInstance(apiKey);

      await client.connectUser(
        { id: userId, name: userName, image: userImage || undefined },
        token
      );

      setStreamClient(client);
      setStreamReady(true);
      setUseStream(true);
      console.log('✅ Stream connected');
    } catch (err) {
      console.warn('⚠️ Stream unavailable, using Supabase fallback:', err);
      setUseStream(false);
      setStreamReady(true); // mark as "done trying"
    }
  };

  // ─── Stream Methods ─────────────────────────────────

  const loadStreamChannels = async () => {
    if (!streamClient || !user) return;
    setLoading(true);
    try {
      const filter = { type: 'messaging' as const, members: { $in: [user.id] } };
      const sort = [{ last_message_at: -1 as const }];
      const result = await streamClient.queryChannels(filter, sort, { limit: 30 });

      const convos: Conversation[] = result.map(ch => {
        const members = Object.values(ch.state.members);
        const other = members.find(m => m.user_id !== user.id);
        const lastMsg = ch.state.messages[ch.state.messages.length - 1];
        return {
          partner_id: other?.user_id || '',
          partner_name: other?.user?.name || 'Unknown',
          partner_photo: (other?.user?.image as string) || null,
          last_message: lastMsg?.text || 'No messages yet',
          last_message_time: lastMsg?.created_at?.toString() || new Date().toISOString(),
          unread_count: ch.countUnread(),
        };
      });
      setConversations(convos);
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
    setLoading(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      } else { setConversations([]); }
    } catch { setConversations([]); }
    finally { setLoading(false); }
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

  if (authLoading || (!streamReady && useStream)) {
    return (
      <div className="min-h-screen bg-[#EFE6D5]/40">
        <div className="max-w-sm mx-auto">
          <div className="bg-[#FAF7F2] px-6 pt-14 pb-4 border-b border-[#C9A66B]/10">
            <div className="skeleton w-28 h-5 mb-1" />
            <div className="skeleton w-20 h-3" />
          </div>
          <div className="px-4 pt-4 space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF7F2]">
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
      <div className="h-screen bg-[#EFE6D5]/30 flex justify-center">
        <div className="h-full w-full max-w-sm flex flex-col bg-[#EFE6D5]/20">
          {/* Chat Header */}
          <div className="bg-[#FAF7F2] px-4 pt-12 pb-3 flex items-center gap-3 border-b border-[#C9A66B]/15 flex-shrink-0 shadow-sm">
            <button
              onClick={() => router.push('/messages')}
              className="w-9 h-9 rounded-xl bg-[#355E3B]/8 flex items-center justify-center hover:bg-[#355E3B]/15 transition-colors"
            >
              <ArrowLeft size={18} className="text-[#355E3B]" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#355E3B] to-[#6E8B74] flex items-center justify-center overflow-hidden flex-shrink-0">
              {chatPartner?.photo ? (
                <img src={chatPartner.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{chatPartner ? getInitials(chatPartner.name) : '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#2B2B2B] truncate">{chatPartner?.name || 'Loading...'}</p>
              <p className="text-[10px] text-[#6E8B74] font-medium">
                {useStream ? '🟢 Real-time' : 'Family member'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="text-[#355E3B] animate-spin" />
              </div>
            ) : normalizedMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#355E3B]/8 flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={28} className="text-[#6E8B74]" />
                  </div>
                  <p className="text-sm text-[#5E5E5E]">Say hello to start the conversation!</p>
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
                          <span className="text-[10px] font-semibold text-[#5E5E5E]/60 bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#C9A66B]/10">
                            {getDateLabel(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
                        <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.isMine
                            ? 'bg-[#355E3B] text-white rounded-br-md'
                            : 'bg-[#FAF7F2] text-[#2B2B2B] border border-[#C9A66B]/10 rounded-bl-md'
                        }`}>
                          <p>{msg.text}</p>
                          {msg.created_at && (
                            <p className={`text-[9px] mt-1 ${msg.isMine ? 'text-white/50' : 'text-[#5E5E5E]/50'} text-right`}>
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
          <div className="bg-[#FAF7F2] border-t border-[#C9A66B]/15 px-4 py-3 flex items-center gap-2 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <input
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[#EFE6D5]/50 border border-[#C9A66B]/15 text-sm outline-none placeholder:text-[#5E5E5E]/40 text-[#2B2B2B] focus:border-[#355E3B]/30 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 rounded-xl bg-[#355E3B] flex items-center justify-center hover:bg-[#2d5033] transition-colors disabled:opacity-40 active:scale-95 shadow-sm shadow-[#355E3B]/20"
            >
              {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ INBOX VIEW ═══════════
  const filteredConvos = conversations.filter(c =>
    c.partner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#EFE6D5]/40 pb-24 animate-pageEnter">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-6 pt-12 pb-4 shadow-sm border-b border-[#C9A66B]/10">
          <h1 className="text-xl font-bold text-[#2B2B2B]">Messages</h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">
            {useStream ? '🟢 Real-time chat' : 'Chat with your family members'}
          </p>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#C9A66B]/10 flex items-center px-3.5 py-2.5 gap-2">
            <Search size={16} className="text-[#5E5E5E]/40" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-[#5E5E5E]/40 text-[#2B2B2B]"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="px-4 space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-[#355E3B] animate-spin" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="bg-[#FAF7F2] rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-[#C9A66B]/15 mt-4">
              <div className="w-16 h-16 rounded-full bg-[#355E3B]/8 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-[#6E8B74]" />
              </div>
              <h3 className="font-bold text-[#2B2B2B] mb-1">No messages yet</h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Tap on a family member in your tree and select &quot;Send Message&quot; to start chatting.
              </p>
            </div>
          ) : (
            filteredConvos.map(conv => (
              <button
                key={conv.partner_id}
                onClick={() => router.push(`/messages?to=${conv.partner_id}`)}
                className="w-full bg-[#FAF7F2] rounded-2xl p-4 flex items-center gap-3 border border-[#C9A66B]/10 hover:bg-[#355E3B]/3 transition-colors text-left active:scale-[0.99]"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#355E3B] to-[#6E8B74] flex items-center justify-center overflow-hidden">
                    {conv.partner_photo ? (
                      <img src={conv.partner_photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">{getInitials(conv.partner_name)}</span>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#B76E5D] rounded-full border-2 border-[#FAF7F2] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold' : 'font-semibold'} text-[#2B2B2B]`}>
                      {conv.partner_name}
                    </p>
                    <span className={`text-[10px] flex-shrink-0 ml-2 ${conv.unread_count > 0 ? 'text-[#355E3B] font-semibold' : 'text-[#5E5E5E]/50'}`}>
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-[#2B2B2B] font-medium' : 'text-[#5E5E5E]'}`}>
                    {conv.last_message}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
