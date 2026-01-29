import type { Zone, Terrain } from './game.js';

// ==========================================
// TERRITORY TYPES
// ==========================================

export interface Territory {
  id: string;
  generationId: string;

  // Position
  x: number; // 0-99
  y: number; // 0-99

  // Characteristics
  zone: Zone;
  terrain: Terrain;

  // Ownership
  ownerId: string | null;
  ownerSince: Date | null;

  // Status
  isForsaken: boolean; // Controlled by NPCs
  forsakenStrength: number; // NPC army power if Forsaken

  // Infrastructure
  hasBridge: boolean; // For river crossings
  bridgeDestroyed: boolean;
}

export interface TerritoryWithDetails extends Territory {
  buildingCount: number;
  garrisonStrength: number;
  resourceProduction: {
    gold: number;
    stone: number;
    wood: number;
    food: number;
    mana: number;
  };
}

// Map coordinate helpers
export interface Coordinates {
  x: number;
  y: number;
}

export function coordsToId(x: number, y: number): string {
  return `${x},${y}`;
}

export function idToCoords(id: string): Coordinates {
  const [x, y] = id.split(',').map(Number);
  return { x, y };
}

export function getDistance(a: Coordinates, b: Coordinates): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
}

export function getZoneFromCoords(x: number, y: number): Zone {
  const centerX = 50;
  const centerY = 50;
  const distance = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));

  if (distance <= 5) return 'heart';
  if (distance <= 15) return 'inner';
  if (distance <= 30) return 'middle';
  return 'outer';
}

export function getAdjacentCoords(x: number, y: number): Coordinates[] {
  const adjacent: Coordinates[] = [];
  const directions = [
    { dx: 0, dy: -1 }, // North
    { dx: 1, dy: 0 },  // East
    { dx: 0, dy: 1 },  // South
    { dx: -1, dy: 0 }, // West
  ];

  for (const { dx, dy } of directions) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < 100 && ny >= 0 && ny < 100) {
      adjacent.push({ x: nx, y: ny });
    }
  }

  return adjacent;
}
