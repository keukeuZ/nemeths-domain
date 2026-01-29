import type { Army } from './units.js';

// ==========================================
// COMBAT TYPES
// ==========================================

export const COMBAT_STATUSES = [
  'pending',    // Scheduled but not started
  'inprogress', // Currently resolving
  'completed',  // Finished
  'cancelled',  // Called off
] as const;
export type CombatStatus = (typeof COMBAT_STATUSES)[number];

export const COMBAT_RESULTS = [
  'attacker_victory',
  'defender_victory',
  'draw',
  'retreat',
] as const;
export type CombatResult = (typeof COMBAT_RESULTS)[number];

export interface Combat {
  id: string;
  generationId: string;
  territoryId: string;

  attackerId: string;
  defenderId: string;

  status: CombatStatus;
  result: CombatResult | null;

  // Timestamps
  scheduledAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;

  // Armies at start (snapshot)
  attackerArmy: Army;
  defenderArmy: Army;

  // Results
  attackerCasualties: number;
  defenderCasualties: number;
  attackerCaptainDied: boolean;
  defenderCaptainDied: boolean;

  // Loot
  lootGold: number;
  lootStone: number;
  lootWood: number;
  lootFood: number;
  prisonersCaptured: number;

  // Combat log (rounds)
  rounds: CombatRound[];
}

export interface CombatRound {
  roundNumber: number;
  attackerRoll: number; // D20
  defenderRoll: number; // D20
  attackerDamage: number;
  defenderDamage: number;
  attackerRemainingHp: number;
  defenderRemainingHp: number;
  events: CombatEvent[];
}

export interface CombatEvent {
  type: CombatEventType;
  description: string;
  unitType?: string;
  quantity?: number;
  damage?: number;
}

export const COMBAT_EVENT_TYPES = [
  'attack',
  'defend',
  'critical_hit',
  'critical_miss',
  'special_ability',
  'morale_break',
  'unit_destroyed',
  'captain_wounded',
  'captain_died',
  'retreat',
  'reformation',
  'curse_applied',
  'spell_cast',
] as const;
export type CombatEventType = (typeof COMBAT_EVENT_TYPES)[number];

// D20 Combat System
export const D20_BASE = {
  criticalHit: 20,
  criticalMiss: 1,
  hitThreshold: 10,
};

// Captain death save
export interface DeathSave {
  roll: number;
  modifiers: DeathSaveModifier[];
  totalModifier: number;
  finalRoll: number;
  survived: boolean;
}

export interface DeathSaveModifier {
  source: string;
  value: number;
}

export const DEATH_SAVE_THRESHOLD = 10; // Need 10+ to survive
export const MAX_DEATH_SAVE_MODIFIER = 5;

// Combat modifiers
export interface CombatModifier {
  source: string;
  type: 'atk' | 'def' | 'spd' | 'damage' | 'evasion';
  value: number; // Percentage modifier
}

// Morale system
export interface MoraleState {
  value: number; // 0-100
  modifiers: MoraleModifier[];
}

export interface MoraleModifier {
  source: string;
  value: number;
  expiresAt?: Date;
}

export const MORALE_EFFECTS = {
  captainDeath: -30,
  majorDefeat: -20,
  minorDefeat: -10,
  draw: -5,
  minorVictory: 5,
  majorVictory: 10,
  captainLeadership: 10,
} as const;
