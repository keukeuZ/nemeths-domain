import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { players, armies } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import {
  type Race,
  type CaptainClass,
  type CaptainSkill,
  CAPTAIN_CLASS_DEFINITIONS,
  CAPTAIN_SKILL_DEFINITIONS,
  RACE_DEATH_SAVE_MODIFIERS,
  MAX_DEATH_SAVE_MODIFIER,
  type CaptainCombatModifiers,
  type DeathSaveResult,
  type DeathSaveTrigger,
} from '@nemeths/shared';

// ==========================================
// CAPTAIN SERVICE
// ==========================================

/**
 * Roll a weighted D20 for combat/spells
 * Uses crypto for true randomness
 */
export function rollD20(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 20) + 1;
}

/**
 * Get captain class definition
 */
export function getCaptainClass(captainClass: CaptainClass) {
  return CAPTAIN_CLASS_DEFINITIONS[captainClass];
}

/**
 * Get captain skill definition
 */
export function getCaptainSkill(skill: CaptainSkill) {
  return CAPTAIN_SKILL_DEFINITIONS[skill];
}

/**
 * Validate that a skill belongs to a class
 */
export function isValidSkillForClass(captainClass: CaptainClass, skill: CaptainSkill): boolean {
  const classDef = CAPTAIN_CLASS_DEFINITIONS[captainClass];
  return classDef.skills.includes(skill);
}

/**
 * Calculate death save modifiers for a player
 */
export function calculateDeathSaveModifiers(
  race: Race,
  captainClass: CaptainClass,
  skill: CaptainSkill,
  isDefendingInFortress: boolean = false,
  hasWardenBeasts: boolean = false
): { source: string; value: number }[] {
  const modifiers: { source: string; value: number }[] = [];

  // Race modifier (Ashborn +2)
  const raceModifier = RACE_DEATH_SAVE_MODIFIERS[race];
  if (raceModifier > 0) {
    modifiers.push({ source: `${race} race`, value: raceModifier });
  }

  // Class modifier
  const classDef = CAPTAIN_CLASS_DEFINITIONS[captainClass];
  if (classDef.deathSaveBonus > 0) {
    modifiers.push({ source: `${classDef.name} class`, value: classDef.deathSaveBonus });
  }

  // Fortress skill modifier when defending
  if (skill === 'fortress' && isDefendingInFortress) {
    modifiers.push({ source: 'Fortress (defending)', value: 2 });
  }

  // Warden beasts protect captain
  if (skill === 'warden' && hasWardenBeasts) {
    modifiers.push({ source: 'Warden beasts', value: 2 });
  }

  return modifiers;
}

/**
 * Process a death save roll (D20 based)
 * Roll 10+ to survive (before modifiers)
 */
export function processDeathSave(
  race: Race,
  captainClass: CaptainClass,
  skill: CaptainSkill,
  trigger: DeathSaveTrigger,
  context: {
    isDefendingInFortress?: boolean;
    hasWardenBeasts?: boolean;
  } = {}
): DeathSaveResult {
  const roll = rollD20();

  const modifiers = calculateDeathSaveModifiers(
    race,
    captainClass,
    skill,
    context.isDefendingInFortress,
    context.hasWardenBeasts
  );

  // Calculate total modifier (capped at +5)
  let totalModifier = modifiers.reduce((sum, m) => sum + m.value, 0);
  totalModifier = Math.min(totalModifier, MAX_DEATH_SAVE_MODIFIER);

  const finalRoll = roll + totalModifier;

  // Survive on 10+ (after modifiers)
  const survived = finalRoll >= 10;

  // If survived, captain is wounded for 24 hours
  const isWounded = survived;
  const woundedHours = survived ? 24 : 0;

  logger.info(
    {
      roll,
      modifiers,
      totalModifier,
      finalRoll,
      survived,
      trigger,
    },
    'Death save processed'
  );

  return {
    roll,
    modifiers,
    totalModifier,
    finalRoll,
    survived,
    isWounded,
    woundedHours,
  };
}

/**
 * Apply captain death to player
 */
