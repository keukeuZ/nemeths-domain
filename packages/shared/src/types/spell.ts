// ==========================================
// SPELL SYSTEM TYPES
// ==========================================

import type { Race } from './game.js';

// ==========================================
// SPELL SCHOOLS
// ==========================================

export const SPELL_SCHOOLS = [
  'destruction',
  'protection',
  'divination',
  'manipulation',
  'necromancy',
  'enhancement',
] as const;
export type SpellSchool = (typeof SPELL_SCHOOLS)[number];

// ==========================================
// SPELL TARGETS
// ==========================================

export const SPELL_TARGETS = [
  'single_unit',
  'army',
  'territory',
  'building',
  'player',
  'self',
] as const;
export type SpellTarget = (typeof SPELL_TARGETS)[number];

// ==========================================
// SPELL DEFINITIONS
// ==========================================

export interface SpellDefinition {
  id: string;
  name: string;
  school: SpellSchool;
  manaCost: number;
  cooldownHours: number;
  target: SpellTarget;
  description: string;
  baseDamage?: { min: number; max: number };
  buffPercentage?: number;
  debuffPercentage?: number;
  durationHours?: number;
  raceRestriction?: Race;
}

// School of Destruction spells
export const DESTRUCTION_SPELLS: SpellDefinition[] = [
  {
    id: 'firebolt',
    name: 'Firebolt',
    school: 'destruction',
    manaCost: 10,
    cooldownHours: 0,
    target: 'single_unit',
    description: '50-150 damage to single unit or structure',
    baseDamage: { min: 50, max: 150 },
  },
  {
    id: 'lightning_strike',
    name: 'Lightning Strike',
    school: 'destruction',
    manaCost: 25,
    cooldownHours: 4,
    target: 'army',
    description: '200-600 damage, hits 3 random units',
    baseDamage: { min: 200, max: 600 },
  },
  {
    id: 'fireball',
    name: 'Fireball',
    school: 'destruction',
    manaCost: 40,
    cooldownHours: 8,
    target: 'army',
    description: '300-900 AOE damage',
    baseDamage: { min: 300, max: 900 },
  },
  {
    id: 'meteor_storm',
    name: 'Meteor Storm',
    school: 'destruction',
    manaCost: 100,
    cooldownHours: 24,
    target: 'territory',
    description: '1000-3000 damage to all enemies',
    baseDamage: { min: 1000, max: 3000 },
  },
  {
    id: 'titans_wrath',
    name: "Titan's Wrath",
    school: 'destruction',
    manaCost: 200,
    cooldownHours: 72,
    target: 'territory',
    description: '2000-6000 damage + building damage',
    baseDamage: { min: 2000, max: 6000 },
  },
];

// School of Protection spells
export const PROTECTION_SPELLS: SpellDefinition[] = [
  {
    id: 'shield',
    name: 'Shield',
    school: 'protection',
    manaCost: 15,
    cooldownHours: 0,
    target: 'army',
    description: '+20% DEF for 1 battle',
    buffPercentage: 20,
    durationHours: 0, // Until battle ends
  },
  {
    id: 'stone_skin',
    name: 'Stone Skin',
    school: 'protection',
    manaCost: 30,
    cooldownHours: 6,
    target: 'army',
    description: '+40% DEF, -20% SPD for 12h',
    buffPercentage: 40,
    debuffPercentage: 20,
    durationHours: 12,
  },
  {
    id: 'ward',
    name: 'Ward',
    school: 'protection',
    manaCost: 25,
    cooldownHours: 4,
    target: 'building',
    description: 'Building immune to next spell',
    durationHours: 24,
  },
  {
    id: 'fortress_of_will',
    name: 'Fortress of Will',
    school: 'protection',
    manaCost: 60,
    cooldownHours: 12,
    target: 'territory',
    description: 'All structures +500 DEF for 24h',
    durationHours: 24,
  },
  {
    id: 'titans_aegis',
    name: "Titan's Aegis",
    school: 'protection',
    manaCost: 150,
    cooldownHours: 48,
    target: 'territory',
    description: 'Territory immune to magic for 24h',
    durationHours: 24,
  },
];

