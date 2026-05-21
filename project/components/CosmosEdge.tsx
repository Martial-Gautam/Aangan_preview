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

// ─── Premium Color & Style System ────────────────────────────

const EDGE_STYLES: Record<string, { color: string; lineWidth: number; dashed: boolean }> = {
  father:    { color: '#3B82F6', lineWidth: 1.8, dashed: false },   // Blue (paternal)
  mother:    { color: '#8B5CF6', lineWidth: 1.8, dashed: false },   // Violet (maternal)
  child:     { color: '#14B8A6', lineWidth: 1.6, dashed: false },   // Teal
  spouse:    { color: '#EC4899', lineWidth: 2.5, dashed: false },   // Pink
  sibling:   { color: '#F59E0B', lineWidth: 1.2, dashed: true },    // Amber
  crossTree: { color: '#6B7280', lineWidth: 0.8, dashed: true },    // Gray
};

function getEdgeStyle(relType: string, isCrossTree: boolean) {
  if (isCrossTree) return EDGE_STYLES.crossTree;
  return EDGE_STYLES[relType] || EDGE_STYLES.father;
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
      (start[1] + end[1]) / 2 + 0.4, // slightly more upward bow
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
        opacity={isCrossTree ? 0.2 : 0.5}
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
      opacity={isCrossTree ? 0.15 : 0.4}
      dashed={style.dashed}
      dashScale={style.dashed ? 3 : undefined}
      dashSize={style.dashed ? 0.3 : undefined}
      gapSize={style.dashed ? 0.15 : undefined}
    />
  );
}
