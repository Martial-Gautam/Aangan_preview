'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { Bell, Loader2, User, CheckCircle2, XCircle, Users, UserPlus } from 'lucide-react';

type PendingRequest = {
  id: string;
  sender: { full_name: string; photo_url: string | null };
  created_at: string;
  relationship?: string | null;
  type?: string;
};

type Suggestion = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  reason?: string | null;
  mutual_connection?: string | null;
};

export default function NotificationsPage() {
  const { user, session, loading } = useAuth();
  const queryClient = useQueryClient();
  
  // Connection Requests state
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Suggestions state
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  const pendingRequestsKey = ['notifications', 'pending', user?.id];
  const suggestionsKey = ['notifications', 'suggestions', user?.id];

  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery<PendingRequest[]>({
    queryKey: pendingRequestsKey,
    enabled: Boolean(session?.access_token && user?.id),
    queryFn: async () => {
      const res = await fetch('/api/connections/pending', {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (!res.ok) return [] as any[];
      const data = await res.json();
      return data.requests || [];
    },
  });

  const handleConnectionResponse = async (requestId: string, action: 'accept' | 'reject') => {
    if (!session?.access_token) return;
    setProcessingRequestId(requestId);
    try {
      const res = await fetch('/api/connections/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ request_id: requestId, action })
      });
      if (res.ok) {
        queryClient.setQueryData(pendingRequestsKey, (prev: any[] | undefined) =>
          (prev || []).filter((r) => r.id !== requestId)
        );
      }
    } catch (err) {
      console.error('Failed to respond to request', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery<Suggestion[]>({
    queryKey: suggestionsKey,
    enabled: Boolean(session?.access_token && user?.id),
    queryFn: async () => {
      const res = await fetch('/api/connections/suggestions', {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      });
      if (!res.ok) return [] as any[];
      const data = await res.json();
      return data.suggestions || [];
    },
  });

  const handleSendConnection = async (userId: string) => {
    if (!session?.access_token) return;
    setSendingRequestId(userId);
    try {
      const res = await fetch('/api/connections/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ to_user_id: userId })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        queryClient.setQueryData(suggestionsKey, (prev: any[] | undefined) =>
          (prev || []).filter((s) => s.user_id !== userId)
        );
        if (data?.merged) {
          queryClient.invalidateQueries({ queryKey: pendingRequestsKey });
        }
      }
    } catch (err) {
      console.error('Failed to send request', err);
    } finally {
      setSendingRequestId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <Loader2 size={24} className="text-[#2A4365] animate-spin" />
      </div>
    );
  }

  const isEmpty = !requestsLoading && !suggestionsLoading && pendingRequests.length === 0 && suggestions.length === 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'transparent' }}>
      <div className="max-w-sm mx-auto">
        <div className="glass-header px-6 pt-12 pb-6">
          <h1 className="screen-title text-xl text-gray-900">Notifications</h1>
        </div>

        <div className="px-4 space-y-4">
          {isEmpty && (
            <div className="glass-card rounded-3xl p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#2A4365]/8 flex items-center justify-center mb-4">
                <Bell size={28} className="text-[#2A4365]/40" />
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                No notifications yet. When someone adds you to their tree, you'll see it here.
              </p>
            </div>
          )}

          {/* Connection Requests Section */}
          {(pendingRequests.length > 0 || requestsLoading) && (
            <div className="glass-card rounded-3xl overflow-hidden relative">
              <div className="px-5 pt-4 pb-2 border-b border-gray-200/30 bg-[#2A4365]/5">
                <h3 className="text-sm font-semibold text-[#2A4365] flex items-center gap-2">
                  <Bell size={16} className="text-[#2A4365]" />
                  Connection Requests
                  {!requestsLoading && pendingRequests.length > 0 && (
                    <span className="bg-[#2A4365] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                      {pendingRequests.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {requestsLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 size={24} className="text-[#2A4365]/40 animate-spin" />
                  </div>
                ) : (
                  pendingRequests.map((req: PendingRequest) => (
                    <div key={req.id} className="p-4 hover:bg-white/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2A4365]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {req.sender.photo_url ? (
                            <img src={req.sender.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-[#2A4365]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug">
                            <span className="font-bold">{req.sender.full_name}</span>{' '}
                            {req.type === 'suggestion'
                              ? 'wants to connect with you'
                              : 'added you to their family tree'}
                            {req.relationship && req.type !== 'suggestion' && (
                              <>
                                {' '}as their <span className="font-semibold text-[#2A4365]">{req.relationship}</span>
                              </>
                            )}.
                          </p>
                          <p className="meta-text text-gray-400 mt-1">
                            {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleConnectionResponse(req.id, 'accept')}
                              disabled={processingRequestId === req.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#2A4365] hover:bg-[#2A4365]/90 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                              {processingRequestId === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Connect Trees
                            </button>
                            <button
                              onClick={() => handleConnectionResponse(req.id, 'reject')}
                              disabled={processingRequestId === req.id}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* People You May Know Section */}
          {(suggestions.length > 0 || suggestionsLoading) && (
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  People You May Know
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {suggestionsLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 size={24} className="text-gray-300 animate-spin" />
                  </div>
                ) : (
                  suggestions.map((s: Suggestion) => (
                    <div key={s.user_id} className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.full_name}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {s.reason || `Both know ${s.mutual_connection}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSendConnection(s.user_id)}
                        disabled={sendingRequestId === s.user_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 border border-gray-200"
                      >
                        {sendingRequestId === s.user_id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        Connect
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