// School of Divination spells
export const DIVINATION_SPELLS: SpellDefinition[] = [
  {
    id: 'scry',
    name: 'Scry',
    school: 'divination',
    manaCost: 10,
    cooldownHours: 0,
    target: 'territory',
    description: 'Reveal army size (+-20% accuracy)',
  },
  {
    id: 'true_sight',
    name: 'True Sight',
    school: 'divination',
    manaCost: 25,
    cooldownHours: 4,
    target: 'territory',
    description: 'Exact army composition revealed',
  },
  {
    id: 'foresight',
    name: 'Foresight',
    school: 'divination',
    manaCost: 40,
    cooldownHours: 8,
    target: 'self',
    description: 'Know incoming attacks 2h earlier',
    durationHours: 24,
  },
  {
    id: 'dream_walk',
    name: 'Dream Walk',
    school: 'divination',
    manaCost: 60,
    cooldownHours: 12,
    target: 'player',
    description: "See all target's territories for 1h",
    durationHours: 1,
  },
  {
    id: 'titans_eye',
    name: "Titan's Eye",
    school: 'divination',
    manaCost: 120,
    cooldownHours: 48,
    target: 'territory',
    description: 'Reveal 10 random enemy armies',
  },
];

// School of Manipulation spells
export const MANIPULATION_SPELLS: SpellDefinition[] = [
  {
    id: 'slow',
    name: 'Slow',
    school: 'manipulation',
    manaCost: 15,
    cooldownHours: 0,
    target: 'army',
    description: '-30% SPD for 6h',
    debuffPercentage: 30,
    durationHours: 6,
  },
  {
    id: 'confusion',
    name: 'Confusion',
    school: 'manipulation',
    manaCost: 30,
    cooldownHours: 6,
    target: 'army',
    description: '10-30% chance attack wrong target',
    durationHours: 12,
  },
  {
    id: 'windshear',
    name: 'Windshear',
    school: 'manipulation',
    manaCost: 35,
    cooldownHours: 4,
    target: 'army',
    description: 'Delay arrival 1-4h',
    raceRestriction: 'breathborn',
  },
  {
    id: 'mass_panic',
    name: 'Mass Panic',
    school: 'manipulation',
    manaCost: 50,
    cooldownHours: 12,
    target: 'army',
    description: '-25% morale, 5-15% desert',
    debuffPercentage: 25,
  },
  {
    id: 'titans_whisper',
    name: "Titan's Whisper",
    school: 'manipulation',
    manaCost: 100,
    cooldownHours: 24,
    target: 'player',
    description: 'All their armies -20% ATK for 24h',
    debuffPercentage: 20,
    durationHours: 24,
  },
];

// School of Necromancy spells
export const NECROMANCY_SPELLS: SpellDefinition[] = [
  {
    id: 'drain_life',
    name: 'Drain Life',
    school: 'necromancy',
    manaCost: 20,
    cooldownHours: 2,
    target: 'army',
    description: 'Deal 100-300 damage, heal your units half',
    baseDamage: { min: 100, max: 300 },
  },
  {
    id: 'raise_dead',
    name: 'Raise Dead',
    school: 'necromancy',
    manaCost: 35,
    cooldownHours: 8,
    target: 'territory',
    description: 'Resurrect 5-15% of recent dead',
  },
  {
    id: 'curse',
    name: 'Curse',
    school: 'necromancy',
    manaCost: 25,
    cooldownHours: 4,
    target: 'army',
    description: '-15% to all stats for 24h',
    debuffPercentage: 15,
    durationHours: 24,
  },
  {
    id: 'plague',
    name: 'Plague',
    school: 'necromancy',
    manaCost: 60,
    cooldownHours: 12,
    target: 'territory',
    description: '1-3% army dies per day for 3 days',
    durationHours: 72,
  },
  {
    id: 'titans_grasp',
    name: "Titan's Grasp",
    school: 'necromancy',
    manaCost: 150,
    cooldownHours: 72,
    target: 'army',
    description: '20-40% instant death, no reformation',
  },
];

