import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { armies, players } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { rollD20 } from './captain.js';
import { getPlayerById } from './player.js';
import { type Race, type CaptainClass, type CaptainSkill, FOOD_RATES } from '@nemeths/shared';

// ==========================================
// MORALE & PRISONER CAPTURE SYSTEM
// ==========================================

// Base morale values
const BASE_MORALE = 100;
const MAX_MORALE = 150;
const MIN_MORALE = 0;

// Morale modifiers
const MORALE_MODIFIERS = {
  captain_leading: 10, // +10 when captain leads
  captain_dead: -30, // -30 if captain died this generation
  captain_wounded: -20, // -20 if captain wounded
  winning_battle: 15, // +15 for each battle won recently
  losing_battle: -15, // -15 for each battle lost recently
  starving: -25, // -25 if food is 0
  defending_home: 10, // +10 when defending owned territory
  outnumbered: -10, // -10 when heavily outnumbered (2:1 or more)
  outnumbering: 5, // +5 when heavily outnumbering enemy
  forsaken_territory: -10, // -10 for fighting in forsaken territory
  alliance_nearby: 5, // +5 if allied army nearby
};

// Fleeing thresholds
const FLEE_THRESHOLD = 30; // Below 30 morale, army may flee
const FLEE_CHANCE_PER_MORALE_POINT = 0.02; // 2% chance per point below threshold

// Prisoner capture rates
const BASE_CAPTURE_RATE = 0.05; // 5% base capture rate
const KORRATH_CAPTURE_RATE = 0.10; // 10% for Korrath

// Morale recovery
const DAILY_MORALE_RECOVERY = 10; // +10 morale per day when at rest

export interface MoraleState {
  current: number;
  max: number;
  modifiers: { source: string; value: number }[];
  willFlee: boolean;
  fleeChance: number;
}

export interface PrisonerCaptureResult {
  captured: number;
  unitType: string;
  originalRace: Race;
}

/**
 * Calculate army morale
 */
