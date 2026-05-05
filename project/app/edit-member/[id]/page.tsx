'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, RelationshipType } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { Camera, ChevronLeft, Check, User, Mail, Phone, Loader2 } from 'lucide-react';

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Father', mother: 'Mother', sibling: 'Sibling',
  spouse: 'Spouse', child: 'Child',
};

const genders = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^[\d\s\-+()]{7,}$/.test(phone);

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const personId = params.id as string;
  const { user, session, profile, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile?.onboarding_completed) {
      router.replace('/welcome');
      return;
    }
    fetchPerson();
  }, [user, profile, authLoading, personId]);

  const fetchPerson = async () => {
    if (!session?.access_token || !personId) return;
    setFetchLoading(true);

    try {
      const res = await fetch('/api/tree/full', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setError('Failed to load member details');
        setFetchLoading(false);
        return;
      }

      const data = await res.json();
      const nodes = data.nodes || [];
      const edges = data.edges || [];
      const selfId = data.self_person_id;

      const person = nodes.find((p: any) => p.id === personId);
      if (!person) {
        setError('Member not found');
        setFetchLoading(false);
        return;
      }

      setName(person.full_name || '');
      setGender(person.gender || '');
      setDob(person.date_of_birth || '');
      setMemberEmail(person.email || '');
      setMemberPhone(person.phone_number || '');
      setExistingPhotoUrl(person.photo_url || '');
      setPhotoPreview(person.photo_url || '');

      // Find relationship type
      const rel = edges.find(
        (r: any) => r.person_id === selfId && r.related_person_id === personId
      );
      setRelationshipType(rel?.relationship_type || '');
    } catch {
      setError('Failed to load member details');
    } finally {
      setFetchLoading(false);
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
    if (!user || !session?.access_token || !name.trim()) return;

    if (memberEmail && !isValidEmail(memberEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (memberPhone && !isValidPhone(memberPhone)) {
      setError('Please enter a valid phone number');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let photoUrl = existingPhotoUrl;

      // Upload new photo if changed
      if (photo) {
        const ext = photo.name.split('.').pop();
        const path = `${user.id}/members/${personId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photo, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const res = await fetch('/api/members/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          person_id: personId,
          full_name: name.trim(),
          gender: gender || null,
          date_of_birth: dob || null,
          photo_url: photoUrl || null,
          email: memberEmail.trim() || null,
          phone_number: memberPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');

      setSuccess(true);
      setTimeout(() => router.replace('/home'), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update member';
      console.error('Edit member error:', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim().length >= 2;

  if (authLoading || fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="text-orange-400 animate-spin" />
          <p className="text-sm text-gray-400">Loading member...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-sm mx-auto">
        <div className="bg-white px-6 pt-12 pb-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Edit Family Member</h1>
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Relationship type — READ ONLY */}
          {relationshipType && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Relationship</h3>
              <div className="flex items-center gap-3 p-3 rounded-2xl border-2 border-orange-500 bg-orange-50">
                <span className="text-2xl">
                  {relationshipType === 'father' ? '👨' :
                   relationshipType === 'mother' ? '👩' :
                   relationshipType === 'sibling' ? '🧑' :
                   relationshipType === 'spouse' ? '💑' : '👶'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-orange-600">
                    {RELATIONSHIP_LABELS[relationshipType] || relationshipType}
                  </p>
                  <p className="text-xs text-gray-400">Cannot be changed</p>
                </div>
              </div>
            </div>
          )}

          {/* Photo */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Photo (optional)</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 flex flex-col items-center justify-center hover:border-orange-400 hover:bg-orange-100 transition-all active:scale-95 overflow-hidden flex-shrink-0"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={20} className="text-orange-400 mb-1" />
                    <span className="text-xs text-orange-500">Add</span>
                  </>
                )}
              </button>
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700">{photoPreview ? 'Change photo' : 'Upload a photo'}</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 5MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          {/* Name */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Full Name *</h3>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter their name"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Gender (optional)</h3>
            <div className="grid grid-cols-3 gap-2">
              {genders.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(gender === g.value ? '' : g.value)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 ${
                    gender === g.value
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-100 text-gray-600 hover:border-orange-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* DOB */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Date of Birth (optional)</h3>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-gray-700"
            />
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Contact Info (optional)</h3>
            <p className="text-xs text-gray-400 mb-3">
              If they join Aangan, they can claim this profile automatically
            </p>
            <div className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Their email address"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="Their phone number"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isValid || saving || success}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              success
                ? 'bg-green-500 shadow-green-200 text-white'
                : 'bg-orange-500 shadow-orange-200 text-white hover:bg-orange-600 active:scale-[0.98]'
            }`}
          >
            {success ? <><Check size={18} /> Updated successfully!</> : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
