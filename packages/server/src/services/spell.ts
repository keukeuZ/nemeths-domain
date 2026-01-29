import { eq, and, lt, gt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { players, armies, territories, buildings } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { rollD20, getHighPriestRollBonus } from './captain.js';
import {
  type Race,
  type CaptainClass,
  type CaptainSkill,
  type SpellSchool,
  type SpellDefinition,
  type ActiveSpellEffect,
  type BloodSacrificeResult,
  getSpellDefinition,
  ALL_SPELLS,
  DAMAGE_ROLL_MODIFIERS,
  DURATION_ROLL_MODIFIERS,
  SPELL_MISHAPS,
  SPELL_CRITICALS,
  BLOOD_SACRIFICE_TIERS,
  BLOOD_SACRIFICE_POWER,
  MANA_GENERATION,
  VAELTHIR_MANA_BONUS,
  VAELTHIR_MANA_CAP_BONUS,
} from '@nemeths/shared';
import { getPlayerById, deductResourcesAtomic } from './player.js';

// ==========================================
// SPELL SERVICE - D20 WEIGHTED SYSTEM
// ==========================================

// In-memory spell effect tracking (would be persisted in production)
const activeSpellEffects: Map<string, ActiveSpellEffect[]> = new Map();

// Spell cooldown tracking (playerId -> spellId -> expiresAt)
const spellCooldowns: Map<string, Map<string, Date>> = new Map();

/**
 * Get all spells available to a player
 */
export function getAvailableSpells(race: Race): SpellDefinition[] {
  return ALL_SPELLS.filter((spell) => {
    // If no race restriction, available to all
    if (!spell.raceRestriction) return true;
    // If race restriction matches, available
    return spell.raceRestriction === race;
  });
}

/**
 * Check if player can cast a spell
 */
export async function canCastSpell(
  playerId: string,
  spellId: string
): Promise<{ canCast: boolean; reason?: string }> {
  const player = await getPlayerById(playerId);
  if (!player) {
    return { canCast: false, reason: 'Player not found' };
  }

  const spell = getSpellDefinition(spellId);
  if (!spell) {
    return { canCast: false, reason: 'Spell not found' };
  }

  // Check race restriction
  if (spell.raceRestriction && spell.raceRestriction !== player.race) {
    return { canCast: false, reason: `Only ${spell.raceRestriction} can cast this spell` };
  }

  // Check mana
  if (player.resources.mana < spell.manaCost) {
    return { canCast: false, reason: `Insufficient mana (need ${spell.manaCost}, have ${player.resources.mana})` };
  }

  // Check cooldown
  const cooldowns = spellCooldowns.get(playerId);
  if (cooldowns) {
    const cooldownEnd = cooldowns.get(spellId);
    if (cooldownEnd && new Date() < cooldownEnd) {
      const remainingMs = cooldownEnd.getTime() - Date.now();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return { canCast: false, reason: `Spell on cooldown (${remainingHours}h remaining)` };
    }
  }

  // Check captain alive
  if (!player.captainAlive) {
    return { canCast: false, reason: 'Captain must be alive to cast spells' };
  }

  // Check captain wounded (reduced effectiveness, not prevented)
  // Wounded captains can still cast but with penalty

  return { canCast: true };
}

/**
 * Roll spell effect with D20 weighted system
 * This is the core of the spell unpredictability
 */
export function rollSpellEffect(
  spell: SpellDefinition,
  casterClass: CaptainClass,
  casterSkill: CaptainSkill,
  casterRace: Race,
  bloodSacrificeUnits: number = 0
): {
  roll: number;
  modifier: number;
  finalRoll: number;
  damageMultiplier: number;
  durationMultiplier: number;
  isCritical: boolean;
  isFizzle: boolean;
  mishap?: (typeof SPELL_MISHAPS)[number];
  criticalEffect?: string;
  bloodSacrificeBonus: number;
} {
  // Base D20 roll
  let roll = rollD20();

  // Modifiers
  let modifier = 0;

  // High Priest Divine Favor (+2 to all D20 rolls)
  modifier += getHighPriestRollBonus(casterClass);

  // Vaelthir spell roll bonus (+2 to damage spells)
  if (casterRace === 'vaelthir' && spell.school === 'destruction') {
    modifier += 2;
  }

  // Destruction skill bonus
  if (casterSkill === 'destruction' && spell.school === 'destruction') {
    // Destruction archmages get +30% damage, handled separately
  }

  // Blood sacrifice (Vaelthir only)
  let bloodSacrificeBonus = 0;
  if (casterRace === 'vaelthir' && bloodSacrificeUnits >= 5) {
    const sacrifice = calculateBloodSacrifice(bloodSacrificeUnits, roll + modifier);
    modifier += sacrifice.rollModifier;
    bloodSacrificeBonus = sacrifice.spellPowerBonus;
  }

  const finalRoll = Math.min(20, Math.max(1, roll + modifier));

  // Get multipliers from tables
  // Note: we use the clamped finalRoll for table lookup but track if natural 1 or 20
  const damageMultiplier = DAMAGE_ROLL_MODIFIERS[Math.min(20, Math.max(1, finalRoll))] || 1.0;
  const durationMultiplier = DURATION_ROLL_MODIFIERS[Math.min(20, Math.max(1, finalRoll))] || 1.0;

  // Critical on natural 20
  const isCritical = roll === 20;

  // Fizzle on natural 1
  const isFizzle = roll === 1;

  // Mishap roll on fizzle
  let mishap: (typeof SPELL_MISHAPS)[number] | undefined;
  if (isFizzle) {
    const mishapRoll = Math.floor(Math.random() * 6) + 1;
    mishap = SPELL_MISHAPS.find((m) => m.roll === mishapRoll);
  }

  // Critical effect on natural 20
  let criticalEffect: string | undefined;
  if (isCritical) {
    criticalEffect = SPELL_CRITICALS[spell.school];
  }

  logger.debug(
    {
      spellId: spell.id,
      roll,
      modifier,
      finalRoll,
      damageMultiplier,
      isCritical,
      isFizzle,
    },
    'Spell effect rolled'
  );

  return {
    roll,
    modifier,
    finalRoll,
    damageMultiplier,
    durationMultiplier,
    isCritical,
    isFizzle,
    mishap,
    criticalEffect,
    bloodSacrificeBonus,
  };
}

/**
 * Calculate blood sacrifice effect (Vaelthir only)
 */
export function calculateBloodSacrifice(unitsToSacrifice: number, currentRoll: number): BloodSacrificeResult {
  // Find sacrifice tier
  const tier = BLOOD_SACRIFICE_TIERS.find(
    (t) => unitsToSacrifice >= t.minUnits && unitsToSacrifice <= t.maxUnits
  );

  if (!tier) {
    return {
      unitsRequired: 0,
      rollModifier: 0,
      spellPowerBonus: 0,
      roll: currentRoll,
    };
  }

  const rollWithBonus = Math.min(20, currentRoll + tier.rollModifier);
  const spellPowerBonus = BLOOD_SACRIFICE_POWER[rollWithBonus] || 0.05;

  return {
    unitsRequired: unitsToSacrifice,
    rollModifier: tier.rollModifier,
    spellPowerBonus,
    roll: rollWithBonus,
  };
}

/**
 * Cast a spell
 */
export async function castSpell(
  playerId: string,
  spellId: string,
  targetId: string,
  bloodSacrificeUnits: number = 0
): Promise<{
  success: boolean;
  result: {
    roll: number;
    finalRoll: number;
    damage?: number;
    duration?: number;
    isCritical: boolean;
    isFizzle: boolean;
    mishap?: string;
    criticalEffect?: string;
    manaSpent: number;
    bloodSacrificeUnits: number;
  };
  error?: string;
}> {
  // Validate
  const canCast = await canCastSpell(playerId, spellId);
  if (!canCast.canCast) {
    return {
      success: false,
      result: {
        roll: 0,
        finalRoll: 0,
        isCritical: false,
        isFizzle: false,
        manaSpent: 0,
        bloodSacrificeUnits: 0,
      },
      error: canCast.reason,
    };
  }

  const player = await getPlayerById(playerId);
  if (!player) {
    return {
      success: false,
      result: {
        roll: 0,
        finalRoll: 0,
        isCritical: false,
        isFizzle: false,
        manaSpent: 0,
        bloodSacrificeUnits: 0,
      },
      error: 'Player not found',
    };
  }

  const spell = getSpellDefinition(spellId)!;

  // Roll spell effect with full D20 system
  const rollResult = rollSpellEffect(
    spell,
    player.captainClass,
    player.captainSkill,
    player.race,
    bloodSacrificeUnits
  );

  // Calculate actual damage/effect
  let damage: number | undefined;
  let duration: number | undefined;

  if (spell.baseDamage && !rollResult.isFizzle) {
    const baseDamage = (spell.baseDamage.min + spell.baseDamage.max) / 2;
    damage = Math.floor(baseDamage * rollResult.damageMultiplier);

    // Apply Destruction skill bonus (+30%)
    if (player.captainSkill === 'destruction' && spell.school === 'destruction') {
      damage = Math.floor(damage * 1.3);
    }

    // Apply blood sacrifice bonus
    if (rollResult.bloodSacrificeBonus > 0) {
      damage = Math.floor(damage * (1 + rollResult.bloodSacrificeBonus));
    }

    // Apply critical damage (already 2x from table, but add DOT for destruction)
    if (rollResult.isCritical && spell.school === 'destruction') {
      // Fire DOT handled separately as ongoing effect
    }
  }

  if (spell.durationHours && !rollResult.isFizzle) {
    duration = Math.floor(spell.durationHours * rollResult.durationMultiplier);
  }

  // Calculate mana to spend (including mishap modifications)
  let manaSpent = spell.manaCost;

  // Handle mishaps that modify mana cost
  if (rollResult.mishap) {
    switch (rollResult.mishap.roll) {
      case 2: // Mana Drain - lose additional 50%
        manaSpent = Math.floor(manaSpent * 1.5);
        break;
      // Other mishaps handled by caller
    }
  }

  // Atomically deduct mana (prevents race conditions)
  await deductResourcesAtomic(playerId, { mana: manaSpent });

  // Set cooldown
  if (spell.cooldownHours > 0) {
    let cooldownHours = spell.cooldownHours;

    // Check for exhaustion mishap (2x cooldown for 24h)
    if (rollResult.mishap?.roll === 3) {
      cooldownHours *= 2;
    }

    const cooldownEnd = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);
    if (!spellCooldowns.has(playerId)) {
      spellCooldowns.set(playerId, new Map());
    }
    spellCooldowns.get(playerId)!.set(spellId, cooldownEnd);
  }

  // Handle blood sacrifice - remove units if Vaelthir
  if (bloodSacrificeUnits > 0 && player.race === 'vaelthir') {
    // Units would be removed from army here
    logger.info({ playerId, spellId, bloodSacrificeUnits }, 'Blood sacrifice performed');
  }

  // Apply spell effect to target
  if (!rollResult.isFizzle && damage) {
    await applySpellDamage(spell, targetId, damage, rollResult.isCritical);
  }

  if (!rollResult.isFizzle && duration && spell.buffPercentage) {
    await applySpellBuff(spell, playerId, targetId, duration, rollResult.isCritical);
  }

  logger.info(
    {
      playerId,
      spellId,
      targetId,
      roll: rollResult.roll,
      finalRoll: rollResult.finalRoll,
      damage,
      duration,
      isCritical: rollResult.isCritical,
      isFizzle: rollResult.isFizzle,
      mishap: rollResult.mishap?.name,
    },
    'Spell cast'
  );

  return {
    success: true,
    result: {
      roll: rollResult.roll,
      finalRoll: rollResult.finalRoll,
      damage,
      duration,
      isCritical: rollResult.isCritical,
      isFizzle: rollResult.isFizzle,
      mishap: rollResult.mishap?.effect,
      criticalEffect: rollResult.criticalEffect,
      manaSpent,
      bloodSacrificeUnits,
    },
  };
}

