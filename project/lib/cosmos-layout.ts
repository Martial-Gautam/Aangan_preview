/**
 * Cosmos Layout Engine — Deterministic Spatial Mapper
 *
 * Converts family relationship data into 3D coordinates:
 *   - Angular sectors: dynamically allocated proportional to member count
 *   - Radial distance: hop distance from center person (ring system)
 *   - Z-depth: generational distance (ancestors −Z, descendants +Z)
 *
 * Sectors are NOT fixed to axes. They are dynamically allocated
 * based on the actual family structure, like a proportional pie chart.
 */

import type { Person, Relationship } from './tree-to-flow';
import { calculateDegree } from './degree-calculator';
import { resolveRelationshipLabel } from './relationship-resolver';

// ─── Types ───────────────────────────────────────────────────

export type LineageSector =
  | 'self'
  | 'maternal'
  | 'paternal'
  | 'spouse'
  | 'siblings'
  | 'children';

export interface CosmosPosition {
  x: number;
  y: number;
  z: number;
  ring: number;          // 0 = center, 1, 2, 3...
  generation: number;    // negative = ancestors, positive = descendants
  sector: LineageSector;
  hopDistance: number;
  angleInSector: number; // radians — for debugging
}

interface SectorAllocation {
  sector: LineageSector;
  startAngle: number;  // radians
  endAngle: number;    // radians
  midAngle: number;    // radians
  memberCount: number;
}

// ─── Constants ───────────────────────────────────────────────

const RING_SPACING = 3.0;       // Radial distance between rings
const GENERATION_DEPTH = 2.5;   // Z spacing per generation
const MIN_SECTOR_ANGLE = Math.PI / 6;  // 30° minimum sector size
const TWO_PI = Math.PI * 2;

// ─── Lineage Classification ─────────────────────────────────

/**
 * Classify each person into a lineage sector by tracing their
 * relationship path from the center person.
 *
 * Uses BFS and tracks the "entry direction" from self:
 *   - through mother → maternal
 *   - through father → paternal
 *   - through spouse → spouse
 *   - through sibling → siblings
 *   - through child → children
 */
function classifyLineage(
  selfId: string,
  people: Person[],
  relationships: Relationship[],
  visibleIds: Set<string>
): Map<string, { sector: LineageSector; generation: number; hopDistance: number }> {
  const result = new Map<string, { sector: LineageSector; generation: number; hopDistance: number }>();
  result.set(selfId, { sector: 'self', generation: 0, hopDistance: 0 });

  for (const person of people) {
    if (!visibleIds.has(person.id) || person.id === selfId) continue;

    const relation = resolveRelationshipLabel(selfId, person.id, people, relationships);
    const relPath = relation.relPath || [];

    if (relPath.length === 0) {
      result.set(person.id, { sector: 'self', generation: 0, hopDistance: 99 });
      continue;
    }

    const firstHop = relPath[0];
    const sector = relTypeToSector(firstHop);
    const generation = relPath.reduce((sum, relType) => sum + relTypeToGenDelta(relType), 0);

    result.set(person.id, {
      sector,
      generation,
      hopDistance: relPath.length,
    });
  }

  // Fallback: any unvisited visible nodes
  for (const id of Array.from(visibleIds)) {
    if (!result.has(id)) {
      result.set(id, { sector: 'self', generation: 0, hopDistance: 99 });
    }
  }

  return result;
}

function relTypeToSector(type: string): LineageSector {
  switch (type) {
    case 'mother': return 'maternal';
    case 'father': return 'paternal';
    case 'parent': return 'paternal';
    case 'spouse': return 'spouse';
    case 'sibling': return 'siblings';
    case 'child': return 'children';
    default: return 'siblings';
  }
}

function relTypeToGenDelta(type: string): number {
  switch (type) {
    case 'father': case 'mother': return -1; // going up to parent
    case 'parent': return -1;
    case 'child': return 1; // going down to child
    case 'spouse': case 'sibling': return 0; // same generation
    default: return 0;
  }
}

// ─── Sector Allocation ───────────────────────────────────────

/**
 * Allocate angular sectors proportional to member count.
 * Each sector gets at least MIN_SECTOR_ANGLE (30°).
 */
