'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { CosmosPosition, LineageSector } from '@/lib/cosmos-layout';

// ─── Premium Sector Color System ─────────────────────────────

const SECTOR_COLORS: Record<LineageSector, string> = {
  self:     '#10B981',  // Emerald — stands out as "you"
  maternal: '#8B5CF6',  // Violet
  paternal: '#3B82F6',  // Blue
  spouse:   '#EC4899',  // Pink
  siblings: '#F59E0B',  // Amber
  children: '#14B8A6',  // Teal
};

const SECTOR_EMISSIVE: Record<LineageSector, string> = {
  self:     '#10B981',
  maternal: '#7C3AED',
  paternal: '#2563EB',
  spouse:   '#DB2777',
  siblings: '#D97706',
  children: '#0D9488',
};

const SECTOR_LABELS: Record<LineageSector, string> = {
  self: 'You',
  maternal: 'Maternal',
  paternal: 'Paternal',
  spouse: 'Spouse',
  siblings: 'Sibling',
  children: 'Child',
};

// ─── Props ───────────────────────────────────────────────────

interface CosmosNodeProps {
  personId: string;
  name: string;
  photoUrl: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  isSelf: boolean;
  isLinked: boolean;
  isCenterPerson: boolean;
  position: CosmosPosition;
  relationshipLabel: string;
  onClick: (personId: string) => void;
  onDoubleClick: (personId: string) => void;
  isHighlighted?: boolean;
  searchActive?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

// ─── Component ───────────────────────────────────────────────

export default function CosmosNode({
  personId,
  name,
  photoUrl,
  gender,
  dateOfBirth,
  isSelf,
  isLinked,
  isCenterPerson,
  position,
  relationshipLabel,
  onClick,
  onDoubleClick,
  isHighlighted,
  searchActive,
}: CosmosNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const color = SECTOR_COLORS[position.sector] || '#9ca3af';
  const emissiveColor = SECTOR_EMISSIVE[position.sector] || '#555';
  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);
  const safeName = name || 'Unknown';
  const initials = safeName.split(' ').map((n: string) => n ? n[0] : '').join('').toUpperCase().slice(0, 2);

  // Node size based on relationship
  const baseSize = isSelf ? 0.6 : isCenterPerson ? 0.5 : 0.4;

  // Pulse animation for self node + hover
  useFrame((state) => {
    if (!meshRef.current) return;

    // Hover scale
    const targetScale = hovered ? 1.18 : 1.0;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    // Self pulsing glow
    if (glowRef.current && isSelf) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.18;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }

    // Center person ring rotation
    if (ringRef.current && isCenterPerson) {
      ringRef.current.rotation.z += 0.005;
    }

    // Emissive intensity based on hover
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        hovered ? 1.0 : 0.4,
        0.1
      );
    }
  });

  // LOD: compute detail level based on hop distance
  const detailLevel: 'full' | 'medium' | 'far' = useMemo(() => {
    if (position.hopDistance <= 1) return 'full';
    if (position.hopDistance <= 3) return 'medium';
    return 'far';
  }, [position.hopDistance]);

  // Search dimming
  const opacity = searchActive && isHighlighted === false ? 0.12 : 1;

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(personId);
  }, [onClick, personId]);

  const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onDoubleClick(personId);
  }, [onDoubleClick, personId]);

  return (
    <group
      position={[position.x, position.z, position.y]}
    >
      {/* Invisible Hit Target for Interactions */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[baseSize, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Linked indicator dot */}
      {isLinked && !isSelf && detailLevel !== 'far' && (
        <mesh position={[baseSize * 0.7, baseSize * 0.5, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      )}

      {/* HTML Labels — LOD controlled */}
      {detailLevel === 'full' && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Html
            center
            distanceFactor={8}
            style={{
              transition: 'opacity 0.3s ease',
              opacity: opacity,
              pointerEvents: 'none',
            }}
            position={[0, 0, 0]}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transform: hovered ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              userSelect: 'none',
            }}>
              
              {/* Relationship badge — Top */}
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#ffffff',
                background: `${color}cc`,
                padding: '3px 10px',
                borderRadius: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: `0 2px 8px ${color}55`,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${color}`,
                marginBottom: '2px',
              }}>
                {relationshipLabel}
              </div>

              {/* Photo or initials — Center (replacing sphere) */}
              <div style={{ position: 'relative' }}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={safeName}
                    style={{
                      width: 56, height: 56,
                      borderRadius: '50%',
                      border: `3px solid ${color}`,
                      objectFit: 'cover',
                      boxShadow: `0 0 20px ${color}66, 0 4px 12px rgba(0,0,0,0.4)`,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}, ${color}99)`,
                    border: `3px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    boxShadow: `0 0 20px ${color}66, 0 4px 12px rgba(0,0,0,0.4)`,
                    letterSpacing: '0.5px',
                  }}>
                    {initials}
                  </div>
                )}
                
                {/* Self Ring / Indicator */}
                {isSelf && (
                  <div style={{
                    position: 'absolute',
                    inset: -6,
                    borderRadius: '50%',
                    border: `2px dashed ${color}`,
                    animation: 'spin 10s linear infinite',
                    opacity: 0.6,
                  }} />
                )}
              </div>

              {/* Name — Bottom */}
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff',
                textAlign: 'center',
                maxWidth: 120,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.6)',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: '-0.01em',
                marginTop: '2px',
              }}>
                {safeName}
              </div>
            </div>
          </Html>
        </Billboard>
      )}

      {/* Medium LOD — just initials and name, smaller */}
      {detailLevel === 'medium' && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Html
            center
            distanceFactor={10}
            style={{ opacity: opacity * 0.9, pointerEvents: 'none' }}
            position={[0, 0, 0]}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              userSelect: 'none',
            }}>
              <div style={{
                width: 24, height: 24,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 10,
                fontWeight: 600,
                boxShadow: `0 0 8px ${color}88`,
              }}>
                {initials}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#ffffff',
                textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {safeName}
              </div>
            </div>
          </Html>
        </Billboard>
      )}

      {/* Far LOD — colored point light */}
      {detailLevel === 'far' && (
        <pointLight
          color={color}
          intensity={0.4}
          distance={2.5}
        />
      )}
    </group>
  );
}
