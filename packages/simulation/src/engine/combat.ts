/**
 * Combat Engine
 *
 * Simulates the D20-based combat system from the game design.
 * Balanced for approximately 55% attacker / 45% defender win rates
 * with terrain/walls pushing towards defender advantage.
 */

import {
  UNIT_DEFINITIONS,
  CAPTAIN_CLASS_DEFINITIONS,
  RACE_DEATH_SAVE_MODIFIERS,
  DEATH_SAVE_THRESHOLD,
  MAX_DEATH_SAVE_MODIFIER,
  type Race,
  type CaptainClass,
  type CaptainSkill,
  type UnitType,
} from '@nemeths/shared';

import type {
  SimPlayer,
  SimArmy,
  SimCombat,
  SimTerritory,
} from '../types.js';
import { D20_WEIGHTED_MODIFIERS } from '../types.js';
import { SeededRandom } from '../utils/random.js';

// Debug logging (disabled for production)
// let debugCombatCount = 0;
// const DEBUG_MAX = 5;

export interface CombatContext {
  attacker: SimPlayer;
  defender: SimPlayer | null; // null for Forsaken
  attackerArmy: SimArmy;
  defenderArmy: SimArmy;
  territory: SimTerritory;
  day: number;
}

export interface CombatResult {
  combat: SimCombat;
  attackerSurvivingUnits: number;
  defenderSurvivingUnits: number;
  territoryChangedOwner: boolean;
}

/** Base defender advantage (home territory bonus) */
const BASE_DEFENDER_BONUS = 1.50; // Increased from 1.25 - defending is much easier

/** Minimum army strength to attack (prevents trivial attacks) */
const MIN_ATTACK_STRENGTH = 10;

/** Number of combat rounds */
const MAX_COMBAT_ROUNDS = 3;

export class CombatEngine {
  private random: SeededRandom;

  constructor(random: SeededRandom) {
    this.random = random;
  }

  /**
   * Calculate army attack strength based on units
   */
  calculateAttackStrength(army: SimArmy, player: SimPlayer | null): number {
    let totalStrength = 0;

    for (const unit of army.units) {
      const stats = UNIT_DEFINITIONS[unit.type];
      if (!stats) continue;

      // Attack strength = ATK * quantity
      let unitStrength = stats.atk * unit.quantity;

      // Apply HP modifier (damaged units are weaker)
      const maxHp = stats.hp * unit.quantity;
      const hpRatio = Math.max(0.1, unit.currentHp / maxHp);
      unitStrength *= hpRatio;

      // Role bonus: attackers get +15% when attacking
      if (stats.role === 'attacker') {
        unitStrength *= 1.15;
      }

      totalStrength += unitStrength;
    }

    // Apply player bonuses
    if (player) {
      totalStrength *= this.getAttackModifier(player);
    }

    return Math.floor(totalStrength);
  }

  /**
   * Calculate army defense strength based on units
   */
  calculateDefenseStrength(army: SimArmy, player: SimPlayer | null): number {
    let totalStrength = 0;

    for (const unit of army.units) {
      const stats = UNIT_DEFINITIONS[unit.type];
      if (!stats) continue;

      // Defense strength = (ATK + DEF*2) * quantity / 2
      // DEF matters more for defense
      let unitStrength = (stats.atk + stats.def * 2) * unit.quantity / 2;

      // Apply HP modifier
      const maxHp = stats.hp * unit.quantity;
      const hpRatio = Math.max(0.1, unit.currentHp / maxHp);
      unitStrength *= hpRatio;

      // Role bonus: defenders get +20% when defending
      if (stats.role === 'defender') {
        unitStrength *= 1.20;
      }

      // Elite units are strong in any role
      if (stats.role === 'elite') {
        unitStrength *= 1.10;
      }

      totalStrength += unitStrength;
    }

    // Apply player bonuses
    if (player) {
      totalStrength *= this.getDefenseModifier(player);
    }

    return Math.floor(totalStrength);
  }