function allocateSectors(
  memberCounts: Map<LineageSector, number>
): SectorAllocation[] {
  // Filter out 'self' — center user doesn't need a sector
  const sectors: LineageSector[] = ['maternal', 'paternal', 'spouse', 'siblings', 'children'];
  const activeSectors: { sector: LineageSector; count: number }[] = [];

  for (let i = 0; i < sectors.length; i++) {
    const count = memberCounts.get(sectors[i]) || 0;
    if (count > 0) {
      activeSectors.push({ sector: sectors[i], count });
    }
  }

  if (activeSectors.length === 0) return [];

  // Total members across all active sectors
  const totalMembers = activeSectors.reduce((sum, s) => sum + s.count, 0);

  // Calculate minimum total angle needed
  const minTotalAngle = activeSectors.length * MIN_SECTOR_ANGLE;
  const remainingAngle = Math.max(0, TWO_PI - minTotalAngle);

  // Allocate: min + proportional share of remaining
  const allocations: SectorAllocation[] = [];
  let currentAngle = -Math.PI / 2; // Start from top (−90°)

  for (let i = 0; i < activeSectors.length; i++) {
    const s = activeSectors[i];
    const proportional = totalMembers > 0 ? (s.count / totalMembers) * remainingAngle : 0;
    const sectorAngle = MIN_SECTOR_ANGLE + proportional;

    allocations.push({
      sector: s.sector,
      startAngle: currentAngle,
      endAngle: currentAngle + sectorAngle,
      midAngle: currentAngle + sectorAngle / 2,
      memberCount: s.count,
    });

    currentAngle += sectorAngle;
  }

  return allocations;
}

// ─── Focus Mode: Visible Nodes ──────────────────────────────

/**
 * Get visible person IDs within maxHops of center.
 */
export function getVisibleIds(
  centerId: string,
  people: Person[],
  relationships: Relationship[],
  maxHops: number
): Set<string> {
  const visited = new Set<string>();

  for (const person of people) {
    const degree = calculateDegree(centerId, person.id, relationships).degree;
    if (degree >= 0 && degree <= maxHops) {
      visited.add(person.id);
    }
  }

  visited.add(centerId);
  return visited;
}

// ─── Main Layout Function ────────────────────────────────────

export function computeCosmosLayout(
  selfId: string,
  people: Person[],
  relationships: Relationship[],
  maxHops: number = 3
): Map<string, CosmosPosition> {
  const positions = new Map<string, CosmosPosition>();

  // Step 1: Focus mode — get visible IDs
  const visibleIds = getVisibleIds(selfId, people, relationships, maxHops);
  visibleIds.add(selfId);

  // Step 2: Classify each person
  const classified = classifyLineage(selfId, people, relationships, visibleIds);

  // Step 3: Count members per sector
  const sectorCounts = new Map<LineageSector, number>();
  classified.forEach((info) => {
    if (info.sector === 'self') return;
    sectorCounts.set(info.sector, (sectorCounts.get(info.sector) || 0) + 1);
  });

  // Step 4: Allocate angular sectors
  const sectorAllocations = allocateSectors(sectorCounts);
  const sectorMap = new Map<LineageSector, SectorAllocation>();
  for (let i = 0; i < sectorAllocations.length; i++) {
    sectorMap.set(sectorAllocations[i].sector, sectorAllocations[i]);
  }

  // Step 5: Group people by sector + ring for intra-sector spreading
  const sectorRingGroups = new Map<string, string[]>();

  classified.forEach((info, personId) => {
    if (info.sector === 'self') return;
    const key = `${info.sector}::${info.hopDistance}`;
    if (!sectorRingGroups.has(key)) sectorRingGroups.set(key, []);
    sectorRingGroups.get(key)!.push(personId);
  });

  // Step 6: Calculate positions
  // Self is always at origin
  positions.set(selfId, {
    x: 0, y: 0, z: 0,
    ring: 0,
    generation: 0,
    sector: 'self',
    hopDistance: 0,
    angleInSector: 0,
  });

  // Place everyone else
  classified.forEach((info, personId) => {
    if (personId === selfId) return;

    const allocation = sectorMap.get(info.sector);
    if (!allocation) {
      // Fallback: place near center
      positions.set(personId, {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: info.generation * GENERATION_DEPTH,
        ring: info.hopDistance,
        generation: info.generation,
        sector: info.sector,
        hopDistance: info.hopDistance,
        angleInSector: 0,
      });
      return;
    }

    // Find this person's index within their sector+ring group
    const groupKey = `${info.sector}::${info.hopDistance}`;
    const group = sectorRingGroups.get(groupKey) || [personId];
    const indexInGroup = group.indexOf(personId);
    const countInGroup = group.length;

    // Spread evenly within the sector's angular range
    const sectorSpan = allocation.endAngle - allocation.startAngle;
    const padding = sectorSpan * 0.1; // 10% padding from edges
    const usableSpan = sectorSpan - 2 * padding;

    let angle: number;
    if (countInGroup === 1) {
      angle = allocation.midAngle;
    } else {
      const step = usableSpan / (countInGroup - 1);
      angle = allocation.startAngle + padding + step * indexInGroup;
    }

    // Radial distance based on hop
    const ring = info.hopDistance;
    const radialDist = ring * RING_SPACING;

    // Convert polar → cartesian (X-Y plane), with Z for generation
    const x = radialDist * Math.cos(angle);
    const y = radialDist * Math.sin(angle);
    const z = info.generation * GENERATION_DEPTH;

    positions.set(personId, {
      x, y, z,
      ring,
      generation: info.generation,
      sector: info.sector,
      hopDistance: info.hopDistance,
      angleInSector: angle,
    });
  });

  return positions;
}
