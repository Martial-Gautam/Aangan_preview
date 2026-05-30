'use client';

import { useMemo, useRef, useCallback, useEffect, Suspense, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import './FamilyCosmos.module.css';

export type ViewMode = 'fpp' | 'tpp';

import CosmosNode from './CosmosNode';
import CosmosEdge from './CosmosEdge';
import CosmosRings from './CosmosRings';
import { computeCosmosLayout, type CosmosPosition } from '@/lib/cosmos-layout';
import type { Person, Relationship } from '@/lib/tree-to-flow';
import { resolveRelationshipLabel } from '@/lib/relationship-resolver';

// ─── FPP FOV-based Zoom (Pinch + Scroll Wheel) ──────────────

const FPP_FOV_MIN = 30;  // fully zoomed in
const FPP_FOV_MAX = 110; // fully zoomed out
const FPP_FOV_SENSITIVITY_WHEEL = 1.8;
const FPP_FOV_SENSITIVITY_PINCH = 0.35;
const FPP_FOV_LERP_SPEED = 0.12;

function FppFovZoom({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const targetFovRef = useRef((camera as THREE.PerspectiveCamera).fov);
  const pinchRef = useRef({ active: false, startDist: 0, startFov: 0 });

  // Sync target FOV when mode changes
  useEffect(() => {
    if (enabled) {
      targetFovRef.current = (camera as THREE.PerspectiveCamera).fov;
    }
  }, [enabled, camera]);

  // Scroll-wheel handler for desktop zoom
  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? FPP_FOV_SENSITIVITY_WHEEL : -FPP_FOV_SENSITIVITY_WHEEL;
      targetFovRef.current = Math.max(FPP_FOV_MIN, Math.min(FPP_FOV_MAX, targetFovRef.current + delta));
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [enabled, gl]);

  // Touch pinch handler for mobile zoom
  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;

    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          active: true,
          startDist: getTouchDist(e),
          startFov: targetFovRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pinchRef.current.active || e.touches.length !== 2) return;
      const dist = getTouchDist(e);
      const scale = pinchRef.current.startDist / dist; // pinch-in => scale > 1 => zoom out (wider FOV)
      const newFov = pinchRef.current.startFov * scale;
      targetFovRef.current = Math.max(FPP_FOV_MIN, Math.min(FPP_FOV_MAX, newFov));
    };

    const onTouchEnd = () => {
      pinchRef.current.active = false;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, gl]);

  // Smooth lerp every frame
  useFrame(() => {
    if (!enabled) return;
    const cam = camera as THREE.PerspectiveCamera;
    const diff = targetFovRef.current - cam.fov;
    if (Math.abs(diff) > 0.05) {
      cam.fov += diff * FPP_FOV_LERP_SPEED;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

// ─── Scene Content ───────────────────────────────────────────

interface SceneProps {
  selfPersonId: string;
  people: Person[];
  relationships: Relationship[];
  onNodeClick: (personId: string) => void;
  onCenterChange: (personId: string) => void;
  centerPersonId: string;
  centerKey: number;
  maxHops: number;
  searchQuery: string;
  viewMode: ViewMode;
  onReady?: () => void;
}

function SceneReady({ onReady }: { onReady?: () => void }) {
  const readyCalledRef = useRef(false);

  useEffect(() => {
    if (!onReady || readyCalledRef.current) return;
    readyCalledRef.current = true;
    const frame = requestAnimationFrame(() => onReady());
    return () => cancelAnimationFrame(frame);
  }, [onReady]);

  return null;
}

function Scene({
  selfPersonId,
  people,
  relationships,
  onNodeClick,
  onCenterChange,
  centerPersonId,
  centerKey,
  maxHops,
  searchQuery,
  viewMode,
  onReady,
}: SceneProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Compute 3D layout
  const cosmosPositions = useMemo(() =>
    computeCosmosLayout(centerPersonId, people, relationships, maxHops),
    [centerPersonId, people, relationships, maxHops]
  );

  const relationLabels = useMemo(() => {
    const labels = new Map<string, string>();
    labels.set(selfPersonId, 'You');

    const visibleIds = new Set<string>();
    for (const person of people) {
      if (cosmosPositions.has(person.id)) visibleIds.add(person.id);
    }

    for (const personId of Array.from(visibleIds)) {
      const result = resolveRelationshipLabel(selfPersonId, personId, people, relationships);
      const label = result.term.english || 'Relative';
      labels.set(personId, label);
    }

    return labels;
  }, [selfPersonId, people, relationships, cosmosPositions]);

  // Get self person for owner comparison
  const selfPerson = useMemo(() =>
    people.find(p => p.id === selfPersonId),
    [people, selfPersonId]
  );

  // Search highlighting
  const searchLower = searchQuery.toLowerCase().trim();
  const searchActive = searchLower.length > 0;

  // Animate camera to center when centerPersonId or viewMode changes
  useEffect(() => {
    const pos = cosmosPositions.get(centerPersonId);
    if (pos && controlsRef.current) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      
      let camPosX, camPosY, camPosZ;
      let tgtPosX, tgtPosY, tgtPosZ;
      let targetFov = 55;

      if (viewMode === 'fpp') {
        // FPP: camera at center node, looking outward
        // On mobile, we increase the FOV significantly to show more nodes horizontally
        targetFov = isMobile ? 95 : 75;
        
        camPosX = pos.x;
        camPosY = pos.z + 0.1;
        camPosZ = pos.y;
        
        // Target is slightly in front of the camera, so OrbitControls rotates the camera around this close point
        tgtPosX = pos.x;
        tgtPosY = pos.z + 0.1;
        tgtPosZ = pos.y - 0.1;
      } else {
        // TPP: camera above, looking at the center node
        targetFov = isMobile ? 65 : 55;
        
        tgtPosX = pos.x;
        tgtPosY = pos.z;
        tgtPosZ = pos.y;
        
        camPosX = pos.x;
        camPosY = 12;
        camPosZ = pos.y + 10;
      }

      // Animate Camera Position
      gsap.to(camera.position, {
        x: camPosX,
        y: camPosY,
        z: camPosZ,
        duration: 1.2,
        ease: 'power3.inOut',
      });

      // Animate OrbitControls Target
      gsap.to(controlsRef.current.target, {
        x: tgtPosX,
        y: tgtPosY,
        z: tgtPosZ,
        duration: 1.2,
        ease: 'power3.inOut',
      });

      // Animate FOV for dramatic transition
      gsap.to(camera, {
        fov: targetFov,
        duration: 1.2,
        ease: 'power3.inOut',
        onUpdate: () => camera.updateProjectionMatrix(),
      });
    }
  }, [centerPersonId, centerKey, cosmosPositions, viewMode, camera]);

  // Handle manual interaction to stop GSAP animations
  useEffect(() => {
    const handlePointerDown = () => {
      // Instantly kill any ongoing cinematic camera flights if the user touches/clicks the screen
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camera);
      if (controlsRef.current) {
        gsap.killTweensOf(controlsRef.current.target);
      }
    };
    
    // Attach to the canvas parent document
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [camera]);

  // Handle center change + camera animation
  const handleCenterChange = useCallback((personId: string) => {
    onCenterChange(personId);
  }, [onCenterChange]);

  // Build visible nodes
  const visiblePeople = useMemo(() =>
    people.filter(p => cosmosPositions.has(p.id)),
    [people, cosmosPositions]
  );

  // Build edges (deduplicated)
  const visibleEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    const edges: Array<{
      sourceId: string;
      targetId: string;
      relType: string;
      isCrossTree: boolean;
    }> = [];

    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i];
      if (!cosmosPositions.has(rel.person_id) || !cosmosPositions.has(rel.related_person_id)) continue;
      if (rel.person_id === rel.related_person_id) continue;

      const pairKey = [rel.person_id, rel.related_person_id].sort().join('::');
      const typeKey = rel.relationship_type === 'father' || rel.relationship_type === 'mother' || rel.relationship_type === 'child'
        ? 'hierarchy' : rel.relationship_type;
      const dedupeKey = `${pairKey}::${typeKey}`;

      if (edgeSet.has(dedupeKey)) continue;
      edgeSet.add(dedupeKey);

      const isCrossTree = selfPerson
        ? (() => {
            const src = people.find(p => p.id === rel.person_id);
            const tgt = people.find(p => p.id === rel.related_person_id);
            return !!(src && tgt && src.owner_id !== tgt.owner_id);
          })()
        : false;

      edges.push({
        sourceId: rel.person_id,
        targetId: rel.related_person_id,
        relType: rel.relationship_type,
        isCrossTree,
      });
    }

    return edges;
  }, [relationships, cosmosPositions, people, selfPerson]);

  return (
    <>
      {/* Cinematic Lighting — warm/cool contrast */}
      <ambientLight intensity={0.35} color="#c8d6e5" />
      <pointLight position={[12, 18, 10]} intensity={0.7} color="#ffffff" />
      <pointLight position={[-10, 12, -8]} intensity={0.35} color="#a5b4fc" />
      <pointLight position={[0, -5, 0]} intensity={0.15} color="#10B981" />

      {/* Fog for depth — deeper gradient */}
      <fog attach="fog" args={['#060b16', 12, 45]} />

      {/* Dense starfield background */}
      <Stars
        radius={60}
        depth={50}
        count={3500}
        factor={3.5}
        saturation={0.25}
        fade
        speed={0.2}
      />

      {/* Camera controls — adapts to FPP/TPP mode */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={viewMode === 'tpp'}
        enableZoom={viewMode !== 'fpp'}
        enableRotate={true}
        screenSpacePanning={true}
        minPolarAngle={viewMode === 'fpp' ? Math.PI / 6 : Math.PI / 8}
        maxPolarAngle={viewMode === 'fpp' ? Math.PI / 1.2 : Math.PI / 2.2}
        minDistance={viewMode === 'fpp' ? 0.1 : 2}
        maxDistance={viewMode === 'fpp' ? 0.1 : 30}
        enableDamping={true}
        dampingFactor={0.08}
        rotateSpeed={viewMode === 'fpp' ? -0.7 : -0.8}
        zoomSpeed={1.2}
        panSpeed={-1.2}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: viewMode === 'fpp' ? THREE.TOUCH.ROTATE : THREE.TOUCH.DOLLY_PAN,
        }}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: viewMode === 'fpp' ? THREE.MOUSE.ROTATE : THREE.MOUSE.DOLLY,
          RIGHT: viewMode === 'fpp' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        }}
        target={[0, 0, 0]}
      />

      {/* FPP-mode FOV zoom via pinch / scroll wheel */}
      <FppFovZoom enabled={viewMode === 'fpp'} />

      {/* Ring indicators */}
      <CosmosRings />

      {/* Edges */}
      {visibleEdges.map((edge, idx) => {
        const sourcePos = cosmosPositions.get(edge.sourceId);
        const targetPos = cosmosPositions.get(edge.targetId);
        if (!sourcePos || !targetPos) return null;

        return (
          <CosmosEdge
            key={`edge-${idx}`}
            sourcePos={sourcePos}
            targetPos={targetPos}
            relationshipType={edge.relType}
            isCrossTree={edge.isCrossTree}
          />
        );
      })}

      {/* Nodes */}
      {visiblePeople.map(person => {
        const pos = cosmosPositions.get(person.id);
        if (!pos) return null;

        const isSelf = person.is_self && selfPerson && person.owner_id === selfPerson.owner_id;
        const relLabel = relationLabels.get(person.id) || (pos.sector !== 'self' ? pos.sector : 'Relative');

        const isHighlighted = searchActive
          ? person.full_name.toLowerCase().includes(searchLower) ||
            (person.email || '').toLowerCase().includes(searchLower) ||
            (person.phone_number || '').includes(searchLower)
          : undefined;

        return (
          <CosmosNode
            key={person.id}
            personId={person.id}
            name={person.full_name}
            photoUrl={person.photo_url}
            gender={person.gender}
            dateOfBirth={(person as any).date_of_birth || null}
            isSelf={!!isSelf}
            isLinked={person.user_id !== null}
            isCenterPerson={person.id === centerPersonId}
            position={pos}
            relationshipLabel={relLabel}
            onClick={onNodeClick}
            onDoubleClick={handleCenterChange}
            isHighlighted={isHighlighted}
            searchActive={searchActive}
            viewMode={viewMode}
          />
        );
      })}

      <SceneReady onReady={onReady} />
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────

interface FamilyCosmosProps {
  selfPersonId: string;
  people: Person[];
  relationships: Relationship[];
  onNodeClick: (personId: string) => void;
  onCenterChange: (personId: string) => void;
  centerPersonId: string;
  centerKey: number;
  maxHops: number;
  searchQuery: string;
  viewMode: ViewMode;
  onReady?: () => void;
}

export default function FamilyCosmos(props: FamilyCosmosProps) {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(180deg, #060b16 0%, #0a1628 50%, #0d0f18 100%)', zIndex: 0 }}>
      <Canvas
        camera={{
          position: [0, 12, 10],
          fov: 55,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