  /**
   * Get attack modifier for a player
   */
  getAttackModifier(player: SimPlayer): number {
    let modifier = 1.0;

    // Race bonuses
    switch (player.race) {
      case 'korrath':
        modifier *= 1.35; // +35% ATK - blood frenzy warriors (major buff)
        break;
      case 'vaelthir':
        modifier *= 1.10; // +10% ATK - magic damage
        break;
      case 'sylvaeth':
        modifier *= 0.95; // -5% ATK - not fighters
        break;
    }

    // Class bonuses
    if (player.captainClass === 'warlord') {
      modifier *= 1.10; // +10% when captain leads
    }

    // Skill bonuses
    switch (player.captainSkill) {
      case 'vanguard':
        modifier *= 1.15; // +15% first strike
        break;
      case 'destruction':
        modifier *= 1.10; // +10% spell damage
        break;
      case 'packalpha':
        modifier *= 1.08; // +8% pack tactics
        break;
      case 'assassin':
        modifier *= 1.05; // +5% precision
        break;
    }

    // Morale affects attack
    const moraleMod = 0.7 + (player.morale / 100) * 0.6; // 70%-130%
    modifier *= moraleMod;

    return modifier;
  }

  /**
   * Get defense modifier for a player
   */
  getDefenseModifier(player: SimPlayer): number {
    let modifier = 1.0;

    // Race bonuses
    switch (player.race) {
      case 'ironveld':
        modifier *= 1.20; // +20% DEF - defensive masters
        break;
      case 'ashborn':
        modifier *= 1.10; // +10% DEF - undying
        break;
      case 'breathborn':
        modifier *= 1.05; // +5% DEF - evasive
        break;
      // Korrath: no DEF penalty - their aggression is their defense
    }

    // Class bonuses
    if (player.captainClass === 'warlord') {
      modifier *= 1.05; // +5% defensive leadership
    }
    if (player.captainClass === 'highpriest') {
      modifier *= 1.10; // +10% divine protection
    }

    // Skill bonuses
    switch (player.captainSkill) {
      case 'fortress':
        modifier *= 1.30; // +30% fortified positions
        break;
      case 'protection':
        modifier *= 1.20; // +20% magical protection
        break;
      case 'warden':
        modifier *= 1.10; // +10% beast guard
        break;
      case 'oracle':
        modifier *= 1.08; // +8% foresight
        break;
    }

    return modifier;
  }

  /**
   * Get territorial defense bonus (terrain + buildings)
   */
  getTerritoryDefenseBonus(territory: SimTerritory, defender: SimPlayer | null): number {
    let modifier = BASE_DEFENDER_BONUS; // Start with 50% defender advantage

    // Terrain bonuses
    switch (territory.terrain) {
      case 'mountain':
        modifier *= 1.35; // +35% DEF in mountains
        break;
      case 'forest':
        modifier *= 1.20; // +20% DEF in forests
        break;
      case 'ruins':
        modifier *= 1.15; // +15% DEF in ruins
        break;
      case 'river':
        modifier *= 1.10; // +10% DEF (crossing penalty for attacker)
        break;
      case 'corruption':
        modifier *= 0.90; // -10% DEF (chaos affects defense)
        break;
    }

    // Wall bonus - major defensive structure
    const hasWall = territory.buildings.some((b) => b.type === 'wall' && b.completed);
    if (hasWall) {
      modifier *= 1.50; // +50% DEF with walls

      // Ironveld wall bonus
      if (defender?.race === 'ironveld') {
        modifier *= 1.15; // Additional +15% for Ironveld walls
      }

      // Gate bonus
      const hasGate = territory.buildings.some((b) => b.type === 'gate' && b.completed);
      if (hasGate) {
        modifier *= 1.10; // +10% with gate
      }
    }

    // Watchtower bonus - early warning
    const watchtowers = territory.buildings.filter((b) => b.type === 'watchtower' && b.completed).length;
    if (watchtowers > 0) {
      modifier *= 1 + watchtowers * 0.05; // +5% per watchtower
    }

    // Armory bonus
    if (territory.buildings.some((b) => b.type === 'armory' && b.completed)) {
      modifier *= 1.15; // +15% with armory
    }

    return modifier;
  }

