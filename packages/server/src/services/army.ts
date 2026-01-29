import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { armies, territories } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import {
  type UnitType,
  type Race,
  type ArmyUnit,
  UNIT_DEFINITIONS,
  FOOD_RATES,
  getUnitsForRace,
} from '@nemeths/shared';
import { getPlayerById, deductResourcesAtomic } from './player.js';
import { getBuildingsInTerritory } from './building.js';

// ==========================================
// ARMY SERVICE
// ==========================================

export interface ArmyInfo {
  id: string;
  playerId: string;
  territoryId: string;
  units: ArmyUnit[];
  totalStrength: number;
  totalFoodConsumption: number;
  isGarrison: boolean;
  leadedByCaptain: boolean;
}

/**
 * Get army by ID
 */
export async function getArmyById(id: string): Promise<ArmyInfo | null> {
  const [army] = await db.select().from(armies).where(eq(armies.id, id)).limit(1);

  if (!army) return null;

  return armyToInfo(army);
}

/**
 * Get armies in a territory
 */
export async function getArmiesInTerritory(territoryId: string): Promise<ArmyInfo[]> {
  const result = await db
    .select()
    .from(armies)
    .where(eq(armies.territoryId, territoryId));

  return result.map(armyToInfo);
}

/**
 * Get player's garrison in a territory
 */
export async function getGarrison(playerId: string, territoryId: string): Promise<ArmyInfo | null> {
  const [army] = await db
    .select()
    .from(armies)
    .where(
      and(
        eq(armies.playerId, playerId),
        eq(armies.territoryId, territoryId),
        eq(armies.isGarrison, true)
      )
    )
    .limit(1);

  if (!army) return null;

  return armyToInfo(army);
}

/**
 * Get all player armies
 */
export async function getPlayerArmies(playerId: string): Promise<ArmyInfo[]> {
  const result = await db.select().from(armies).where(eq(armies.playerId, playerId));

  return result.map(armyToInfo);
}

/**
 * Check if player can train a unit type
 */
export async function canTrainUnit(
  playerId: string,
  territoryId: string,
  unitType: UnitType
): Promise<{ canTrain: boolean; reason?: string }> {
  const player = await getPlayerById(playerId);
  if (!player) return { canTrain: false, reason: 'Player not found' };

  const unitDef = UNIT_DEFINITIONS[unitType];

  // Check if unit is available for player's race (or universal)
  const availableUnits = getUnitsForRace(player.race);
  if (!availableUnits.includes(unitType)) {
    return { canTrain: false, reason: `${unitType} is not available for ${player.race}` };
  }

  // Check building requirements
  const buildingsInTerritory = await getBuildingsInTerritory(territoryId);
  const completedBuildings = buildingsInTerritory.filter((b) => !b.isUnderConstruction);
  const buildingTypes = completedBuildings.map((b) => b.type);

  // Defenders and Attackers need Barracks
  if (unitDef.role === 'defender' || unitDef.role === 'attacker') {
    if (!buildingTypes.includes('barracks')) {
      return { canTrain: false, reason: 'Barracks required to train this unit' };
    }
  }

  // Elites need War Hall
  if (unitDef.role === 'elite') {
    if (!buildingTypes.includes('warhall')) {
      return { canTrain: false, reason: 'War Hall required to train elite units' };
    }
  }

  // Siege needs Siege Workshop
  if (unitDef.role === 'siege') {
    if (!buildingTypes.includes('siegeworkshop')) {
      return { canTrain: false, reason: 'Siege Workshop required to train siege weapons' };
    }
    // Sylvaeth restriction already handled by getUnitsForRace excluding siege from their list
  }

  return { canTrain: true };
}

/**
 * Calculate training cost with race modifiers
 */
export function getTrainingCost(
  unitType: UnitType,
  quantity: number,
  race: Race
): { gold: number; mana?: number } {
  const unitDef = UNIT_DEFINITIONS[unitType];
  let goldCost = unitDef.cost * quantity;

  // Vaelthir: +15% unit cost
  if (race === 'vaelthir') {
    goldCost = Math.floor(goldCost * 1.15);
  }

  const cost: { gold: number; mana?: number } = { gold: goldCost };

  if (unitDef.manaCost) {
    cost.mana = unitDef.manaCost * quantity;
  }

  return cost;
}