/**
 * Apply spell damage to target
 */
async function applySpellDamage(
  spell: SpellDefinition,
  targetId: string,
  damage: number,
  isCritical: boolean
): Promise<void> {
  switch (spell.target) {
    case 'army':
      // Reduce army HP
      const [army] = await db.select().from(armies).where(eq(armies.id, targetId)).limit(1);
      if (army) {
        const units = army.units as Array<{
          unitType: string;
          quantity: number;
          currentHp: number;
          isPrisoner: boolean;
          originalRace?: string;
        }>;

        // Distribute damage across units
        let remainingDamage = damage;
        for (const unit of units) {
          if (remainingDamage <= 0) break;

          const unitTotalHp = unit.quantity * unit.currentHp;
          if (unitTotalHp <= remainingDamage) {
            // Kill all units of this type
            remainingDamage -= unitTotalHp;
            unit.quantity = 0;
          } else {
            // Partial damage
            const unitsKilled = Math.floor(remainingDamage / unit.currentHp);
            unit.quantity -= unitsKilled;
            remainingDamage = 0;
          }
        }

        // Remove empty stacks
        const filteredUnits = units.filter((u) => u.quantity > 0);

        await db
          .update(armies)
          .set({ units: filteredUnits, updatedAt: new Date() })
          .where(eq(armies.id, targetId));
      }
      break;

    case 'building':
      // Reduce building HP
      const [building] = await db.select().from(buildings).where(eq(buildings.id, targetId)).limit(1);
      if (building) {
        const newHp = Math.max(0, building.hp - damage);
        await db
          .update(buildings)
          .set({ hp: newHp, updatedAt: new Date() })
          .where(eq(buildings.id, targetId));

        if (newHp <= 0) {
          // Building destroyed
          await db.delete(buildings).where(eq(buildings.id, targetId));
        }
      }
      break;

    case 'territory':
      // Damage all enemy armies in territory
      const territoryArmies = await db
        .select()
        .from(armies)
        .where(eq(armies.territoryId, targetId));

      for (const army of territoryArmies) {
        const units = army.units as Array<{
          unitType: string;
          quantity: number;
          currentHp: number;
          isPrisoner: boolean;
        }>;

        let remainingDamage = damage;
        for (const unit of units) {
          if (remainingDamage <= 0) break;

          const unitTotalHp = unit.quantity * unit.currentHp;
          if (unitTotalHp <= remainingDamage) {
            remainingDamage -= unitTotalHp;
            unit.quantity = 0;
          } else {
            const unitsKilled = Math.floor(remainingDamage / unit.currentHp);
            unit.quantity -= unitsKilled;
            remainingDamage = 0;
          }
        }

        const filteredUnits = units.filter((u) => u.quantity > 0);
        await db
          .update(armies)
          .set({ units: filteredUnits, updatedAt: new Date() })
          .where(eq(armies.id, army.id));
      }
      break;
  }

  // Apply critical DOT effect for destruction spells
  if (isCritical && spell.school === 'destruction') {
    // Add fire DOT effect (100 damage/round for 3 rounds)
    const dotEffect: ActiveSpellEffect = {
      id: crypto.randomUUID(),
      spellId: spell.id,
      targetType: spell.target === 'army' ? 'army' : 'territory',
      targetId,
      casterId: '', // Would need caster ID
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
      effectData: {
        dotDamagePerRound: 100,
      },
    };

    if (!activeSpellEffects.has(targetId)) {
      activeSpellEffects.set(targetId, []);
    }
    activeSpellEffects.get(targetId)!.push(dotEffect);
  }
}