// School of Enhancement spells
export const ENHANCEMENT_SPELLS: SpellDefinition[] = [
  {
    id: 'haste',
    name: 'Haste',
    school: 'enhancement',
    manaCost: 20,
    cooldownHours: 2,
    target: 'army',
    description: '+30% SPD for 12h',
    buffPercentage: 30,
    durationHours: 12,
  },
  {
    id: 'strength',
    name: 'Strength',
    school: 'enhancement',
    manaCost: 25,
    cooldownHours: 4,
    target: 'army',
    description: '+20% ATK for 1 battle',
    buffPercentage: 20,
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    school: 'enhancement',
    manaCost: 40,
    cooldownHours: 8,
    target: 'army',
    description: '+40% ATK, -20% DEF for 1 battle',
    buffPercentage: 40,
    debuffPercentage: 20,
  },
  {
    id: 'war_cry',
    name: 'War Cry',
    school: 'enhancement',
    manaCost: 35,
    cooldownHours: 6,
    target: 'army',
    description: '+30% morale, immune to fear',
    buffPercentage: 30,
  },
  {
    id: 'titans_blessing',
    name: "Titan's Blessing",
    school: 'enhancement',
    manaCost: 100,
    cooldownHours: 24,
    target: 'army',
    description: '+25% all stats for 24h',
    buffPercentage: 25,
    durationHours: 24,
  },
];

// Race-specific spells
export const RACE_SPELLS: SpellDefinition[] = [
  // Ironveld - Earth Magic
  {
    id: 'stone_wall',
    name: 'Stone Wall',
    school: 'protection',
    manaCost: 30,
    cooldownHours: 8,
    target: 'territory',
    description: 'Create temporary wall (500 HP, 24h)',
    raceRestriction: 'ironveld',
    durationHours: 24,
  },
  {
    id: 'earthquake',
    name: 'Earthquake',
    school: 'destruction',
    manaCost: 80,
    cooldownHours: 24,
    target: 'territory',
    description: 'All enemies knocked down, -50% DEF round 1',
    raceRestriction: 'ironveld',
    debuffPercentage: 50,
  },
  {
    id: 'crystal_prison',
    name: 'Crystal Prison',
    school: 'manipulation',
    manaCost: 50,
    cooldownHours: 12,
    target: 'single_unit',
    description: 'Trap single unit for 12h',
    raceRestriction: 'ironveld',
    durationHours: 12,
  },

  // Vaelthir - Blood Magic
  {
    id: 'crimson_bolt',
    name: 'Crimson Bolt',
    school: 'destruction',
    manaCost: 15,
    cooldownHours: 0,
    target: 'army',
    description: '100-300 damage, heal caster 25% of damage',
    raceRestriction: 'vaelthir',
    baseDamage: { min: 100, max: 300 },
  },
  {
    id: 'blood_pact',
    name: 'Blood Pact',
    school: 'necromancy',
    manaCost: 40,
    cooldownHours: 8,
    target: 'army',
    description: 'Link two armies - damage shared',
    raceRestriction: 'vaelthir',
    durationHours: 24,
  },
  {
    id: 'exsanguinate',
    name: 'Exsanguinate',
    school: 'necromancy',
    manaCost: 100,
    cooldownHours: 24,
    target: 'army',
    description: 'Target loses 30% HP, Vaelthir gains as temp units',
    raceRestriction: 'vaelthir',
  },

  // Korrath - War Magic
  {
    id: 'battle_rage',
    name: 'Battle Rage',
    school: 'enhancement',
    manaCost: 25,
    cooldownHours: 4,
    target: 'army',
    description: '+50% ATK, army attacks nearest enemy automatically',
    raceRestriction: 'korrath',
    buffPercentage: 50,
  },
  {
    id: 'war_drums',
    name: 'War Drums',
    school: 'manipulation',
    manaCost: 20,
    cooldownHours: 6,
    target: 'army',
    description: 'All enemies in range know attack coming, -15% morale',
    raceRestriction: 'korrath',
    debuffPercentage: 15,
  },
  {
    id: 'blood_frenzy_spell',
    name: 'Blood Frenzy',
    school: 'enhancement',
    manaCost: 60,
    cooldownHours: 12,
    target: 'army',
    description: '+10% ATK per kill for battle duration',
    raceRestriction: 'korrath',
  },

  // Sylvaeth - Dream Magic
  {
    id: 'illusion_army',
    name: 'Illusion Army',
    school: 'manipulation',
    manaCost: 35,
    cooldownHours: 8,
    target: 'territory',
    description: 'Create fake army (fools scrying for 24h)',
    raceRestriction: 'sylvaeth',
    durationHours: 24,
  },
  {
    id: 'nightmare',
    name: 'Nightmare',
    school: 'necromancy',
    manaCost: 45,
    cooldownHours: 12,
    target: 'army',
    description: 'Target army cannot rest, no healing for 48h',
    raceRestriction: 'sylvaeth',
    durationHours: 48,
  },
  {
    id: 'dream_sight',
    name: 'Dream Sight',
    school: 'divination',
    manaCost: 60,
    cooldownHours: 24,
    target: 'player',
    description: "See through target's eyes for 1h",
    raceRestriction: 'sylvaeth',
    durationHours: 1,
  },

  // Ashborn - Death Magic
  {
    id: 'ash_cloud',
    name: 'Ash Cloud',
    school: 'manipulation',
    manaCost: 30,
    cooldownHours: 6,
    target: 'territory',
    description: 'Territory shrouded, -50% vision for 12h',
    raceRestriction: 'ashborn',
    debuffPercentage: 50,
    durationHours: 12,
  },
  {
    id: 'pyre_burst',
    name: 'Pyre Burst',
    school: 'destruction',
    manaCost: 50,
    cooldownHours: 12,
    target: 'army',
    description: 'All Ashborn units deal death damage (1-2% of their HP)',
    raceRestriction: 'ashborn',
  },
  {
    id: 'mass_reformation',
    name: 'Mass Reformation',
    school: 'necromancy',
    manaCost: 80,
    cooldownHours: 24,
    target: 'territory',
    description: 'All Ashborn dead in last 24h get +5% to reformation roll',
    raceRestriction: 'ashborn',
  },

  // Breath-Born - Wind Magic
  {
    id: 'gust',
    name: 'Gust',
    school: 'manipulation',
    manaCost: 15,
    cooldownHours: 2,
    target: 'army',
    description: 'Push enemy army back 1 territory',
    raceRestriction: 'breathborn',
  },
  {
    id: 'windshear_racial',
    name: 'Windshear',
    school: 'manipulation',
    manaCost: 35,
    cooldownHours: 4,
    target: 'army',
    description: 'Delay enemy arrival 1-4h',
    raceRestriction: 'breathborn',
  },
  {
    id: 'storm_call',
    name: 'Storm Call',
    school: 'destruction',
    manaCost: 70,
    cooldownHours: 24,
    target: 'territory',
    description: 'Territory stormy: -30% SPD all, ranged -50% ATK',
    raceRestriction: 'breathborn',
    debuffPercentage: 30,
    durationHours: 24,
  },
];

