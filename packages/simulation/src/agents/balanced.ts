/**
 * Balanced Agent
 *
 * A well-rounded strategy that adapts based on game state.
 * Balances economy, military, and expansion.
 */

import { UNIT_DEFINITIONS, ZONE_MULTIPLIERS } from '@nemeths/shared';
import type { AgentAction } from '../types.js';
import { BaseAgent, type AgentContext } from './base.js';
import type { SeededRandom } from '../utils/random.js';

export class BalancedAgent extends BaseAgent {
  constructor(random: SeededRandom) {
    super('balanced', random);
  }

  decideActions(context: AgentContext): AgentAction[] {
    const actions: AgentAction[] = [];
    const { player, territories, day, phase } = context;

    // Analyze current state
    const armyStrength = this.getTotalArmyStrength(player);
    const economyScore = this.calculateEconomyScore(context);
    const defenseScore = this.calculateDefenseScore(context);
    const threatLevel = this.assessThreatLevel(context);

    // Early game (days 1-10): balanced setup
    if (day <= 10) {
      this.earlyGameStrategy(context, actions);
    }
    // Mid game (days 11-35): adapt based on situation
    else if (day <= 35) {
      this.midGameStrategy(context, actions, economyScore, threatLevel);
    }
    // Late game (days 36-50): push for victory
    else {
      this.lateGameStrategy(context, actions, armyStrength);
    }

    // Always consider training if we can afford it
    this.considerTraining(context, actions, threatLevel);

    // Always consider expansion
    if (phase !== 'planning') {
      this.considerExpansion(context, actions, armyStrength, threatLevel);
    }

    if (actions.length === 0) {
      actions.push({ type: 'wait', priority: 0, data: {} });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }

  private earlyGameStrategy(context: AgentContext, actions: AgentAction[]): void {
    const { player, territories } = context;

    // Build order: farm -> barracks -> mine -> farm
    const hasFarm = territories.some((t) => t.buildings.some((b) => b.type === 'farm'));
    const hasBarracks = territories.some((t) => t.buildings.some((b) => b.type === 'barracks'));
    const hasMine = territories.some((t) => t.buildings.some((b) => b.type === 'mine'));

    if (!hasFarm) {
      const territory = this.findBestBuildTerritory(context, 'farm');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 10,
          data: { buildingType: 'farm', territoryId: territory.id },
        });
      }
    } else if (!hasBarracks) {
      const territory = this.findBestBuildTerritory(context, 'barracks');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 9,
          data: { buildingType: 'barracks', territoryId: territory.id },
        });
      }
    } else if (!hasMine) {
      const territory = this.findBestBuildTerritory(context, 'mine');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 8,
          data: { buildingType: 'mine', territoryId: territory.id },
        });
      }
    } else {
      // Second farm
      const farmCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'farm').length,
        0
      );
      if (farmCount < 2) {
        const territory = this.findBestBuildTerritory(context, 'farm');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 7,
            data: { buildingType: 'farm', territoryId: territory.id },
          });
        }
      }
    }
  }

  private midGameStrategy(
    context: AgentContext,
    actions: AgentAction[],
    economyScore: number,
    threatLevel: number
  ): void {
    const { player, territories, day } = context;

    // If under threat, prioritize defense
    if (threatLevel > 0.6) {
      const hasWall = territories.some((t) => t.buildings.some((b) => b.type === 'wall'));
      if (!hasWall) {
        const territory = this.findBestBuildTerritory(context, 'wall');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 9,
            data: { buildingType: 'wall', territoryId: territory.id },
          });
        }
      }

      const watchtowerCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'watchtower').length,
        0
      );
      if (watchtowerCount < 2) {
        const territory = this.findBestBuildTerritory(context, 'watchtower');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 8,
            data: { buildingType: 'watchtower', territoryId: territory.id },
          });
        }
      }
    }
    // If economy is weak, build more production
    else if (economyScore < 0.5) {
      const mineCount = territories.reduce(
        (sum, t) => sum + t.buildings.filter((b) => b.type === 'mine').length,
        0
      );
      if (mineCount < 2) {
        const territory = this.findBestBuildTerritory(context, 'mine');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 8,
            data: { buildingType: 'mine', territoryId: territory.id },
          });
        }
      }

      const hasMarket = territories.some((t) => t.buildings.some((b) => b.type === 'market'));
      if (!hasMarket && mineCount >= 1) {
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
    // Otherwise, build military infrastructure
    else {
      const hasWarhall = territories.some((t) => t.buildings.some((b) => b.type === 'warhall'));
      if (!hasWarhall) {
        const territory = this.findBestBuildTerritory(context, 'warhall');
        if (territory) {
          actions.push({
            type: 'build',
            priority: 7,
            data: { buildingType: 'warhall', territoryId: territory.id },
          });
        }
      }

      const hasArmory = territories.some((t) => t.buildings.some((b) => b.type === 'armory'));
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
  }

  private lateGameStrategy(
    context: AgentContext,
    actions: AgentAction[],
    armyStrength: number
  ): void {
    const { player, territories, day } = context;

    // Build siege workshop for taking fortified positions
    const hasSiegeWorkshop = territories.some((t) =>
      t.buildings.some((b) => b.type === 'siegeworkshop')
    );
    if (!hasSiegeWorkshop && player.race !== 'sylvaeth') {
      const territory = this.findBestBuildTerritory(context, 'siegeworkshop');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 7,
          data: { buildingType: 'siegeworkshop', territoryId: territory.id },
        });
      }
    }

    // Mage tower for endgame spells
    const hasMagetower = territories.some((t) =>
      t.buildings.some((b) => b.type === 'magetower')
    );
    if (!hasMagetower) {
      const territory = this.findBestBuildTerritory(context, 'magetower');
      if (territory) {
        actions.push({
          type: 'build',
          priority: 6,
          data: { buildingType: 'magetower', territoryId: territory.id },
        });
      }
    }
  }

  private considerTraining(
    context: AgentContext,
    actions: AgentAction[],
    threatLevel: number
  ): void {
    const { player } = context;
    const available = this.getAvailableUnits(context);

    if (available.length === 0 || !this.hasEnoughFood(context)) return;

    const defenders = available.filter((u) => UNIT_DEFINITIONS[u]?.role === 'defender');
    const attackers = available.filter((u) => UNIT_DEFINITIONS[u]?.role === 'attacker');
    const elites = available.filter((u) => UNIT_DEFINITIONS[u]?.role === 'elite');

    // Under threat: train more defenders
    if (threatLevel > 0.5 && defenders.length > 0) {
      const quantity = Math.min(8, Math.floor(player.resources.gold / 40));
      if (quantity > 0) {
        actions.push({
          type: 'train',
          priority: 7,
          data: { unitType: this.random.pick(defenders), quantity },
        });
      }
    }
    // Normal: balanced training
    else {
      // Attackers
      if (attackers.length > 0 && player.resources.gold > 300) {
        const quantity = Math.min(5, Math.floor((player.resources.gold - 200) / 50));
        if (quantity > 0) {
          actions.push({
            type: 'train',
            priority: 5,
            data: { unitType: this.random.pick(attackers), quantity },
          });
        }
      }

      // Defenders
      if (defenders.length > 0 && player.resources.gold > 200) {
        const quantity = Math.min(4, Math.floor((player.resources.gold - 100) / 40));
        if (quantity > 0) {
          actions.push({
            type: 'train',
            priority: 4,
            data: { unitType: this.random.pick(defenders), quantity },
          });
        }
      }

      // Elites (if wealthy)
      if (elites.length > 0 && player.resources.gold > 800) {
        const quantity = Math.min(3, Math.floor((player.resources.gold - 600) / 100));
        if (quantity > 0) {
          actions.push({
            type: 'train',
            priority: 4,
            data: { unitType: this.random.pick(elites), quantity },
          });
        }
      }
    }
  }

  private considerExpansion(
    context: AgentContext,
    actions: AgentAction[],
    armyStrength: number,
    threatLevel: number
  ): void {
    const { player, day } = context;
    const targets = this.findAttackTargets(context);

    // Don't expand when under heavy threat
    if (threatLevel > 0.7) return;

    // Prioritize Forsaken
    const forsaken = targets.filter((t) => t.isForsaken);
    const beatable = forsaken.filter((t) => t.forsakenStrength < armyStrength * 0.6);

    if (beatable.length > 0) {
      // Prefer higher value zones
      beatable.sort((a, b) => ZONE_MULTIPLIERS[b.zone] - ZONE_MULTIPLIERS[a.zone]);
      actions.push({
        type: 'attack',
        priority: 6,
        data: { targetId: beatable[0].id },
      });
    }

    // Attack weak players in mid-late game
    if (day > 20 && armyStrength > 300 && threatLevel < 0.4) {
      const playerTargets = targets.filter((t) => !t.isForsaken && t.ownerId);

      for (const target of playerTargets) {
        const enemy = context.allPlayers.get(target.ownerId!);
        if (!enemy) continue;

        const enemyStrength = this.getTotalArmyStrength(enemy);

        // Attack if we have significant advantage
        if (armyStrength > enemyStrength * 1.5) {
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

  private calculateEconomyScore(context: AgentContext): number {
    const { player, territories } = context;

    // Score based on production buildings
    let score = 0;
    const maxScore = territories.length * 3; // Max 3 production buildings per territory

    for (const territory of territories) {
      for (const building of territory.buildings) {
        if (['farm', 'mine', 'lumbermill', 'market'].includes(building.type)) {
          if (building.completed) score += 1;
        }
      }
    }

    return Math.min(1, score / Math.max(1, maxScore));
  }

  private calculateDefenseScore(context: AgentContext): number {
    const { territories } = context;

    let score = 0;
    const maxScore = territories.length * 2;

    for (const territory of territories) {
      for (const building of territory.buildings) {
        if (['wall', 'watchtower', 'gate'].includes(building.type)) {
          if (building.completed) score += 1;
        }
      }
    }

    return Math.min(1, score / Math.max(1, maxScore));
  }

  private assessThreatLevel(context: AgentContext): number {
    const { player, territories, allPlayers, mapEngine } = context;
    const myStrength = this.getTotalArmyStrength(player);

    // Check for nearby enemies
    let maxThreat = 0;

    for (const territory of territories) {
      const adjacent = mapEngine.getAdjacentTerritories(territory.x, territory.y);

      for (const adj of adjacent) {
        if (adj.ownerId && adj.ownerId !== player.id) {
          const enemy = allPlayers.get(adj.ownerId);
          if (enemy) {
            const enemyStrength = this.getTotalArmyStrength(enemy);
            const threat = enemyStrength / Math.max(1, myStrength);
            maxThreat = Math.max(maxThreat, threat);
          }
        }
      }
    }

    return Math.min(1, maxThreat);
  }
}
