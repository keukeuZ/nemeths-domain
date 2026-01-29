// ==========================================
// GAME CONSTANTS & CORE TYPES
// ==========================================

export const GENERATION_LENGTH_DAYS = 50;
export const MAP_SIZE = 100;
export const TOTAL_PLOTS = MAP_SIZE * MAP_SIZE; // 10,000

// Races
export const RACES = [
  'ironveld',
  'vaelthir',
  'korrath',
  'sylvaeth',
  'ashborn',
  'breathborn',
] as const;
export type Race = (typeof RACES)[number];

// Food consumption rates by race
export const FOOD_RATES: Record<Race, number> = {
  ashborn: 0,
  ironveld: 0.5,
  breathborn: 0.7,
  sylvaeth: 0.8,
  vaelthir: 1.0,
  korrath: 1.0,
};

// Captain Classes
export const CAPTAIN_CLASSES = [
  'warlord',
  'archmage',
  'highpriest',
  'shadowmaster',
  'merchantprince',
  'beastlord',
] as const;
export type CaptainClass = (typeof CAPTAIN_CLASSES)[number];

// Captain Skills (2 per class)
export const CAPTAIN_SKILLS = {
  warlord: ['vanguard', 'fortress'] as const,
  archmage: ['destruction', 'protection'] as const,
  highpriest: ['crusader', 'oracle'] as const,
  shadowmaster: ['assassin', 'saboteur'] as const,
  merchantprince: ['profiteer', 'artificer'] as const,
  beastlord: ['packalpha', 'warden'] as const,
} as const;

export type CaptainSkill =
  | (typeof CAPTAIN_SKILLS.warlord)[number]
  | (typeof CAPTAIN_SKILLS.archmage)[number]
  | (typeof CAPTAIN_SKILLS.highpriest)[number]
  | (typeof CAPTAIN_SKILLS.shadowmaster)[number]
  | (typeof CAPTAIN_SKILLS.merchantprince)[number]
  | (typeof CAPTAIN_SKILLS.beastlord)[number];

// Resource Types
export const RESOURCES = ['gold', 'stone', 'wood', 'food', 'mana'] as const;
export type ResourceType = (typeof RESOURCES)[number];

export interface Resources {
  gold: number;
  stone: number;
  wood: number;
  food: number;
  mana: number;
}

// Map Zones
export const ZONES = ['outer', 'middle', 'inner', 'heart'] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_MULTIPLIERS: Record<Zone, number> = {
  outer: 1.0,
  middle: 1.5,
  inner: 2.0,
  heart: 3.0,
};

// Terrain Types
export const TERRAINS = [
  'plains',
  'forest',
  'mountain',
  'river',
  'ruins',
  'corruption',
] as const;
export type Terrain = (typeof TERRAINS)[number];

// Generation Status
export const GENERATION_STATUSES = [
  'planning', // Day 1-5
  'active', // Day 6-45
  'endgame', // Day 46-50
  'ended',
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export interface Generation {
  id: string;
  number: number;
  startedAt: Date;
  endsAt: Date;
  status: GenerationStatus;
  heartbeatDay: number; // When next heartbeat occurs
  totalPlayers: number;
}
