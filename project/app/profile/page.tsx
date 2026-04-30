'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import ClaimProfileModal, { ClaimMatch } from '@/components/ClaimProfileModal';
import {
  Camera, LogOut, Check, CreditCard as Edit2, ChevronRight,
  Calendar, User, Users, Phone, Search, Loader2, Bell, CheckCircle2, XCircle, UserPlus
} from 'lucide-react';

export default function ProfilePage() {
  const { user, session, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [familyCount, setFamilyCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Claim state
  const [claimMatches, setClaimMatches] = useState<ClaimMatch[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimChecking, setClaimChecking] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');


  // Connection Requests state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile?.onboarding_completed) { router.replace('/welcome'); return; }
    setName(profile.full_name || '');
    setGender(profile.gender || '');
    setDob(profile.date_of_birth || '');
    setPhone(profile.phone || '');
    fetchFamilyCount();
    fetchPendingRequests();
    fetchSuggestions();
  }, [user, profile, loading]);

  const fetchFamilyCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('relationships')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    setFamilyCount(count || 0);
  };

  const fetchPendingRequests = async () => {
    if (!session?.access_token) return;
    setRequestsLoading(true);
    try {
      const res = await fetch('/api/connections/pending', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setRequestsLoading(false);
    }
  };

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
        // Remove from list
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        if (action === 'accept') {
          // You might want to refresh family or show a success toast
        }
      }
    } catch (err) {
      console.error('Failed to respond to request', err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const fetchSuggestions = async () => {
    if (!session?.access_token) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/connections/suggestions', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

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
        body: JSON.stringify({ receiver_id: userId })
      });
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.user_id !== userId));
      }
    } catch (err) {
      console.error('Failed to send request', err);
    } finally {
      setSendingRequestId(null);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let photoUrl = profile?.photo_url || '';
      if (photo) {
        const ext = photo.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photo, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = urlData.publicUrl + `?t=${Date.now()}`;
      }

      await supabase.from('profiles').update({
        full_name: name,
        gender: gender || null,
        date_of_birth: dob || null,
        phone: phone.trim() || null,
        photo_url: photoUrl || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await supabase.from('people').update({
        full_name: name,
        gender: gender || null,
        date_of_birth: dob || null,
        photo_url: photoUrl || null,
        updated_at: new Date().toISOString(),
      }).eq('owner_id', user.id).eq('is_self', true);

      await refreshProfile();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleClaimCheck = async () => {
    if (!session?.access_token || !user?.email) return;
    setClaimChecking(true);
    setClaimMessage('');

    try {
      const body: { email?: string; phone?: string } = { email: user.email };
      if (phone.trim()) body.phone = phone.trim();

      const res = await fetch('/api/claim/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          setClaimMatches(data.matches);
          setShowClaimModal(true);
        } else {
          setClaimMessage('No matching profiles found. When someone adds you to their family tree with your email or phone, you\'ll be able to claim that profile.');
        }
      } else {
        setClaimMessage('Could not check for profiles right now. Please try again later.');
      }
    } catch {
      setClaimMessage('Something went wrong. Please try again.');
    } finally {
      setClaimChecking(false);
    }
  };



  const handleSignOut = async () => {
    await signOut();
    router.replace('/welcome');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const displayPhoto = photoPreview || profile?.photo_url;
  const initials = (profile?.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-sm mx-auto">
        <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
                editing ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
              }`}
            >
              <Edit2 size={14} />
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-orange-500">{initials}</span>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors"
                >
                  <Camera size={14} className="text-white" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="mt-3 text-center">
              <h2 className="font-bold text-gray-900 text-xl">{profile?.full_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="flex justify-center mb-1">
                <Users size={20} className="text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{familyCount}</p>
              <p className="text-xs text-gray-500">Family Members</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="flex justify-center mb-1">
                <Calendar size={20} className="text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.date_of_birth
                  ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
                  : '--'}
              </p>
              <p className="text-xs text-gray-500">Years Old</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700">Personal Details</h3>
            </div>

            {editing ? (
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['male', 'female', 'other'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(gender === g ? '' : g)}
                        className={`py-2.5 rounded-xl border-2 text-xs font-medium capitalize transition-all ${
                          gender === g
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-gray-100 text-gray-600 hover:border-orange-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Your phone number"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    saved
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] shadow-md shadow-orange-200'
                  } disabled:opacity-60`}
                >
                  {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {[
                  { label: 'Name', value: profile?.full_name, icon: User },
                  { label: 'Gender', value: profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—', icon: User },
                  {
                    label: 'Birthday',
                    value: profile?.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—',
                    icon: Calendar
                  },
                  { label: 'Phone', value: profile?.phone || '—', icon: Phone },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center px-5 py-3.5 gap-3">
                    <Icon size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Claim Profile section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700">Claim Profile</h3>
            </div>
            <div className="px-5 pb-4">
              <p className="text-xs text-gray-400 mb-3">
                If someone has already added you to their family tree, you can link your account to that profile.
              </p>
              <button
                onClick={handleClaimCheck}
                disabled={claimChecking}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-600 text-sm font-semibold hover:bg-orange-100 hover:border-orange-300 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {claimChecking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Checking...
                  </>
                ) : (
                  <>
                    <Search size={16} /> Check if someone added you
                  </>
                )}
              </button>
              {claimMessage && (
                <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed">
                  {claimMessage}
                </p>
              )}
            </div>
          </div>

          {/* Connection Requests Section */}
          {(pendingRequests.length > 0 || requestsLoading) && (
            <div className="bg-white rounded-3xl shadow-sm border border-indigo-100 overflow-hidden relative">
              <div className="px-5 pt-4 pb-2 border-b border-indigo-50 bg-indigo-50/30">
                <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                  <Bell size={16} className="text-indigo-500" />
                  Connection Requests
                  {!requestsLoading && pendingRequests.length > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                      {pendingRequests.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {requestsLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 size={24} className="text-indigo-400 animate-spin" />
                  </div>
                ) : (
                  pendingRequests.map(req => (
                    <div key={req.id} className="p-4 bg-white hover:bg-indigo-50/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {req.sender.photo_url ? (
                            <img src={req.sender.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-indigo-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug">
                            <span className="font-bold">{req.sender.full_name}</span> added you to their family tree as their <span className="font-semibold text-indigo-700">{req.relationship}</span>.
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleConnectionResponse(req.id, 'accept')}
                              disabled={processingRequestId === req.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
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
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
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
                  suggestions.map(s => (
                    <div key={s.user_id} className="p-4 bg-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{s.full_name}</p>
                        <p className="text-[11px] text-gray-500 truncate">Both know {s.mutual_connection}</p>
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

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700">Account</h3>
            </div>
            <div className="px-5 pb-4">
              <div className="flex items-center py-2.5 gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-600">@</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{user?.email}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full bg-white border-2 border-red-100 text-red-500 py-4 rounded-2xl font-semibold text-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      <BottomNav />

      {/* Claim modal */}
      {showClaimModal && claimMatches.length > 0 && (
        <ClaimProfileModal
          matches={claimMatches}
          onClaimed={() => {
            setShowClaimModal(false);
            setClaimMessage('Profile claimed successfully! Your account is now linked.');
          }}
          onDismiss={() => {
            setShowClaimModal(false);
          }}
        />
      )}


    </div>
  );
}
