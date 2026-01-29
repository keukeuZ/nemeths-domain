import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { combats, territories, players, armies } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import {
  type ArmyUnit,
  type UnitType,
  type CombatRound,
  type CombatEvent,
  UNIT_DEFINITIONS,
  DEATH_SAVE_THRESHOLD,
  MAX_DEATH_SAVE_MODIFIER,
} from '@nemeths/shared';
import { getPlayerById, woundCaptain, killCaptain } from './player.js';
import { getArmyById, type ArmyInfo, calculateArmyTotals } from './army.js';
import { getBuildingsInTerritory } from './building.js';
import { isPvPEnabled, getCurrentGeneration, hasNewPlayerProtection } from './generation.js';
import {
  notifyAttackIncoming,
  notifyCombatStarted,
  notifyCombatEnded,
  notifyCaptainWounded,
  notifyCaptainDied,
} from './notification.js';

// ==========================================
// COMBAT SERVICE
// ==========================================

// Attack roll modifiers (weighted D20)
const ATTACK_ROLL_MODIFIERS: Record<number, number> = {
  1: 0.5,   // Critical failure
  2: 0.7, 3: 0.7, 4: 0.7,  // Poor
  5: 0.85, 6: 0.85, 7: 0.85, 8: 0.85,  // Below average
  9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0,  // Median
  13: 1.1, 14: 1.1, 15: 1.1, 16: 1.1,  // Above average
  17: 1.25, 18: 1.25, 19: 1.25,  // Strong
  20: 1.5,  // Critical hit
};

// Defense roll modifiers
const DEFENSE_ROLL_MODIFIERS: Record<number, number> = {
  1: 0.5,
  2: 0.75, 3: 0.75, 4: 0.75,
  5: 0.9, 6: 0.9, 7: 0.9, 8: 0.9,
  9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0,
  13: 1.1, 14: 1.1, 15: 1.1, 16: 1.1,
  17: 1.2, 18: 1.2, 19: 1.2,
  20: 1.4,
};

export interface CombatResult {
  id: string;
  winner: 'attacker' | 'defender' | 'draw';
  attackerCasualties: number;
  defenderCasualties: number;
  attackerCaptainDied: boolean;
  defenderCaptainDied: boolean;
  loot: {
    gold: number;
    stone: number;
    wood: number;
    food: number;
  };
  prisonersCaptured: number;
  rounds: CombatRound[];
  territoryChanged: boolean;
}

/**
 * Roll a D20
 */
function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Calculate total ATK for an army
 */
function calculateArmyAtk(units: ArmyUnit[]): number {
  let total = 0;
  for (const unit of units) {
    const def = UNIT_DEFINITIONS[unit.unitType as UnitType];
    const modifier = unit.isPrisoner ? 0.6 : 1.0;
    total += def.atk * unit.quantity * modifier;
  }
  return total;
}

/**
 * Calculate total DEF for an army
 */
function calculateArmyDef(units: ArmyUnit[]): number {
  let total = 0;
  for (const unit of units) {
    const def = UNIT_DEFINITIONS[unit.unitType as UnitType];
    const modifier = unit.isPrisoner ? 0.6 : 1.0;
    total += def.def * unit.quantity * modifier;
  }
  return total;
}

/**
 * Calculate total HP for an army
 */
function calculateArmyHp(units: ArmyUnit[]): number {
  let total = 0;
  for (const unit of units) {
    total += unit.currentHp;
  }
  return total;
}

/**
 * Get total unit count
 */
function getUnitCount(units: ArmyUnit[]): number {
  return units.reduce((sum, u) => sum + u.quantity, 0);
}

/**
 * Apply damage to army units
 * Returns number of casualties
 */