/**
 * Apply spell buff/debuff effect
 */
async function applySpellBuff(
  spell: SpellDefinition,
  casterId: string,
  targetId: string,
  durationHours: number,
  isCritical: boolean
): Promise<void> {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const effect: ActiveSpellEffect = {
    id: crypto.randomUUID(),
    spellId: spell.id,
    targetType: spell.target === 'army' ? 'army' : spell.target === 'building' ? 'building' : 'territory',
    targetId,
    casterId,
    expiresAt,
    effectData: {},
  };

  // Set effect data based on spell
  if (spell.buffPercentage) {
    switch (spell.id) {
      case 'shield':
      case 'stone_skin':
        effect.effectData.defenseModifier = spell.buffPercentage / 100;
        break;
      case 'haste':
        effect.effectData.speedModifier = spell.buffPercentage / 100;
        break;
      case 'strength':
      case 'bloodlust':
        effect.effectData.attackModifier = spell.buffPercentage / 100;
        break;
      case 'war_cry':
        effect.effectData.moraleModifier = spell.buffPercentage / 100;
        break;
      case 'titans_blessing':
        effect.effectData.attackModifier = spell.buffPercentage / 100;
        effect.effectData.defenseModifier = spell.buffPercentage / 100;
        effect.effectData.speedModifier = spell.buffPercentage / 100;
        break;
    }
  }

  if (spell.debuffPercentage) {
    switch (spell.id) {
      case 'slow':
        effect.effectData.speedModifier = -spell.debuffPercentage / 100;
        break;
      case 'curse':
        effect.effectData.attackModifier = -spell.debuffPercentage / 100;
        effect.effectData.defenseModifier = -spell.debuffPercentage / 100;
        break;
      case 'stone_skin': // Has both buff (DEF) and debuff (SPD)
        effect.effectData.speedModifier = -spell.debuffPercentage / 100;
        break;
      case 'bloodlust': // Has both buff (ATK) and debuff (DEF)
        effect.effectData.defenseModifier = -spell.debuffPercentage / 100;
        break;
    }
  }

  // Ward effect
  if (spell.id === 'ward') {
    effect.effectData.isWarded = true;
  }

  // Titan's Aegis - magic immunity
  if (spell.id === 'titans_aegis') {
    effect.effectData.isImmune = true;
  }

  // Protection magic resistance
  if (spell.id === 'protection') {
    effect.effectData.magicResistance = 0.15;
  }

  // Critical enhancement - spread to nearby allies
  if (isCritical && spell.school === 'enhancement') {
    // Would need to find adjacent armies and apply same effect
    logger.info({ spellId: spell.id, targetId }, 'Critical enhancement - effect spreads');
  }

  // Store effect
  if (!activeSpellEffects.has(targetId)) {
    activeSpellEffects.set(targetId, []);
  }
  activeSpellEffects.get(targetId)!.push(effect);

  logger.debug({ effect }, 'Spell effect applied');
}