  /**
   * Roll D20 with proper weighted distribution
   */
  rollD20(): { roll: number; modifier: number; isCriticalHit: boolean; isCriticalMiss: boolean } {
    const roll = this.random.weightedD20();
    const modifier = D20_WEIGHTED_MODIFIERS[roll] ?? 100;
    return {
      roll,
      modifier,
      isCriticalHit: roll === 20,
      isCriticalMiss: roll === 1,
    };
  }

  /**
   * Calculate death save for a captain
   */
  calculateDeathSave(player: SimPlayer, trigger: 'army_destroyed' | 'critical_hit' | 'assassination'): boolean {
    const roll = this.random.d20();
    let totalModifier = 0;

    // Race modifier
    totalModifier += RACE_DEATH_SAVE_MODIFIERS[player.race] ?? 0;

    // Class modifier
    const classDef = CAPTAIN_CLASS_DEFINITIONS[player.captainClass];
    totalModifier += classDef.deathSaveBonus;

    // Trigger penalty
    if (trigger === 'assassination') {
      totalModifier -= 3; // Assassination is very dangerous
    } else if (trigger === 'critical_hit') {
      totalModifier -= 1; // Critical hits are dangerous
    }

    // Cap modifier
    totalModifier = Math.min(totalModifier, MAX_DEATH_SAVE_MODIFIER);
    totalModifier = Math.max(totalModifier, -MAX_DEATH_SAVE_MODIFIER);

    const finalRoll = roll + totalModifier;
    return finalRoll >= DEATH_SAVE_THRESHOLD;
  }

