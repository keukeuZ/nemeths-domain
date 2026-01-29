import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { players, territories, buildings, armies } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import {
  type Race,
  type Zone,
  type Resources,
  ZONE_MULTIPLIERS,
  FOOD_RATES,
  BUILDING_DEFINITIONS,
} from '@nemeths/shared';
import { getPlayerById, updatePlayerResources } from './player.js';
import { calculateArmyTotals, type ArmyInfo } from './army.js';

// ==========================================
// RESOURCE TICK SERVICE
// ==========================================

// Base production per building
const BUILDING_PRODUCTION: Record<string, Partial<Resources>> = {
  farm: { food: 50 },
  mine: { gold: 40 },
  lumbermill: { wood: 40 },
  market: { gold: 100 },
  magetower: { mana: 20 },
  shrine: { mana: 10 },
};

// Race production modifiers
const RACE_PRODUCTION_MODIFIERS: Record<Race, number> = {
  ironveld: 1.0, // +15% mine output handled separately
  vaelthir: 1.0, // +30% mana handled separately
  korrath: 1.0,
  sylvaeth: 1.1, // +10% all production
  ashborn: 0.85, // -15% all production
  breathborn: 1.0,
};

interface TerritoryProduction {
  territoryId: string;
  x: number;
  y: number;
  zone: Zone;
  gold: number;
  stone: number;
  wood: number;
  food: number;
  mana: number;
}

/**
 * Calculate production for a single territory
 */
export async function calculateTerritoryProduction(
  territoryId: string,
  playerRace: Race
): Promise<TerritoryProduction> {
  const [territory] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, territoryId))
    .limit(1);

  if (!territory) {
    throw new Error('Territory not found');
  }

  const production: TerritoryProduction = {
    territoryId,
    x: territory.x,
    y: territory.y,
    zone: territory.zone,
    gold: 0,
    stone: 0,
    wood: 0,
    food: 0,
    mana: 0,
  };

  // Get completed buildings
  const buildingList = await db
    .select()
    .from(buildings)
    .where(and(eq(buildings.territoryId, territoryId), eq(buildings.isUnderConstruction, false)));

  // Base race modifier
  const raceModifier = RACE_PRODUCTION_MODIFIERS[playerRace];

  // Zone multiplier
  const zoneMultiplier = ZONE_MULTIPLIERS[territory.zone];

  // Calculate production from buildings
  for (const building of buildingList) {
    const baseProduction = BUILDING_PRODUCTION[building.type];
    if (!baseProduction) continue;

    // Apply modifiers
    let modifier = raceModifier * zoneMultiplier;

    // Special race bonuses
    if (building.type === 'mine' && playerRace === 'ironveld') {
      modifier *= 1.15; // +15% mine output for Ironveld
    }
    if (building.type === 'magetower' && playerRace === 'vaelthir') {
      modifier *= 1.3; // +30% mana for Vaelthir
    }
    if (building.type === 'farm' && playerRace === 'ashborn') {
      modifier *= 0.8; // -20% farm output for Ashborn
    }

    // Add to production
    if (baseProduction.gold) production.gold += Math.floor(baseProduction.gold * modifier);
    if (baseProduction.stone) production.stone += Math.floor(baseProduction.stone * modifier);
    if (baseProduction.wood) production.wood += Math.floor(baseProduction.wood * modifier);
    if (baseProduction.food) production.food += Math.floor(baseProduction.food * modifier);
    if (baseProduction.mana) production.mana += Math.floor(baseProduction.mana * modifier);
  }

  // Zone mana bonuses
  if (territory.zone === 'heart') {
    production.mana += 25;
  } else if (territory.zone === 'inner') {
    production.mana += 10;
  } else if (territory.zone === 'middle') {
    production.mana += 5;
  }

  return production;
}

/**
 * Calculate food consumption for a player's armies
 */
export async function calculateFoodConsumption(playerId: string): Promise<number> {
  const player = await getPlayerById(playerId);
  if (!player) return 0;

  const playerArmies = await db
    .select()
    .from(armies)
    .where(eq(armies.playerId, playerId));

  let totalFood = 0;
  for (const army of playerArmies) {
    totalFood += army.totalFoodConsumption;
  }

  return totalFood;
}

/**
 * Process daily resource tick for a player
 */
