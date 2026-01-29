import type { Race } from './game.js';

// ==========================================
// UNIT TYPES
// ==========================================

// Unit roles
export const UNIT_ROLES = ['defender', 'attacker', 'elite', 'siege'] as const;
export type UnitRole = (typeof UNIT_ROLES)[number];

// All unit types
export const UNIT_TYPES = [
  // Ironveld
  'stoneshield',
  'hammerer',
  'siegeanvil',
  // Vaelthir
  'bloodwarden',
  'crimsonblade',
  'magister',
  // Korrath
  'warshield',
  'rageborn',
  'warchief',
  // Sylvaeth
  'veilguard',
  'fadestriker',
  'dreamweaver',
  // Ashborn
  'cinderguard',
  'ashstriker',
  'pyreknight',
  // Breath-Born
  'galeguard',
  'zephyr',
  'stormherald',
  // Siege (universal)
  'batteringram',
  'catapult',
  'trebuchet',
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

// Unit stats definition
export interface UnitStats {
  atk: number;
  def: number;
  spd: number;
  hp: number;
  cost: number;
  manaCost?: number;
  food: number;
  trainTime: number; // hours
  role: UnitRole;
  race: Race | 'universal';
  special: string;
}

// Complete unit definitions
export const UNIT_DEFINITIONS: Record<UnitType, UnitStats> = {
  // Ironveld (50% food)
  stoneshield: {
    atk: 8, def: 25, spd: 1, hp: 60, cost: 30, food: 1, trainTime: 1,
    role: 'defender', race: 'ironveld',
    special: 'Cannot be knocked back. +10% DEF on walls.',
  },
  hammerer: {
    atk: 20, def: 12, spd: 1, hp: 45, cost: 45, food: 1, trainTime: 1.5,
    role: 'attacker', race: 'ironveld',
    special: '+25% damage vs buildings.',
  },
  siegeanvil: {
    atk: 15, def: 35, spd: 0.5, hp: 100, cost: 100, food: 2, trainTime: 3,
    role: 'elite', race: 'ironveld',
    special: 'Immune to morale. -30% siege effectiveness vs your walls.',
  },

  // Vaelthir (100% food)
  bloodwarden: {
    atk: 10, def: 18, spd: 2, hp: 35, cost: 40, food: 1, trainTime: 1,
    role: 'defender', race: 'vaelthir',
    special: 'Absorbs 20% damage for adjacent units. Heals 5% on enemy death.',
  },
  crimsonblade: {
    atk: 28, def: 6, spd: 2, hp: 25, cost: 50, food: 1, trainTime: 1.5,
    role: 'attacker', race: 'vaelthir',
    special: 'Magic damage (ignores 50% DEF). Sacrifice 10% HP for +20% ATK.',
  },
  magister: {
    atk: 40, def: 5, spd: 2, hp: 30, cost: 120, manaCost: 50, food: 2, trainTime: 3,
    role: 'elite', race: 'vaelthir',
    special: 'AOE attack. Spell criticals do 2.5x damage.',
  },

  // Korrath (100% food)
  warshield: {
    atk: 12, def: 15, spd: 2, hp: 40, cost: 25, food: 1, trainTime: 1,
    role: 'defender', race: 'korrath',
    special: '+15% DEF when outnumbered. Gains Blood Frenzy.',
  },
  rageborn: {
    atk: 25, def: 5, spd: 3, hp: 35, cost: 35, food: 2, trainTime: 1.5,
    role: 'attacker', race: 'korrath',
    special: '+10% ATK per Rageborn death. First strike.',
  },
  warchief: {
    atk: 35, def: 20, spd: 3, hp: 70, cost: 90, food: 3, trainTime: 3,
    role: 'elite', race: 'korrath',
    special: '+10% ATK to all Korrath. Immune to morale penalties.',
  },

  // Sylvaeth (80% food)
  veilguard: {
    atk: 8, def: 20, spd: 2, hp: 35, cost: 35, food: 1, trainTime: 1,
    role: 'defender', race: 'sylvaeth',
    special: '15% evasion. Counter-attacks deal +25% damage.',
  },
  fadestriker: {
    atk: 22, def: 8, spd: 4, hp: 30, cost: 45, food: 1, trainTime: 1.5,
    role: 'attacker', race: 'sylvaeth',
    special: 'Stealth until 2 tiles. +30% ATK from ambush.',
  },
  dreamweaver: {
    atk: 15, def: 15, spd: 3, hp: 40, cost: 80, manaCost: 30, food: 1, trainTime: 3,
    role: 'elite', race: 'sylvaeth',
    special: 'Army appears 50% larger. Intel always accurate.',
  },

  // Ashborn (0% food)
  cinderguard: {
    atk: 12, def: 18, spd: 2, hp: 45, cost: 35, food: 0, trainTime: 1,
    role: 'defender', race: 'ashborn',
    special: '25% reform after death. Immune to poison/disease.',
  },
  ashstriker: {
    atk: 22, def: 10, spd: 2, hp: 35, cost: 40, food: 0, trainTime: 1.5,
    role: 'attacker', race: 'ashborn',
    special: 'Curse on hit (-5% stats for 24h, stacks). Cannot heal.',
  },
  pyreknight: {
    atk: 30, def: 15, spd: 2, hp: 50, cost: 85, food: 0, trainTime: 3,
    role: 'elite', race: 'ashborn',
    special: 'Explodes on death (2% AOE). 5% killed rise as prisoners.',
  },

  // Breath-Born (70% food)
  galeguard: {
    atk: 10, def: 16, spd: 3, hp: 30, cost: 30, food: 1, trainTime: 1,
    role: 'defender', race: 'breathborn',
    special: '20% evasion. Slows attackers by 15%.',
  },
  zephyr: {
    atk: 18, def: 8, spd: 5, hp: 25, cost: 40, food: 1, trainTime: 1.5,
    role: 'attacker', race: 'breathborn',
    special: 'Fastest unit. Can retreat round 1. +20% ATK when flanking.',
  },
  stormherald: {
    atk: 25, def: 18, spd: 4, hp: 45, cost: 95, food: 2, trainTime: 3,
    role: 'elite', race: 'breathborn',
    special: 'AOE slow (-25% SPD). Delays reinforcements 1h.',
  },

  // Siege (universal, no food)
  batteringram: {
    atk: 5, def: 25, spd: 1, hp: 80, cost: 100, food: 0, trainTime: 4,
    role: 'siege', race: 'universal',
    special: '+400% vs gates/walls.',
  },
  catapult: {
    atk: 10, def: 10, spd: 1, hp: 50, cost: 200, food: 0, trainTime: 4,
    role: 'siege', race: 'universal',
    special: '+250% vs buildings.',
  },
  trebuchet: {
    atk: 15, def: 5, spd: 0.5, hp: 40, cost: 400, food: 0, trainTime: 4,
    role: 'siege', race: 'universal',
    special: '+400% vs buildings, range 2 tiles.',
  },
};

// Army composition
export interface ArmyUnit {
  unitType: UnitType;
  quantity: number;
  currentHp: number; // Total HP for this unit stack
  isPrisoner: boolean;
  originalRace?: Race; // For prisoners
}

export interface Army {
  id: string;
  playerId: string;
  territoryId: string;
  units: ArmyUnit[];
  totalStrength: number; // Calculated combat power
  totalFoodConsumption: number;
  isGarrison: boolean;
  leadedByCaptain: boolean;
}

// Get units available for a race
export function getUnitsForRace(race: Race): UnitType[] {
  return (Object.entries(UNIT_DEFINITIONS) as [UnitType, UnitStats][])
    .filter(([_, stats]) => stats.race === race || stats.race === 'universal')
    .map(([type]) => type);
}
