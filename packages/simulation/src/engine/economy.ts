/**
 * Economy Engine
 *
 * Handles resource production, consumption, building costs, and unit training.
 */

import {
  BUILDING_DEFINITIONS,
  UNIT_DEFINITIONS,
  ZONE_MULTIPLIERS,
  FOOD_RATES,
  RACE_BUILDING_MODIFIERS,
  type Race,
  type BuildingType,
  type UnitType,
  type Zone,
  type Resources,
} from '@nemeths/shared';

import type { SimPlayer, SimTerritory, SimBuilding, SimArmy } from '../types.js';

/** Building production rates per day */
const BUILDING_PRODUCTION: Partial<Record<BuildingType, Partial<Resources>>> = {
  farm: { food: 50 },
  mine: { gold: 40 },
  lumbermill: { wood: 40 },
  market: { gold: 100 },
  magetower: { mana: 20 },
  shrine: { mana: 10 },
};

export class EconomyEngine {
  /**
   * Calculate daily resource production for a player
   */
  calculateDailyProduction(
    player: SimPlayer,
    territories: SimTerritory[]
  ): Resources {
    const production: Resources = { gold: 0, stone: 0, wood: 0, food: 0, mana: 0 };

    // Base production per territory
    for (const territory of territories) {
      const zoneMultiplier = ZONE_MULTIPLIERS[territory.zone];

      // Territory base production
      production.gold += 10 * zoneMultiplier;
      production.food += 5 * zoneMultiplier;

      // Building production
      for (const building of territory.buildings) {
        if (!building.completed) continue;

        const buildingProd = BUILDING_PRODUCTION[building.type];
        if (buildingProd) {
          for (const [resource, amount] of Object.entries(buildingProd)) {
            let adjusted = (amount ?? 0) * zoneMultiplier;

            // Apply race modifiers
            adjusted *= this.getRaceBuildingModifier(player.race, building.type);

            production[resource as keyof Resources] += adjusted;
          }
        }
      }
    }

    // Apply global race modifiers
    this.applyRaceProductionModifiers(production, player.race);

    // Round all values
    for (const key of Object.keys(production) as (keyof Resources)[]) {
      production[key] = Math.floor(production[key]);
    }

    return production;
  }

  /**
   * Get race-specific building modifier
   */
  getRaceBuildingModifier(race: Race, buildingType: BuildingType): number {
    switch (race) {
      case 'ironveld':
        if (buildingType === 'mine') return 1.15; // +15% mine output
        break;
      case 'vaelthir':
        if (buildingType === 'magetower') return 1.30; // +30% mana
        break;
      case 'ashborn':
        if (buildingType === 'farm') return 0.80; // -20% farm output
        break;
    }
    return 1.0;
  }

  /**
   * Apply global race production modifiers
   */
  applyRaceProductionModifiers(production: Resources, race: Race): void {
    switch (race) {
      case 'sylvaeth':
        // +10% to all resources
        for (const key of Object.keys(production) as (keyof Resources)[]) {
          production[key] *= 1.10;
        }
        break;
      case 'vaelthir':
        // +50% mana generation
        production.mana *= 1.50;
        break;
    }
  }

  /**
   * Calculate daily food consumption for a player's armies
   */
  calculateFoodConsumption(player: SimPlayer, armies: SimArmy[]): number {
    let consumption = 0;
    const foodRate = FOOD_RATES[player.race];

    for (const army of armies) {
      for (const unit of army.units) {
        const unitDef = UNIT_DEFINITIONS[unit.type];
        if (unitDef) {
          consumption += unitDef.food * unit.quantity * foodRate;
        }
      }
    }

    // Merchant Prince logistics: -10% supply costs
    if (player.captainClass === 'merchantprince') {
      consumption *= 0.90;
    }

    return Math.ceil(consumption);
  }

  /**
   * Check if player can afford a building
   */
  canAffordBuilding(player: SimPlayer, buildingType: BuildingType): boolean {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return false;

    let cost = { ...def.cost };

    // Vaelthir: +15% building costs
    if (player.race === 'vaelthir') {
      for (const key of Object.keys(cost) as (keyof Resources)[]) {
        if (cost[key]) {
          cost[key] = Math.ceil((cost[key] ?? 0) * 1.15);
        }
      }
    }

    return this.canAfford(player.resources, cost as Resources);
  }

  /**
   * Get building cost (with race modifiers)
   */
  getBuildingCost(player: SimPlayer, buildingType: BuildingType): Partial<Resources> {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return {};

    const cost = { ...def.cost };

    // Vaelthir: +15% building costs
    if (player.race === 'vaelthir') {
      for (const key of Object.keys(cost) as (keyof Resources)[]) {
        if (cost[key]) {
          cost[key] = Math.ceil((cost[key] ?? 0) * 1.15);
        }
      }
    }

    return cost;
  }

