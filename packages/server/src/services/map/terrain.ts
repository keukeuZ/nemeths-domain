import type { Terrain, Zone } from '@nemeths/shared';

// ==========================================
// TERRAIN GENERATION
// ==========================================

export const MAP_SIZE = 100;
export const CENTER = 50;

// Zone boundaries (Chebyshev distance from center)
export const ZONE_BOUNDARIES = {
  heart: { min: 0, max: 5 },
  inner: { min: 6, max: 20 },
  middle: { min: 21, max: 35 },
  outer: { min: 36, max: 50 },
} as const;

// Terrain distribution percentages
export const TERRAIN_DISTRIBUTION: Record<Terrain, number> = {
  plains: 0.30,
  forest: 0.18,
  mountain: 0.08,
  river: 0.15, // Water/ocean
  ruins: 0.06, // Swamp in design, using ruins
  corruption: 0.04, // Titan-touched
};

// Calculate remaining for hills and desert (using plains for simplicity)
// hills: 13%, desert: 6%, swamp: 6% - we'll use the available terrains

// Zone-based terrain weights (higher = more likely in that zone)
export const ZONE_TERRAIN_WEIGHTS: Record<Zone, Partial<Record<Terrain, number>>> = {
  heart: {
    corruption: 5.0, // Titan-touched dominates
    mountain: 0.5,
    plains: 0.3,
  },
  inner: {
    corruption: 2.0,
    mountain: 2.0,
    ruins: 1.5,
    plains: 1.0,
    forest: 0.8,
  },
  middle: {
    plains: 1.5,
    forest: 1.5,
    mountain: 1.0,
    ruins: 1.0,
    river: 1.0,
  },
  outer: {
    plains: 2.0,
    forest: 1.5,
    ruins: 0.8,
    river: 0.8,
    mountain: 0.3,
    corruption: 0.1,
  },
};

/**
 * Get zone from coordinates using Chebyshev distance
 */
export function getZone(x: number, y: number): Zone {
  const distance = Math.max(Math.abs(x - CENTER), Math.abs(y - CENTER));

  if (distance <= ZONE_BOUNDARIES.heart.max) return 'heart';
  if (distance <= ZONE_BOUNDARIES.inner.max) return 'inner';
  if (distance <= ZONE_BOUNDARIES.middle.max) return 'middle';
  return 'outer';
}

/**
 * Simple seeded random number generator (Mulberry32)
 */
export function createRng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 2D Simplex-like noise for terrain clustering
 */
export function createNoiseGenerator(seed: number) {
  const rng = createRng(seed);

  // Pre-generate gradient table
  const gradients: [number, number][] = [];
  for (let i = 0; i < 256; i++) {
    const angle = rng() * Math.PI * 2;
    gradients.push([Math.cos(angle), Math.sin(angle)]);
  }

  // Permutation table
  const perm: number[] = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  function dot(g: [number, number], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }

  return function noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[(perm[X] + Y) & 255];
    const ab = perm[(perm[X] + Y + 1) & 255];
    const ba = perm[(perm[(X + 1) & 255] + Y) & 255];
    const bb = perm[(perm[(X + 1) & 255] + Y + 1) & 255];

    const x1 = lerp(dot(gradients[aa], xf, yf), dot(gradients[ba], xf - 1, yf), u);
    const x2 = lerp(dot(gradients[ab], xf, yf - 1), dot(gradients[bb], xf - 1, yf - 1), u);

    return (lerp(x1, x2, v) + 1) / 2; // Normalize to 0-1
  };
}

/**
 * Generate terrain for a single tile using noise-based clustering
 */
export function generateTerrain(
  x: number,
  y: number,
  zone: Zone,
  noiseGenerators: Record<Terrain, (x: number, y: number) => number>,
  rng: () => number
): Terrain {
  const weights = ZONE_TERRAIN_WEIGHTS[zone];

  // Calculate weighted noise values for each terrain type
  const terrainScores: [Terrain, number][] = [];

  for (const [terrain, baseWeight] of Object.entries(weights) as [Terrain, number][]) {
    const noiseValue = noiseGenerators[terrain](x / 15, y / 15); // Scale for clustering
    const score = noiseValue * baseWeight * (0.8 + rng() * 0.4); // Add some randomness
    terrainScores.push([terrain, score]);
  }

  // Sort by score and pick highest
  terrainScores.sort((a, b) => b[1] - a[1]);

  return terrainScores[0][0];
}

/**
 * Check if a position is near map edges
 */
export function isNearEdge(x: number, y: number, buffer: number = 2): boolean {
  return x < buffer || x >= MAP_SIZE - buffer || y < buffer || y >= MAP_SIZE - buffer;
}

/**
 * Get all adjacent coordinates (8-directional)
 */
export function getAdjacentCoords(
  x: number,
  y: number
): Array<{ x: number; y: number; diagonal: boolean }> {
  const adjacent: Array<{ x: number; y: number; diagonal: boolean }> = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;

      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
        adjacent.push({ x: nx, y: ny, diagonal: dx !== 0 && dy !== 0 });
      }
    }
  }

  return adjacent;
}

/**
 * Calculate Manhattan distance between two points
 */
export function getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