function applyDamageToArmy(units: ArmyUnit[], damage: number): number {
  if (damage <= 0) return 0;

  let remainingDamage = damage;
  let totalCasualties = 0;

  // Sort by role: frontline takes damage first
  const roleOrder: Record<string, number> = {
    defender: 1,
    attacker: 2,
    elite: 3,
    siege: 4,
  };

  const sortedUnits = [...units].sort((a, b) => {
    const roleA = UNIT_DEFINITIONS[a.unitType as UnitType].role;
    const roleB = UNIT_DEFINITIONS[b.unitType as UnitType].role;
    return roleOrder[roleA] - roleOrder[roleB];
  });

  for (const unit of sortedUnits) {
    if (remainingDamage <= 0) break;
    if (unit.quantity <= 0) continue;

    const unitDef = UNIT_DEFINITIONS[unit.unitType as UnitType];
    const hpPerUnit = unitDef.hp;

    // Apply damage to this unit stack
    const damageToUnit = Math.min(remainingDamage, unit.currentHp);
    unit.currentHp -= damageToUnit;
    remainingDamage -= damageToUnit;

    // Calculate casualties
    const casualties = Math.floor(damageToUnit / hpPerUnit);
    unit.quantity = Math.max(0, unit.quantity - casualties);
    totalCasualties += casualties;

    // Adjust HP for partial damage
    if (unit.quantity > 0) {
      unit.currentHp = Math.max(unit.currentHp, unit.quantity * hpPerUnit * 0.1);
    }
  }

  // Remove destroyed unit stacks
  for (let i = units.length - 1; i >= 0; i--) {
    if (units[i].quantity <= 0) {
      units.splice(i, 1);
    }
  }

  return totalCasualties;
}

/**
 * Perform captain death save
 */
function performDeathSave(
  playerId: string,
  race: string,
  captainClass: string,
  captainSkill: string,
  isDefending: boolean
): { roll: number; modifiers: Array<{ source: string; value: number }>; survived: boolean } {
  const roll = rollD20();
  const modifiers: Array<{ source: string; value: number }> = [];

  // Race modifiers
  if (race === 'ashborn') {
    modifiers.push({ source: 'Ashborn race', value: 2 });
  }

  // Class modifiers
  if (captainClass === 'warlord') {
    modifiers.push({ source: 'Warlord class', value: 2 });
  }
  if (captainClass === 'shadowmaster') {
    modifiers.push({ source: 'Shadow Master class', value: 3 });
  }

  // Skill modifiers
  if (captainSkill === 'fortress' && isDefending) {
    modifiers.push({ source: 'Fortress skill (defending)', value: 2 });
  }
  if (captainSkill === 'warden') {
    modifiers.push({ source: 'Warden beasts', value: 2 });
  }

  // Calculate total modifier (capped)
  const totalModifier = Math.min(
    modifiers.reduce((sum, m) => sum + m.value, 0),
    MAX_DEATH_SAVE_MODIFIER
  );

  const finalRoll = roll + totalModifier;
  const survived = finalRoll >= DEATH_SAVE_THRESHOLD;

  return { roll, modifiers, survived };
}

/**
 * Resolve a single combat round
 */