  /**
   * Check if player can afford a unit
   */
  canAffordUnit(player: SimPlayer, unitType: UnitType, quantity: number = 1): boolean {
    const def = UNIT_DEFINITIONS[unitType];
    if (!def) return false;

    const cost: Partial<Resources> = {
      gold: def.cost * quantity,
    };
    if (def.manaCost) {
      cost.mana = def.manaCost * quantity;
    }

    return this.canAfford(player.resources, cost as Resources);
  }

  /**
   * Get unit cost
   */
  getUnitCost(unitType: UnitType, quantity: number = 1): Partial<Resources> {
    const def = UNIT_DEFINITIONS[unitType];
    if (!def) return {};

    const cost: Partial<Resources> = {
      gold: def.cost * quantity,
    };
    if (def.manaCost) {
      cost.mana = def.manaCost * quantity;
    }

    return cost;
  }

  /**
   * Check if player can afford a cost
   */
  canAfford(resources: Resources, cost: Partial<Resources>): boolean {
    for (const [key, value] of Object.entries(cost)) {
      if (value && resources[key as keyof Resources] < value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Deduct resources
   */
  deductResources(resources: Resources, cost: Partial<Resources>): void {
    for (const [key, value] of Object.entries(cost)) {
      if (value) {
        resources[key as keyof Resources] -= value;
      }
    }
  }

  /**
   * Add resources
   */
  addResources(resources: Resources, addition: Partial<Resources>): void {
    for (const [key, value] of Object.entries(addition)) {
      if (value) {
        resources[key as keyof Resources] += value;
      }
    }
  }

  /**
   * Process daily resource tick for a player
   */
  processDailyTick(
    player: SimPlayer,
    territories: SimTerritory[],
    armies: SimArmy[]
  ): { production: Resources; consumption: number; netFood: number } {
    const production = this.calculateDailyProduction(player, territories);
    const consumption = this.calculateFoodConsumption(player, armies);

    // Add production
    this.addResources(player.resources, production);

    // Deduct food consumption
    player.resources.food -= consumption;

    // Handle starvation (food goes negative)
    const netFood = production.food - consumption;

    return { production, consumption, netFood };
  }

  /**
   * Calculate player score based on territories and resources
   */
  calculateScore(
    player: SimPlayer,
    territories: SimTerritory[],
    day: number
  ): number {
    let score = 0;

    // Territory score (1 point per plot per day)
    for (const territory of territories) {
      const zoneMultiplier = ZONE_MULTIPLIERS[territory.zone];

      // Zone bonuses: heart = 100, inner = 5, middle = 2, outer = 1
      switch (territory.zone) {
        case 'heart':
          score += 100;
          break;
        case 'inner':
          score += 5;
          break;
        case 'middle':
          score += 2;
          break;
        default:
          score += 1;
      }
    }

    // Building score
    for (const territory of territories) {
      for (const building of territory.buildings) {
        if (building.completed) {
          score += 5;
        }
      }
    }

    // Army score
    for (const army of player.armies) {
      for (const unit of army.units) {
        const unitDef = UNIT_DEFINITIONS[unit.type];
        if (unitDef) {
          score += Math.floor((unitDef.cost * unit.quantity) / 100);
        }
      }
    }

    // Combat bonus
    score += player.battlesWon * 10;

    return score;
  }

  /**
   * Check building prerequisites
   */
  canBuildInTerritory(
    player: SimPlayer,
    territory: SimTerritory,
    buildingType: BuildingType
  ): { canBuild: boolean; reason?: string } {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) {
      return { canBuild: false, reason: 'Unknown building type' };
    }

    // Check max per territory
    const existingOfType = territory.buildings.filter(
      (b) => b.type === buildingType
    ).length;
    if (existingOfType >= def.maxPerTerritory) {
      return { canBuild: false, reason: 'Max buildings of this type reached' };
    }

    // Check prerequisite
    if (def.requires) {
      const hasPrereq = territory.buildings.some(
        (b) => b.type === def.requires && b.completed
      );
      if (!hasPrereq) {
        return { canBuild: false, reason: `Requires ${def.requires}` };
      }
    }

    // Check race restrictions
    const raceMods = RACE_BUILDING_MODIFIERS.find((m) => m.race === player.race);
    if (raceMods?.restrictions.includes(buildingType)) {
      return { canBuild: false, reason: 'Race restriction' };
    }

    // Check affordability
    if (!this.canAffordBuilding(player, buildingType)) {
      return { canBuild: false, reason: 'Cannot afford' };
    }

    return { canBuild: true };
  }
}