export async function applyCaptainDeath(playerId: string): Promise<void> {
  await db
    .update(players)
    .set({
      captainAlive: false,
      updatedAt: new Date(),
    })
    .where(eq(players.id, playerId));

  logger.info({ playerId }, 'Captain died');
}

/**
 * Apply captain wounded status
 */
export async function applyCaptainWounded(playerId: string, hours: number = 24): Promise<void> {
  const woundedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  await db
    .update(players)
    .set({
      captainWoundedUntil: woundedUntil,
      updatedAt: new Date(),
    })
    .where(eq(players.id, playerId));

  logger.info({ playerId, woundedUntil }, 'Captain wounded');
}

/**
 * Check if captain is currently wounded
 */
export async function isCaptainWounded(playerId: string): Promise<boolean> {
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);

  if (!player) return false;

  if (!player.captainWoundedUntil) return false;

  return new Date() < player.captainWoundedUntil;
}

/**
 * Calculate combat modifiers from captain class and skill
 */
export function calculateCaptainCombatModifiers(
  captainClass: CaptainClass,
  skill: CaptainSkill,
  context: {
    isFirstRound?: boolean;
    isDefending?: boolean;
    isCaptainLeading?: boolean;
    unitCount?: number;
    armyHpPercentage?: number;
    targetIsForsaken?: boolean;
  } = {}
): CaptainCombatModifiers {
  const modifiers: CaptainCombatModifiers = {
    attackBonus: 0,
    defenseBonus: 0,
    siegeBonus: 0,
    magicResistance: 0,
    firstRoundAttackBonus: 0,
    defendingBonus: 0,
    assassinationChance: 0,
    lootBonus: 0,
    forsakenDamageBonus: 0,
  };

  // Base class bonuses
  const classDef = CAPTAIN_CLASS_DEFINITIONS[captainClass];

  // Warlord: Commander's Presence (+5% ATK/DEF when captain leads)
  if (captainClass === 'warlord' && context.isCaptainLeading) {
    modifiers.attackBonus += 0.05;
    modifiers.defenseBonus += 0.05;
  }

  // Merchant Prince: Logistics (-10% supply costs handled elsewhere)
  if (captainClass === 'merchantprince') {
    // Trade Network (+20% gold handled in resources)
  }

  // Beastlord: Nature's Swiftness (+10% movement handled in army)
  if (captainClass === 'beastlord') {
    // Animal Companion (+5% to one stat - handled at creation)
  }

  // Skill-specific bonuses
  switch (skill) {
    case 'vanguard':
      modifiers.siegeBonus += 0.25; // +25% siege damage
      if (context.isFirstRound) {
        modifiers.firstRoundAttackBonus += 0.2; // +20% ATK first round
      }
      break;

    case 'fortress':
      if (context.isDefending) {
        modifiers.defendingBonus += 0.25; // +25% DEF when defending
      }
      // Building +20% HP handled in building service
      break;

    case 'destruction':
      // +30% spell damage handled in spell service
      break;

    case 'protection':
      modifiers.magicResistance += 0.15; // +15% magic resistance
      break;

    case 'crusader':
      if (context.targetIsForsaken) {
        modifiers.forsakenDamageBonus += 0.2; // +20% ATK vs Forsaken
      }
      break;

    case 'oracle':
      // Intel bonuses handled in visibility service
      break;

    case 'assassin':
      modifiers.assassinationChance = 0.15; // 15% assassination chance
      // Marked targets +25% damage handled separately
      break;

    case 'saboteur':
      // +50% building damage handled in combat
      // Bridge destruction handled in territory service
      break;

    case 'profiteer':
      modifiers.lootBonus += 0.3; // +30% battle loot
      // +20% razing rewards handled in building destruction
      break;

    case 'artificer':
      modifiers.siegeBonus += 0.2; // +20% siege damage
      // Construction/training time reductions handled elsewhere
      break;

    case 'packalpha':
      // +5% ATK per 100 units
      if (context.unitCount) {
        modifiers.attackBonus += Math.floor(context.unitCount / 100) * 0.05;
      }
      // Below 50% HP: +25% ATK
      if (context.armyHpPercentage && context.armyHpPercentage < 0.5) {
        modifiers.attackBonus += 0.25;
      }
      break;

    case 'warden':
      // Beast units +15% stats handled in unit calculations
      // Assassination redirection handled in death save
      break;
  }

  return modifiers;
}