function resolveRound(
  attackerUnits: ArmyUnit[],
  defenderUnits: ArmyUnit[],
  attackerRace: string,
  defenderRace: string,
  defenderHasWall: boolean,
  roundNumber: number
): CombatRound {
  const events: CombatEvent[] = [];

  // Roll dice
  const attackerRoll = rollD20();
  const defenderRoll = rollD20();

  const attackMod = ATTACK_ROLL_MODIFIERS[attackerRoll];
  const defenseMod = DEFENSE_ROLL_MODIFIERS[defenderRoll];

  // Calculate stats
  let attackerAtk = calculateArmyAtk(attackerUnits);
  let defenderDef = calculateArmyDef(defenderUnits);
  let defenderAtk = calculateArmyAtk(defenderUnits);
  let attackerDef = calculateArmyDef(attackerUnits);

  // Apply race bonuses
  // Korrath: Blood Frenzy (+35% ATK - aggressive warriors)
  if (attackerRace === 'korrath') {
    attackerAtk *= 1.35;
    events.push({
      type: 'special_ability',
      description: 'Blood Frenzy: +35% ATK',
    });
  }

  // Ironveld: +10% DEF on walls
  if (defenderRace === 'ironveld' && defenderHasWall) {
    defenderDef *= 1.1;
    events.push({
      type: 'special_ability',
      description: 'Ironveld Wall Bonus: +10% DEF',
    });
  }

  // Vaelthir: Magic damage ignores 50% DEF
  if (attackerRace === 'vaelthir') {
    defenderDef *= 0.75;
    events.push({
      type: 'special_ability',
      description: 'Vaelthir Magic: Ignores 25% DEF',
    });
  }

  // Wall bonus
  if (defenderHasWall) {
    defenderDef *= 1.3;
    events.push({
      type: 'defend',
      description: 'Wall provides +30% DEF',
    });
  }

  // Calculate damage (minimum 1 damage on non-critical-miss to prevent combat stalls)
  const rawAttackerDamage = Math.floor(attackerAtk * attackMod - defenderDef * defenseMod);
  const rawDefenderDamage = Math.floor(defenderAtk * attackMod - attackerDef * defenseMod);

  // Minimum 1 damage unless critical miss (roll 1), to prevent stalemates
  const attackerDamage = attackerRoll === 1 ? Math.max(0, rawAttackerDamage) : Math.max(1, rawAttackerDamage);
  const defenderDamage = defenderRoll === 1 ? Math.max(0, rawDefenderDamage) : Math.max(1, rawDefenderDamage);

  // Critical hit effects
  if (attackerRoll === 20) {
    events.push({
      type: 'critical_hit',
      description: 'Critical Hit! 150% damage',
    });
  }
  if (attackerRoll === 1) {
    events.push({
      type: 'critical_miss',
      description: 'Critical Failure! 50% damage',
    });
  }

  // Apply damage
  const defenderCasualties = applyDamageToArmy(defenderUnits, attackerDamage);
  const attackerCasualties = applyDamageToArmy(attackerUnits, defenderDamage);

  // Ashborn reformation (25% chance to reform)
  if (defenderRace === 'ashborn' && defenderCasualties > 0) {
    const reformed = Math.floor(defenderCasualties * 0.25 * Math.random());
    if (reformed > 0) {
      // Add back some units
      events.push({
        type: 'reformation',
        description: `Ashborn Reformation: ${reformed} units reform`,
        quantity: reformed,
      });
    }
  }

  return {
    roundNumber,
    attackerRoll,
    defenderRoll,
    attackerDamage,
    defenderDamage,
    attackerRemainingHp: calculateArmyHp(attackerUnits),
    defenderRemainingHp: calculateArmyHp(defenderUnits),
    events,
  };
}

/**
 * Initiate combat between two armies
 */
export async function initiateCombat(
  attackerPlayerId: string,
  attackerArmyId: string,
  targetTerritoryId: string
): Promise<string> {
  const generation = await getCurrentGeneration();
  if (!generation) throw new Error('No active generation');

  // Check PvP enabled
  const attacker = await getPlayerById(attackerPlayerId);
  if (!attacker) throw new Error('Attacker not found');

  const attackerArmy = await getArmyById(attackerArmyId);
  if (!attackerArmy) throw new Error('Army not found');
  if (attackerArmy.playerId !== attackerPlayerId) throw new Error('Not your army');

  // Get target territory
  const [territory] = await db
    .select()
    .from(territories)
    .where(eq(territories.id, targetTerritoryId))
    .limit(1);

  if (!territory) throw new Error('Territory not found');

  // Check if attacking Forsaken or player
  if (territory.ownerId) {
    const defender = await getPlayerById(territory.ownerId);
    if (defender) {
      // PvP attack
      if (!isPvPEnabled(generation)) {
        throw new Error('PvP is not enabled yet (planning phase)');
      }

      // Check new player protection
      if (hasNewPlayerProtection(generation, defender.joinedAt)) {
        throw new Error('Target player is under new player protection');
      }

      // Attacker loses protection if they attack
      if (hasNewPlayerProtection(generation, attacker.joinedAt)) {
        await db
          .update(players)
          .set({ protectedUntil: null, updatedAt: new Date() })
          .where(eq(players.id, attackerPlayerId));
      }
    }
  }

  // Schedule combat
  const scheduledAt = new Date(Date.now() + 60 * 1000); // 1 minute delay for now

  // Get defender army
  const defenderArmies = await db
    .select()
    .from(armies)
    .where(eq(armies.territoryId, targetTerritoryId));

  const defenderArmy = defenderArmies[0] || {
    units: [],
    totalStrength: territory.forsakenStrength,
    leadedByCaptain: false,
  };

  const [combat] = await db
    .insert(combats)
    .values({
      generationId: generation.id,
      territoryId: targetTerritoryId,
      attackerId: attackerPlayerId,
      defenderId: territory.ownerId || attackerPlayerId, // Self if Forsaken
      status: 'pending',
      scheduledAt,
      attackerArmy: attackerArmy,
      defenderArmy: defenderArmy,
      rounds: [],
    })
    .returning();

  logger.info(
    {
      combatId: combat.id,
      attackerId: attackerPlayerId,
      targetTerritory: targetTerritoryId,
      scheduledAt,
    },
    'Combat initiated'
  );

  // Notify defender about incoming attack (if PvP, not Forsaken)
  if (territory.ownerId && territory.ownerId !== attackerPlayerId) {
    notifyAttackIncoming({
      defenderId: territory.ownerId,
      targetTerritoryId,
      attackerRace: attacker.race,
      armyStrength: attackerArmy.totalStrength,
      estimatedArrivalMs: 60 * 1000, // 1 minute delay
    });
  }

  return combat.id;
}

