// ==========================================
// CAPTAIN SYSTEM TYPES
// ==========================================

import type { CaptainClass, CaptainSkill, Race } from './game.js';

// ==========================================
// CAPTAIN SKILL DEFINITIONS
// ==========================================

export interface SkillEffect {
  type: 'combat' | 'economy' | 'intel' | 'building' | 'unit';
  trigger: 'passive' | 'battle_start' | 'battle_round' | 'daily' | 'on_attack' | 'on_defend';
  description: string;
}

export interface CaptainSkillDefinition {
  id: CaptainSkill;
  class: CaptainClass;
  name: string;
  description: string;
  counters: CaptainSkill[];
  counteredBy: CaptainSkill[];
  effects: SkillEffect[];
}

// All captain skill definitions
export const CAPTAIN_SKILL_DEFINITIONS: Record<CaptainSkill, CaptainSkillDefinition> = {
  // Warlord Skills
  vanguard: {
    id: 'vanguard',
    class: 'warlord',
    name: 'Vanguard',
    description: 'First round of combat: +20% ATK. Siege weapons deal +25% damage.',
    counters: ['fortress'],
    counteredBy: ['oracle', 'fortress'],
    effects: [
      { type: 'combat', trigger: 'battle_start', description: '+20% ATK first round' },
      { type: 'combat', trigger: 'passive', description: '+25% siege damage' },
    ],
  },
  fortress: {
    id: 'fortress',
    class: 'warlord',
    name: 'Fortress',
    description: '+25% DEF when defending owned territory. Buildings gain +20% HP.',
    counters: ['vanguard'],
    counteredBy: ['saboteur', 'destruction'],
    effects: [
      { type: 'combat', trigger: 'on_defend', description: '+25% DEF defending' },
      { type: 'building', trigger: 'passive', description: '+20% building HP' },
    ],
  },

  // Archmage Skills
  destruction: {
    id: 'destruction',
    class: 'archmage',
    name: 'Destruction',
    description: 'Damage spells deal +30% damage. Spell criticals cause fire DOT.',
    counters: ['fortress'],
    counteredBy: ['protection', 'oracle'],
    effects: [
      { type: 'combat', trigger: 'passive', description: '+30% spell damage' },
      { type: 'combat', trigger: 'passive', description: 'Spell crits cause fire DOT (50/round, 3 rounds)' },
    ],
  },
  protection: {
    id: 'protection',
    class: 'archmage',
    name: 'Protection',
    description: 'All friendly units gain +15% magic resistance. Can cast Ward on buildings.',
    counters: ['destruction'],
    counteredBy: ['assassin', 'saboteur'],
    effects: [
      { type: 'combat', trigger: 'passive', description: '+15% magic resistance' },
      { type: 'building', trigger: 'passive', description: 'Can cast Ward (building immune to next spell)' },
    ],
  },

  // High Priest Skills
  crusader: {
    id: 'crusader',
    class: 'highpriest',
    name: 'Crusader',
    description: '+20% ATK against Forsaken. Once per battle: one attack cannot miss.',
    counters: [],
    counteredBy: ['packalpha', 'saboteur'],
    effects: [
      { type: 'combat', trigger: 'passive', description: '+20% ATK vs Forsaken' },
      { type: 'combat', trigger: 'battle_round', description: 'Once per battle: guaranteed hit' },
    ],
  },
  oracle: {
    id: 'oracle',
    class: 'highpriest',
    name: 'Oracle',
    description: 'See incoming attacks 2h earlier. Before battle: see probable outcome.',
    counters: ['vanguard', 'assassin'],
    counteredBy: ['saboteur', 'destruction'],
    effects: [
      { type: 'intel', trigger: 'passive', description: 'Incoming attack warning +2h' },
      { type: 'intel', trigger: 'passive', description: 'Battle outcome prediction' },
    ],
  },

  // Shadow Master Skills
  assassin: {
    id: 'assassin',
    class: 'shadowmaster',
    name: 'Assassin',
    description: '15% chance to force enemy captain death save on attack. Marked targets take +25% damage.',
    counters: ['oracle'],
    counteredBy: ['fortress', 'warden'],
    effects: [
      { type: 'combat', trigger: 'on_attack', description: '15% captain assassination attempt' },
      { type: 'combat', trigger: 'passive', description: 'Marked targets: +25% damage from all sources' },
    ],
  },
  saboteur: {
    id: 'saboteur',
    class: 'shadowmaster',
    name: 'Saboteur',
    description: '+50% damage to buildings. Can instantly destroy bridges. Traps deal 5% damage.',
    counters: ['fortress'],
    counteredBy: ['packalpha'],
    effects: [
      { type: 'building', trigger: 'on_attack', description: '+50% building damage' },
      { type: 'building', trigger: 'passive', description: 'Bridge destruction (50 mana, 24h CD)' },
      { type: 'combat', trigger: 'on_defend', description: 'Traps deal 5% invader HP damage' },
    ],
  },

  // Merchant Prince Skills
  profiteer: {
    id: 'profiteer',
    class: 'merchantprince',
    name: 'Profiteer',
    description: '+30% loot from battles. +20% razing rewards. Earn gold equal to 5% damage dealt.',
    counters: [],
    counteredBy: ['saboteur'],
    effects: [
      { type: 'economy', trigger: 'passive', description: '+30% battle loot' },
      { type: 'economy', trigger: 'passive', description: '+20% razing rewards' },
      { type: 'economy', trigger: 'battle_round', description: '+5% damage dealt as gold' },
    ],
  },
  artificer: {
    id: 'artificer',
    class: 'merchantprince',
    name: 'Artificer',
    description: 'Building construction -25% time. Unit training -20% time. Siege weapons +20% damage.',
    counters: ['fortress'],
    counteredBy: ['assassin'],
    effects: [
      { type: 'building', trigger: 'passive', description: '-25% construction time' },
      { type: 'unit', trigger: 'passive', description: '-20% training time' },
      { type: 'combat', trigger: 'passive', description: '+20% siege damage' },
    ],
  },

  // Beastlord Skills
  packalpha: {
    id: 'packalpha',
    class: 'beastlord',
    name: 'Pack Alpha',
    description: 'Summon 20 wolf units daily. +5% ATK per 100 units. Below 50% HP: +25% ATK.',
    counters: ['crusader', 'saboteur'],
    counteredBy: ['destruction'],
    effects: [
      { type: 'unit', trigger: 'daily', description: 'Summon 20 wolves' },
      { type: 'combat', trigger: 'passive', description: '+5% ATK per 100 units' },
      { type: 'combat', trigger: 'battle_round', description: 'Below 50% HP: +25% ATK' },
    ],
  },
  warden: {
    id: 'warden',
    class: 'beastlord',
    name: 'Warden',
    description: 'Unlock War Beast unit. Beast units +15% stats. Beasts protect captain (redirect assassination).',
    counters: ['assassin'],
    counteredBy: ['destruction', 'saboteur'],
    effects: [
      { type: 'unit', trigger: 'passive', description: 'Unlock War Beast' },
      { type: 'combat', trigger: 'passive', description: 'Beast units +15% stats' },
      { type: 'combat', trigger: 'passive', description: 'Beasts redirect assassination attempts' },
    ],
  },
};

