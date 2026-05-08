'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Camera, ChevronRight, ChevronLeft, Check, User } from 'lucide-react';
import ClaimProfileModal, { ClaimMatch } from '@/components/ClaimProfileModal';

const STEPS = ['photo', 'name', 'gender', 'dob'] as const;
type Step = typeof STEPS[number];

const genders = [
  { value: 'male', label: 'Male', icon: '👨' },
  { value: 'female', label: 'Female', icon: '👩' },
  { value: 'other', label: 'Other', icon: '🧑' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, session, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Claim state
  const [claimMatches, setClaimMatches] = useState<ClaimMatch[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);

  const currentIndex = STEPS.indexOf(step);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]);
  };

  const goBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex]);
  };

  const checkClaimableProfiles = async () => {
    if (!session?.access_token || !user?.email) return;

    try {
      const res = await fetch('/api/claim/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          setClaimMatches(data.matches);
          setShowClaimModal(true);
          return; // Don't navigate yet — wait for modal interaction
        }
      }
    } catch {
      // Non-critical: if claim check fails, just skip it
    }

    router.replace('/home');
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      let photoUrl = '';

      if (photo) {
        const ext = photo.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photo, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name,
        gender: gender || null,
        date_of_birth: dob || null,
        photo_url: photoUrl || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      const { data: existingSelf } = await supabase
        .from('people')
        .select('id')
        .eq('owner_id', user.id)
        .eq('is_self', true)
        .maybeSingle();

      if (existingSelf) {
        await supabase.from('people').update({
          full_name: name,
          gender: gender || null,
          date_of_birth: dob || null,
          photo_url: photoUrl || null,
          updated_at: new Date().toISOString(),
        }).eq('id', existingSelf.id);
      } else {
        const { error: personError } = await supabase.from('people').insert({
          owner_id: user.id,
          full_name: name,
          gender: gender || null,
          date_of_birth: dob || null,
          photo_url: photoUrl || null,
          is_self: true,
        });
        if (personError) throw personError;
      }

      await refreshProfile();

      // After onboarding, check for claimable profiles before navigating
      await checkClaimableProfiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 'photo') return true;
    if (step === 'name') return name.trim().length >= 2;
    if (step === 'gender') return gender !== '';
    if (step === 'dob') return dob !== '';
    return false;
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col max-w-sm mx-auto">
      <div className="px-6 pt-12 pb-2">
        <div className="flex items-center gap-3 mb-6">
          {currentIndex > 0 && (
            <button onClick={goBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors -ml-2">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
          )}
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#355E3B] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">{currentIndex + 1}/{STEPS.length}</span>
        </div>
      </div>

      <div className="flex-1 px-6 pb-8">
        {step === 'photo' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Add your photo</h2>
            <p className="text-gray-500 text-sm text-center mb-10">Help your family recognize you</p>
            <div className="relative mb-10">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-36 h-36 rounded-full border-4 border-dashed border-[#355E3B]/25 bg-[#355E3B]/5 flex flex-col items-center justify-center hover:border-[#355E3B]/50 hover:bg-[#355E3B]/10 transition-all active:scale-95 overflow-hidden"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={32} className="text-[#355E3B]/50 mb-2" />
                    <span className="text-xs text-[#355E3B] font-medium">Add Photo</span>
                  </>
                )}
              </button>
              {photoPreview && (
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#355E3B] rounded-full flex items-center justify-center shadow-md">
                  <Camera size={14} className="text-white" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <p className="text-xs text-gray-400 text-center">You can skip this and add it later</p>
          </div>
        )}

        {step === 'name' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What&apos;s your name?</h2>
            <p className="text-gray-500 text-sm mb-10">Your family will know you by this name</p>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoFocus
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-[#C9A66B]/20 bg-[#FAF7F2] text-base focus:outline-none focus:border-[#355E3B]/50 transition-all placeholder:text-[#5E5E5E]/40 font-medium text-[#2B2B2B]"
              />
            </div>
          </div>
        )}

        {step === 'gender' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your gender</h2>
            <p className="text-gray-500 text-sm mb-10">This helps us personalize your family tree</p>
            <div className="grid grid-cols-3 gap-3">
              {genders.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 ${
                    gender === g.value
                      ? 'border-[#355E3B] bg-[#355E3B]/5 shadow-md shadow-[#355E3B]/10'
                      : 'border-[#C9A66B]/15 bg-[#EFE6D5]/30 hover:border-[#355E3B]/30'
                  }`}
                >
                  <span className="text-3xl">{g.icon}</span>
                  <span className={`text-sm font-semibold ${gender === g.value ? 'text-[#355E3B]' : 'text-[#5E5E5E]'}`}>
                    {g.label}
                  </span>
                  {gender === g.value && (
                    <div className="w-5 h-5 rounded-full bg-[#355E3B] flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'dob' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Date of birth</h2>
            <p className="text-gray-500 text-sm mb-10">Your family can celebrate your birthday!</p>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-4 rounded-2xl border-2 border-[#C9A66B]/20 bg-[#FAF7F2] text-base focus:outline-none focus:border-[#355E3B]/50 transition-all font-medium text-[#2B2B2B]"
            />
            {error && (
              <div className="mt-4 bg-[#6B2E2E]/8 border border-[#6B2E2E]/15 rounded-xl px-4 py-3 text-sm text-[#6B2E2E]">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-10">
        {step === 'dob' ? (
          <button
            onClick={handleFinish}
            disabled={!canProceed() || loading}
            className="w-full bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white py-4 rounded-2xl font-semibold text-base hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] transition-all shadow-lg shadow-[#355E3B]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Setting up your account...' : <>Finish Setup <Check size={18} /></>}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={step !== 'photo' && !canProceed()}
            className="w-full bg-gradient-to-r from-[#355E3B] to-[#6E8B74] text-white py-4 rounded-2xl font-semibold text-base hover:from-[#2d5033] hover:to-[#5f7a64] active:scale-[0.98] transition-all shadow-lg shadow-[#355E3B]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continue <ChevronRight size={18} />
          </button>
        )}

        {step === 'photo' && (
          <button
            onClick={goNext}
            className="w-full mt-3 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Claim profile modal (shown post-onboarding if matches found) */}
      {showClaimModal && claimMatches.length > 0 && (
        <ClaimProfileModal
          matches={claimMatches}
          onClaimed={() => {
            setShowClaimModal(false);
            router.replace('/home');
          }}
          onDismiss={() => {
            setShowClaimModal(false);
            router.replace('/home');
          }}
        />
      )}
    </div>
  );
}