/**
 * Calculate training time with modifiers
 */
export function getTrainingTime(
  unitType: UnitType,
  quantity: number,
  captainSkill: string
): number {
  const unitDef = UNIT_DEFINITIONS[unitType];
  let hoursPerUnit = unitDef.trainTime;

  // Artificer skill: -20% training time
  if (captainSkill === 'artificer') {
    hoursPerUnit *= 0.8;
  }

  // Training is parallel up to 10 units, then batched
  const batchSize = 10;
  const batches = Math.ceil(quantity / batchSize);

  return hoursPerUnit * batches;
}

/**
 * Train units in a territory
 */
export async function trainUnits(
  playerId: string,
  territoryId: string,
  unitType: UnitType,
  quantity: number
): Promise<{ army: ArmyInfo; completesAt: Date }> {
  if (quantity <= 0) throw new Error('Quantity must be positive');
  if (quantity > 100) throw new Error('Cannot train more than 100 units at once');

  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  // Verify territory ownership
  const [territory] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, territoryId))
    .limit(1);

  if (!territory) throw new Error('Territory not found');
  if (territory.ownerId !== playerId) throw new Error('You do not own this territory');

  // Check if can train
  const trainCheck = await canTrainUnit(playerId, territoryId, unitType);
  if (!trainCheck.canTrain) {
    throw new Error(trainCheck.reason);
  }

  // Calculate cost and atomically deduct resources (prevents race conditions)
  const cost = getTrainingCost(unitType, quantity, player.race);
  await deductResourcesAtomic(playerId, cost);

  // Get or create garrison
  let garrison = await getGarrison(playerId, territoryId);

  if (!garrison) {
    // Create new garrison
    const [newArmy] = await db
      .insert(armies)
      .values({
        playerId,
        territoryId,
        units: [],
        totalStrength: 0,
        totalFoodConsumption: 0,
        isGarrison: true,
        leadedByCaptain: false,
      })
      .returning();

    garrison = armyToInfo(newArmy);
  }

  // Calculate unit stats
  const unitDef = UNIT_DEFINITIONS[unitType];
  const totalHp = unitDef.hp * quantity;

  // Add units to garrison (or update existing stack)
  const existingUnitIndex = garrison.units.findIndex(
    (u) => u.unitType === unitType && !u.isPrisoner
  );

  if (existingUnitIndex >= 0) {
    // Add to existing stack
    garrison.units[existingUnitIndex].quantity += quantity;
    garrison.units[existingUnitIndex].currentHp += totalHp;
  } else {
    // New stack
    garrison.units.push({
      unitType,
      quantity,
      currentHp: totalHp,
      isPrisoner: false,
    });
  }

  // Recalculate totals
  const { strength, food } = calculateArmyTotals(garrison.units, player.race);

  // Update garrison
  await db
    .update(armies)
    .set({
      units: garrison.units,
      totalStrength: strength,
      totalFoodConsumption: food,
      updatedAt: new Date(),
    })
    .where(eq(armies.id, garrison.id));

  // Calculate completion time
  const trainingHours = getTrainingTime(unitType, quantity, player.captainSkill);
  const completesAt = new Date(Date.now() + trainingHours * 60 * 60 * 1000);

  logger.info(
    {
      playerId,
      territoryId,
      unitType,
      quantity,
      cost,
      completesAt,
    },
    'Units trained'
  );

  return {
    army: { ...garrison, totalStrength: strength, totalFoodConsumption: food },
    completesAt,
  };
}

/**
 * Calculate army totals (strength and food)
 */