// All spells combined
export const ALL_SPELLS: SpellDefinition[] = [
  ...DESTRUCTION_SPELLS,
  ...PROTECTION_SPELLS,
  ...DIVINATION_SPELLS,
  ...MANIPULATION_SPELLS,
  ...NECROMANCY_SPELLS,
  ...ENHANCEMENT_SPELLS,
  ...RACE_SPELLS,
];

// Get spell by ID
export function getSpellDefinition(spellId: string): SpellDefinition | undefined {
  return ALL_SPELLS.find((s) => s.id === spellId);
}

// ==========================================
// SPELL ROLL TABLES
// ==========================================

// D20 damage modifier table
export const DAMAGE_ROLL_MODIFIERS: Record<number, number> = {
  1: 0, // Fizzle
  2: 0.5,
  3: 0.5,
  4: 0.5,
  5: 0.75,
  6: 0.75,
  7: 0.75,
  8: 0.75,
  9: 1.0,
  10: 1.0,
  11: 1.0,
  12: 1.0,
  13: 1.25,
  14: 1.25,
  15: 1.25,
  16: 1.25,
  17: 1.5,
  18: 1.5,
  19: 1.5,
  20: 2.0, // Critical + bonus
};

// D20 duration modifier table
export const DURATION_ROLL_MODIFIERS: Record<number, number> = {
  1: 0.25,
  2: 0.5,
  3: 0.5,
  4: 0.5,
  5: 0.75,
  6: 0.75,
  7: 0.75,
  8: 0.75,
  9: 1.0,
  10: 1.0,
  11: 1.0,
  12: 1.0,
  13: 1.25,
  14: 1.25,
  15: 1.25,
  16: 1.25,
  17: 1.5,
  18: 1.5,
  19: 1.5,
  20: 2.0,
};

