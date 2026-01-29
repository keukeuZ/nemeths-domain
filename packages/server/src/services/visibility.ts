import { eq, and, or, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { territories, armies, players, buildings } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { getPlayerById } from './player.js';
import { areAllies, getAllianceTerritories, getPlayerAlliance } from './alliance.js';
import {
  type Race,
  type CaptainClass,
  type CaptainSkill,
  type Zone,
  MAP_SIZE,
} from '@nemeths/shared';

// ==========================================
// VISIBILITY & FOG OF WAR SERVICE
// ==========================================

// Base visibility ranges by structure
const BASE_VISIBILITY_RANGE = 2; // All owned territories see 2 tiles around
const WATCHTOWER_RANGE = 4; // Watchtower extends visibility

// Race modifiers
const RACE_VISIBILITY_MODIFIERS: Record<Race, number> = {
  ironveld: 0,
  vaelthir: 0,
  korrath: 0,
  sylvaeth: 2, // +50% scout range (2 extra tiles)
  ashborn: 0,
  breathborn: 1, // Slightly better vision due to wind spirits
};

// Stealth detection ranges
const STEALTH_DETECTION_RANGE = 3; // Shadow Master detected within 3 tiles
const SYLVAETH_STEALTH_RANGE = 2; // Sylvaeth stealth detection

export interface VisibleTerritory {
  id: string;
  x: number;
  y: number;
  zone: Zone;
  terrain: string;
  ownerId: string | null;
  ownerName?: string;
  ownerRace?: Race;
  visibilityLevel: 'full' | 'partial' | 'enemy_detected' | 'allied';
  armies?: VisibleArmy[];
  buildings?: VisibleBuilding[];
}

export interface VisibleArmy {
  id: string;
  playerId: string;
  playerName?: string;
  isAlly: boolean;
  isEnemy: boolean;
  isStealth: boolean;
  estimatedStrength: 'small' | 'medium' | 'large' | 'massive' | 'exact';
  actualStrength?: number; // Only if full visibility
  unitTypes?: string[]; // Only if full visibility
}

export interface VisibleBuilding {
  id: string;
  type: string;
  isUnderConstruction: boolean;
}

/**
 * Calculate Chebyshev distance between two points
 */
function chebyshevDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Get all tiles visible to a player
 */
export async function getPlayerVisibility(playerId: string): Promise<{
  visibleTerritories: Set<string>;
  ownedTerritories: Set<string>;
  alliedTerritories: Set<string>;
}> {
  const player = await getPlayerById(playerId);
  if (!player) {
    return {
      visibleTerritories: new Set(),
      ownedTerritories: new Set(),
      alliedTerritories: new Set(),
    };
  }

  const visibleTerritories = new Set<string>();
  const ownedTerritories = new Set<string>();
  const alliedTerritories = new Set<string>();

  // Get owned territories
  const playerTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.ownerId, playerId));

  for (const territory of playerTerritories) {
    ownedTerritories.add(territory.id);
    visibleTerritories.add(territory.id);
  }

  // Get allied territories (shared vision)
  const alliance = await getPlayerAlliance(playerId);
  if (alliance) {
    const alliedTerritoryIds = await getAllianceTerritories(alliance.id);
    for (const id of alliedTerritoryIds) {
      alliedTerritories.add(id);
      visibleTerritories.add(id);
    }
  }

  // Calculate visibility range
  const raceBonus = RACE_VISIBILITY_MODIFIERS[player.race];

  // Get watchtowers for extended range
  const watchtowers = await db
    .select()
    .from(buildings)
    .where(
      and(
        eq(buildings.playerId, playerId),
        eq(buildings.type, 'watchtower'),
        eq(buildings.isUnderConstruction, false)
      )
    );

  // Get all territories in generation
  const allTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.generationId, player.generationId));

  // Calculate visible territories from owned/allied territories
  const visibilitySourceTerritories = [...ownedTerritories, ...alliedTerritories];

  for (const sourceId of visibilitySourceTerritories) {
    const source = allTerritories.find((t) => t.id === sourceId);
    if (!source) continue;

    // Check if this territory has a watchtower
    const hasWatchtower = watchtowers.some((w) => w.territoryId === sourceId);
    const range = hasWatchtower
      ? WATCHTOWER_RANGE + raceBonus
      : BASE_VISIBILITY_RANGE + raceBonus;

    // Add all territories within range
    for (const target of allTerritories) {
      const distance = chebyshevDistance(source.x, source.y, target.x, target.y);
      if (distance <= range) {
        visibleTerritories.add(target.id);
      }
    }
  }

  // Add visibility from armies (scouting)
  const playerArmies = await db.select().from(armies).where(eq(armies.playerId, playerId));

  for (const army of playerArmies) {
    const armyTerritory = allTerritories.find((t) => t.id === army.territoryId);
    if (!armyTerritory) continue;

    // Armies have base visibility of 1 tile around them
    for (const target of allTerritories) {
      const distance = chebyshevDistance(
        armyTerritory.x,
        armyTerritory.y,
        target.x,
        target.y
      );
      if (distance <= 1 + raceBonus) {
        visibleTerritories.add(target.id);
      }
    }
  }

  return { visibleTerritories, ownedTerritories, alliedTerritories };
}

