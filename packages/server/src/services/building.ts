import { eq, and, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { buildings, territories, players } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import {
  type BuildingType,
  type Resources,
  BUILDING_DEFINITIONS,
  MAX_BUILDINGS_PER_TERRITORY,
  MAX_CONCURRENT_BUILDS,
} from '@nemeths/shared';
import { getPlayerById, canAfford, deductResources } from './player.js';

// ==========================================
// BUILDING SERVICE
// ==========================================

export interface BuildingInfo {
  id: string;
  territoryId: string;
  playerId: string;
  type: BuildingType;
  hp: number;
  maxHp: number;
  constructionStarted: Date;
  constructionComplete: Date | null;
  isUnderConstruction: boolean;
}

/**
 * Get building by ID
 */
export async function getBuildingById(id: string): Promise<BuildingInfo | null> {
  const [building] = await db.select().from(buildings).where(eq(buildings.id, id)).limit(1);

  if (!building) return null;

  return buildingToInfo(building);
}

/**
 * Get all buildings in a territory
 */
export async function getBuildingsInTerritory(territoryId: string): Promise<BuildingInfo[]> {
  const result = await db
    .select()
    .from(buildings)
    .where(eq(buildings.territoryId, territoryId));

  return result.map(buildingToInfo);
}

/**
 * Get count of buildings under construction for a player
 */
export async function getPlayerActiveBuilds(playerId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(buildings)
    .where(and(eq(buildings.playerId, playerId), eq(buildings.isUnderConstruction, true)));

  return result?.count ?? 0;
}

/**
 * Check if building prerequisites are met
 */
export async function checkPrerequisites(
  territoryId: string,
  buildingType: BuildingType
): Promise<{ met: boolean; missing?: BuildingType }> {
  const definition = BUILDING_DEFINITIONS[buildingType];

  if (!definition.requires) {
    return { met: true };
  }

  const existingBuildings = await getBuildingsInTerritory(territoryId);
  const hasPrerequisite = existingBuildings.some(
    (b) => b.type === definition.requires && !b.isUnderConstruction
  );

  if (!hasPrerequisite) {
    return { met: false, missing: definition.requires };
  }

  return { met: true };
}

/**
 * Check building limits
 */
export async function checkBuildingLimits(
  territoryId: string,
  buildingType: BuildingType
): Promise<{ allowed: boolean; reason?: string }> {
  const existingBuildings = await getBuildingsInTerritory(territoryId);
  const definition = BUILDING_DEFINITIONS[buildingType];

  // Check total buildings per territory
  if (existingBuildings.length >= MAX_BUILDINGS_PER_TERRITORY) {
    return { allowed: false, reason: `Maximum ${MAX_BUILDINGS_PER_TERRITORY} buildings per territory` };
  }

  // Check specific building type limits
  const sameTypeCount = existingBuildings.filter((b) => b.type === buildingType).length;
  if (sameTypeCount >= definition.maxPerTerritory) {
    return { allowed: false, reason: `Maximum ${definition.maxPerTerritory} ${buildingType} per territory` };
  }

  return { allowed: true };
}

/**
 * Get race building cost modifier
 */
function getRaceCostModifier(race: string): number {
  // Vaelthir: +15% building costs
  if (race === 'vaelthir') return 1.15;
  return 1.0;
}

/**
 * Get building cost for a player (with race modifiers)
 */
export async function getBuildingCost(
  playerId: string,
  buildingType: BuildingType
): Promise<Partial<Resources>> {
  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  const definition = BUILDING_DEFINITIONS[buildingType];
  const modifier = getRaceCostModifier(player.race);

  const cost: Partial<Resources> = {};
  if (definition.cost.gold) cost.gold = Math.floor(definition.cost.gold * modifier);
  if (definition.cost.stone) cost.stone = Math.floor(definition.cost.stone * modifier);
  if (definition.cost.wood) cost.wood = Math.floor(definition.cost.wood * modifier);

  return cost;
}

/**
 * Get building time (with race/class modifiers)
 */
export function getBuildingTime(
  buildingType: BuildingType,
  race: string,
  captainSkill: string
): number {
  const definition = BUILDING_DEFINITIONS[buildingType];
  let hours = definition.buildTimeHours;

  // Artificer skill: -25% construction time
  if (captainSkill === 'artificer') {
    hours *= 0.75;
  }

  // Ironveld: faster construction (implied by lore)
  if (race === 'ironveld') {
    hours *= 0.9;
  }

  return hours;
}

/**
 * Start building construction
 */
export async function startConstruction(
  playerId: string,
  territoryId: string,
  buildingType: BuildingType
): Promise<BuildingInfo> {
  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  // Check territory ownership
  const [territory] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, territoryId))
    .limit(1);

  if (!territory) throw new Error('Territory not found');
  if (territory.ownerId !== playerId) throw new Error('You do not own this territory');

  // Check race restrictions
  const definition = BUILDING_DEFINITIONS[buildingType];

  // Sylvaeth cannot build siege workshop
  if (player.race === 'sylvaeth' && buildingType === 'siegeworkshop') {
    throw new Error('Sylvaeth cannot build Siege Workshops');
  }

  // Check concurrent builds
  const activeBuilds = await getPlayerActiveBuilds(playerId);
  if (activeBuilds >= MAX_CONCURRENT_BUILDS) {
    throw new Error(`Maximum ${MAX_CONCURRENT_BUILDS} concurrent builds allowed`);
  }

  // Check prerequisites
  const prereqCheck = await checkPrerequisites(territoryId, buildingType);
  if (!prereqCheck.met) {
    throw new Error(`Requires ${prereqCheck.missing} to be built first`);
  }

  // Check building limits
  const limitCheck = await checkBuildingLimits(territoryId, buildingType);
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason);
  }

  // Check and deduct resources
  const cost = await getBuildingCost(playerId, buildingType);
  if (!canAfford(player.resources, cost)) {
    throw new Error('Insufficient resources');
  }

  await deductResources(playerId, cost);

  // Calculate construction time
  const hours = getBuildingTime(buildingType, player.race, player.captainSkill);
  const constructionComplete = new Date(Date.now() + hours * 60 * 60 * 1000);

  // Calculate max HP (with race bonuses)
  let maxHp = 1000; // Base HP
  if (player.race === 'ironveld' && buildingType === 'wall') {
    maxHp = Math.floor(maxHp * 1.25); // +25% wall HP
  }

  // Create building
  const [building] = await db
    .insert(buildings)
    .values({
      territoryId,
      playerId,
      type: buildingType,
      hp: maxHp,
      maxHp,
      constructionComplete,
      isUnderConstruction: true,
    })
    .returning();

  logger.info(
    {
      buildingId: building.id,
      playerId,
      territoryId,
      type: buildingType,
      completesAt: constructionComplete,
    },
    'Building construction started'
  );

  return buildingToInfo(building);
}

