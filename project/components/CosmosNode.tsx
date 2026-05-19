'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { CosmosPosition, LineageSector } from '@/lib/cosmos-layout';

// ─── Color System ────────────────────────────────────────────

const SECTOR_COLORS: Record<LineageSector, string> = {
  self:     '#355E3B',
  maternal: '#B76E5D',
  paternal: '#8B5E3C',
  spouse:   '#C9A66B',
  siblings: '#6E8B74',
  children: '#4a7a52',
};

const SECTOR_EMISSIVE: Record<LineageSector, string> = {
  self:     '#355E3B',
  maternal: '#B76E5D',
  paternal: '#8B5E3C',
  spouse:   '#C9A66B',
  siblings: '#6E8B74',
  children: '#4a7a52',
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
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const color = SECTOR_COLORS[position.sector] || '#9ca3af';
  const emissiveColor = SECTOR_EMISSIVE[position.sector] || '#555';
  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Node size based on relationship
  const baseSize = isSelf ? 0.55 : isCenterPerson ? 0.48 : 0.38;

  // Pulse animation for self node
  useFrame((state) => {
    if (!meshRef.current) return;

    // Distance from camera for LOD
    const dist = camera.position.distanceTo(meshRef.current.position);

    // Hover scale
    const targetScale = hovered ? 1.2 : 1.0;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    // Self pulsing glow
    if (glowRef.current && isSelf) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }

    // Emissive intensity based on hover
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        hovered ? 0.8 : 0.3,
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
  const opacity = searchActive && isHighlighted === false ? 0.15 : 1;

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
      {/* Outer glow sphere (self only) */}
      {isSelf && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[baseSize * 1.8, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Center person ring indicator */}
      {isCenterPerson && !isSelf && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -baseSize * 0.6, 0]}>
          <ringGeometry args={[baseSize * 1.2, baseSize * 1.4, 32]} />
          <meshBasicMaterial color="#C9A66B" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[baseSize, detailLevel === 'far' ? 8 : 24, detailLevel === 'far' ? 8 : 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Linked indicator dot */}
      {isLinked && !isSelf && detailLevel !== 'far' && (
        <mesh position={[baseSize * 0.7, baseSize * 0.5, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
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
            position={[0, baseSize + 0.4, 0]}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transform: 'scale(1)',
              userSelect: 'none',
            }}>
              {/* Photo or initials */}
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                />
              ) : (
                <div style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color}, ${color}99)`,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                  {initials}
                </div>
              )}

              {/* Name */}
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#FAF7F2',
                textAlign: 'center',
                maxWidth: 90,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {name}
              </div>

              {/* Age + relationship */}
              <div style={{
                fontSize: 8,
                fontWeight: 600,
                color: color,
                background: 'rgba(250,247,242,0.9)',
                padding: '1px 6px',
                borderRadius: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                {relationshipLabel}{age !== null ? ` · ${age}y` : ''}
              </div>
            </div>
          </Html>
        </Billboard>
      )}

      {/* Medium LOD — just name */}
      {detailLevel === 'medium' && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Html
            center
            distanceFactor={10}
            style={{ opacity: opacity * 0.85, pointerEvents: 'none' }}
            position={[0, baseSize + 0.25, 0]}
          >
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: '#FAF7F2',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              {name}
            </div>
          </Html>
        </Billboard>
      )}

      {/* Far LOD — just a glow, no label */}
      {detailLevel === 'far' && (
        <pointLight
          color={color}
          intensity={0.3}
          distance={2}
        />
      )}
    </group>
  );
}