  /**
   * Resolve a combat between two armies over multiple rounds
   */
  resolveCombat(context: CombatContext): CombatResult {
    const { attacker, defender, attackerArmy, defenderArmy, territory, day } = context;

    // Calculate base strengths
    const attackerAttack = this.calculateAttackStrength(attackerArmy, attacker);
    const defenderDefense = this.calculateDefenseStrength(defenderArmy, defender);

    // Get territorial defense bonus
    const territoryBonus = this.getTerritoryDefenseBonus(territory, defender);

    // Roll D20 for both sides
    const attackerRoll = this.rollD20();
    const defenderRoll = this.rollD20();


    // Calculate effective strength
    // Attacker: raw attack * roll modifier
    const attackerEffective = Math.floor(
      (attackerAttack * attackerRoll.modifier) / 100
    );

    // Defender: defense * roll modifier * territory bonus
    const defenderEffective = Math.floor(
      (defenderDefense * defenderRoll.modifier * territoryBonus) / 100
    );

    // Determine winner based on strength comparison
    let result: 'attacker_victory' | 'defender_victory' | 'draw';
    const strengthRatio = attackerEffective / Math.max(1, defenderEffective);


    // Critical rolls affect outcome
    if (attackerRoll.isCriticalHit && !defenderRoll.isCriticalHit) {
      // Critical hit by attacker - likely victory
      result = strengthRatio > 0.5 ? 'attacker_victory' : 'draw';
    } else if (defenderRoll.isCriticalHit && !attackerRoll.isCriticalHit) {
      // Critical hit by defender - likely holds
      result = strengthRatio < 2.0 ? 'defender_victory' : 'draw';
    } else if (attackerRoll.isCriticalMiss) {
      // Attacker fumble - defender wins unless very weak
      result = defenderEffective > 0 ? 'defender_victory' : 'draw';
    } else if (defenderRoll.isCriticalMiss) {
      // Defender fumble - attacker wins unless very weak
      result = attackerEffective > 0 ? 'attacker_victory' : 'draw';
    } else {
      // Normal resolution: attacker needs significant advantage to win
      // Defending is easier than attacking - attacker needs 1.5x to win decisively
      if (strengthRatio > 1.5) {
        result = 'attacker_victory';
      } else if (strengthRatio < 0.9) {
        result = 'defender_victory';
      } else {
        // Close fight (0.9-1.5 ratio) - heavily favors defender (home advantage)
        const tiebreaker = this.random.random();
        // Scale probability based on ratio: 1.5 = 60% attacker, 0.9 = 10% attacker
        const attackerChance = 0.1 + (strengthRatio - 0.9) * (0.5 / 0.6);
        if (tiebreaker < attackerChance) {
          result = 'attacker_victory';
        } else if (tiebreaker > 0.85) {
          result = 'draw';
        } else {
          result = 'defender_victory';
        }
      }
    }


    // Calculate casualties based on combat result
    const { attackerCasualties, defenderCasualties } = this.calculateCasualties(
      attackerArmy,
      defenderArmy,
      attackerRoll,
      defenderRoll,
      result
    );

    // Calculate unit totals
    const attackerTotalUnits = attackerArmy.units.reduce((sum, u) => sum + u.quantity, 0);
    const defenderTotalUnits = defenderArmy.units.reduce((sum, u) => sum + u.quantity, 0);

    // Check for captain deaths
    let attackerCaptainDied = false;
    let defenderCaptainDied = false;

    // Captain death on critical fail, heavy losses, or army destroyed
    if (attackerArmy.hasCaptain && attacker.captainAlive) {
      const heavyLosses = attackerCasualties >= attackerTotalUnits * 0.7;
      if (attackerRoll.isCriticalMiss || (result === 'defender_victory' && heavyLosses)) {
        attackerCaptainDied = !this.calculateDeathSave(
          attacker,
          attackerRoll.isCriticalMiss ? 'critical_hit' : 'army_destroyed'
        );
      }
    }

    if (defenderArmy.hasCaptain && defender?.captainAlive) {
      const heavyLosses = defenderCasualties >= defenderTotalUnits * 0.7;
      if (defenderRoll.isCriticalMiss || (result === 'attacker_victory' && heavyLosses)) {
        defenderCaptainDied = !this.calculateDeathSave(
          defender,
          defenderRoll.isCriticalMiss ? 'critical_hit' : 'army_destroyed'
        );
      }
    }

    // Assassination attempt (Shadow Master skill)
    if (attacker.captainSkill === 'assassin' && defender?.captainAlive && !defenderCaptainDied) {
      if (this.random.chance(0.12)) { // 12% assassination chance
        defenderCaptainDied = !this.calculateDeathSave(defender, 'assassination');
      }
    }

    // Ashborn reformation (25% of casualties return)
    let attackerReformed = 0;
    let defenderReformed = 0;
    if (attacker.race === 'ashborn' && attackerCasualties > 0) {
      attackerReformed = Math.floor(attackerCasualties * 0.25);
    }
    if (defender?.race === 'ashborn' && defenderCasualties > 0) {
      defenderReformed = Math.floor(defenderCasualties * 0.25);
    }

    const combat: SimCombat = {
      id: `combat-${day}-${this.random.int(0, 99999)}`,
      day,
      territoryId: territory.id,
      attackerId: attacker.id,
      defenderId: defender?.id ?? null,
      attackerStrength: attackerAttack,
      defenderStrength: defenderDefense,
      attackerRoll: attackerRoll.roll,
      defenderRoll: defenderRoll.roll,
      attackerModifier: attackerRoll.modifier,
      defenderModifier: Math.floor(defenderRoll.modifier * territoryBonus),
      result,
      attackerCasualties: Math.max(0, attackerCasualties - attackerReformed),
      defenderCasualties: Math.max(0, defenderCasualties - defenderReformed),
      attackerCaptainDied,
      defenderCaptainDied,
    };

    return {
      combat,
      attackerSurvivingUnits: Math.max(0, attackerTotalUnits - attackerCasualties + attackerReformed),
      defenderSurvivingUnits: Math.max(0, defenderTotalUnits - defenderCasualties + defenderReformed),
      territoryChangedOwner: result === 'attacker_victory',
    };
  }