/**
 * Complete building construction (called by timer service)
 */
export async function completeConstruction(buildingId: string): Promise<void> {
  await db
    .update(buildings)
    .set({ isUnderConstruction: false, updatedAt: new Date() })
    .where(eq(buildings.id, buildingId));

  logger.info({ buildingId }, 'Building construction completed');
}

/**
 * Destroy a building
 */
export async function destroyBuilding(
  playerId: string,
  buildingId: string
): Promise<Partial<Resources>> {
  const building = await getBuildingById(buildingId);
  if (!building) throw new Error('Building not found');
  if (building.playerId !== playerId) throw new Error('You do not own this building');

  const definition = BUILDING_DEFINITIONS[building.type];

  // Calculate refund (25% of cost)
  const refund: Partial<Resources> = {};
  if (definition.cost.gold) refund.gold = Math.floor(definition.cost.gold * 0.25);
  if (definition.cost.stone) refund.stone = Math.floor(definition.cost.stone * 0.25);
  if (definition.cost.wood) refund.wood = Math.floor(definition.cost.wood * 0.25);

  // Delete building
  await db.delete(buildings).where(eq(buildings.id, buildingId));

  // Add refund to player
  const player = await getPlayerById(playerId);
  if (player) {
    await db
      .update(players)
      .set({
        resources: {
          ...player.resources,
          gold: player.resources.gold + (refund.gold || 0),
          stone: player.resources.stone + (refund.stone || 0),
          wood: player.resources.wood + (refund.wood || 0),
        },
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId));
  }

  logger.info({ buildingId, playerId, refund }, 'Building destroyed');

  return refund;
}

/**
 * Damage a building
 */
export async function damageBuilding(buildingId: string, damage: number): Promise<number> {
  const building = await getBuildingById(buildingId);
  if (!building) throw new Error('Building not found');

  const newHp = Math.max(0, building.hp - damage);

  if (newHp === 0) {
    // Building destroyed
    await db.delete(buildings).where(eq(buildings.id, buildingId));
    logger.info({ buildingId, damage }, 'Building destroyed by damage');
    return 0;
  }

  await db
    .update(buildings)
    .set({ hp: newHp, updatedAt: new Date() })
    .where(eq(buildings.id, buildingId));

  return newHp;
}

/**
 * Repair a building
 */
export async function repairBuilding(
  playerId: string,
  buildingId: string
): Promise<{ hp: number; cost: number }> {
  const building = await getBuildingById(buildingId);
  if (!building) throw new Error('Building not found');
  if (building.playerId !== playerId) throw new Error('You do not own this building');

  const damagePercent = 1 - building.hp / building.maxHp;
  if (damagePercent === 0) throw new Error('Building is not damaged');

  // Calculate repair cost based on damage level
  let costPercent: number;
  if (damagePercent <= 0.25) costPercent = 0.1;
  else if (damagePercent <= 0.5) costPercent = 0.2;
  else if (damagePercent <= 0.75) costPercent = 0.35;
  else costPercent = 0.45;

  const definition = BUILDING_DEFINITIONS[building.type];
  const baseCost = (definition.cost.gold || 0) + (definition.cost.stone || 0);
  const repairCost = Math.floor(baseCost * costPercent);

  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  if (player.resources.gold < repairCost) {
    throw new Error('Insufficient gold for repair');
  }

  // Deduct cost and repair
  await db
    .update(players)
    .set({
      resources: { ...player.resources, gold: player.resources.gold - repairCost },
      updatedAt: new Date(),
    })
    .where(eq(players.id, playerId));

  await db
    .update(buildings)
    .set({ hp: building.maxHp, updatedAt: new Date() })
    .where(eq(buildings.id, buildingId));

  logger.info({ buildingId, repairCost, newHp: building.maxHp }, 'Building repaired');

  return { hp: building.maxHp, cost: repairCost };
}

/**
 * Convert database building to BuildingInfo
 */
function buildingToInfo(building: typeof buildings.$inferSelect): BuildingInfo {
  return {
    id: building.id,
    territoryId: building.territoryId,
    playerId: building.playerId,
    type: building.type,
    hp: building.hp,
    maxHp: building.maxHp,
    constructionStarted: building.constructionStarted,
    constructionComplete: building.constructionComplete,
    isUnderConstruction: building.isUnderConstruction,
  };
}
