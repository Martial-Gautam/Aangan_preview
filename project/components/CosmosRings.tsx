'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Ring Constants ──────────────────────────────────────────

const RING_SPACING = 3.0; // Must match cosmos-layout.ts
const NUM_RINGS = 4;

// Gradient from bright → subtle as rings expand outward
const RING_COLORS = [
  '#10B981', // Ring 1 — Emerald (near self)
  '#3B82F6', // Ring 2 — Blue
  '#8B5CF6', // Ring 3 — Violet
  '#6B7280', // Ring 4 — Gray (far)
];

const RING_OPACITIES = [0.12, 0.08, 0.06, 0.04];

// ─── Component ───────────────────────────────────────────────

/**
 * Subtle ring indicators on the XZ ground plane.
 * Provides spatial orientation with premium depth cues.
 */
export default function CosmosRings() {
  const centerRef = useRef<THREE.Mesh>(null);

  // Animate center disc with gentle pulse
  useFrame((state) => {
    if (centerRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
      centerRef.current.scale.set(pulse, pulse, 1);
      const mat = centerRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
      }
    }
  });

  return (
    <group>
      {/* Render concentric rings */}
      {Array.from({ length: NUM_RINGS }).map((_, i) => {
        const radius = (i + 1) * RING_SPACING;
        const color = RING_COLORS[i] || RING_COLORS[RING_COLORS.length - 1];
        const baseOpacity = RING_OPACITIES[i] || 0.03;

        return (
          <group key={`ring-${i}`}>
            {/* Primary ring circle */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <ringGeometry args={[radius - 0.03, radius + 0.03, 128]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={baseOpacity}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Subtle glow ring (slightly larger, more transparent) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <ringGeometry args={[radius - 0.2, radius + 0.2, 128]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={baseOpacity * 0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      {/* Center marker — animated glowing disc at origin */}
      <mesh ref={centerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.4, 48]} />
        <meshBasicMaterial
          color="#10B981"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner glow ring around center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.5, 0.8, 64]} />
        <meshBasicMaterial
          color="#10B981"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
