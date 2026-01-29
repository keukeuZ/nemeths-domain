/**
 * Map Engine
 *
 * Handles territory generation, Forsaken spawning, and map operations.
 */

import {
  MAP_SIZE,
  ZONES,
  TERRAINS,
  type Zone,
  type Terrain,
} from '@nemeths/shared';

import type { SimTerritory } from '../types.js';
import { SeededRandom } from '../utils/random.js';

/** Distance from center to zone boundaries */
const ZONE_BOUNDARIES = {
  heart: 5,    // 0-5 from center
  inner: 20,   // 6-20 from center
  middle: 35,  // 21-35 from center
  outer: 50,   // 36-50 (edge)
};

/** Forsaken strength by zone */
const FORSAKEN_STRENGTH_BY_ZONE: Record<Zone, { min: number; max: number }> = {
  outer: { min: 50, max: 150 },
  middle: { min: 100, max: 300 },
  inner: { min: 200, max: 500 },
  heart: { min: 400, max: 800 },
};

export class MapEngine {
  private random: SeededRandom;
  private territories: Map<string, SimTerritory> = new Map();
  private readonly centerX = Math.floor(MAP_SIZE / 2);
  private readonly centerY = Math.floor(MAP_SIZE / 2);

  constructor(random: SeededRandom) {
    this.random = random;
  }

