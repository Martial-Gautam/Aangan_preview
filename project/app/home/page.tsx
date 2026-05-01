'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Person, Relationship } from '@/lib/supabase';
import { buildNetworkTreeData, TreeNodeData } from '@/lib/tree-utils';
import BottomNav from '@/components/BottomNav';
import { Plus, TreePine, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Tree = dynamic(() => import('react-d3-tree'), { ssr: false });

export default function HomePage() {
  const { user, profile, session, loading } = useAuth();
  const router = useRouter();
  const [selfPerson, setSelfPerson] = useState<Person | null>(null);
  const [treeData, setTreeData] = useState<TreeNodeData | null>(null);
  const [familyCount, setFamilyCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const treeContainerRef = useRef<HTMLDivElement>(null);
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
    if (treeContainerRef.current) {
      const { width, height } = treeContainerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 80 });
    }
  }, [dataLoading]);

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
      const connectedRoots: string[] = data.connected_roots || [];

      const self = nodes.find((p) => p.id === selfId) || null;
      setSelfPerson(self);

      if (!selfId) {
        setTreeData(null);
        setFamilyCount(0);
        setDataLoading(false);
        return;
      }

      const tree = buildNetworkTreeData(selfId, nodes, edges, connectedRoots);
      setTreeData(tree);
      setFamilyCount(Math.max(0, nodes.length - 1));
    } finally {
      setDataLoading(false);
    }
  };

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.15, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.15, 0.3));
  }, []);

  const handleFit = useCallback(() => {
    setZoom(0.8);
    if (treeContainerRef.current) {
      const { width, height } = treeContainerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 80 });
    }
  }, []);

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

  const renderCustomNode = ({ nodeDatum }: { nodeDatum: TreeNodeData }) => {
    const { name, attributes } = nodeDatum;
    const relType = attributes.relationshipType;
    const isSelf = attributes.isSelf;
    const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      self: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-400', badge: 'bg-orange-100 text-orange-700' },
      father: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
      mother: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', badge: 'bg-pink-100 text-pink-700' },
      sibling: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', badge: 'bg-green-100 text-green-700' },
      spouse: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700' },
      child: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', badge: 'bg-teal-100 text-teal-700' },
      connection: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', badge: 'bg-indigo-100 text-indigo-700' },
    };

    const labelMap: Record<string, string> = {
      self: 'You', father: 'Father', mother: 'Mother',
      sibling: 'Sibling', spouse: 'Spouse', child: 'Child',
      connection: 'Connected',
    };

    const colors = colorMap[relType] || colorMap.self;
    const label = labelMap[relType] || relType;

    return (
      <g>
        <foreignObject width={120} height={110} x={-60} y={-15}>
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-sm ${
                isSelf
                  ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-200'
                  : `${colors.bg} ${colors.text} ${colors.border}`
              }`}
            >
              {attributes.photoUrl ? (
                <img src={attributes.photoUrl} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-gray-800 text-center leading-tight max-w-[110px] truncate">
              {name}
            </p>
            <span
              className={`mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                isSelf ? 'bg-orange-100 text-orange-700' : colors.badge
              }`}
            >
              {label}
            </span>
          </div>
        </foreignObject>
      </g>
    );
  };

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
      <div className="flex-1 relative" ref={treeContainerRef}>
        {treeData && familyCount > 0 ? (
          <>
            <Tree
              data={treeData}
              renderCustomNodeElement={renderCustomNode as never}
              orientation="vertical"
              pathFunc="step"
              translate={translate}
              zoom={zoom}
              scaleExtent={{ min: 0.3, max: 2 }}
              draggable
              zoomable
              collapsible={false}
              transitionDuration={400}
              separation={{ siblings: 1.5, nonSiblings: 2 }}
              nodeSize={{ x: 140, y: 110 }}
              styles={{
                links: {
                  stroke: '#d1d5db',
                  strokeWidth: 2,
                },
                nodes: {
                  node: {
                    circle: { fill: 'transparent', stroke: 'transparent' },
                    name: { fill: 'transparent' },
                    attributes: { fill: 'transparent' },
                  },
                },
              }}
              onTranslateChange={(t: { x: number; y: number }) => setTranslate(t)}
              onZoomChange={(z: number) => setZoom(z)}
            />

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-20">
              <button
                onClick={handleZoomIn}
                className="w-10 h-10 bg-white rounded-xl shadow-md border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
              >
                <ZoomIn size={18} className="text-gray-600" />
              </button>
              <button
                onClick={handleZoomOut}
                className="w-10 h-10 bg-white rounded-xl shadow-md border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
              >
                <ZoomOut size={18} className="text-gray-600" />
              </button>
              <button
                onClick={handleFit}
                className="w-10 h-10 bg-white rounded-xl shadow-md border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Maximize size={18} className="text-gray-600" />
              </button>
            </div>
          </>
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

      <BottomNav />
    </div>
  );
}
