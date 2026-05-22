'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useFamilyStore } from '@/lib/family-store';
import { useAuth } from '@/lib/auth-context';
import { uploadImageToCloudinaryViaApi } from '@/lib/cloudinary-upload';
import { Camera, User, Check, Loader2, X } from 'lucide-react';
import { useRef } from 'react';

interface RelOption {
  value: string;
  label: string;
  icon: string;
  desc: string;
}

function getRelationshipOptions(gender: string | null): RelOption[] {
  const base: RelOption[] = [
    { value: 'father', label: 'Father', icon: 'F', desc: 'Their dad' },
    { value: 'mother', label: 'Mother', icon: 'M', desc: 'Their mom' },
    { value: 'child', label: 'Child', icon: 'C', desc: 'Son or daughter' },
    { value: 'sibling', label: 'Sibling', icon: 'S', desc: 'Brother or sister' },
  ];

  // Add spouse option with gender-aware label
  if (gender === 'male') {
    base.push({ value: 'spouse', label: 'Wife', icon: 'W', desc: 'Their wife' });
  } else if (gender === 'female') {
    base.push({ value: 'spouse', label: 'Husband', icon: 'H', desc: 'Their husband' });
  } else {
    base.push({ value: 'spouse', label: 'Spouse', icon: 'S', desc: 'Husband or wife' });
  }

  return base;
}

export default function QuickAddSheet() {
  const router = useRouter();
  const { session } = useAuth();
  const quickAddTargetId = useFamilyStore(s => s.quickAddTargetId);
  const setQuickAddTarget = useFamilyStore(s => s.setQuickAddTarget);
  const people = useFamilyStore(s => s.people);
  const fetchFamily = useFamilyStore(s => s.fetchFamily);

  const targetPerson = useMemo(
    () => people.find(p => p.id === quickAddTargetId) || null,
    [people, quickAddTargetId]
  );

  const relOptions = useMemo(
    () => getRelationshipOptions(targetPerson?.gender || null),
    [targetPerson?.gender]
  );

  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [selectedRel, setSelectedRel] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setStep('choose');
    setSelectedRel('');
    setName('');
    setGender('');
    setPhoto(null);
    setPhotoPreview('');
    setSaving(false);
    setSuccess(false);
    setError('');
  };

  const handleClose = () => {
    setQuickAddTarget(null);
    resetForm();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleChooseRel = (rel: string) => {
    setSelectedRel(rel);
    setStep('form');
  };

  const handleSave = async () => {
    if (!session?.access_token || !targetPerson || !selectedRel || !name.trim()) return;

    setSaving(true);
    setError('');

    try {
      let photoUrl = '';
      if (photo) {
        photoUrl = await uploadImageToCloudinaryViaApi(photo, session.access_token, 'members');
      }

      // Use the add-relative API — it adds relative of a specific person
      const res = await fetch('/api/members/add-relative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          target_person_id: targetPerson.id,
          full_name: name.trim(),
          gender: gender || null,
          photo_url: photoUrl || null,
          relationship_type: selectedRel,
        }),
      });

      if (!res.ok) {
        // Fallback: use the regular add endpoint (adds relative of self)
        const fallbackRes = await fetch('/api/members/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: name.trim(),
            gender: gender || null,
            photo_url: photoUrl || null,
            is_self: false,
            relationship_type: selectedRel,
          }),
        });

        if (!fallbackRes.ok) {
          const data = await fallbackRes.json();
          throw new Error(data.error || 'Failed to add member');
        }
      }

      setSuccess(true);

      // Refresh tree
      await fetchFamily(session.user.id, session.access_token);

      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add member';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!targetPerson) return null;

  return (
    <Sheet open={!!quickAddTargetId} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-4 max-h-[80vh] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Quick Add Relative</SheetTitle>
        </SheetHeader>

        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {step === 'choose' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Add {targetPerson.full_name.split(' ')[0]}&apos;s...
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Choose who to add to the tree
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {relOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChooseRel(opt.value)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-200/40 bg-white/40 backdrop-blur-md hover:border-[#2A4365]/30 hover:bg-[#2A4365]/5 transition-all active:scale-95 text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#2A4365]/10 flex items-center justify-center text-sm font-bold text-[#2A4365]">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                handleClose();
                router.push('/add-member');
              }}
              className="w-full mt-4 py-3 text-sm text-[#2A4365] font-medium hover:underline"
            >
              Or go to full Add Member page →
            </button>
          </div>
        )}

        {step === 'form' && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setStep('choose')} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-400" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Add {targetPerson.full_name.split(' ')[0]}&apos;s {selectedRel}
                </h2>
              </div>
            </div>

            {/* Photo */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#2A4365]/25 bg-[#2A4365]/5 flex flex-col items-center justify-center overflow-hidden flex-shrink-0 active:scale-95"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={18} className="text-[#2A4365]/50" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

              <div className="flex-1">
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 rounded-xl glass-input text-sm focus:outline-none focus:ring-2 focus:ring-[#2A4365]/40 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(gender === g.value ? '' : g.value)}
                  className={`py-2 rounded-xl border-2 text-xs font-medium transition-all active:scale-95 ${
                    gender === g.value
                      ? 'border-[#2A4365] bg-[#2A4365]/5 text-[#2A4365]'
                      : 'border-gray-200/40 text-gray-500 hover:border-[#2A4365]/30'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2 text-sm text-red-600 mb-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!name.trim() || saving || success}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                success
                  ? 'bg-[#2A4365] shadow-[#2A4365]/20 text-white'
                  : 'bg-[#2A4365] shadow-[#2A4365]/20 text-white hover:bg-[#2A4365]/90 active:scale-[0.98]'
              }`}
            >
              {success ? <><Check size={16} /> Added!</> : saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Add to Tree'}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