/**
 * Get active spell effects on a target
 */
export function getActiveEffects(targetId: string): ActiveSpellEffect[] {
  const effects = activeSpellEffects.get(targetId) || [];

  // Filter out expired effects
  const now = new Date();
  const activeEffects = effects.filter((e) => e.expiresAt > now);

  // Update stored effects
  if (activeEffects.length !== effects.length) {
    activeSpellEffects.set(targetId, activeEffects);
  }

  return activeEffects;
}

/**
 * Calculate total modifiers from active spell effects
 */
export function calculateSpellModifiers(targetId: string): {
  attackModifier: number;
  defenseModifier: number;
  speedModifier: number;
  magicResistance: number;
  moraleModifier: number;
  isImmune: boolean;
  isWarded: boolean;
} {
  const effects = getActiveEffects(targetId);

  const modifiers = {
    attackModifier: 0,
    defenseModifier: 0,
    speedModifier: 0,
    magicResistance: 0,
    moraleModifier: 0,
    isImmune: false,
    isWarded: false,
  };

  for (const effect of effects) {
    modifiers.attackModifier += effect.effectData.attackModifier || 0;
    modifiers.defenseModifier += effect.effectData.defenseModifier || 0;
    modifiers.speedModifier += effect.effectData.speedModifier || 0;
    modifiers.magicResistance += effect.effectData.magicResistance || 0;
    modifiers.moraleModifier += effect.effectData.moraleModifier || 0;
    modifiers.isImmune = modifiers.isImmune || effect.effectData.isImmune || false;
    modifiers.isWarded = modifiers.isWarded || effect.effectData.isWarded || false;
  }

  return modifiers;
}

