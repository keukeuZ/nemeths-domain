/**
 * Defensive Agent
 *
 * Focuses on building strong defenses, walls, and garrison troops.
 * Expands slowly but holds territory well.
 */

import { UNIT_DEFINITIONS } from '@nemeths/shared';
import type { AgentAction } from '../types.js';
import { BaseAgent, type AgentContext } from './base.js';
import type { SeededRandom } from '../utils/random.js';

export class DefensiveAgent extends BaseAgent {
  constructor(random: SeededRandom) {
    super('defensive', random);
  }

  decideActions(context: AgentContext): AgentAction[] {
    const actions: AgentAction[] = [];
    const { player, territories, day, phase } = context;

    // Early game: economy + barracks
    if (day <= 15) {
      // Build farm first
      const farmCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'farm').length,
        0
      );
      if (farmCount < 2) {
        const territory = this.findBestBuildTerritory(context, 'farm');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 9,
            data: { buildingType: 'farm', territoryId: territory.id },
          });
        }
      }

      // Build mine
      const mineCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'mine').length,
        0
      );
      if (mineCount < 1) {
        const territory = this.findBestBuildTerritory(context, 'mine');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 8,
            data: { buildingType: 'mine', territoryId: territory.id },
          });
        }
      }

      // Build barracks
      const hasBarracks = territories.some((t) =>
        t.buildings.some((b) => b.type === 'barracks')
      );
      if (!hasBarracks) {
        const territory = this.findBestBuildTerritory(context, 'barracks');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 7,
            data: { buildingType: 'barracks', territoryId: territory.id },
          });
        }
      }
    }

    // Mid game: walls and watchtowers
    if (day > 10) {
      // Build walls on border territories
      const borderTerritories = territories.filter((t) => {
        const adjacent = context.mapEngine.getAdjacentTerritories(t.x, t.y);
        return adjacent.some((a) => a.ownerId !== player.id);
      });

      const unwalled = borderTerritories.filter(
        (t) => !t.buildings.some((b) => b.type === 'wall')
      );

      if (unwalled.length > 0 && context.economyEngine.canAffordBuilding(player, 'wall')) {
        const territory = unwalled[0];
        actions.push({
          type: 'build',
          priority: 8,
          data: { buildingType: 'wall', territoryId: territory.id },
        });
      }

      // Build watchtowers
      const watchtowerCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'watchtower').length,
        0
      );
      if (watchtowerCount < 3) {
        const territory = this.findBestBuildTerritory(context, 'watchtower');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 6,
            data: { buildingType: 'watchtower', territoryId: territory.id },
          });
        }
      }

      // Build armory for combat bonus
      const hasArmory = territories.some((t) =>
        t.buildings.some((b) => b.type === 'armory')
      );
      if (!hasArmory && day > 15) {
        const territory = this.findBestBuildTerritory(context, 'armory');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 7,
            data: { buildingType: 'armory', territoryId: territory.id },
          });
        }
      }
    }

    // Train defenders primarily - build a strong garrison
    const available = this.getAvailableUnits(context);
    const defenders = available.filter((u) => {
      const def = UNIT_DEFINITIONS[u];
      return def?.role === 'defender';
    });

    if (defenders.length > 0 && this.hasEnoughFood(context)) {
      const unitType = this.random.pick(defenders);
      // Train more defenders - strong garrison is key
      const quantity = Math.min(15, Math.floor(player.resources.gold / 35));
      if (quantity > 0) {
        actions.push({
          type: 'train',
          priority: 8, // High priority
          data: { unitType, quantity },
        });
      }
    }

    // Train attackers for expansion - need some offensive power
    const attackers = available.filter((u) => {
      const def = UNIT_DEFINITIONS[u];
      return def?.role === 'attacker';
    });
    if (attackers.length > 0 && player.resources.gold > 300) {
      const unitType = this.random.pick(attackers);
      // Train more attackers than before
      const quantity = Math.min(8, Math.floor((player.resources.gold - 200) / 45));
      if (quantity > 0) {
        actions.push({
          type: 'train',
          priority: 6,
          data: { unitType, quantity },
        });
      }
    }

    // Expand cautiously but consistently - territory = points
    if (phase !== 'planning') {
      const targets = this.findAttackTargets(context);
      const armyStrength = this.getTotalArmyStrength(player);

      // Attack Forsaken when we have good advantage (70% threshold)
      const forsakenTargets = targets.filter(
        (t) => t.isForsaken && t.forsakenStrength < armyStrength * 0.7
      );

      if (forsakenTargets.length > 0) {
        actions.push({
          type: 'attack',
          priority: 6, // Higher priority - expansion is important
          data: { targetId: forsakenTargets[0].id },
        });
      }

      // In endgame, attack weak players to secure victory
      if (phase === 'endgame' && armyStrength > 300) {
        const playerTargets = targets.filter((t) => !t.isForsaken && t.ownerId);
        for (const target of playerTargets) {
          const enemy = context.allPlayers.get(target.ownerId!);
          if (enemy && this.getTotalArmyStrength(enemy) < armyStrength * 0.4) {
            actions.push({
              type: 'attack',
              priority: 5,
              data: { targetId: target.id },
            });
            break;
          }
        }
      }
    }

    // Late game: more economy and defenses
    if (day > 30) {
      const hasMarket = territories.some((t) =>
        t.buildings.some((b) => b.type === 'market')
      );
      if (!hasMarket) {
        const territory = this.findBestBuildTerritory(context, 'market');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 5,
            data: { buildingType: 'market', territoryId: territory.id },
          });
        }
      }

      // Build gates on walled territories
      const walledWithoutGate = territories.filter(
        (t) =>
          t.buildings.some((b) => b.type === 'wall' && b.completed) &&
          !t.buildings.some((b) => b.type === 'gate')
      );
      if (walledWithoutGate.length > 0) {
        actions.push({
          type: 'build',
          priority: 4,
          data: { buildingType: 'gate', territoryId: walledWithoutGate[0].id },
        });
      }
    }

    if (actions.length === 0) {
      actions.push({ type: 'wait', priority: 0, data: {} });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }
}