// ==========================================
// SPELL EFFECTS & ACTIVE BUFFS
// ==========================================

export interface ActiveSpellEffect {
  id: string;
  spellId: string;
  targetType: 'army' | 'territory' | 'building' | 'player';
  targetId: string;
  casterId: string;
  expiresAt: Date;
  effectData: {
    attackModifier?: number;
    defenseModifier?: number;
    speedModifier?: number;
    magicResistance?: number;
    dotDamagePerRound?: number;
    isImmune?: boolean;
    isWarded?: boolean;
    isCursed?: boolean;
    moraleModifier?: number;
  };
}

// ==========================================
// MANA SYSTEM
// ==========================================

export const BASE_MANA_PER_DAY = 10;

export const MANA_GENERATION: Record<string, number> = {
  base: 10,
  mage_tower: 15,
  shrine: 5,
  heart_territory: 25,
  inner_territory: 10,
  middle_territory: 5,
};

export const MANA_CAP_BY_STRUCTURE: Record<string, number> = {
  none: 50,
  mage_tower_1: 100,
  mage_tower_2: 150,
  mage_tower_3: 200,
};

// Vaelthir mana bonuses
export const VAELTHIR_MANA_BONUS = 0.5; // +50% mana generation
export const VAELTHIR_MANA_CAP_BONUS = 100; // +100 to max mana cap

// ==========================================
// BLOOD SACRIFICE (VAELTHIR)
// ==========================================

export interface BloodSacrificeResult {
  unitsRequired: number;
  rollModifier: number;
  spellPowerBonus: number;
  roll: number;
}

export const BLOOD_SACRIFICE_TIERS = [
  { name: 'Minor', minUnits: 5, maxUnits: 14, rollModifier: 0 },
  { name: 'Moderate', minUnits: 15, maxUnits: 29, rollModifier: 2 },
  { name: 'Major', minUnits: 30, maxUnits: 49, rollModifier: 4 },
  { name: 'Supreme', minUnits: 50, maxUnits: Infinity, rollModifier: 6 },
] as const;

export const BLOOD_SACRIFICE_POWER: Record<number, number> = {
  1: 0.05,
  2: 0.05,
  3: 0.05,
  4: 0.05,
  5: 0.05,
  6: 0.08,
  7: 0.08,
  8: 0.08,
  9: 0.08,
  10: 0.08,
  11: 0.12,
  12: 0.12,
  13: 0.12,
  14: 0.12,
  15: 0.12,
  16: 0.15,
  17: 0.15,
  18: 0.15,
  19: 0.15,
  20: 0.2,
};

// ==========================================
// SPELL MISHAPS (NATURAL 1)
// ==========================================

export const SPELL_MISHAPS = [
  { roll: 1, name: 'Backlash', effect: 'Caster takes 25% of spell damage' },
  { roll: 2, name: 'Mana Drain', effect: 'Lose additional 50% mana' },
  { roll: 3, name: 'Exhaustion', effect: 'All spells on 2x cooldown for 24h' },
  { roll: 4, name: 'Misfire', effect: 'Spell hits random target (could be ally)' },
  { roll: 5, name: 'Corruption', effect: 'Captain takes 10% HP damage' },
  { roll: 6, name: "Titan's Notice", effect: 'Random negative event' },
] as const;

// ==========================================
// SPELL CRITICAL EFFECTS (NATURAL 20)
// ==========================================

export const SPELL_CRITICALS: Record<SpellSchool, string> = {
  destruction: 'Targets catch fire (100 damage/round for 3 rounds)',
  protection: 'Shield reflects 25% damage back to attacker',
  divination: "See target's planned actions for next 24h",
  manipulation: 'Effect spreads to adjacent army',
  necromancy: 'Raised dead are permanent (until killed)',
  enhancement: 'Buff is contagious - spreads to nearby allies',
};
