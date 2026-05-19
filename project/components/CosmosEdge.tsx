'use client';


import { Line, QuadraticBezierLine } from '@react-three/drei';
import type { CosmosPosition } from '@/lib/cosmos-layout';

// ─── Props ───────────────────────────────────────────────────

interface CosmosEdgeProps {
  sourcePos: CosmosPosition;
  targetPos: CosmosPosition;
  relationshipType: string; // 'father' | 'mother' | 'child' | 'spouse' | 'sibling'
  isCrossTree?: boolean;
}

// ─── Color & Style Definitions ───────────────────────────────

const EDGE_STYLES: Record<string, { color: string; lineWidth: number; dashed: boolean }> = {
  parent:    { color: '#355E3B', lineWidth: 1.5, dashed: false },
  spouse:    { color: '#C9A66B', lineWidth: 2.0, dashed: false },
  sibling:   { color: '#6E8B74', lineWidth: 1.0, dashed: true },
  crossTree: { color: '#C9A66B', lineWidth: 0.8, dashed: true },
};

function getEdgeStyle(relType: string, isCrossTree: boolean) {
  if (isCrossTree) return EDGE_STYLES.crossTree;
  if (relType === 'father' || relType === 'mother' || relType === 'child') return EDGE_STYLES.parent;
  if (relType === 'spouse') return EDGE_STYLES.spouse;
  if (relType === 'sibling') return EDGE_STYLES.sibling;
  return EDGE_STYLES.parent;
}

// ─── Component ───────────────────────────────────────────────

/**
 * 3D edge between two cosmos nodes.
 *
 * Coordinate mapping:
 *   Three.js X = cosmos X (radial)
 *   Three.js Y = cosmos Z (generation/depth)
 *   Three.js Z = cosmos Y (radial perpendicular)
 */
export default function CosmosEdge({
  sourcePos,
  targetPos,
  relationshipType,
  isCrossTree = false,
}: CosmosEdgeProps) {
  const style = getEdgeStyle(relationshipType, isCrossTree);

  // Map cosmos coordinates to Three.js space
  // (same mapping as CosmosNode: Three.js Y = cosmos Z for generation)
  const start: [number, number, number] = [sourcePos.x, sourcePos.z, sourcePos.y];
  const end: [number, number, number] = [targetPos.x, targetPos.z, targetPos.y];

  // For parent→child edges, use a curved bezier (looks like flowing lineage)
  const isHierarchical = relationshipType === 'father' || relationshipType === 'mother' || relationshipType === 'child';

  if (isHierarchical && !isCrossTree) {
    // Midpoint with slight curve
    const mid: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 0.3, // slight upward bow
      (start[2] + end[2]) / 2,
    ];

    return (
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        color={style.color}
        lineWidth={style.lineWidth}
        transparent
        opacity={isCrossTree ? 0.3 : 0.5}
        dashed={style.dashed}
        dashScale={style.dashed ? 3 : undefined}
        dashSize={style.dashed ? 0.3 : undefined}
        gapSize={style.dashed ? 0.15 : undefined}
      />
    );
  }

  // Straight line for spouse/sibling/cross-tree
  return (
    <Line
      points={[start, end]}
      color={style.color}
      lineWidth={style.lineWidth}
      transparent
      opacity={isCrossTree ? 0.25 : 0.45}
      dashed={style.dashed}
      dashScale={style.dashed ? 3 : undefined}
      dashSize={style.dashed ? 0.3 : undefined}
      gapSize={style.dashed ? 0.15 : undefined}
    />
  );
}