/**
 * Get visible territory details for a player
 */
export async function getVisibleTerritoryDetails(
  playerId: string,
  territoryId: string
): Promise<VisibleTerritory | null> {
  const player = await getPlayerById(playerId);
  if (!player) return null;

  const { visibleTerritories, ownedTerritories, alliedTerritories } =
    await getPlayerVisibility(playerId);

  if (!visibleTerritories.has(territoryId)) {
    return null; // Not visible
  }

  const [territory] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, territoryId))
    .limit(1);

  if (!territory) return null;

  // Determine visibility level
  let visibilityLevel: 'full' | 'partial' | 'enemy_detected' | 'allied';
  if (ownedTerritories.has(territoryId)) {
    visibilityLevel = 'full';
  } else if (alliedTerritories.has(territoryId)) {
    visibilityLevel = 'allied';
  } else if (territory.ownerId) {
    visibilityLevel = 'enemy_detected';
  } else {
    visibilityLevel = 'partial';
  }

  // Get owner info if owned
  let ownerName: string | undefined;
  let ownerRace: Race | undefined;
  if (territory.ownerId) {
    const owner = await getPlayerById(territory.ownerId);
    if (owner) {
      ownerName = owner.captainName;
      ownerRace = owner.race;
    }
  }

  // Get armies in territory
  const territoryArmies = await db
    .select()
    .from(armies)
    .where(eq(armies.territoryId, territoryId));

  const visibleArmies: VisibleArmy[] = [];

  for (const army of territoryArmies) {
    const armyOwner = await getPlayerById(army.playerId);
    if (!armyOwner) continue;

    const isOwn = army.playerId === playerId;
    const isAlly = await areAllies(playerId, army.playerId);
    const isEnemy = !isOwn && !isAlly;

    // Check if army is in stealth (Shadow Master)
    const isStealth =
      armyOwner.captainClass === 'shadowmaster' && !isOwn && !isAlly;

    // Determine what we can see about this army
    let estimatedStrength: VisibleArmy['estimatedStrength'];
    let actualStrength: number | undefined;
    let unitTypes: string[] | undefined;

    if (isOwn || (isAlly && visibilityLevel === 'allied')) {
      // Full visibility for own/allied armies
      estimatedStrength = 'exact';
      actualStrength = army.totalStrength;
      unitTypes = (army.units as Array<{ unitType: string }>).map((u) => u.unitType);
    } else if (player.race === 'sylvaeth') {
      // Sylvaeth always see exact intel
      estimatedStrength = 'exact';
      actualStrength = army.totalStrength;
      unitTypes = (army.units as Array<{ unitType: string }>).map((u) => u.unitType);
    } else {
      // Estimate strength for enemies
      const strength = army.totalStrength;
      if (strength < 500) estimatedStrength = 'small';
      else if (strength < 2000) estimatedStrength = 'medium';
      else if (strength < 5000) estimatedStrength = 'large';
      else estimatedStrength = 'massive';
    }

    visibleArmies.push({
      id: army.id,
      playerId: army.playerId,
      playerName: armyOwner.captainName,
      isAlly,
      isEnemy,
      isStealth,
      estimatedStrength,
      actualStrength,
      unitTypes,
    });
  }

  // Get buildings (visible if we own or territory is visible)
  let visibleBuildings: VisibleBuilding[] = [];
  if (visibilityLevel === 'full' || visibilityLevel === 'allied') {
    const buildingsInTerritory = await db
      .select()
      .from(buildings)
      .where(eq(buildings.territoryId, territoryId));

    visibleBuildings = buildingsInTerritory.map((b) => ({
      id: b.id,
      type: b.type,
      isUnderConstruction: b.isUnderConstruction,
    }));
  } else if (visibilityLevel === 'enemy_detected') {
    // Only see completed buildings for enemies
    const buildingsInTerritory = await db
      .select()
      .from(buildings)
      .where(and(eq(buildings.territoryId, territoryId), eq(buildings.isUnderConstruction, false)));

    visibleBuildings = buildingsInTerritory.map((b) => ({
      id: b.id,
      type: b.type,
      isUnderConstruction: false,
    }));
  }

  return {
    id: territory.id,
    x: territory.x,
    y: territory.y,
    zone: territory.zone,
    terrain: territory.terrain,
    ownerId: territory.ownerId,
    ownerName,
    ownerRace,
    visibilityLevel,
    armies: visibleArmies,
    buildings: visibleBuildings,
  };
}