export function calculateArmyTotals(
  units: ArmyUnit[],
  ownerRace: Race
): { strength: number; food: number } {
  let strength = 0;
  let food = 0;

  const foodRate = FOOD_RATES[ownerRace];

  for (const unit of units) {
    const unitDef = UNIT_DEFINITIONS[unit.unitType as UnitType];
    const _unitRace = unitDef.race === 'universal' ? ownerRace : unitDef.race;

    // Calculate strength based on ATK + DEF
    const unitStrength = (unitDef.atk + unitDef.def) * unit.quantity;
    strength += unit.isPrisoner ? unitStrength * 0.6 : unitStrength;

    // Calculate food (prisoners use their original race's rate)
    const unitFoodRate = unit.isPrisoner && unit.originalRace
      ? FOOD_RATES[unit.originalRace as Race]
      : foodRate;

    food += Math.floor(unitDef.food * unit.quantity * unitFoodRate);
  }

  return { strength: Math.floor(strength), food };
}

/**
 * Move army to another territory
 */
export async function moveArmy(
  playerId: string,
  armyId: string,
  targetTerritoryId: string
): Promise<{ army: ArmyInfo; arrivesAt: Date; distance: number }> {
  const army = await getArmyById(armyId);
  if (!army) throw new Error('Army not found');
  if (army.playerId !== playerId) throw new Error('You do not own this army');
  if (army.isGarrison) throw new Error('Cannot move garrison directly, create a marching army first');

  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  // Get source and target territories
  const [source] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, army.territoryId))
    .limit(1);

  const [target] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, targetTerritoryId))
    .limit(1);

  if (!source || !target) throw new Error('Territory not found');

  // Check target is not water
  if (target.terrain === 'river') {
    throw new Error('Cannot move to water');
  }

  // Calculate distance (Manhattan)
  const distance = Math.abs(source.x - target.x) + Math.abs(source.y - target.y);

  // Calculate travel time based on slowest unit
  let slowestSpeed = Infinity;
  for (const unit of army.units) {
    const unitDef = UNIT_DEFINITIONS[unit.unitType as UnitType];
    if (unitDef.spd < slowestSpeed) {
      slowestSpeed = unitDef.spd;
    }
  }

  // Apply race speed modifiers
  let speedModifier = 1.0;
  if (player.race === 'ironveld') speedModifier = 0.75; // -25% movement
  if (player.race === 'breathborn') speedModifier = 1.15; // +15% movement

  const effectiveSpeed = slowestSpeed * speedModifier;
  const travelHours = distance / effectiveSpeed;
  const arrivesAt = new Date(Date.now() + travelHours * 60 * 60 * 1000);

  // Update army with target
  await db
    .update(armies)
    .set({
      territoryId: targetTerritoryId,
      updatedAt: new Date(),
    })
    .where(eq(armies.id, armyId));

  logger.info(
    {
      armyId,
      playerId,
      from: `${source.x},${source.y}`,
      to: `${target.x},${target.y}`,
      distance,
      arrivesAt,
    },
    'Army moved'
  );

  return {
    army: { ...army, territoryId: targetTerritoryId },
    arrivesAt,
    distance,
  };
}

/**
 * Split units from garrison into a new army
 */
