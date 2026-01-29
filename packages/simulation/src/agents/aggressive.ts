/**
 * Aggressive Agent
 *
 * Prioritizes military expansion and combat. Builds minimum economy.
 */

import { UNIT_DEFINITIONS } from '@nemeths/shared';
import type { AgentAction } from '../types.js';
import { BaseAgent, type AgentContext } from './base.js';
import type { SeededRandom } from '../utils/random.js';

export class AggressiveAgent extends BaseAgent {
  constructor(random: SeededRandom) {
    super('aggressive', random);
  }

  decideActions(context: AgentContext): AgentAction[] {
    const actions: AgentAction[] = [];
    const { player, territories, day, phase } = context;

    // Early game: minimal economy, quick barracks
    if (day <= 10) {
      // Build barracks first
      const hasBarracks = territories.some((t) =>
        t.buildings.some((b) => b.type === 'barracks')
      );

      if (!hasBarracks) {
        const territory = this.findBestBuildTerritory(context, 'barracks');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 10,
            data: { buildingType: 'barracks', territoryId: territory.id },
          });
        }
      }

      // Build one farm for food
      const hasFarm = territories.some((t) =>
        t.buildings.some((b) => b.type === 'farm')
      );

      if (!hasFarm && this.hasEnoughFood(context) === false) {
        const territory = this.findBestBuildTerritory(context, 'farm');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 8,
            data: { buildingType: 'farm', territoryId: territory.id },
          });
        }
      }
    }

    // Always prioritize training attackers
    const available = this.getAvailableUnits(context);
    const attackers = available.filter((u) => {
      const def = UNIT_DEFINITIONS[u];
      return def?.role === 'attacker';
    });

    if (attackers.length > 0 && this.hasEnoughFood(context)) {
      const unitType = this.random.pick(attackers);
      const quantity = Math.min(10, Math.floor(player.resources.gold / 50));
      if (quantity > 0) {
        actions.push({
          type: 'train',
          priority: 9,
          data: { unitType, quantity },
        });
      }
    }

    // Train defenders if no attackers available
    if (attackers.length === 0 && available.length > 0) {
      const unitType = this.random.pick(available);
      const quantity = Math.min(5, Math.floor(player.resources.gold / 40));
      if (quantity > 0) {
        actions.push({
          type: 'train',
          priority: 7,
          data: { unitType, quantity },
        });
      }
    }

    // Attack aggressively after planning phase
    if (phase !== 'planning') {
      const targets = this.findAttackTargets(context);
      const armyStrength = this.getTotalArmyStrength(player);

      // Attack any Forsaken we can beat
      const forsakenTargets = targets.filter((t) => t.isForsaken && t.forsakenStrength < armyStrength * 0.8);
      if (forsakenTargets.length > 0) {
        const target = forsakenTargets[0]; // Weakest first
        actions.push({
          type: 'attack',
          priority: 10,
          data: { targetId: target.id },
        });
      }

      // Attack weak players
      const playerTargets = targets.filter((t) => !t.isForsaken && t.ownerId);
      if (playerTargets.length > 0 && armyStrength > 200) {
        // Find weakest enemy
        const weakest = playerTargets.reduce((prev, curr) => {
          const prevOwner = context.allPlayers.get(prev.ownerId!);
          const currOwner = context.allPlayers.get(curr.ownerId!);
          if (!prevOwner) return curr;
          if (!currOwner) return prev;
          return this.getTotalArmyStrength(currOwner) < this.getTotalArmyStrength(prevOwner) ? curr : prev;
        });

        const enemyStrength = context.allPlayers.get(weakest.ownerId!)
          ? this.getTotalArmyStrength(context.allPlayers.get(weakest.ownerId!)!)
          : 0;

        // Attack if we have advantage
        if (armyStrength > enemyStrength * 1.2) {
          actions.push({
            type: 'attack',
            priority: 8,
            data: { targetId: weakest.id },
          });
        }
      }
    }

    // Build armory for combat bonus
    if (day > 15) {
      const hasArmory = territories.some((t) =>
        t.buildings.some((b) => b.type === 'armory')
      );
      if (!hasArmory) {
        const territory = this.findBestBuildTerritory(context, 'armory');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 6,
            data: { buildingType: 'armory', territoryId: territory.id },
          });
        }
      }
    }

    // War Hall for elite units mid-game
    if (day > 20) {
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
    }

    if (actions.length === 0) {
      actions.push({ type: 'wait', priority: 0, data: {} });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }
}
