'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, RelationshipType } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import ClaimProfileModal, { ClaimMatch } from '@/components/ClaimProfileModal';
import {
  Camera, LogOut, Check, CreditCard as Edit2, ChevronRight,
  Calendar, User, Users, Phone, Search, Loader2, Trash2, AlertTriangle
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
      <div className="min-h-screen bg-[#EFE6D5]/40 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#355E3B] border-t-transparent animate-spin" />
      </div>
    );
  }

  const displayPhoto = photoPreview || profile?.photo_url;
  const initials = (profile?.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-[#EFE6D5]/40 pb-24">
      <div className="max-w-sm mx-auto">
        <div className="bg-[#FAF7F2] px-6 pt-12 pb-6 shadow-sm border-b border-[#C9A66B]/10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all ${
                editing ? 'bg-[#EFE6D5] text-[#5E5E5E]' : 'bg-[#355E3B]/8 text-[#355E3B] hover:bg-[#355E3B]/15'
              }`}
            >
              <Edit2 size={14} />
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#355E3B]/10 flex items-center justify-center">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-[#355E3B]">{initials}</span>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#355E3B] rounded-full flex items-center justify-center shadow-md hover:bg-[#2d5033] transition-colors"
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
                <Users size={20} className="text-[#C9A66B]" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{familyCount}</p>
              <p className="text-xs text-gray-500">Family Members</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="flex justify-center mb-1">
                <Calendar size={20} className="text-[#C9A66B]" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {profile?.date_of_birth
                  ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
                  : '--'}
              </p>
              <p className="text-xs text-gray-500">Years Old</p>
            </div>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl shadow-sm border border-[#C9A66B]/15 overflow-hidden">
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
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#C9A66B]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all"
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
                            ? 'border-[#355E3B] bg-[#355E3B]/5 text-[#355E3B]'
                            : 'border-[#C9A66B]/15 text-[#5E5E5E] hover:border-[#355E3B]/30'
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
                    className="w-full px-4 py-3 rounded-xl border border-[#C9A66B]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all text-[#2B2B2B]"
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
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#C9A66B]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all placeholder:text-[#5E5E5E]/40"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    saved
                      ? 'bg-[#355E3B] text-white'
                      : 'bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] shadow-md shadow-[#355E3B]/20'
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
          <div className="bg-[#FAF7F2] rounded-3xl shadow-sm border border-[#C9A66B]/15 overflow-hidden">
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#355E3B]/20 bg-[#355E3B]/5 text-[#355E3B] text-sm font-semibold hover:bg-[#355E3B]/10 hover:border-[#355E3B]/30 active:scale-[0.98] transition-all disabled:opacity-60"
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

          {/* Family Members section */}
          <div className="bg-[#FAF7F2] rounded-3xl shadow-sm border border-[#C9A66B]/15 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-700">Family Members</h3>
            </div>
            <div className="px-5 pb-4">
              {familyLoading ? (
                <div className="py-6 flex justify-center">
                  <Loader2 size={20} className="text-gray-300 animate-spin" />
                </div>
              ) : familyMembers.length === 0 ? (
                <p className="text-xs text-gray-400">No members added yet.</p>
              ) : (
                <div className="space-y-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{member.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{member.relationship_type}</p>
                        {member.user_id && (
                          <p className="text-[11px] text-[#C9A66B]">Linked profile</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        disabled={deletingMemberId === member.id || !!member.user_id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#6B2E2E]/15 text-[#6B2E2E] hover:bg-[#6B2E2E]/5 disabled:opacity-50"
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
            </div>
          </div>



          <div className="bg-[#FAF7F2] rounded-3xl shadow-sm border border-[#C9A66B]/15 overflow-hidden">
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
            className="w-full bg-white border-2 border-gray-200 text-gray-600 py-4 rounded-2xl font-semibold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full bg-[#FAF7F2] border-2 border-[#6B2E2E]/15 text-[#6B2E2E] py-4 rounded-2xl font-semibold text-sm hover:bg-[#6B2E2E]/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Delete Account
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
            setClaimMessage('Profile linked. Connection requests were sent for confirmation.');
          }}
          onDismiss={() => {
            setShowClaimModal(false);
          }}
        />
      )}

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