export async function calculateArmyMorale(
  armyId: string,
  context: {
    isDefending?: boolean;
    isOwnTerritory?: boolean;
    enemyStrength?: number;
    ownStrength?: number;
    isForsaken?: boolean;
    hasAllyNearby?: boolean;
  } = {}
): Promise<MoraleState> {
  const [army] = await db.select().from(armies).where(eq(armies.id, armyId)).limit(1);

  if (!army) {
    return {
      current: BASE_MORALE,
      max: MAX_MORALE,
      modifiers: [],
      willFlee: false,
      fleeChance: 0,
    };
  }

  const player = await getPlayerById(army.playerId);
  if (!player) {
    return {
      current: BASE_MORALE,
      max: MAX_MORALE,
      modifiers: [],
      willFlee: false,
      fleeChance: 0,
    };
  }

  let morale = BASE_MORALE;
  const modifiers: { source: string; value: number }[] = [];

  // Captain leading bonus
  if (army.leadedByCaptain && player.captainAlive) {
    morale += MORALE_MODIFIERS.captain_leading;
    modifiers.push({ source: 'Captain leading', value: MORALE_MODIFIERS.captain_leading });
  }

  // Captain dead penalty
  if (!player.captainAlive) {
    morale += MORALE_MODIFIERS.captain_dead;
    modifiers.push({ source: 'Captain dead', value: MORALE_MODIFIERS.captain_dead });
  }

  // Captain wounded penalty
  if (player.captainWoundedUntil && new Date() < player.captainWoundedUntil) {
    morale += MORALE_MODIFIERS.captain_wounded;
    modifiers.push({ source: 'Captain wounded', value: MORALE_MODIFIERS.captain_wounded });
  }

  // Starving penalty
  if (player.resources.food <= 0) {
    morale += MORALE_MODIFIERS.starving;
    modifiers.push({ source: 'Starving', value: MORALE_MODIFIERS.starving });
  }

  // Defending home territory
  if (context.isDefending && context.isOwnTerritory) {
    morale += MORALE_MODIFIERS.defending_home;
    modifiers.push({ source: 'Defending home', value: MORALE_MODIFIERS.defending_home });
  }

  // Outnumbered/outnumbering
  if (context.enemyStrength && context.ownStrength) {
    const ratio = context.enemyStrength / context.ownStrength;
    if (ratio >= 2) {
      morale += MORALE_MODIFIERS.outnumbered;
      modifiers.push({ source: 'Outnumbered', value: MORALE_MODIFIERS.outnumbered });
    } else if (ratio <= 0.5) {
      morale += MORALE_MODIFIERS.outnumbering;
      modifiers.push({ source: 'Outnumbering enemy', value: MORALE_MODIFIERS.outnumbering });
    }
  }

  // Forsaken territory
  if (context.isForsaken) {
    morale += MORALE_MODIFIERS.forsaken_territory;
    modifiers.push({ source: 'Forsaken territory', value: MORALE_MODIFIERS.forsaken_territory });
  }

  // Alliance nearby
  if (context.hasAllyNearby) {
    morale += MORALE_MODIFIERS.alliance_nearby;
    modifiers.push({ source: 'Allied army nearby', value: MORALE_MODIFIERS.alliance_nearby });
  }

  // Race bonuses
  if (player.race === 'korrath') {
    // Korrath War Drums: already know attack is coming, but intimidation effect
    // No direct morale bonus for attacker
  }

  if (player.race === 'ashborn') {
    // Ashborn have higher morale due to being undead (don't fear death)
    morale += 10;
    modifiers.push({ source: 'Ashborn undead', value: 10 });
  }

  // Clamp morale
  morale = Math.max(MIN_MORALE, Math.min(MAX_MORALE, morale));

  // Calculate flee chance
  let fleeChance = 0;
  if (morale < FLEE_THRESHOLD) {
    fleeChance = (FLEE_THRESHOLD - morale) * FLEE_CHANCE_PER_MORALE_POINT;
    fleeChance = Math.min(0.8, fleeChance); // Max 80% flee chance
  }

  // Ashborn never flee (undead)
  if (player.race === 'ashborn') {
    fleeChance = 0;
  }

  // Korrath Blood Frenzy reduces flee chance
  if (player.race === 'korrath') {
    fleeChance *= 0.5; // 50% less likely to flee
  }

  // Roll to see if actually flees
  const willFlee = Math.random() < fleeChance;

  return {
    current: morale,
    max: MAX_MORALE,
    modifiers,
    willFlee,
    fleeChance,
  };
}

/**
 * Apply morale damage after combat round
 */
export function calculateMoraleDamage(
  currentMorale: number,
  casualties: number,
  totalUnits: number,
  wonRound: boolean
): number {
  let moraleDelta = 0;

  // Casualties reduce morale
  const casualtyPercent = casualties / Math.max(1, totalUnits);
  moraleDelta -= Math.floor(casualtyPercent * 50); // Up to -50 for 100% casualties

  // Winning/losing round
  if (wonRound) {
    moraleDelta += 5;
  } else {
    moraleDelta -= 10;
  }

  return Math.max(MIN_MORALE, Math.min(MAX_MORALE, currentMorale + moraleDelta));
}

/**
 * Check if army flees this round
 */
export function checkArmyFlees(morale: number, race: Race): { flees: boolean; deserters: number } {
  // Ashborn never flee
  if (race === 'ashborn') {
    return { flees: false, deserters: 0 };
  }

  if (morale >= FLEE_THRESHOLD) {
    return { flees: false, deserters: 0 };
  }

  const fleeChance = (FLEE_THRESHOLD - morale) * FLEE_CHANCE_PER_MORALE_POINT;

  // Roll D20 for flee check
  const roll = rollD20();
  const fleeThreshold = Math.floor(fleeChance * 20);

  if (roll <= fleeThreshold) {
    // Army flees - calculate deserters
    const desertionPercent = Math.min(0.3, (FLEE_THRESHOLD - morale) * 0.01);
    return { flees: true, deserters: desertionPercent };
  }

  return { flees: false, deserters: 0 };
}

