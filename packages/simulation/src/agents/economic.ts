/**
 * Economic Agent
 *
 * Focuses on maximizing resource production and building a strong economy.
 * Builds military late but can outproduce opponents.
 */

import { UNIT_DEFINITIONS } from '@nemeths/shared';
import type { AgentAction } from '../types.js';
import { BaseAgent, type AgentContext } from './base.js';
import type { SeededRandom } from '../utils/random.js';

export class EconomicAgent extends BaseAgent {
  constructor(random: SeededRandom) {
    super('economic', random);
  }

  decideActions(context: AgentContext): AgentAction[] {
    const actions: AgentAction[] = [];
    const { player, territories, day, phase } = context;

    // Economy is ALWAYS priority
    // Build farms until we have enough food
    const farmCount = territories.reduce(
      (sum, t) => sum + t.buildings.filter((b) => b.type === 'farm' && b.completed).length,
      0
    );
    const targetFarms = Math.min(6, Math.ceil(territories.length / 2));

    if (farmCount < targetFarms) {
      const territory = this.findBestBuildTerritory(context, 'farm');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 10,
          data: { buildingType: 'farm', territoryId: territory.id },
        });
      }
    }

    // Build mines for gold
    const mineCount = territories.reduce(
      (sum, t) => sum + t.buildings.filter((b) => b.type === 'mine' && b.completed).length,
      0
    );
    const targetMines = Math.min(4, Math.ceil(territories.length / 3));

    if (mineCount < targetMines) {
      const territory = this.findBestBuildTerritory(context, 'mine');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 9,
          data: { buildingType: 'mine', territoryId: territory.id },
        });
      }
    }

    // Build lumbermills
    const lumberCount = territories.reduce(
      (sum, t) => sum + t.buildings.filter((b) => b.type === 'lumbermill' && b.completed).length,
      0
    );
    if (lumberCount < 2) {
      const territory = this.findBestBuildTerritory(context, 'lumbermill');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 8,
          data: { buildingType: 'lumbermill', territoryId: territory.id },
        });
      }
    }

    // Build markets for gold bonus (requires mine)
    if (mineCount >= 1) {
      const marketCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'market' && b.completed).length,
        0
      );
      if (marketCount < 2) {
        const territory = this.findBestBuildTerritory(context, 'market');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 7,
            data: { buildingType: 'market', territoryId: territory.id },
          });
        }
      }
    }

    // Build warehouses to protect resources
    if (day > 20) {
      const warehouseCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'warehouse' && b.completed).length,
        0
      );
      if (warehouseCount < 2) {
        const territory = this.findBestBuildTerritory(context, 'warehouse');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 6,
            data: { buildingType: 'warehouse', territoryId: territory.id },
          });
        }
      }
    }

    // Build barracks mid-game for defense
    if (day > 10) {
      const hasBarracks = territories.some((t) =>
        t.buildings.some((b) => b.type === 'barracks')
      );
      if (!hasBarracks) {
        const territory = this.findBestBuildTerritory(context, 'barracks');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 6,
            data: { buildingType: 'barracks', territoryId: territory.id },
          });
        }
      }
    }

    // Train units mid-late game (when economy is established)
    if (day > 15 && player.resources.gold > 1000) {
      const available = this.getAvailableUnits(context);
      if (available.length > 0 && this.hasEnoughFood(context)) {
        // Prefer balanced mix
        const defenders = available.filter((u) => UNIT_DEFINITIONS[u]?.role === 'defender');
        const attackers = available.filter((u) => UNIT_DEFINITIONS[u]?.role === 'attacker');

        if (defenders.length > 0) {
          const quantity = Math.min(10, Math.floor((player.resources.gold - 500) / 40));
          if (quantity > 0) {
            actions.push({
              type: 'train',
              priority: 5,
              data: { unitType: this.random.pick(defenders), quantity },
            });
          }
        }

        if (attackers.length > 0 && player.resources.gold > 800) {
          const quantity = Math.min(5, Math.floor((player.resources.gold - 600) / 50));
          if (quantity > 0) {
            actions.push({
              type: 'train',
              priority: 4,
              data: { unitType: this.random.pick(attackers), quantity },
            });
          }
        }
      }
    }

    // Late game: heavy military investment
    if (day > 30 && player.resources.gold > 2000) {
      // Build war hall for elites
      const hasWarhall = territories.some((t) =>
        t.buildings.some((b) => b.type === 'warhall')
      );
      if (!hasWarhall) {
        const territory = this.findBestBuildTerritory(context, 'warhall');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 5,
            data: { buildingType: 'warhall', territoryId: territory.id },
          });
        }
      }

      // Train elite units
      const available = this.getAvailableUnits(context);
      const elites = available.filter((u) => UNIT_DEFINITIONS[u]?.role === 'elite');
      if (elites.length > 0) {
        const quantity = Math.min(5, Math.floor((player.resources.gold - 1500) / 100));
        if (quantity > 0) {
          actions.push({
            type: 'train',
            priority: 4,
            data: { unitType: this.random.pick(elites), quantity },
          });
        }
      }
    }

    // Expand cautiously - only Forsaken until strong
    if (phase !== 'planning') {
      const armyStrength = this.getTotalArmyStrength(player);
      const targets = this.findAttackTargets(context);

      // Attack very weak Forsaken for more territory (more buildings = more economy)
      const weakForsaken = targets.filter(
        (t) => t.isForsaken && t.forsakenStrength < armyStrength * 0.4
      );

      if (weakForsaken.length > 0) {
        actions.push({
          type: 'attack',
          priority: 3,
          data: { targetId: weakForsaken[0].id },
        });
      }

      // Late game with big army: go aggressive
      if (day > 35 && armyStrength > 500) {
        const playerTargets = targets.filter((t) => !t.isForsaken && t.ownerId);
        if (playerTargets.length > 0) {
          const weakest = playerTargets[0];
          actions.push({
            type: 'attack',
            priority: 4,
            data: { targetId: weakest.id },
          });
        }
      }
    }

    if (actions.length === 0) {
      actions.push({ type: 'wait', priority: 0, data: {} });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }
}