  /**
   * Generate the 100x100 map
   */
  generateMap(): Map<string, SimTerritory> {
    this.territories.clear();

    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        const id = `${x},${y}`;
        const zone = this.getZone(x, y);
        const terrain = this.generateTerrain(x, y, zone);

        const territory: SimTerritory = {
          id,
          x,
          y,
          zone,
          terrain,
          ownerId: null,
          isForsaken: false,
          forsakenStrength: 0,
          buildings: [],
          garrison: null,
        };

        this.territories.set(id, territory);
      }
    }

    return this.territories;
  }

  /**
   * Determine zone based on distance from center
   */
  getZone(x: number, y: number): Zone {
    const distance = this.getDistanceFromCenter(x, y);

    if (distance <= ZONE_BOUNDARIES.heart) return 'heart';
    if (distance <= ZONE_BOUNDARIES.inner) return 'inner';
    if (distance <= ZONE_BOUNDARIES.middle) return 'middle';
    return 'outer';
  }

  /**
   * Calculate Chebyshev distance from center
   */
  getDistanceFromCenter(x: number, y: number): number {
    return Math.max(Math.abs(x - this.centerX), Math.abs(y - this.centerY));
  }

  /**
   * Calculate Manhattan distance between two points
   */
  getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * Generate terrain for a tile
   */
  generateTerrain(x: number, y: number, zone: Zone): Terrain {
    // Weighted terrain distribution by zone
    const weights: Record<Zone, Record<Terrain, number>> = {
      outer: { plains: 40, forest: 30, mountain: 15, river: 10, ruins: 4, corruption: 1 },
      middle: { plains: 35, forest: 25, mountain: 20, river: 10, ruins: 8, corruption: 2 },
      inner: { plains: 30, forest: 20, mountain: 20, river: 10, ruins: 15, corruption: 5 },
      heart: { plains: 25, forest: 15, mountain: 15, river: 10, ruins: 20, corruption: 15 },
    };

    const zoneWeights = weights[zone];
    const terrains = Object.keys(zoneWeights) as Terrain[];
    const weightValues = terrains.map((t) => zoneWeights[t]);

    return this.random.weightedPick(terrains, weightValues);
  }

  /**
   * Get territory by coordinates
   */
  getTerritory(x: number, y: number): SimTerritory | undefined {
    return this.territories.get(`${x},${y}`);
  }

  /**
   * Get all territories
   */
  getAllTerritories(): SimTerritory[] {
    return Array.from(this.territories.values());
  }

  /**
   * Get adjacent territories (4-directional)
   */
  getAdjacentTerritories(x: number, y: number): SimTerritory[] {
    const adjacent: SimTerritory[] = [];
    const directions = [
      [0, -1], // North
      [1, 0],  // East
      [0, 1],  // South
      [-1, 0], // West
    ];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
        const territory = this.getTerritory(nx, ny);
        if (territory) {
          adjacent.push(territory);
        }
      }
    }

    return adjacent;
  }

  /**
   * Find starting positions for players (clustered spawn in outer zone)
   */
  findStartingPositions(playerCount: number, plotsPerPlayer: number): { playerId: string; positions: [number, number][] }[] {
    const startingPositions: { playerId: string; positions: [number, number][] }[] = [];
    const usedPositions = new Set<string>();

    // Distribute players around the outer edge
    const angleStep = (2 * Math.PI) / playerCount;

    for (let i = 0; i < playerCount; i++) {
      const playerId = `player-${i}`;
      const positions: [number, number][] = [];

      // Calculate base position on outer ring
      const angle = angleStep * i;
      const radius = MAP_SIZE / 2 - 8; // Slightly inside edge
      const baseX = Math.floor(this.centerX + radius * Math.cos(angle));
      const baseY = Math.floor(this.centerY + radius * Math.sin(angle));

      // Claim clustered positions
      const claimed = this.claimClusteredPositions(
        baseX,
        baseY,
        plotsPerPlayer,
        usedPositions
      );
      positions.push(...claimed);

      startingPositions.push({ playerId, positions });
    }

    return startingPositions;
  }

  /**
   * Claim clustered positions around a center point
   */
  private claimClusteredPositions(
    centerX: number,
    centerY: number,
    count: number,
    usedPositions: Set<string>
  ): [number, number][] {
    const positions: [number, number][] = [];
    const queue: [number, number][] = [[centerX, centerY]];
    const visited = new Set<string>();

    while (positions.length < count && queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key) || usedPositions.has(key)) continue;
      if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) continue;

      visited.add(key);

      // Only claim outer/middle zone territories for starting
      const zone = this.getZone(x, y);
      if (zone === 'heart' || zone === 'inner') continue;

      positions.push([x, y]);
      usedPositions.add(key);

      // Add adjacent tiles to queue
      const directions = [
        [0, -1], [1, 0], [0, 1], [-1, 0],
        [1, -1], [1, 1], [-1, 1], [-1, -1], // Include diagonals for better clustering
      ];
      for (const [dx, dy] of this.random.shuffle(directions)) {
        queue.push([x + dx, y + dy]);
      }
    }

    return positions;
  }

  /**
   * Spawn Forsaken on unclaimed territories
   */
  spawnForsaken(coverage: number = 0.3): void {
    const unclaimed = Array.from(this.territories.values()).filter(
      (t) => !t.ownerId && !t.isForsaken
    );

    // Randomly select territories to become Forsaken
    const toSpawn = this.random.shuffle(unclaimed).slice(
      0,
      Math.floor(unclaimed.length * coverage)
    );

    for (const territory of toSpawn) {
      territory.isForsaken = true;
      const strengthRange = FORSAKEN_STRENGTH_BY_ZONE[territory.zone];
      territory.forsakenStrength = this.random.int(
        strengthRange.min,
        strengthRange.max
      );
    }
  }

  /**
   * Heartbeat: spawn more Forsaken and strengthen existing ones
   */
  heartbeat(): void {
    // Strengthen existing Forsaken
    for (const territory of this.territories.values()) {
      if (territory.isForsaken) {
        const strengthRange = FORSAKEN_STRENGTH_BY_ZONE[territory.zone];
        territory.forsakenStrength = Math.min(
          territory.forsakenStrength * 1.2,
          strengthRange.max * 1.5
        );
      }
    }

    // Spawn new Forsaken on unclaimed territories
    this.spawnForsaken(0.1); // 10% of remaining unclaimed
  }

  /**
   * Get territories by zone
   */
  getTerritoriesByZone(zone: Zone): SimTerritory[] {
    return Array.from(this.territories.values()).filter((t) => t.zone === zone);
  }

  /**
   * Get player's territories
   */
  getPlayerTerritories(playerId: string): SimTerritory[] {
    return Array.from(this.territories.values()).filter(
      (t) => t.ownerId === playerId
    );
  }

  /**
   * Get expansion targets for a player (adjacent unclaimed or enemy)
   */
  getExpansionTargets(playerId: string): SimTerritory[] {
    const playerTerritories = this.getPlayerTerritories(playerId);
    const targets = new Set<SimTerritory>();

    for (const territory of playerTerritories) {
      for (const adjacent of this.getAdjacentTerritories(territory.x, territory.y)) {
        if (adjacent.ownerId !== playerId) {
          targets.add(adjacent);
        }
      }
    }

    return Array.from(targets);
  }

  /**
   * Claim territory for a player
   */
  claimTerritory(territory: SimTerritory, playerId: string): void {
    territory.ownerId = playerId;
    territory.isForsaken = false;
    territory.forsakenStrength = 0;
  }

  /**
   * Get zone statistics
   */
  getZoneStats(): Record<Zone, { total: number; claimed: number; forsaken: number }> {
    const stats: Record<Zone, { total: number; claimed: number; forsaken: number }> = {
      outer: { total: 0, claimed: 0, forsaken: 0 },
      middle: { total: 0, claimed: 0, forsaken: 0 },
      inner: { total: 0, claimed: 0, forsaken: 0 },
      heart: { total: 0, claimed: 0, forsaken: 0 },
    };

    for (const territory of this.territories.values()) {
      stats[territory.zone].total++;
      if (territory.ownerId) {
        stats[territory.zone].claimed++;
      } else if (territory.isForsaken) {
        stats[territory.zone].forsaken++;
      }
    }

    return stats;
  }
}