export async function splitArmy(
  playerId: string,
  sourceArmyId: string,
  unitsToSplit: Array<{ unitType: UnitType; quantity: number }>,
  includeCaptain: boolean
): Promise<ArmyInfo> {
  const source = await getArmyById(sourceArmyId);
  if (!source) throw new Error('Army not found');
  if (source.playerId !== playerId) throw new Error('You do not own this army');

  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  // Validate we have enough units
  for (const split of unitsToSplit) {
    const sourceUnit = source.units.find((u) => u.unitType === split.unitType && !u.isPrisoner);
    if (!sourceUnit || sourceUnit.quantity < split.quantity) {
      throw new Error(`Not enough ${split.unitType} units`);
    }
  }

  // Can only have captain in one place
  if (includeCaptain && !source.leadedByCaptain) {
    throw new Error('Captain is not with this army');
  }

  // Create new army
  const newUnits: ArmyUnit[] = [];

  for (const split of unitsToSplit) {
    const sourceUnit = source.units.find((u) => u.unitType === split.unitType && !u.isPrisoner)!;
    const _unitDef = UNIT_DEFINITIONS[split.unitType];

    // Calculate HP to transfer (proportional)
    const hpPerUnit = sourceUnit.currentHp / sourceUnit.quantity;
    const transferHp = Math.floor(hpPerUnit * split.quantity);

    // Remove from source
    sourceUnit.quantity -= split.quantity;
    sourceUnit.currentHp -= transferHp;

    // Add to new army
    newUnits.push({
      unitType: split.unitType,
      quantity: split.quantity,
      currentHp: transferHp,
      isPrisoner: false,
    });
  }

  // Clean up empty unit stacks
  source.units = source.units.filter((u) => u.quantity > 0);

  // Calculate new totals
  const sourceTotals = calculateArmyTotals(source.units, player.race);
  const newTotals = calculateArmyTotals(newUnits, player.race);

  // Update source
  await db
    .update(armies)
    .set({
      units: source.units,
      totalStrength: sourceTotals.strength,
      totalFoodConsumption: sourceTotals.food,
      leadedByCaptain: includeCaptain ? false : source.leadedByCaptain,
      updatedAt: new Date(),
    })
    .where(eq(armies.id, sourceArmyId));

  // Create new army
  const [newArmy] = await db
    .insert(armies)
    .values({
      playerId,
      territoryId: source.territoryId,
      units: newUnits,
      totalStrength: newTotals.strength,
      totalFoodConsumption: newTotals.food,
      isGarrison: false,
      leadedByCaptain: includeCaptain,
    })
    .returning();

  logger.info(
    {
      playerId,
      sourceArmyId,
      newArmyId: newArmy.id,
      unitsTransferred: unitsToSplit,
      includeCaptain,
    },
    'Army split'
  );

  return armyToInfo(newArmy);
}

/**
 * Merge army into garrison
 */
export async function mergeArmy(
  playerId: string,
  armyId: string,
  targetArmyId: string
): Promise<ArmyInfo> {
  const army = await getArmyById(armyId);
  const target = await getArmyById(targetArmyId);

  if (!army || !target) throw new Error('Army not found');
  if (army.playerId !== playerId || target.playerId !== playerId) {
    throw new Error('You do not own these armies');
  }
  if (army.territoryId !== target.territoryId) {
    throw new Error('Armies must be in the same territory');
  }

  const player = await getPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  // Merge units
  for (const unit of army.units) {
    const existingIndex = target.units.findIndex(
      (u) => u.unitType === unit.unitType && u.isPrisoner === unit.isPrisoner
    );

    if (existingIndex >= 0) {
      target.units[existingIndex].quantity += unit.quantity;
      target.units[existingIndex].currentHp += unit.currentHp;
    } else {
      target.units.push({ ...unit });
    }
  }

  // Captain follows
  const hasCaptain = army.leadedByCaptain || target.leadedByCaptain;

  // Calculate new totals
  const totals = calculateArmyTotals(target.units, player.race);

  // Update target
  await db
    .update(armies)
    .set({
      units: target.units,
      totalStrength: totals.strength,
      totalFoodConsumption: totals.food,
      leadedByCaptain: hasCaptain,
      updatedAt: new Date(),
    })
    .where(eq(armies.id, targetArmyId));

  // Delete source army
  await db.delete(armies).where(eq(armies.id, armyId));

  logger.info({ playerId, mergedArmyId: armyId, targetArmyId }, 'Armies merged');

  return {
    ...target,
    totalStrength: totals.strength,
    totalFoodConsumption: totals.food,
    leadedByCaptain: hasCaptain,
  };
}

/**
 * Convert database army to ArmyInfo
 */
function armyToInfo(army: typeof armies.$inferSelect): ArmyInfo {
  return {
    id: army.id,
    playerId: army.playerId,
    territoryId: army.territoryId,
    units: army.units as ArmyUnit[],
    totalStrength: army.totalStrength,
    totalFoodConsumption: army.totalFoodConsumption,
    isGarrison: army.isGarrison,
    leadedByCaptain: army.leadedByCaptain,
  };
}
