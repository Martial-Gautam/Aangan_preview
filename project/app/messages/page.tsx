'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useStream } from '@/lib/stream-provider';
import { StreamProvider } from '@/lib/stream-provider';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft, Send, Search, MessageCircle, Loader2,
} from 'lucide-react';
import type { Channel as StreamChannel } from 'stream-chat';

// ─── Main Export (wraps with StreamProvider) ─────────────────

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
          <Loader2 size={24} className="text-[#355E3B] animate-spin" />
        </div>
      }
    >
      <StreamProvider>
        <MessagesContent />
      </StreamProvider>
    </Suspense>
  );
}

// ─── Types ───────────────────────────────────────────────────

interface ChannelPreview {
  channel: StreamChannel;
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  memberId: string;
}

// ─── Messages Content ────────────────────────────────────────

function MessagesContent() {
  const { user, session, loading: authLoading } = useAuth();
  const { chatClient, connecting: streamConnecting, error: streamError } = useStream();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatPartnerId = searchParams.get('to');

  const [channels, setChannels] = useState<ChannelPreview[]>([]);
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState('');
  const [chatPartnerImage, setChatPartnerImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.replace('/welcome');
  }, [authLoading, user]);

  // Load channels or open direct chat
  useEffect(() => {
    if (!chatClient || !user) return;

    if (chatPartnerId) {
      openDirectChat(chatPartnerId);
    } else {
      loadChannels();
    }
  }, [chatClient, user, chatPartnerId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Load Channel List ──────────────────────────────

  const loadChannels = async () => {
    if (!chatClient || !user) return;
    setLoading(true);
    try {
      const filter = { type: 'messaging', members: { $in: [user.id] } };
      const sort = [{ last_message_at: -1 as const }];
      const result = await chatClient.queryChannels(filter, sort, { limit: 30 });

      const previews: ChannelPreview[] = result.map(ch => {
        const members = Object.values(ch.state.members);
        const otherMember = members.find(m => m.user_id !== user.id);
        const name = otherMember?.user?.name || 'Unknown';
        const image = (otherMember?.user?.image as string) || null;
        const lastMsg = ch.state.messages[ch.state.messages.length - 1];

        return {
          channel: ch,
          name,
          image,
          lastMessage: lastMsg?.text || 'No messages yet',
          lastMessageTime: lastMsg?.created_at?.toString() || ch.data?.created_at?.toString() || new Date().toISOString(),
          unreadCount: ch.countUnread(),
          memberId: otherMember?.user_id || '',
        };
      });

      setChannels(previews);
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Open/Create Direct Chat ────────────────────────

  const openDirectChat = async (partnerId: string) => {
    if (!chatClient || !user) return;
    setLoading(true);
    try {
      // Create or get 1:1 channel
      const channelId = [user.id, partnerId].sort().join('--');
      const channel = chatClient.channel('messaging', channelId, {
        members: [user.id, partnerId],
      } as any);
      await channel.watch();

      setActiveChannel(channel);

      // Get partner info
      const members = Object.values(channel.state.members);
      const partner = members.find(m => m.user_id !== user.id);
      setChatPartnerName(partner?.user?.name || 'Family Member');
      setChatPartnerImage((partner?.user?.image as string) || null);

      // Load messages
      setMessages(channel.state.messages || []);

      // Mark as read
      await channel.markRead();

      // Listen for new messages
      channel.on('message.new', (event) => {
        if (event.message) {
          setMessages(prev => [...prev, event.message!]);
        }
      });
    } catch (err) {
      console.error('Failed to open chat:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Send Message ───────────────────────────────────

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChannel || sending) return;
    setSending(true);
    try {
      await activeChannel.sendMessage({ text: newMessage.trim() });
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
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
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ─── Loading / Connecting State ─────────────────────

  if (authLoading || streamConnecting) {
    return (
      <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="text-[#355E3B] animate-spin" />
          <p className="text-xs text-[#5E5E5E]">Connecting...</p>
        </div>
      </div>
    );
  }

  // ─── Stream Error Fallback ──────────────────────────

  if (streamError || !chatClient) {
    return (
      <div className="min-h-screen bg-[#EFE6D5]/40 pb-24">
        <div className="max-w-sm mx-auto">
          <div className="bg-[#FAF7F2] px-6 pt-12 pb-4 shadow-sm border-b border-[#C9A66B]/10">
            <h1 className="text-xl font-bold text-[#2B2B2B]">Messages</h1>
            <p className="text-xs text-[#5E5E5E] mt-0.5">Chat with your family members</p>
          </div>
          <div className="px-4 mt-8">
            <div className="bg-[#FAF7F2] rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-[#C9A66B]/15">
              <div className="w-16 h-16 rounded-full bg-[#B76E5D]/10 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-[#B76E5D]" />
              </div>
              <h3 className="font-bold text-[#2B2B2B] mb-1">Connection Issue</h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Unable to connect to messaging service. Please check your internet and try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-5 py-2 rounded-xl bg-[#355E3B] text-white text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ═══════════ CHAT VIEW ═══════════
  if (chatPartnerId && activeChannel) {
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
              {chatPartnerImage ? (
                <img src={chatPartnerImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{getInitials(chatPartnerName)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#2B2B2B] truncate">{chatPartnerName}</p>
              <p className="text-[10px] text-[#6E8B74] font-medium">
                {activeChannel.state.watcher_count && activeChannel.state.watcher_count > 1 ? '🟢 Online' : 'Family member'}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="text-[#355E3B] animate-spin" />
              </div>
            ) : messages.length === 0 ? (
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
                {messages.map((msg, i) => {
                  const isMine = msg.user?.id === user?.id;
                  const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : '';
                  const prevDate = i > 0 && messages[i-1].created_at ? new Date(messages[i-1].created_at).toDateString() : '';
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
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
                        <div
                          className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? 'bg-[#355E3B] text-white rounded-br-md'
                              : 'bg-[#FAF7F2] text-[#2B2B2B] border border-[#C9A66B]/10 rounded-bl-md'
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.created_at && (
                            <p className={`text-[9px] mt-1 ${isMine ? 'text-white/50' : 'text-[#5E5E5E]/50'} text-right`}>
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
              {sending ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ INBOX VIEW ═══════════
  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#EFE6D5]/40 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-6 pt-12 pb-4 shadow-sm border-b border-[#C9A66B]/10">
          <h1 className="text-xl font-bold text-[#2B2B2B]">Messages</h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">Real-time chat with your family</p>
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

        {/* Channel List */}
        <div className="px-4 space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-[#355E3B] animate-spin" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="bg-[#FAF7F2] rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-[#C9A66B]/15 mt-4">
              <div className="w-16 h-16 rounded-full bg-[#355E3B]/8 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-[#6E8B74]" />
              </div>
              <h3 className="font-bold text-[#2B2B2B] mb-1">No conversations yet</h3>
              <p className="text-sm text-[#5E5E5E] leading-relaxed">
                Tap on a family member in your tree and select &quot;Send Message&quot; to start chatting.
              </p>
            </div>
          ) : (
            filteredChannels.map(ch => (
              <button
                key={ch.memberId || ch.channel.id}
                onClick={() => router.push(`/messages?to=${ch.memberId}`)}
                className="w-full bg-[#FAF7F2] rounded-2xl p-4 flex items-center gap-3 border border-[#C9A66B]/10 hover:bg-[#355E3B]/3 transition-colors text-left active:scale-[0.99]"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#355E3B] to-[#6E8B74] flex items-center justify-center overflow-hidden">
                    {ch.image ? (
                      <img src={ch.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">{getInitials(ch.name)}</span>
                    )}
                  </div>
                  {ch.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#B76E5D] rounded-full border-2 border-[#FAF7F2] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{ch.unreadCount > 9 ? '9+' : ch.unreadCount}</span>
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${ch.unreadCount > 0 ? 'font-bold text-[#2B2B2B]' : 'font-semibold text-[#2B2B2B]'}`}>
                      {ch.name}
                    </p>
                    <span className={`text-[10px] flex-shrink-0 ml-2 ${ch.unreadCount > 0 ? 'text-[#355E3B] font-semibold' : 'text-[#5E5E5E]/50'}`}>
                      {formatTime(ch.lastMessageTime)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${ch.unreadCount > 0 ? 'text-[#2B2B2B] font-medium' : 'text-[#5E5E5E]'}`}>
                    {ch.lastMessage}
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