/**
 * Check if an army is detected (stealth mechanics)
 */
export async function isArmyDetected(
  observerPlayerId: string,
  armyId: string
): Promise<boolean> {
  const observer = await getPlayerById(observerPlayerId);
  if (!observer) return false;

  const [army] = await db.select().from(armies).where(eq(armies.id, armyId)).limit(1);
  if (!army) return false;

  const armyOwner = await getPlayerById(army.playerId);
  if (!armyOwner) return false;

  // Own army always detected
  if (army.playerId === observerPlayerId) return true;

  // Allied armies always detected
  if (await areAllies(observerPlayerId, army.playerId)) return true;

  // Check stealth
  if (armyOwner.captainClass !== 'shadowmaster') {
    // Not stealthy - always detected if in visibility range
    return true;
  }

  // Shadow Master stealth check
  const observerTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.ownerId, observerPlayerId));

  const [armyTerritory] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, army.territoryId))
    .limit(1);

  if (!armyTerritory) return false;

  // Check distance to nearest observer territory
  let minDistance = Infinity;
  for (const observerTerritory of observerTerritories) {
    const distance = chebyshevDistance(
      observerTerritory.x,
      observerTerritory.y,
      armyTerritory.x,
      armyTerritory.y
    );
    minDistance = Math.min(minDistance, distance);
  }

  // Sylvaeth have better detection
  const detectionRange =
    observer.race === 'sylvaeth' ? SYLVAETH_STEALTH_RANGE : STEALTH_DETECTION_RANGE;

  return minDistance <= detectionRange;
}

/**
 * Get incoming attack warning time (affected by Oracle skill)
 */
export function getAttackWarningTime(
  defenderClass: CaptainClass,
  defenderSkill: CaptainSkill,
  defenderRace: Race
): number {
  let warningHours = 0; // Base: no warning

  // Oracle skill: +2 hours warning
  if (defenderSkill === 'oracle') {
    warningHours += 2;
  }

  // Sylvaeth bonus: +1 hour (if not already Oracle)
  if (defenderRace === 'sylvaeth' && defenderSkill !== 'oracle') {
    warningHours += 1;
  }

  return warningHours;
}

/**
 * Check if a territory is revealed by spells
 */
export async function isTerritoryRevealed(
  observerPlayerId: string,
  territoryId: string
): Promise<boolean> {
  // Check for active divination spells
  // This would check the activeSpellEffects table for scry/true sight effects
  // For now, return false (no spell revelation)
  return false;
}

/**
 * Get Sylvaeth dream reading accuracy
 * Always 100% accurate for Sylvaeth
 */
export function getSylvaethIntelAccuracy(race: Race): number {
  return race === 'sylvaeth' ? 1.0 : 0.8; // 100% for Sylvaeth, 80% base
}

/**
 * Create illusion army (Sylvaeth Dream Weaver)
 */
export async function createIllusionArmy(
  playerId: string,
  territoryId: string,
  apparentStrength: number
): Promise<string> {
  const player = await getPlayerById(playerId);
  if (!player || player.race !== 'sylvaeth') {
    throw new Error('Only Sylvaeth can create illusions');
  }

  // Create a fake army entry (marked as illusion)
  // This would be a special type of army that appears in visibility
  // but doesn't actually participate in combat

  // For now, return a placeholder
  logger.info({ playerId, territoryId, apparentStrength }, 'Illusion army created');

  return 'illusion-' + crypto.randomUUID();
}

/**
 * Get map fog data for rendering
 */
export async function getMapFogData(
  playerId: string,
  generationId: string
): Promise<{
  visible: Array<{ x: number; y: number }>;
  explored: Array<{ x: number; y: number }>;
  hidden: Array<{ x: number; y: number }>;
}> {
  const { visibleTerritories } = await getPlayerVisibility(playerId);

  const allTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.generationId, generationId));

  const visible: Array<{ x: number; y: number }> = [];
  const explored: Array<{ x: number; y: number }> = []; // Would need to track explored territories
  const hidden: Array<{ x: number; y: number }> = [];

  for (const territory of allTerritories) {
    if (visibleTerritories.has(territory.id)) {
      visible.push({ x: territory.x, y: territory.y });
    } else {
      // For now, treat all non-visible as hidden
      // In a full implementation, we'd track explored territories
      hidden.push({ x: territory.x, y: territory.y });
    }
  }

  return { visible, explored, hidden };
}