  /**
   * Calculate casualties based on combat outcome and rolls
   */
  private calculateCasualties(
    attackerArmy: SimArmy,
    defenderArmy: SimArmy,
    attackerRoll: { roll: number; isCriticalHit: boolean; isCriticalMiss: boolean },
    defenderRoll: { roll: number; isCriticalHit: boolean; isCriticalMiss: boolean },
    result: 'attacker_victory' | 'defender_victory' | 'draw'
  ): { attackerCasualties: number; defenderCasualties: number } {
    const attackerTotalUnits = attackerArmy.units.reduce((sum, u) => sum + u.quantity, 0);
    const defenderTotalUnits = defenderArmy.units.reduce((sum, u) => sum + u.quantity, 0);

    let attackerRate: number;
    let defenderRate: number;

    // Base rates depend on outcome
    switch (result) {
      case 'attacker_victory':
        attackerRate = 0.10; // Winner takes 10% losses
        defenderRate = 0.35; // Loser takes 35% losses
        break;
      case 'defender_victory':
        attackerRate = 0.40; // Failed attack is costly
        defenderRate = 0.15; // Defender holds with some losses
        break;
      case 'draw':
        attackerRate = 0.25; // Both take moderate losses
        defenderRate = 0.20; // Defender slightly better in draws
        break;
    }

    // Critical hits reduce own casualties, increase enemy's
    if (attackerRoll.isCriticalHit) {
      attackerRate *= 0.5;
      defenderRate *= 1.3;
    }
    if (defenderRoll.isCriticalHit) {
      defenderRate *= 0.5;
      attackerRate *= 1.3;
    }

    // Critical misses increase own casualties
    if (attackerRoll.isCriticalMiss) {
      attackerRate *= 1.5;
    }
    if (defenderRoll.isCriticalMiss) {
      defenderRate *= 1.5;
    }

    // Roll quality affects casualties (high rolls = fewer losses)
    attackerRate *= (1.3 - attackerRoll.roll / 30); // Roll 20 = 0.63x, Roll 1 = 1.27x
    defenderRate *= (1.3 - defenderRoll.roll / 30);

    // Clamp rates
    attackerRate = Math.max(0.05, Math.min(0.80, attackerRate));
    defenderRate = Math.max(0.05, Math.min(0.80, defenderRate));

    return {
      attackerCasualties: Math.floor(attackerTotalUnits * attackerRate),
      defenderCasualties: Math.floor(defenderTotalUnits * defenderRate),
    };
  }

  /**
   * Resolve combat against Forsaken (NPC villages)
   */
  resolveForsakenCombat(attacker: SimPlayer, army: SimArmy, territory: SimTerritory, day: number): CombatResult {
    // Create a Forsaken army based on territory strength
    // Forsaken are weaker than player armies but have home advantage
    const forsakenStrength = territory.forsakenStrength;
    const unitCount = Math.max(5, Math.floor(forsakenStrength / 8));

    const forsakenArmy: SimArmy = {
      id: 'forsaken-army',
      ownerId: 'forsaken',
      territoryId: territory.id,
      units: [
        {
          type: 'warshield' as UnitType, // Generic defender unit
          quantity: Math.floor(unitCount * 0.6),
          currentHp: forsakenStrength * 2,
        },
        {
          type: 'rageborn' as UnitType, // Some attackers
          quantity: Math.floor(unitCount * 0.4),
          currentHp: forsakenStrength * 1.5,
        },
      ],
      totalStrength: forsakenStrength,
      totalFoodConsumption: 0,
      hasCaptain: false,
    };

    // Forsaken get reduced territory bonus (no walls, disorganized)
    const result = this.resolveCombat({
      attacker,
      defender: null,
      attackerArmy: army,
      defenderArmy: forsakenArmy,
      territory: { ...territory, buildings: [] }, // No buildings for Forsaken
      day,
    });

    return result;
  }
}
