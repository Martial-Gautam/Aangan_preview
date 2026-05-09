'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Send, Search, MessageCircle, Loader2 } from 'lucide-react';

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

function buildDummyConversations(userId: string): Conversation[] {
  const now = Date.now();
  return [
    {
      partner_id: userId,
      partner_name: 'Aangan Demo',
      partner_photo: null,
      last_message: 'Welcome to messages. This demo chat shows how conversations will look.',
      last_message_time: new Date(now - 1000 * 60 * 8).toISOString(),
      unread_count: 0,
    },
  ];
}

function buildDummyThread(userId: string): Message[] {
  const now = Date.now();
  return [
    {
      id: 'dummy-msg-1',
      sender_id: userId,
      receiver_id: userId,
      content: 'Hi! This is your demo conversation.',
      read: true,
      created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'dummy-msg-2',
      sender_id: userId,
      receiver_id: userId,
      content: 'Once your family members link their accounts, real messages appear here.',
      read: true,
      created_at: new Date(now - 1000 * 60 * 60 + 1000 * 60 * 3).toISOString(),
    },
    {
      id: 'dummy-msg-3',
      sender_id: userId,
      receiver_id: userId,
      content: 'Tip: install Aangan for a smoother messaging experience.',
      read: true,
      created_at: new Date(now - 1000 * 60 * 22).toISOString(),
    },
  ];
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
        <Loader2 size={24} className="text-[#355E3B] animate-spin" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatPartnerId = searchParams.get('to');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatPartner, setChatPartner] = useState<{ name: string; photo: string | null } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;

    const seedDemoSocial = async () => {
      const storageKey = `aangan_demo_social_seeded_${user.id}`;
      const shouldForce =
        typeof window !== 'undefined' &&
        sessionStorage.getItem('aangan_post_login_bootstrap') === '1';

      if (shouldForce && typeof window !== 'undefined') {
        sessionStorage.removeItem('aangan_post_login_bootstrap');
      }

      const alreadySeeded = typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1';
      if (!shouldForce && alreadySeeded) return;

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

    seedDemoSocial();
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/welcome'); return; }
    if (chatPartnerId) {
      fetchThread(chatPartnerId);
      markAsRead(chatPartnerId);
    } else {
      fetchConversations();
    }
  }, [user, authLoading, chatPartnerId]);

  // Poll for new messages in chat view
  useEffect(() => {
    if (!chatPartnerId || !session?.access_token) return;
    const interval = setInterval(() => fetchThread(chatPartnerId, true), 5000);
    return () => clearInterval(interval);
  }, [chatPartnerId, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!session?.access_token || !user?.id) return;
    setLoadingConvos(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched = data.conversations || [];
        const normalized = fetched.map((conv: Conversation) => (
          conv.partner_id === user.id
            ? { ...conv, partner_name: 'Aangan Demo' }
            : conv
        ));
        setConversations(normalized.length > 0 ? normalized : buildDummyConversations(user.id));
      } else {
        setConversations(buildDummyConversations(user.id));
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setConversations(buildDummyConversations(user.id));
    } finally {
      setLoadingConvos(false);
    }
  };

  const fetchThread = async (partnerId: string, silent = false) => {
    if (!session?.access_token || !user?.id) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/thread?partner_id=${partnerId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fetched = data.messages || [];
        setMessages(fetched.length > 0 ? fetched : buildDummyThread(user.id));
      } else {
        setMessages(buildDummyThread(user.id));
      }

      // Also get partner info if not set
      if (!chatPartner) {
        if (partnerId === user.id) {
          setChatPartner({ name: 'Aangan Demo', photo: null });
          return;
        }

        const convRes = await fetch('/api/messages/conversations', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          const match = (convData.conversations || []).find((c: Conversation) => c.partner_id === partnerId);
          if (match) {
            setChatPartner({
              name: match.partner_id === user.id ? 'Aangan Demo' : match.partner_name,
              photo: match.partner_photo
            });
          } else {
            setChatPartner({ name: 'Family Member', photo: null });
          }
        } else if (partnerId === user.id) {
          setChatPartner({ name: 'Aangan Demo', photo: null });
        }
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
      setMessages(buildDummyThread(user.id));
      if (partnerId === user.id) {
        setChatPartner({ name: 'Aangan Demo', photo: null });
      }
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const markAsRead = async (partnerId: string) => {
    if (!session?.access_token) return;
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ partner_id: partnerId }),
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !chatPartnerId || !session?.access_token || sending) return;
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
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

  const filteredConversations = conversations.filter(c =>
    (c.partner_id === user?.id ? 'Aangan Demo' : c.partner_name)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // =========== CHAT VIEW ===========
  if (chatPartnerId) {
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
                {chatPartnerId === user?.id ? 'Demo conversation' : 'Family member'}
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
            {loadingMessages ? (
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
                  const isMine = msg.sender_id === user?.id;
                  const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDate && (
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
                          <p>{msg.content}</p>
                          <p className={`text-[9px] mt-1 ${isMine ? 'text-white/50' : 'text-[#5E5E5E]/50'} text-right`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
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

  // =========== INBOX VIEW ===========
  return (
    <div className="min-h-screen bg-[#EFE6D5]/40 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-[#FAF7F2] px-6 pt-12 pb-4 shadow-sm border-b border-[#C9A66B]/10">
          <h1 className="text-xl font-bold text-[#2B2B2B]">Messages</h1>
          <p className="text-xs text-[#5E5E5E] mt-0.5">Chat with your family members</p>
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

        {/* Conversations List */}
        <div className="px-4 space-y-2 mt-2">
          {loadingConvos ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-[#355E3B] animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
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
            filteredConversations.map(conv => (
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
                      <span className="text-white text-sm font-bold">
                        {getInitials(conv.partner_id === user?.id ? 'Aangan Demo' : conv.partner_name)}
                      </span>
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
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-[#2B2B2B]' : 'font-semibold text-[#2B2B2B]'}`}>
                      {conv.partner_id === user?.id ? 'Aangan Demo' : conv.partner_name}
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
