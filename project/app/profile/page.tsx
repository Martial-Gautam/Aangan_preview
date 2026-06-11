'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, RelationshipType } from '@/lib/supabase';
import { uploadImageToCloudinaryViaApi } from '@/lib/cloudinary-upload';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import ClaimProfileModal, { ClaimMatch } from '@/components/ClaimProfileModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Camera, LogOut, Check, CreditCard as Edit2, ChevronRight,
  Calendar, User, Users, Phone, Search, Loader2, Trash2, AlertTriangle,
  BarChart3, Bell, MapPin, Share2
} from 'lucide-react';
import { ShareInviteSheet } from '@/components/ShareInviteSheet';

export default function ProfilePage() {
  const { user, session, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [familyCount, setFamilyCount] = useState(0);
  const [showFamilyMembersSheet, setShowFamilyMembersSheet] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Claim state
  const [claimMatches, setClaimMatches] = useState<ClaimMatch[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimChecking, setClaimChecking] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');

  // Share state
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');



  const [familyMembers, setFamilyMembers] = useState<Array<{
    id: string;
    full_name: string;
    relationship_type: RelationshipType;
    user_id: string | null;
  }>>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || !profile?.onboarding_completed) { router.replace('/welcome'); return; }
    setName(profile.full_name || '');
    setGender(profile.gender || '');
    setDob(profile.date_of_birth || '');
    setPhone(profile.phone || '');
    setLocationCity(profile.location_city || '');
    setLocationState(profile.location_state || '');
    setLocationCountry(profile.location_country || '');
    fetchFamilyCount();
    fetchFamilyMembers();
  }, [user, profile, loading]);

  const fetchFamilyCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('relationships')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);
    setFamilyCount(count || 0);
  };

  const fetchFamilyMembers = async () => {
    if (!user) return;
    setFamilyLoading(true);
    setFamilyError('');
    try {
      const { data: self } = await supabase
        .from('people')
        .select('id')
        .eq('owner_id', user.id)
        .eq('is_self', true)
        .maybeSingle();

      if (!self) {
        setFamilyMembers([]);
        return;
      }

      const { data: rels } = await supabase
        .from('relationships')
        .select('related_person_id, relationship_type')
        .eq('owner_id', user.id)
        .eq('person_id', self.id);

      const ids = rels?.map((r) => r.related_person_id) || [];
      if (ids.length === 0) {
        setFamilyMembers([]);
        return;
      }

      const { data: people } = await supabase
        .from('people')
        .select('id, full_name, user_id')
        .in('id', ids);

      const members = (rels || []).map((rel) => {
        const person = (people || []).find((p) => p.id === rel.related_person_id);
        return {
          id: rel.related_person_id,
          full_name: person?.full_name || 'Unknown',
          relationship_type: rel.relationship_type as RelationshipType,
          user_id: person?.user_id || null,
        };
      });

      setFamilyMembers(members);
    } catch (err) {
      console.error('Failed to load family members', err);
      setFamilyError('Could not load family members');
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleDeleteMember = async (personId: string) => {
    if (!session?.access_token) return;
    setDeletingMemberId(personId);
    setFamilyError('');
    try {
      const res = await fetch('/api/members/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ person_id: personId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete member');
      setFamilyMembers((prev) => prev.filter((m) => m.id !== personId));
      fetchFamilyCount();
    } catch (err) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to delete member');
    } finally {
      setDeletingMemberId(null);
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
    if (!user || !session?.access_token) return;
    setSaving(true);
    try {
      let photoUrl = profile?.photo_url || '';
      if (photo) {
        photoUrl = `${await uploadImageToCloudinaryViaApi(photo, session.access_token, 'profiles')}?t=${Date.now()}`;
      }

      await supabase.from('profiles').update({
        full_name: name,
        gender: gender || null,
        date_of_birth: dob || null,
        phone: phone.trim() || null,
        location_city: locationCity.trim() || null,
        location_state: locationState.trim() || null,
        location_country: locationCountry.trim() || null,
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

  const handleDeleteAccount = async () => {
    if (!session?.access_token || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ confirmation: 'DELETE_MY_ACCOUNT' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      await signOut();
      router.replace('/welcome');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-sm mx-auto">
          <div className="glass-header px-6 pt-14 pb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="skeleton w-20 h-5" />
              <div className="skeleton w-16 h-7 rounded-xl" />
            </div>
            <div className="flex flex-col items-center">
              <div className="skeleton w-24 h-24 rounded-full" />
              <div className="skeleton w-28 h-4 mt-3" />
              <div className="skeleton w-36 h-3 mt-1.5" />
            </div>
          </div>
          <div className="px-4 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-20 rounded-2xl" />
            </div>
            <div className="skeleton h-48 rounded-3xl" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const displayPhoto = photoPreview || profile?.photo_url;
  const initials = (profile?.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen pb-24 animate-pageEnter" style={{ background: 'transparent' }}>
      <div className="max-w-sm mx-auto">
        <div className="glass-header px-6 pt-12 pb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="screen-title text-xl text-gray-900">Profile</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareSheet(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-[#2A4365]/8 text-[#2A4365] hover:bg-[#2A4365]/12 transition-all"
              >
                <Share2 size={14} />
                Share
              </button>
              <button
                onClick={() => setEditing(!editing)}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  editing ? 'bg-gray-100 text-gray-500' : 'bg-[#2A4365]/8 text-[#2A4365] hover:bg-[#2A4365]/12'
                }`}
              >
                <Edit2 size={14} />
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#2A4365]/10 flex items-center justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-[#2A4365]">{initials}</span>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#2A4365] rounded-full flex items-center justify-center shadow-md hover:bg-[#2A4365]/90 transition-colors"
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
            <button
              type="button"
              onClick={() => setShowFamilyMembersSheet(true)}
              className="glass-card rounded-xl p-4 text-center hover:bg-white/70 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex justify-center mb-1">
                <Users size={20} className="text-[#2A4365]" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{familyCount}</p>
              <p className="text-xs text-gray-500">Family Members</p>
            </button>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="flex justify-center mb-1">
                <Calendar size={20} className="text-[#2A4365]" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.date_of_birth
                  ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
                  : '--'}
              </p>
              <p className="text-xs text-gray-500">Years Old</p>
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
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
                      className="w-full pl-9 pr-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all"
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
                        className={`py-2.5 rounded-lg border-2 text-xs font-medium capitalize transition-all ${
                          gender === g
                            ? 'border-[#2A4365] bg-[#2A4365]/5 text-[#2A4365]'
                            : 'border-gray-200 text-gray-500 hover:border-[#2A4365]/30'
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all text-gray-900"
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
                      className="w-full pl-9 pr-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">City</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      placeholder="e.g., Bengaluru"
                      className="w-full pl-9 pr-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">State</label>
                    <input
                      type="text"
                      value={locationState}
                      onChange={(e) => setLocationState(e.target.value)}
                      placeholder="e.g., Karnataka"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Country</label>
                    <input
                      type="text"
                      value={locationCountry}
                      onChange={(e) => setLocationCountry(e.target.value)}
                      placeholder="e.g., India"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    saved
                      ? 'bg-[#2A4365] text-white'
                      : 'bg-[#2A4365] text-white hover:bg-[#2A4365]/90 active:scale-[0.98]'
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
                  {
                    label: 'Location',
                    value: [profile?.location_city, profile?.location_state, profile?.location_country].filter(Boolean).join(', ') || '—',
                    icon: MapPin,
                  },
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
          <div className="glass-card rounded-xl overflow-hidden">
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-[#2A4365]/20 bg-[#2A4365]/5 text-[#2A4365] text-sm font-semibold hover:bg-[#2A4365]/10 active:scale-[0.98] transition-all disabled:opacity-60"
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

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700">Account</h3>
            </div>
            <div className="px-5 pb-4 space-y-1">
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
              <button
                onClick={() => router.push('/stats')}
                className="w-full flex items-center py-2.5 gap-3 hover:bg-gray-50 rounded-lg transition-colors px-1"
              >
                <div className="w-8 h-8 rounded-full bg-[#2A4365]/8 flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={14} className="text-[#2A4365]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-800">Tree Statistics</p>
                  <p className="text-xs text-gray-400">View your family tree insights</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              <button
                onClick={() => router.push('/notifications')}
                className="w-full flex items-center py-2.5 gap-3 hover:bg-gray-50 rounded-lg transition-colors px-1"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Bell size={14} className="text-gray-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-800">Notifications</p>
                  <p className="text-xs text-gray-400">Connection requests & alerts</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full glass-card text-gray-600 py-4 rounded-2xl font-semibold text-sm hover:bg-white/70 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full bg-white border border-red-200 text-red-600 py-4 rounded-xl font-semibold text-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Delete Account
          </button>

          {/* Profile Footer */}
          <Footer variant="app" />
        </div>
      </div>

      <BottomNav />

      {/* Claim modal */}
      {showClaimModal && claimMatches.length > 0 && (
        <ClaimProfileModal
          matches={claimMatches}
          onClaimed={() => {
            setShowClaimModal(false);
            setClaimMessage('Profile linked. Connection requests were sent for confirmation.');
          }}
          onDismiss={() => {
            setShowClaimModal(false);
          }}
        />
      )}

      {/* Family Members sheet (Instagram followers-style list) */}
      <Sheet open={showFamilyMembersSheet} onOpenChange={setShowFamilyMembersSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Family Members</SheetTitle>
          </SheetHeader>

          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Family Members</h3>
            <p className="text-xs text-gray-500 mt-0.5">{familyCount} people in your tree</p>
          </div>

          {familyLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 size={22} className="text-gray-300 animate-spin" />
            </div>
          ) : familyMembers.length === 0 ? (
            <p className="text-sm text-gray-400">No members added yet.</p>
          ) : (
            <div className="space-y-2">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{member.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{member.relationship_type}</p>
                    {member.user_id && (
                      <p className="text-[11px] text-[#2A4365]">Linked profile</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    disabled={deletingMemberId === member.id || !!member.user_id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingMemberId === member.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {familyError && (
            <p className="mt-3 text-xs text-red-500">{familyError}</p>
          )}
          <p className="mt-3 text-[11px] text-gray-400">
            Linked profiles cannot be deleted.
          </p>
        </SheetContent>
      </Sheet>

      {/* Share Invite Sheet */}
      <ShareInviteSheet
        open={showShareSheet}
        onOpenChange={setShowShareSheet}
      />

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(''); }} />
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Delete Account</h2>
                  <p className="text-sm text-red-100">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                This will permanently delete your account, your family tree, all relationships, and remove you from any connected trees.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">
                  Type <span className="font-bold text-red-500">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm focus:outline-none focus:border-red-400 transition-all placeholder:text-gray-300 font-mono"
                />
              </div>
              {deleteError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{deleteError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(''); }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