/**
 * Calculate daily mana generation for a player
 */
export async function calculateManaGeneration(playerId: string): Promise<number> {
  const player = await getPlayerById(playerId);
  if (!player) return 0;

  let mana = MANA_GENERATION.base;

  // Get player's territories
  const playerTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.ownerId, playerId));

  // Check for mage towers
  const playerBuildings = await db.select().from(buildings).where(eq(buildings.playerId, playerId));

  const mageTowers = playerBuildings.filter((b) => b.type === 'magetower' && !b.isUnderConstruction);
  const shrines = playerBuildings.filter((b) => b.type === 'shrine' && !b.isUnderConstruction);

  mana += mageTowers.length * MANA_GENERATION.mage_tower;
  mana += shrines.length * MANA_GENERATION.shrine;

  // Zone bonuses
  for (const territory of playerTerritories) {
    if (territory.zone === 'heart') {
      mana += MANA_GENERATION.heart_territory;
    } else if (territory.zone === 'inner') {
      mana += MANA_GENERATION.inner_territory;
    } else if (territory.zone === 'middle') {
      mana += MANA_GENERATION.middle_territory;
    }
  }

  // Archmage mana affinity (+25%)
  if (player.captainClass === 'archmage') {
    mana = Math.floor(mana * 1.25);
  }

  // Vaelthir racial bonus (+50%)
  if (player.race === 'vaelthir') {
    mana = Math.floor(mana * (1 + VAELTHIR_MANA_BONUS));
  }

  return mana;
}