/**
 * Check if skill counters another skill
 */
export function doesSkillCounter(attackerSkill: CaptainSkill, defenderSkill: CaptainSkill): boolean {
  const attackerDef = CAPTAIN_SKILL_DEFINITIONS[attackerSkill];
  return attackerDef.counters.includes(defenderSkill);
}

/**
 * Calculate skill counter bonus/penalty
 */
export function calculateCounterModifier(
  attackerSkill: CaptainSkill,
  defenderSkill: CaptainSkill
): { attackerBonus: number; defenderPenalty: number } {
  if (doesSkillCounter(attackerSkill, defenderSkill)) {
    return { attackerBonus: 0.1, defenderPenalty: 0.05 }; // +10% attacker, -5% defender
  }
  if (doesSkillCounter(defenderSkill, attackerSkill)) {
    return { attackerBonus: -0.05, defenderPenalty: -0.1 }; // Reverse if defender counters attacker
  }
  return { attackerBonus: 0, defenderPenalty: 0 };
}

/**
 * Process Pack Alpha daily wolf summon
 */
export async function processPackAlphaSummon(playerId: string): Promise<number> {
  const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);

  if (!player || player.captainSkill !== 'packalpha') {
    return 0;
  }

  // Find player's main army or first army
  const playerArmies = await db.select().from(armies).where(eq(armies.playerId, playerId)).limit(1);

  if (playerArmies.length === 0) {
    return 0;
  }

  const army = playerArmies[0];
  const units = army.units as Array<{
    unitType: string;
    quantity: number;
    currentHp: number;
    isPrisoner: boolean;
    originalRace?: string;
  }>;

  // Add 20 wolves
  const wolfStack = units.find((u) => u.unitType === 'wolf');
  if (wolfStack) {
    wolfStack.quantity += 20;
  } else {
    units.push({
      unitType: 'wolf',
      quantity: 20,
      currentHp: 50, // Wolves have 50 HP
      isPrisoner: false,
    });
  }

  await db
    .update(armies)
    .set({
      units,
      updatedAt: new Date(),
    })
    .where(eq(armies.id, army.id));

  logger.info({ playerId, armyId: army.id }, 'Pack Alpha summoned 20 wolves');

  return 20;
}

/**
 * Get Artificer time reduction multiplier
 */
export function getArtificerTimeMultiplier(skill: CaptainSkill, type: 'building' | 'training'): number {
  if (skill !== 'artificer') return 1.0;

  return type === 'building' ? 0.75 : 0.8; // -25% construction, -20% training
}

/**
 * Get Merchant Prince supply cost reduction
 */
export function getMerchantPrinceSupplyReduction(captainClass: CaptainClass): number {
  if (captainClass !== 'merchantprince') return 1.0;

  return 0.9; // -10% supply costs
}

/**
 * Check if assassination attempt triggers (Assassin skill)
 */
export function checkAssassinationTrigger(attackerSkill: CaptainSkill): boolean {
  if (attackerSkill !== 'assassin') return false;

  // 15% chance
  const roll = Math.random();
  return roll < 0.15;
}

/**
 * Check if Warden beasts redirect assassination
 */
export function checkWardenProtection(defenderSkill: CaptainSkill, hasBeastUnits: boolean): boolean {
  if (defenderSkill !== 'warden' || !hasBeastUnits) return false;

  // Beasts always protect if present
  return true;
}

/**
 * Calculate High Priest D20 roll bonus
 */
export function getHighPriestRollBonus(captainClass: CaptainClass): number {
  if (captainClass !== 'highpriest') return 0;

  // Divine Favor: +10% to all D20 rolls (implemented as +2 to roll)
  return 2;
}

/**
 * Check if Crusader guaranteed hit is available
 */
export async function checkCrusaderGuaranteedHit(
  playerId: string,
  combatId: string
): Promise<boolean> {
  // This would need a tracking table for per-battle abilities
  // For now, return true (available) - should implement proper tracking
  return true;
}