// ==========================================
// CLASS DEFINITIONS
// ==========================================

export interface CaptainClassDefinition {
  id: CaptainClass;
  name: string;
  role: string;
  baseAbilities: {
    name: string;
    description: string;
  }[];
  skills: [CaptainSkill, CaptainSkill];
  deathSaveBonus: number;
}

export const CAPTAIN_CLASS_DEFINITIONS: Record<CaptainClass, CaptainClassDefinition> = {
  warlord: {
    id: 'warlord',
    name: 'Warlord',
    role: 'Combat Leader',
    baseAbilities: [
      { name: "Commander's Presence", description: 'Armies led by captain gain +5% ATK/DEF' },
      { name: 'Death Save Bonus', description: '+2 to captain death saves' },
    ],
    skills: ['vanguard', 'fortress'],
    deathSaveBonus: 2,
  },
  archmage: {
    id: 'archmage',
    name: 'Archmage',
    role: 'Magic Specialist',
    baseAbilities: [
      { name: 'Mana Affinity', description: '+25% mana regeneration' },
      { name: 'Arcane Shield', description: 'Once per day, negate one incoming spell' },
    ],
    skills: ['destruction', 'protection'],
    deathSaveBonus: 0,
  },
  highpriest: {
    id: 'highpriest',
    name: 'High Priest',
    role: 'Support/Vision',
    baseAbilities: [
      { name: 'Divine Favor', description: '+10% to all D20 rolls' },
      { name: 'Blessing', description: 'Once per day, remove one debuff from army' },
    ],
    skills: ['crusader', 'oracle'],
    deathSaveBonus: 0,
  },
  shadowmaster: {
    id: 'shadowmaster',
    name: 'Shadow Master',
    role: 'Covert Ops',
    baseAbilities: [
      { name: 'Stealth', description: 'Armies can move undetected until within 3 tiles' },
      { name: 'Escape Artist', description: '+3 to captain death saves' },
    ],
    skills: ['assassin', 'saboteur'],
    deathSaveBonus: 3,
  },
  merchantprince: {
    id: 'merchantprince',
    name: 'Merchant Prince',
    role: 'Economy/Trade',
    baseAbilities: [
      { name: 'Trade Network', description: '+20% gold income' },
      { name: 'Logistics', description: 'Army supply costs -10%' },
    ],
    skills: ['profiteer', 'artificer'],
    deathSaveBonus: 0,
  },
  beastlord: {
    id: 'beastlord',
    name: 'Beastlord',
    role: 'Unit Specialist',
    baseAbilities: [
      { name: 'Animal Companion', description: 'Personal beast grants +5% to one stat' },
      { name: "Nature's Swiftness", description: 'Army movement +10%' },
    ],
    skills: ['packalpha', 'warden'],
    deathSaveBonus: 0,
  },
};

// ==========================================
// DEATH SAVE SYSTEM
// ==========================================

export interface DeathSaveResult {
  roll: number;
  modifiers: { source: string; value: number }[];
  totalModifier: number;
  finalRoll: number;
  survived: boolean;
  isWounded: boolean;
  woundedHours: number;
}

// Death save triggers
export type DeathSaveTrigger = 'army_destroyed' | 'critical_hit' | 'assassination';

// Race death save modifiers
export const RACE_DEATH_SAVE_MODIFIERS: Record<Race, number> = {
  ironveld: 0,
  vaelthir: 0,
  korrath: 0,
  sylvaeth: 0,
  ashborn: 2, // Ashborn +2
  breathborn: 0,
};

// ==========================================
// CAPTAIN STATUS
// ==========================================

export interface CaptainStatus {
  alive: boolean;
  wounded: boolean;
  woundedUntil: Date | null;
  class: CaptainClass;
  skill: CaptainSkill;
  deathSaveBonus: number;
}

// ==========================================
// COMBAT MODIFIERS FROM CAPTAIN
// ==========================================

export interface CaptainCombatModifiers {
  attackBonus: number;
  defenseBonus: number;
  siegeBonus: number;
  magicResistance: number;
  firstRoundAttackBonus: number;
  defendingBonus: number;
  assassinationChance: number;
  lootBonus: number;
  forsakenDamageBonus: number;
}