/**
 * Process divination spell accuracy (D20 based)
 */
export function rollDivinationAccuracy(
  casterRace: Race,
  casterClass: CaptainClass
): { roll: number; accuracy: number; isFalseVision: boolean; isBonusIntel: boolean } {
  let roll = rollD20();

  // High Priest bonus
  if (casterClass === 'highpriest') {
    roll += 2;
  }

  // Sylvaeth minimum 75% accuracy (reroll 1-4)
  if (casterRace === 'sylvaeth' && roll <= 4) {
    roll = 5 + Math.floor(Math.random() * 16); // Reroll to 5-20 range
  }

  const isFalseVision = roll === 1;
  const isBonusIntel = roll >= 20;

  let accuracy: number;
  if (roll === 1) accuracy = 0; // False vision
  else if (roll <= 4) accuracy = 0.6;
  else if (roll <= 8) accuracy = 0.75;
  else if (roll <= 12) accuracy = 0.9;
  else if (roll <= 16) accuracy = 0.95;
  else if (roll <= 19) accuracy = 1.0;
  else accuracy = 1.0; // 20+ with bonus intel

  return { roll, accuracy, isFalseVision, isBonusIntel };
}

/**
 * Clear expired spell cooldowns and effects
 */
export function cleanupExpiredEffects(): void {
  const now = new Date();

  // Clean up effects
  for (const [targetId, effects] of activeSpellEffects) {
    const activeEffects = effects.filter((e) => e.expiresAt > now);
    if (activeEffects.length === 0) {
      activeSpellEffects.delete(targetId);
    } else {
      activeSpellEffects.set(targetId, activeEffects);
    }
  }

  // Clean up cooldowns
  for (const [playerId, cooldowns] of spellCooldowns) {
    for (const [spellId, expiresAt] of cooldowns) {
      if (expiresAt < now) {
        cooldowns.delete(spellId);
      }
    }
    if (cooldowns.size === 0) {
      spellCooldowns.delete(playerId);
    }
  }
}

/**
 * Get player's spell cooldowns
 */
export function getSpellCooldowns(playerId: string): Map<string, Date> {
  return spellCooldowns.get(playerId) || new Map();
}
