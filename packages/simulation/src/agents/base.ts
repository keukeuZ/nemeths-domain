/**
 * Base Agent Class
 *
 * AI agents that simulate player behavior in the game.
 */

import {
  BUILDING_DEFINITIONS,
  UNIT_DEFINITIONS,
  getUnitsForRace,
  type BuildingType,
  type UnitType,
} from '@nemeths/shared';

import type {
  SimPlayer,
  SimTerritory,
  SimArmy,
  AgentAction,
  AgentType,
} from '../types.js';
import { SeededRandom } from '../utils/random.js';
import { EconomyEngine } from '../engine/economy.js';
import { MapEngine } from '../engine/map.js';

export interface AgentContext {
  player: SimPlayer;
  territories: SimTerritory[];
  day: number;
  phase: 'planning' | 'active' | 'endgame';
  allPlayers: Map<string, SimPlayer>;
  mapEngine: MapEngine;
  economyEngine: EconomyEngine;
  random: SeededRandom;
}

export abstract class BaseAgent {
  protected random: SeededRandom;
  public readonly type: AgentType;

  constructor(type: AgentType, random: SeededRandom) {
    this.type = type;
    this.random = random;
  }

  /**
   * Decide what actions to take this turn
   */
  abstract decideActions(context: AgentContext): AgentAction[];

  /**
   * Get available buildings that can be built
   */
  protected getAvailableBuildings(context: AgentContext): BuildingType[] {
    const { player, territories, economyEngine } = context;
    const available: BuildingType[] = [];

    for (const territory of territories) {
      for (const [type, def] of Object.entries(BUILDING_DEFINITIONS)) {
        const buildingType = type as BuildingType;
        const result = economyEngine.canBuildInTerritory(player, territory, buildingType);
        if (result.canBuild) {
          if (!available.includes(buildingType)) {
            available.push(buildingType);
          }
        }
      }
    }

    return available;
  }

  /**
   * Get available units that can be trained
   */
  protected getAvailableUnits(context: AgentContext): UnitType[] {
    const { player, territories, economyEngine } = context;
    const raceUnits = getUnitsForRace(player.race);
    const available: UnitType[] = [];

    // Check if we have required buildings
    const hasBarracks = territories.some((t) =>
      t.buildings.some((b) => b.type === 'barracks' && b.completed)
    );
    const hasWarhall = territories.some((t) =>
      t.buildings.some((b) => b.type === 'warhall' && b.completed)
    );
    const hasSiegeWorkshop = territories.some((t) =>
      t.buildings.some((b) => b.type === 'siegeworkshop' && b.completed)
    );

    for (const unitType of raceUnits) {
      const def = UNIT_DEFINITIONS[unitType];

      // Check building requirements
      if (def.role === 'defender' || def.role === 'attacker') {
        if (!hasBarracks) continue;
      }
      if (def.role === 'elite') {
        if (!hasWarhall) continue;
      }
      if (def.role === 'siege') {
        if (!hasSiegeWorkshop) continue;
      }

      // Check affordability
      if (economyEngine.canAffordUnit(player, unitType, 1)) {
        available.push(unitType);
      }
    }

    return available;
  }

  /**
   * Find best territory to build in
   */
  protected findBestBuildTerritory(
    context: AgentContext,
    buildingType: BuildingType
  ): SimTerritory | null {
    const { player, territories, economyEngine } = context;

    // Sort by zone (prefer higher value zones)
    const sorted = [...territories].sort((a, b) => {
      const zoneOrder = { heart: 0, inner: 1, middle: 2, outer: 3 };
      return zoneOrder[a.zone] - zoneOrder[b.zone];
    });

    for (const territory of sorted) {
      const result = economyEngine.canBuildInTerritory(player, territory, buildingType);
      if (result.canBuild) {
        return territory;
      }
    }

    return null;
  }

  /**
   * Find best attack target
   */
  protected findAttackTargets(context: AgentContext): SimTerritory[] {
    const { player, mapEngine } = context;
    const targets = mapEngine.getExpansionTargets(player.id);

    // Prioritize: Forsaken > Weak enemies > Strong enemies
    return targets.sort((a, b) => {
      // Forsaken are easy targets
      if (a.isForsaken && !b.isForsaken) return -1;
      if (!a.isForsaken && b.isForsaken) return 1;

      // Compare Forsaken strength
      if (a.isForsaken && b.isForsaken) {
        return a.forsakenStrength - b.forsakenStrength;
      }

      // Compare zone value (prefer higher value)
      const zoneOrder = { heart: 0, inner: 1, middle: 2, outer: 3 };
      return zoneOrder[a.zone] - zoneOrder[b.zone];
    });
  }

  /**
   * Calculate army strength
   */
  protected calculateArmyStrength(army: SimArmy): number {
    let strength = 0;
    for (const unit of army.units) {
      const def = UNIT_DEFINITIONS[unit.type];
      if (def) {
        strength += def.atk * unit.quantity * (unit.currentHp / (def.hp * unit.quantity));
      }
    }
    return strength;
  }

  /**
   * Get player's total army strength
   */
  protected getTotalArmyStrength(player: SimPlayer): number {
    return player.armies.reduce((sum, army) => sum + this.calculateArmyStrength(army), 0);
  }

  /**
   * Check if player has enough food
   */
  protected hasEnoughFood(context: AgentContext): boolean {
    const { player, territories } = context;
    const consumption = context.economyEngine.calculateFoodConsumption(player, player.armies);
    const production = context.economyEngine.calculateDailyProduction(player, territories);
    return production.food >= consumption || player.resources.food > consumption * 5;
  }
}
