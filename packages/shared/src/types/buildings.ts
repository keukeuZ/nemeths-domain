import type { Race, Resources } from './game.js';

// ==========================================
// BUILDING TYPES
// ==========================================

export const BUILDING_CATEGORIES = [
  'resource',
  'military',
  'defense',
  'magic',
  'utility',
] as const;
export type BuildingCategory = (typeof BUILDING_CATEGORIES)[number];

export const BUILDING_TYPES = [
  // Resource (4)
  'farm',
  'mine',
  'lumbermill',
  'market',
  // Military (4)
  'barracks',
  'warhall',
  'siegeworkshop',
  'armory',
  // Defense (3)
  'wall',
  'watchtower',
  'gate',
  // Magic (2)
  'magetower',
  'shrine',
  // Utility (1)
  'warehouse',
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export interface BuildingDefinition {
  type: BuildingType;
  category: BuildingCategory;
  cost: Partial<Resources>;
  buildTimeHours: number;
  effect: string;
  maxPerTerritory: number;
  requires?: BuildingType;
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  // Resource Buildings
  farm: {
    type: 'farm',
    category: 'resource',
    cost: { gold: 100, wood: 50 },
    buildTimeHours: 4,
    effect: '+50 food/day',
    maxPerTerritory: 2,
  },
  mine: {
    type: 'mine',
    category: 'resource',
    cost: { gold: 150, stone: 75 },
    buildTimeHours: 6,
    effect: '+40 gold/day',
    maxPerTerritory: 2,
  },
  lumbermill: {
    type: 'lumbermill',
    category: 'resource',
    cost: { gold: 150, wood: 75 },
    buildTimeHours: 6,
    effect: '+40 wood/day',
    maxPerTerritory: 2,
  },
  market: {
    type: 'market',
    category: 'resource',
    cost: { gold: 300, stone: 100 },
    buildTimeHours: 8,
    effect: '+100 gold/day, enables trading',
    maxPerTerritory: 1,
    requires: 'mine',
  },

  // Military Buildings
  barracks: {
    type: 'barracks',
    category: 'military',
    cost: { gold: 200, wood: 100 },
    buildTimeHours: 6,
    effect: 'Train Defender and Attacker units',
    maxPerTerritory: 1,
  },
  warhall: {
    type: 'warhall',
    category: 'military',
    cost: { gold: 400, stone: 200 },
    buildTimeHours: 10,
    effect: 'Train Elite units, +10% ATK to garrison',
    maxPerTerritory: 1,
    requires: 'barracks',
  },
  siegeworkshop: {
    type: 'siegeworkshop',
    category: 'military',
    cost: { gold: 500, wood: 300 },
    buildTimeHours: 12,
    effect: 'Train siege weapons',
    maxPerTerritory: 1,
    requires: 'barracks',
  },
  armory: {
    type: 'armory',
    category: 'military',
    cost: { gold: 350, stone: 150 },
    buildTimeHours: 8,
    effect: '+15% ATK/DEF to all trained troops',
    maxPerTerritory: 1,
    requires: 'barracks',
  },

  // Defense Buildings
  wall: {
    type: 'wall',
    category: 'defense',
    cost: { gold: 400, stone: 500 },
    buildTimeHours: 12,
    effect: '+30% DEF, requires siege to breach',
    maxPerTerritory: 1,
  },
  watchtower: {
    type: 'watchtower',
    category: 'defense',
    cost: { gold: 150, wood: 100 },
    buildTimeHours: 4,
    effect: 'See incoming attacks 2h earlier',
    maxPerTerritory: 2,
  },
  gate: {
    type: 'gate',
    category: 'defense',
    cost: { gold: 250, stone: 200 },
    buildTimeHours: 6,
    effect: 'Control ally passage, +10% DEF',
    maxPerTerritory: 1,
    requires: 'wall',
  },

  // Magic Buildings
  magetower: {
    type: 'magetower',
    category: 'magic',
    cost: { gold: 400, stone: 200 },
    buildTimeHours: 10,
    effect: '+20 mana/day, enables spellcasting',
    maxPerTerritory: 1,
  },
  shrine: {
    type: 'shrine',
    category: 'magic',
    cost: { gold: 200, stone: 150 },
    buildTimeHours: 6,
    effect: '+10 mana/day, +10% spell effectiveness',
    maxPerTerritory: 1,
    requires: 'magetower',
  },

  // Utility Buildings
  warehouse: {
    type: 'warehouse',
    category: 'utility',
    cost: { gold: 250, wood: 150 },
    buildTimeHours: 6,
    effect: '+2000 resource storage, protect 30% from raids',
    maxPerTerritory: 1,
    requires: 'mine',
  },
};

// Building instance in a territory
export interface Building {
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

// Race building modifiers
export interface RaceBuildingModifier {
  race: Race;
  bonuses: Partial<Record<BuildingType, string>>;
  penalties: string[];
  restrictions: BuildingType[];
}

export const RACE_BUILDING_MODIFIERS: RaceBuildingModifier[] = [
  {
    race: 'ironveld',
    bonuses: { wall: '+25% HP', mine: '+15% output' },
    penalties: [],
    restrictions: [],
  },
  {
    race: 'vaelthir',
    bonuses: { magetower: '+30% mana' },
    penalties: ['All buildings cost +15%'],
    restrictions: [],
  },
  {
    race: 'korrath',
    bonuses: { armory: '+20% stronger bonuses' },
    penalties: [],
    restrictions: [],
  },
  {
    race: 'sylvaeth',
    bonuses: { watchtower: 'Intel always accurate' },
    penalties: [],
    restrictions: ['siegeworkshop'],
  },
  {
    race: 'ashborn',
    bonuses: {},
    penalties: ['Farm -20% output'],
    restrictions: [],
  },
  {
    race: 'breathborn',
    bonuses: {},
    penalties: ['All buildings decay 1% HP/day'],
    restrictions: [],
  },
];

export const MAX_BUILDINGS_PER_TERRITORY = 6;
export const MAX_CONCURRENT_BUILDS = 2;
