'use client';

import * as THREE from 'three';

// ─── Ring Constants ──────────────────────────────────────────

const RING_SPACING = 3.0; // Must match cosmos-layout.ts
const NUM_RINGS = 4;
const RING_COLORS = [
  '#1B4332', // Ring 1
  '#1B4332', // Ring 2
  '#1B4332', // Ring 3
  '#9ca3af', // Ring 4 — grey
];

// ─── Component ───────────────────────────────────────────────

/**
 * Subtle ring indicators on the XZ ground plane.
 * Provides spatial orientation without visual distraction.
 *
 * Rings are rendered at Y=0 (the "ground" plane) with very low opacity.
 */
export default function CosmosRings() {
  return (
    <group>
      {/* Render concentric rings */}
      {Array.from({ length: NUM_RINGS }).map((_, i) => {
        const radius = (i + 1) * RING_SPACING;
        const color = RING_COLORS[i] || RING_COLORS[RING_COLORS.length - 1];

        return (
          <group key={`ring-${i}`}>
            {/* Ring circle */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <ringGeometry args={[radius - 0.02, radius + 0.02, 96]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.08 - i * 0.015}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Subtle glow ring (slightly larger, more transparent) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <ringGeometry args={[radius - 0.15, radius + 0.15, 96]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.03}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      {/* Center marker — small glowing disc at origin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial
          color="#1B4332"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid helper (very subtle) */}
      <gridHelper
        args={[30, 30, '#4a4a4a', '#2a2a2a']}
        position={[0, -0.05, 0]}
        /* @ts-ignore */
        material-opacity={0.04}
        material-transparent={true}
      />
    </group>
  );
}
