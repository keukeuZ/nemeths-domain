import type { Terrain, Zone } from '@nemeths/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { territories, generations } from '../../db/schema.js';
import { logger } from '../../utils/logger.js';
import {
  MAP_SIZE,
  getZone,
  createRng,
  createNoiseGenerator,
  generateTerrain,
  getAdjacentCoords,
  isNearEdge,
} from './terrain.js';

// ==========================================
// MAP GENERATOR
// ==========================================

export interface MapGenerationResult {
  generationId: string;
  totalTerritories: number;
  terrainCounts: Record<Terrain, number>;
  zoneCounts: Record<Zone, number>;
  forsakenCount: number;
}

export interface TerritoryData {
  x: number;
  y: number;
  zone: Zone;
  terrain: Terrain;
  isForsaken: boolean;
  forsakenStrength: number;
  hasBridge: boolean;
}

// Forsaken density by zone (base percentage of tiles)
const FORSAKEN_DENSITY: Record<Zone, number> = {
  outer: 0.15,
  middle: 0.25,
  inner: 0.35,
  heart: 0.50,
};

// Forsaken village types and their strength ranges
const FORSAKEN_TYPES = [
  { name: 'hamlet', weight: 50, minStrength: 20, maxStrength: 50 },
  { name: 'village', weight: 30, minStrength: 50, maxStrength: 150 },
  { name: 'town', weight: 15, minStrength: 150, maxStrength: 400 },
  { name: 'stronghold', weight: 5, minStrength: 400, maxStrength: 1000 },
] as const;

/**
 * Generate a complete map for a new generation
 */
export async function generateMap(generationId: string, seed?: number): Promise<MapGenerationResult> {
  const mapSeed = seed ?? Date.now();
  const rng = createRng(mapSeed);

  logger.info({ generationId, seed: mapSeed }, 'Starting map generation');

  // Create noise generators for each terrain type
  const terrainTypes: Terrain[] = ['plains', 'forest', 'mountain', 'river', 'ruins', 'corruption'];
  const noiseGenerators: Record<Terrain, (x: number, y: number) => number> = {} as Record<
    Terrain,
    (x: number, y: number) => number
  >;

  for (const terrain of terrainTypes) {
    noiseGenerators[terrain] = createNoiseGenerator(mapSeed + terrain.charCodeAt(0) * 1000);
  }

  // Generate all territory data
  const territoriesData: TerritoryData[] = [];
  const terrainCounts: Record<Terrain, number> = {
    plains: 0,
    forest: 0,
    mountain: 0,
    river: 0,
    ruins: 0,
    corruption: 0,
  };
  const zoneCounts: Record<Zone, number> = { outer: 0, middle: 0, inner: 0, heart: 0 };

  // First pass: generate terrain
  const terrainMap: Terrain[][] = [];
  for (let x = 0; x < MAP_SIZE; x++) {
    terrainMap[x] = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      const zone = getZone(x, y);
      const terrain = generateTerrain(x, y, zone, noiseGenerators, rng);
      terrainMap[x][y] = terrain;
    }
  }

  // Second pass: ensure water doesn't isolate land (flood fill check)
  ensureConnectedLand(terrainMap, rng);

  // Third pass: create territory data with Forsaken
  let forsakenCount = 0;

  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      const zone = getZone(x, y);
      const terrain = terrainMap[x][y];

      terrainCounts[terrain]++;
      zoneCounts[zone]++;

      // Determine if Forsaken
      let isForsaken = false;
      let forsakenStrength = 0;

      // No Forsaken on water
      if (terrain !== 'river') {
        const density = FORSAKEN_DENSITY[zone];
        if (rng() < density) {
          isForsaken = true;
          forsakenStrength = generateForsakenStrength(zone, rng);
          forsakenCount++;
        }
      }

      territoriesData.push({
        x,
        y,
        zone,
        terrain,
        isForsaken,
        forsakenStrength,
        hasBridge: false,
      });
    }
  }

  // Insert territories in batches
  const BATCH_SIZE = 500;
  for (let i = 0; i < territoriesData.length; i += BATCH_SIZE) {
    const batch = territoriesData.slice(i, i + BATCH_SIZE);
    await db.insert(territories).values(
      batch.map((t) => ({
        generationId,
        x: t.x,
        y: t.y,
        zone: t.zone,
        terrain: t.terrain,
        isForsaken: t.isForsaken,
        forsakenStrength: t.forsakenStrength,
        hasBridge: t.hasBridge,
        ownerId: null,
      }))
    );
  }

  logger.info(
    {
      generationId,
      totalTerritories: territoriesData.length,
      forsakenCount,
      terrainCounts,
      zoneCounts,
    },
    'Map generation complete'
  );

  return {
    generationId,
    totalTerritories: territoriesData.length,
    terrainCounts,
    zoneCounts,
    forsakenCount,
  };
}

/**
 * Generate Forsaken garrison strength based on zone
 */
function generateForsakenStrength(zone: Zone, rng: () => number): number {
  // Select village type based on weights
  const totalWeight = FORSAKEN_TYPES.reduce((sum, t) => sum + t.weight, 0);
  let roll = rng() * totalWeight;

  let selectedType: typeof FORSAKEN_TYPES[number] = FORSAKEN_TYPES[0];
  for (const type of FORSAKEN_TYPES) {
    roll -= type.weight;
    if (roll <= 0) {
      selectedType = type;
      break;
    }
  }

  // Calculate strength within range
  const baseStrength =
    selectedType.minStrength + rng() * (selectedType.maxStrength - selectedType.minStrength);

  // Zone multiplier
  const zoneMultiplier: Record<Zone, number> = {
    outer: 0.8,
    middle: 1.0,
    inner: 1.3,
    heart: 1.6,
  };

  return Math.floor(baseStrength * zoneMultiplier[zone]);
}