export async function processPlayerResourceTick(playerId: string): Promise<{
  production: Partial<Resources>;
  consumption: Partial<Resources>;
  net: Partial<Resources>;
}> {
  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  // Get all player territories
  const playerTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.ownerId, playerId));

  // Calculate total production
  const totalProduction: Resources = {
    gold: 0,
    stone: 0,
    wood: 0,
    food: 0,
    mana: 0,
  };

  for (const territory of playerTerritories) {
    const production = await calculateTerritoryProduction(territory.id, player.race);
    totalProduction.gold += production.gold;
    totalProduction.stone += production.stone;
    totalProduction.wood += production.wood;
    totalProduction.food += production.food;
    totalProduction.mana += production.mana;
  }

  // Calculate consumption
  const foodConsumption = await calculateFoodConsumption(playerId);

  const consumption: Partial<Resources> = {
    food: foodConsumption,
  };

  // Calculate net
  const net: Partial<Resources> = {
    gold: totalProduction.gold,
    stone: totalProduction.stone,
    wood: totalProduction.wood,
    food: totalProduction.food - foodConsumption,
    mana: totalProduction.mana,
  };

  // Apply to player (don't let resources go negative)
  const newResources: Resources = {
    gold: Math.max(0, player.resources.gold + (net.gold || 0)),
    stone: Math.max(0, player.resources.stone + (net.stone || 0)),
    wood: Math.max(0, player.resources.wood + (net.wood || 0)),
    food: Math.max(0, player.resources.food + (net.food || 0)),
    mana: Math.min(200, Math.max(0, player.resources.mana + (net.mana || 0))), // Mana capped at 200
  };

  await db
    .update(players)
    .set({ resources: newResources, updatedAt: new Date() })
    .where(eq(players.id, playerId));

  logger.debug(
    {
      playerId,
      production: totalProduction,
      consumption,
      net,
      newResources,
    },
    'Resource tick processed'
  );

  return {
    production: totalProduction,
    consumption,
    net,
  };
}

/**
 * Process building decay for Breath-Born players
 */
export async function processBreathBornDecay(playerId: string): Promise<number> {
  const player = await getPlayerById(playerId);
  if (!player || player.race !== 'breathborn') return 0;

  // Get all player buildings
  const playerBuildings = await db
    .select()
    .from(buildings)
    .where(eq(buildings.playerId, playerId));

  let decayedCount = 0;

  for (const building of playerBuildings) {
    // 1% HP decay per day
    const decay = Math.floor(building.maxHp * 0.01);
    const newHp = Math.max(1, building.hp - decay); // Don't destroy, minimum 1 HP

    if (newHp < building.hp) {
      await db
        .update(buildings)
        .set({ hp: newHp, updatedAt: new Date() })
        .where(eq(buildings.id, building.id));
      decayedCount++;
    }
  }

  if (decayedCount > 0) {
    logger.debug({ playerId, decayedCount }, 'Breath-Born building decay applied');
  }

  return decayedCount;
}

/**
 * Process starvation when food goes negative
 */
export async function processStarvation(playerId: string): Promise<number> {
  const player = await getPlayerById(playerId);
  if (!player || player.resources.food > 0) return 0;

  // Get player's armies
  const playerArmies = await db
    .select()
    .from(armies)
    .where(eq(armies.playerId, playerId));

  let totalDeserted = 0;

  for (const army of playerArmies) {
    const units = army.units as Array<{
      unitType: string;
      quantity: number;
      currentHp: number;
      isPrisoner: boolean;
      originalRace?: string;
    }>;

    // 5% desertion when starving
    for (const unit of units) {
      const deserted = Math.floor(unit.quantity * 0.05);
      if (deserted > 0) {
        unit.quantity -= deserted;
        totalDeserted += deserted;
      }
    }

    // Remove empty stacks
    const filteredUnits = units.filter((u) => u.quantity > 0);

    // Recalculate totals
    const totals = calculateArmyTotals(filteredUnits as any, player.race);

    await db
      .update(armies)
      .set({
        units: filteredUnits,
        totalStrength: totals.strength,
        totalFoodConsumption: totals.food,
        updatedAt: new Date(),
      })
      .where(eq(armies.id, army.id));
  }

  if (totalDeserted > 0) {
    logger.info({ playerId, deserted: totalDeserted }, 'Units deserted due to starvation');
  }

  return totalDeserted;
}

/**
 * Run daily tick for all players in a generation
 */
export async function runDailyTick(generationId: string): Promise<{
  playersProcessed: number;
  totalProduction: Resources;
}> {
  const allPlayers = await db
    .select()
    .from(players)
    .where(eq(players.generationId, generationId));

  const totalProduction: Resources = {
    gold: 0,
    stone: 0,
    wood: 0,
    food: 0,
    mana: 0,
  };

  for (const player of allPlayers) {
    try {
      // Process resources
      const result = await processPlayerResourceTick(player.id);

      totalProduction.gold += result.production.gold || 0;
      totalProduction.stone += result.production.stone || 0;
      totalProduction.wood += result.production.wood || 0;
      totalProduction.food += result.production.food || 0;
      totalProduction.mana += result.production.mana || 0;

      // Process Breath-Born decay
      await processBreathBornDecay(player.id);

      // Process starvation
      await processStarvation(player.id);
    } catch (error) {
      logger.error({ playerId: player.id, error }, 'Error processing player tick');
    }
  }

  logger.info(
    {
      generationId,
      playersProcessed: allPlayers.length,
      totalProduction,
    },
    'Daily tick completed'
  );

  return {
    playersProcessed: allPlayers.length,
    totalProduction,
  };
}
