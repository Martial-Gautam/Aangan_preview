'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, RelationshipType } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { Camera, ChevronLeft, Check, User, Mail, Phone, Users } from 'lucide-react';
import Link from 'next/link';

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string; desc: string; icon: string }[] = [
  { value: 'father', label: 'Father', desc: 'Your dad', icon: '👨' },
  { value: 'mother', label: 'Mother', desc: 'Your mom', icon: '👩' },
  { value: 'sibling', label: 'Sibling', desc: 'Brother or sister', icon: '🧑' },
  { value: 'spouse', label: 'Spouse', desc: 'Husband or wife', icon: '💑' },
  { value: 'child', label: 'Child', desc: 'Son or daughter', icon: '👶' },
];

const genders = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

// Basic email validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// Basic phone validation (digits, spaces, dashes, plus, parens — at least 7 chars)
const isValidPhone = (phone: string) => /^[\d\s\-+()]{7,}$/.test(phone);

export default function AddMemberPage() {
  const router = useRouter();
  const { user, session, profile, loading } = useAuth();
  const [relationship, setRelationship] = useState<RelationshipType | ''>('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile?.onboarding_completed) router.replace('/welcome');
  }, [user, profile, loading]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !session?.access_token || !relationship || !name.trim()) return;

    // Validate email if provided
    if (memberEmail && !isValidEmail(memberEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    // Validate phone if provided
    if (memberPhone && !isValidPhone(memberPhone)) {
      setError('Please enter a valid phone number');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let photoUrl = '';
      if (photo) {
        const ext = photo.name.split('.').pop();
        const memberId = crypto.randomUUID();
        const path = `${user.id}/members/${memberId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photo, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const res = await fetch('/api/members/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: name.trim(),
          gender: gender || null,
          date_of_birth: dob || null,
          photo_url: photoUrl || null,
          email: memberEmail.trim() || null,
          phone_number: memberPhone.trim() || null,
          is_self: false,
          relationship_type: relationship,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      setSuccess(true);
      setTimeout(() => router.replace('/home'), 1200);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to add member';
      console.error('Add member error:', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const isValid = relationship !== '' && name.trim().length >= 2;

  return (
    <div className="min-h-screen bg-[#EFE6D5]/50 pb-24">
      <div className="max-w-sm mx-auto">
        <div className="bg-[#FAF7F2] px-6 pt-12 pb-5 shadow-sm border-b border-[#C9A66B]/10">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors -ml-2">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Add Family Member</h1>
          </div>
        </div>

        <div className="px-4 py-5 space-y-5">
          {/* Import Contacts Button */}
          <Link
            href="/import-contacts"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#355E3B]/5 text-[#355E3B] rounded-2xl border border-[#355E3B]/20 font-semibold text-sm hover:bg-[#355E3B]/10 transition-colors"
          >
            <Users size={18} />
            Import from Contacts
          </Link>

          <div className="flex items-center gap-4">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase">Or Add Manually</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-sm border border-[#C9A66B]/15">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Relationship</h3>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRelationship(opt.value)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all active:scale-95 text-left ${
                    relationship === opt.value
                      ? 'border-[#355E3B] bg-[#355E3B]/5'
                      : 'border-[#C9A66B]/15 bg-[#EFE6D5]/30 hover:border-[#355E3B]/30'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${relationship === opt.value ? 'text-[#355E3B]' : 'text-[#2B2B2B]'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-sm border border-[#C9A66B]/15">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Photo (optional)</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#355E3B]/25 bg-[#355E3B]/5 flex flex-col items-center justify-center hover:border-[#355E3B]/50 hover:bg-[#355E3B]/10 transition-all active:scale-95 overflow-hidden flex-shrink-0"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={20} className="text-[#355E3B]/50 mb-1" />
                    <span className="text-xs text-[#355E3B]">Add</span>
                  </>
                )}
              </button>
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700">Upload a photo</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 5MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-sm border border-[#C9A66B]/15">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Full Name *</h3>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter their name"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-sm border border-[#C9A66B]/15">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Gender (optional)</h3>
            <div className="grid grid-cols-3 gap-2">
              {genders.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(gender === g.value ? '' : g.value)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 ${
                    gender === g.value
                      ? 'border-[#355E3B] bg-[#355E3B]/5 text-[#355E3B]'
                      : 'border-[#C9A66B]/15 text-[#5E5E5E] hover:border-[#355E3B]/30'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-sm border border-[#C9A66B]/15">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Date of Birth (optional)</h3>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all text-gray-700"
            />
          </div>

          {/* Contact Info section for claim system */}
          <div className="bg-[#FAF7F2] rounded-3xl p-5 shadow-sm border border-[#C9A66B]/15">
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
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="Their phone number"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#355E3B]/40 focus:border-transparent transition-all placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-[#6B2E2E]/8 border border-[#6B2E2E]/15 rounded-2xl px-4 py-3 text-sm text-[#6B2E2E]">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isValid || saving || success}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              success
                ? 'bg-[#355E3B] shadow-[#355E3B]/20 text-white'
                : 'bg-gradient-to-r from-[#355E3B] to-[#6E8B74] shadow-[#355E3B]/20 text-white hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98]'
            }`}
          >
            {success ? <><Check size={18} /> Added successfully!</> : saving ? 'Saving...' : 'Add to Family Tree'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