/**
 * Ensure all land tiles are connected (no isolated islands)
 * Uses flood fill to verify connectivity
 */
function ensureConnectedLand(terrainMap: Terrain[][], rng: () => number): void {
  const visited: boolean[][] = [];
  for (let x = 0; x < MAP_SIZE; x++) {
    visited[x] = new Array(MAP_SIZE).fill(false);
  }

  // Find first land tile
  let startX = -1;
  let startY = -1;
  outer: for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      if (terrainMap[x][y] !== 'river') {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }

  if (startX === -1) return;

  // Flood fill from start
  const stack: Array<[number, number]> = [[startX, startY]];
  let landCount = 0;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;

    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) continue;
    if (visited[x][y]) continue;
    if (terrainMap[x][y] === 'river') continue;

    visited[x][y] = true;
    landCount++;

    // Add neighbors (4-directional for connectivity check)
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // Count total land tiles
  let totalLand = 0;
  for (let x = 0; x < MAP_SIZE; x++) {
    for (let y = 0; y < MAP_SIZE; y++) {
      if (terrainMap[x][y] !== 'river') totalLand++;
    }
  }

  // If not all land is connected, convert some water to land bridges
  if (landCount < totalLand) {
    logger.debug(
      { connected: landCount, total: totalLand },
      'Creating land bridges for connectivity'
    );

    // Find unvisited land and create paths to main landmass
    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        if (terrainMap[x][y] !== 'river' && !visited[x][y]) {
          // This is an isolated tile - find nearest visited land and create path
          createLandBridge(terrainMap, visited, x, y, rng);
        }
      }
    }
  }
}

/**
 * Create a land bridge from isolated tile to connected landmass
 */
function createLandBridge(
  terrainMap: Terrain[][],
  visited: boolean[][],
  startX: number,
  startY: number,
  rng: () => number
): void {
  // Simple BFS to find nearest connected land
  const searchVisited: boolean[][] = [];
  for (let x = 0; x < MAP_SIZE; x++) {
    searchVisited[x] = new Array(MAP_SIZE).fill(false);
  }

  const queue: Array<[number, number, Array<[number, number]>]> = [[startX, startY, []]];
  searchVisited[startX][startY] = true;

  while (queue.length > 0) {
    const [x, y, path] = queue.shift()!;

    // Found connected land?
    if (visited[x][y]) {
      // Convert water tiles in path to plains
      for (const [px, py] of path) {
        if (terrainMap[px][py] === 'river') {
          terrainMap[px][py] = 'plains';
          visited[px][py] = true;
        }
      }
      // Mark the isolated area as connected
      floodFillVisited(terrainMap, visited, startX, startY);
      return;
    }

    // Check neighbors
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
      if (searchVisited[nx][ny]) continue;

      searchVisited[nx][ny] = true;
      const newPath = [...path, [nx, ny] as [number, number]];
      queue.push([nx, ny, newPath]);
    }
  }
}

/**
 * Mark all connected land as visited
 */
function floodFillVisited(
  terrainMap: Terrain[][],
  visited: boolean[][],
  startX: number,
  startY: number
): void {
  const stack: Array<[number, number]> = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;

    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) continue;
    if (visited[x][y]) continue;
    if (terrainMap[x][y] === 'river') continue;

    visited[x][y] = true;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/**
 * Get available starting positions in outer ring
 */
export async function getAvailableStartingPositions(
  generationId: string,
  requiredPlots: number,
  existingPlayerPositions: Array<{ x: number; y: number }>
): Promise<Array<{ x: number; y: number }> | null> {
  // Get all unowned, non-water, outer ring territories
  const available = await db
    .select({ x: territories.x, y: territories.y, terrain: territories.terrain })
    .from(territories)
    .where(eq(territories.generationId, generationId));

  // Filter for valid starting positions
  const validPositions = available.filter((t) => {
    // Must be outer ring
    const zone = getZone(t.x, t.y);
    if (zone !== 'outer') return false;

    // Must not be water
    if (t.terrain === 'river') return false;

    // Must not be near edge
    if (isNearEdge(t.x, t.y, 3)) return false;

    // Must not be within 5 tiles of another player
    for (const pos of existingPlayerPositions) {
      const distance = Math.max(Math.abs(t.x - pos.x), Math.abs(t.y - pos.y));
      if (distance < 5) return false;
    }

    return true;
  });

  if (validPositions.length < requiredPlots) return null;

  // Pick random starting position
  const rng = createRng(Date.now());
  const startIdx = Math.floor(rng() * validPositions.length);
  const startPos = validPositions[startIdx];

  // Find adjacent plots using BFS
  const selected: Array<{ x: number; y: number }> = [startPos];
  const selectedSet = new Set([`${startPos.x},${startPos.y}`]);

  while (selected.length < requiredPlots) {
    // Get all positions adjacent to selected ones
    const candidates: Array<{ x: number; y: number }> = [];

    for (const pos of selected) {
      for (const adj of getAdjacentCoords(pos.x, pos.y)) {
        const key = `${adj.x},${adj.y}`;
        if (selectedSet.has(key)) continue;

        // Check if valid
        const validPos = validPositions.find((v) => v.x === adj.x && v.y === adj.y);
        if (validPos) {
          candidates.push({ x: adj.x, y: adj.y });
        }
      }
    }

    if (candidates.length === 0) {
      // Can't find enough adjacent plots
      return null;
    }

    // Pick random candidate
    const candidateIdx = Math.floor(rng() * candidates.length);
    const newPos = candidates[candidateIdx];
    selected.push(newPos);
    selectedSet.add(`${newPos.x},${newPos.y}`);
  }

  return selected;
}