/**
 * Calculate prisoner capture after battle
 */
export async function calculatePrisonerCapture(
  winnerPlayerId: string,
  loserPlayerId: string,
  loserCasualties: Array<{ unitType: string; quantity: number }>
): Promise<PrisonerCaptureResult[]> {
  const winner = await getPlayerById(winnerPlayerId);
  const loser = await getPlayerById(loserPlayerId);

  if (!winner || !loser) {
    return [];
  }

  // Determine capture rate
  let captureRate = BASE_CAPTURE_RATE;
  if (winner.race === 'korrath') {
    captureRate = KORRATH_CAPTURE_RATE;
  }

  // Korrath skill bonus
  if (winner.captainSkill === 'profiteer') {
    captureRate += 0.02; // +2% for Profiteer
  }

  const prisoners: PrisonerCaptureResult[] = [];

  for (const casualty of loserCasualties) {
    // Roll for each unit type
    const captured = Math.floor(casualty.quantity * captureRate);

    if (captured > 0) {
      prisoners.push({
        captured,
        unitType: casualty.unitType,
        originalRace: loser.race,
      });
    }
  }

  logger.info(
    { winnerPlayerId, loserPlayerId, prisoners, captureRate },
    'Prisoners captured'
  );

  return prisoners;
}

/**
 * Add prisoners to army
 */
export async function addPrisonersToArmy(
  armyId: string,
  prisoners: PrisonerCaptureResult[]
): Promise<void> {
  const [army] = await db.select().from(armies).where(eq(armies.id, armyId)).limit(1);

  if (!army) return;

  const units = army.units as Array<{
    unitType: string;
    quantity: number;
    currentHp: number;
    isPrisoner: boolean;
    originalRace?: string;
  }>;

  for (const prisoner of prisoners) {
    // Add as prisoner units
    units.push({
      unitType: prisoner.unitType,
      quantity: prisoner.captured,
      currentHp: 50, // Prisoners at half HP
      isPrisoner: true,
      originalRace: prisoner.originalRace,
    });
  }

  await db
    .update(armies)
    .set({ units, updatedAt: new Date() })
    .where(eq(armies.id, armyId));

  logger.info({ armyId, prisoners }, 'Prisoners added to army');
}

/**
 * Apply War Cry spell effect (morale buff)
 */
export function applyWarCryEffect(currentMorale: number): number {
  return Math.min(MAX_MORALE, currentMorale + 30);
}

/**
 * Apply Mass Panic spell effect (morale debuff)
 */
export function applyMassPanicEffect(currentMorale: number): {
  newMorale: number;
  deserters: number;
} {
  const newMorale = currentMorale - 25;

  // 5-15% desertion
  const desertionRoll = rollD20();
  let deserters: number;
  if (desertionRoll <= 5) deserters = 0.05;
  else if (desertionRoll <= 10) deserters = 0.08;
  else if (desertionRoll <= 15) deserters = 0.1;
  else if (desertionRoll <= 18) deserters = 0.12;
  else deserters = 0.15;

  return { newMorale, deserters };
}

/**
 * Calculate Korrath War Drums effect (enemy morale penalty)
 */
export function applyWarDrumsEffect(
  attackerRace: Race,
  defenderMorale: number
): number {
  if (attackerRace !== 'korrath') {
    return defenderMorale;
  }

  // War Drums: enemies know attack is coming, -15% morale
  return Math.max(MIN_MORALE, defenderMorale - 15);
}

/**
 * Ashborn Curse Spread effect
 * -5% enemy stats for 24h (stacks)
 */
export function applyCurseSpread(
  attackerRace: Race,
  combatCount: number
): number {
  if (attackerRace !== 'ashborn') {
    return 0;
  }

  // Each combat stacks -5%, max -25%
  return Math.min(0.25, combatCount * 0.05);
}

/**
 * Daily morale recovery for resting armies
 */
export async function processMoraleRecovery(armyId: string): Promise<number> {
  // Armies at rest recover morale
  // This would be tracked on the army and processed daily
  return DAILY_MORALE_RECOVERY;
}
