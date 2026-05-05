'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import FamilyFlow from '@/components/FamilyFlow';
import MemberDetailSheet from '@/components/MemberDetailSheet';
import { Person, Relationship } from '@/lib/tree-to-flow';
import BottomNav from '@/components/BottomNav';
import { Plus, TreePine } from 'lucide-react';
import Link from 'next/link';


export default function HomePage() {
  const { user, profile, session, loading } = useAuth();
  const router = useRouter();

  const [selfPerson, setSelfPerson] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/welcome'); return; }
    if (!profile?.onboarding_completed) { router.replace('/onboarding'); return; }
    fetchFamily();
  }, [user, profile, loading]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;
    setIsInstalled(Boolean(standalone));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const fetchFamily = async () => {
    if (!user || !session?.access_token) return;
    setDataLoading(true);
    try {
      const res = await fetch('/api/tree/full', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setDataLoading(false);
        return;
      }

      const data = await res.json();
      const nodes: Person[] = data.nodes || [];
      const edges: Relationship[] = data.edges || [];
      const selfId: string | null = data.self_person_id;

      const self = nodes.find((p) => p.id === selfId) || null;
      setSelfPerson(self);
      setPeople(nodes);
      setRelationships(edges);
      setFamilyCount(Math.max(0, nodes.length - 1));
    } finally {
      setDataLoading(false);
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      setCanInstall(false);
      setInstallHint('');
      return;
    }

    setInstallHint('Use your browser menu to add this app to your home screen.');
  };

  const handleDeleteMember = useCallback((personId: string) => {
    setPeople(prev => prev.filter(p => p.id !== personId));
    setRelationships(prev => prev.filter(
      r => r.person_id !== personId && r.related_person_id !== personId
    ));
    setFamilyCount(prev => Math.max(0, prev - 1));
  }, []);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center animate-pulse">
            <TreePine size={20} className="text-orange-400" />
          </div>
          <p className="text-sm text-gray-400">Loading your family...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Aangan</p>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {profile?.full_name?.split(' ')[0]}&apos;s Family
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-2.5 py-1 rounded-full">
              {familyCount} {familyCount === 1 ? 'member' : 'members'}
            </span>
            <button
              onClick={handleInstall}
              className="bg-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-orange-600 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
        {installHint && (
          <p className="text-[11px] text-gray-400 mt-1 max-w-lg mx-auto px-1">
            {installHint}
          </p>
        )}
      </div>

      {/* Tree area */}
      <div className="flex-1 relative">
        {selfPerson && people.length > 1 ? (
          <FamilyFlow
            selfPersonId={selfPerson.id}
            people={people}
            relationships={relationships}
            onNodeClick={(id) => setSelectedPersonId(id)}
          />
        ) : (
          /* Empty state */
          <div className="h-full flex items-center justify-center px-6">
            <div className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-sm border border-gray-100 max-w-xs w-full">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <TreePine size={36} className="text-orange-300" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Your tree is empty</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                Start by adding your parents or siblings to build your family tree
              </p>
              <Link
                href="/add-member"
                className="bg-orange-500 text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg shadow-orange-200"
              >
                <Plus size={16} /> Add First Member
              </Link>
            </div>
          </div>
        )}

        {/* Floating add button */}
        {familyCount > 0 && (
          <div className="absolute bottom-4 right-4 z-20">
            <Link
              href="/add-member"
              className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-300 hover:bg-orange-600 active:scale-95 transition-all"
            >
              <Plus size={24} className="text-white" />
            </Link>
          </div>
        )}
      </div>

      {/* Member detail sheet */}
      {selfPerson && (
        <MemberDetailSheet
          personId={selectedPersonId}
          people={people}
          relationships={relationships}
          selfPersonId={selfPerson.id}
          onClose={() => setSelectedPersonId(null)}
          onDelete={handleDeleteMember}
          accessToken={session?.access_token || ''}
        />
      )}

      <BottomNav />
    </div>
  );
}