/**
 * Resolve a pending combat
 */
export async function resolveCombat(combatId: string): Promise<CombatResult> {
  const [combat] = await db.select().from(combats).where(eq(combats.id, combatId)).limit(1);

  if (!combat) throw new Error('Combat not found');
  if (combat.status !== 'pending' && combat.status !== 'inprogress') {
    throw new Error('Combat already resolved');
  }

  // Update status
  await db
    .update(combats)
    .set({ status: 'inprogress', startedAt: new Date(), updatedAt: new Date() })
    .where(eq(combats.id, combatId));

  // Get players
  const attacker = await getPlayerById(combat.attackerId);
  const defender = combat.attackerId !== combat.defenderId
    ? await getPlayerById(combat.defenderId)
    : null;

  // Clone armies for combat
  const attackerUnits: ArmyUnit[] = JSON.parse(JSON.stringify(
    (combat.attackerArmy as ArmyInfo).units || []
  ));
  const defenderUnits: ArmyUnit[] = JSON.parse(JSON.stringify(
    (combat.defenderArmy as ArmyInfo).units || []
  ));

  // Check for walls
  const defenderBuildings = await getBuildingsInTerritory(combat.territoryId);
  const hasWall = defenderBuildings.some((b) => b.type === 'wall' && !b.isUnderConstruction);

  // Resolve rounds
  const rounds: CombatRound[] = [];
  const maxRounds = 3;

  for (let i = 1; i <= maxRounds; i++) {
    if (getUnitCount(attackerUnits) === 0 || getUnitCount(defenderUnits) === 0) {
      break;
    }

    const round = resolveRound(
      attackerUnits,
      defenderUnits,
      attacker?.race || 'korrath',
      defender?.race || 'korrath',
      hasWall,
      i
    );

    rounds.push(round);
  }

  // Determine winner
  const attackerRemaining = getUnitCount(attackerUnits);
  const defenderRemaining = getUnitCount(defenderUnits);

  let winner: 'attacker' | 'defender' | 'draw';
  if (attackerRemaining > defenderRemaining) {
    winner = 'attacker';
  } else if (defenderRemaining > attackerRemaining) {
    winner = 'defender';
  } else {
    winner = 'draw';
  }

  // Calculate casualties
  const attackerStartCount = getUnitCount((combat.attackerArmy as ArmyInfo).units || []);
  const defenderStartCount = getUnitCount((combat.defenderArmy as ArmyInfo).units || []);
  const attackerCasualties = attackerStartCount - attackerRemaining;
  const defenderCasualties = defenderStartCount - defenderRemaining;

  // Captain death saves
  let attackerCaptainDied = false;
  let defenderCaptainDied = false;

  // Check if captain armies are destroyed
  if ((combat.attackerArmy as ArmyInfo).leadedByCaptain && attackerRemaining === 0 && attacker) {
    const save = performDeathSave(
      combat.attackerId,
      attacker.race,
      attacker.captainClass,
      attacker.captainSkill,
      false
    );
    if (save.survived) {
      await woundCaptain(combat.attackerId);
      rounds[rounds.length - 1].events.push({
        type: 'captain_wounded',
        description: `Attacker captain wounded (rolled ${save.roll}+${save.modifiers.reduce((s, m) => s + m.value, 0)})`,
      });
    } else {
      await killCaptain(combat.attackerId);
      attackerCaptainDied = true;
      rounds[rounds.length - 1].events.push({
        type: 'captain_died',
        description: `Attacker captain died (rolled ${save.roll})`,
      });
    }
  }

  if ((combat.defenderArmy as ArmyInfo).leadedByCaptain && defenderRemaining === 0 && defender) {
    const save = performDeathSave(
      combat.defenderId,
      defender.race,
      defender.captainClass,
      defender.captainSkill,
      true
    );
    if (save.survived) {
      await woundCaptain(combat.defenderId);
      rounds[rounds.length - 1].events.push({
        type: 'captain_wounded',
        description: `Defender captain wounded (rolled ${save.roll}+${save.modifiers.reduce((s, m) => s + m.value, 0)})`,
      });
    } else {
      await killCaptain(combat.defenderId);
      defenderCaptainDied = true;
      rounds[rounds.length - 1].events.push({
        type: 'captain_died',
        description: `Defender captain died (rolled ${save.roll})`,
      });
    }
  }

  // Calculate loot
  let loot = { gold: 0, stone: 0, wood: 0, food: 0 };
  let prisonersCaptured = 0;

  if (winner === 'attacker' && defender) {
    // Base loot
    loot = {
      gold: Math.floor(defender.resources.gold * 0.1),
      stone: Math.floor(defender.resources.stone * 0.1),
      wood: Math.floor(defender.resources.wood * 0.1),
      food: Math.floor(defender.resources.food * 0.1),
    };

    // Korrath bonus (+30% loot)
    if (attacker?.race === 'korrath') {
      loot.gold = Math.floor(loot.gold * 1.3);
      loot.stone = Math.floor(loot.stone * 1.3);
      loot.wood = Math.floor(loot.wood * 1.3);
      loot.food = Math.floor(loot.food * 1.3);
    }

    // Prisoners (base 5%, Korrath 10%)
    const captureRate = attacker?.race === 'korrath' ? 0.1 : 0.05;
    prisonersCaptured = Math.floor(defenderCasualties * captureRate);
  }

  // Territory changes hands
  let territoryChanged = false;
  if (winner === 'attacker') {
    await db
      .update(territories)
      .set({
        ownerId: combat.attackerId,
        ownerSince: new Date(),
        isForsaken: false,
        forsakenStrength: 0,
        updatedAt: new Date(),
      })
      .where(eq(territories.id, combat.territoryId));
    territoryChanged = true;
  }

  // Update combat record
  const result = winner === 'attacker' ? 'attacker_victory' : winner === 'defender' ? 'defender_victory' : 'draw';

  await db
    .update(combats)
    .set({
      status: 'completed',
      result,
      endedAt: new Date(),
      attackerCasualties,
      defenderCasualties,
      attackerCaptainDied,
      defenderCaptainDied,
      lootGold: loot.gold,
      lootStone: loot.stone,
      lootWood: loot.wood,
      lootFood: loot.food,
      prisonersCaptured,
      rounds,
      updatedAt: new Date(),
    })
    .where(eq(combats.id, combatId));

  logger.info(
    {
      combatId,
      winner,
      attackerCasualties,
      defenderCasualties,
      territoryChanged,
    },
    'Combat resolved'
  );

  // Send notifications to both parties
  const winnerId = winner === 'attacker' ? combat.attackerId :
                   winner === 'defender' ? combat.defenderId : null;

  notifyCombatEnded({
    combat: {
      id: combatId,
      attackerId: combat.attackerId,
      defenderId: combat.defenderId,
      territoryId: combat.territoryId,
      status: 'completed',
      result: winner,
    } as any,
    attackerId: combat.attackerId,
    defenderId: combat.defenderId,
    winnerId,
    territoryId: combat.territoryId,
  });

  // Notify about captain status changes
  if (attackerCaptainDied) {
    notifyCaptainDied(combat.attackerId);
  }
  if (defenderCaptainDied && defender) {
    notifyCaptainDied(combat.defenderId);
  }

  return {
    id: combatId,
    winner,
    attackerCasualties,
    defenderCasualties,
    attackerCaptainDied,
    defenderCaptainDied,
    loot,
    prisonersCaptured,
    rounds,
    territoryChanged,
  };
}

/**
 * Get combat by ID
 */
export async function getCombatById(id: string) {
  const [combat] = await db.select().from(combats).where(eq(combats.id, id)).limit(1);
  return combat;
}
