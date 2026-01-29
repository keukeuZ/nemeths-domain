/**
 * Random Agent
 *
 * Makes random decisions. Useful as a baseline for comparison.
 */

import type { AgentAction } from '../types.js';
import { BaseAgent, type AgentContext } from './base.js';
import type { SeededRandom } from '../utils/random.js';

export class RandomAgent extends BaseAgent {
  constructor(random: SeededRandom) {
    super('random', random);
  }

  decideActions(context: AgentContext): AgentAction[] {
    const actions: AgentAction[] = [];
    const { player, territories, day, phase } = context;

    // Random chance to build
    if (this.random.chance(0.4) && territories.length > 0) {
      const available = this.getAvailableBuildings(context);
      if (available.length > 0) {
        const buildingType = this.random.pick(available);
        const territory = this.findBestBuildTerritory(context, buildingType);
        if (territory) {
          actions.push({
            type: 'build',
            priority: this.random.int(1, 10),
            data: { buildingType, territoryId: territory.id },
          });
        }
      }
    }

    // Random chance to train units
    if (this.random.chance(0.5)) {
      const available = this.getAvailableUnits(context);
      if (available.length > 0) {
        const unitType = this.random.pick(available);
        const quantity = this.random.int(1, 5);
        actions.push({
          type: 'train',
          priority: this.random.int(1, 10),
          data: { unitType, quantity },
        });
      }
    }

    // Random chance to attack (after planning phase)
    if (phase !== 'planning' && this.random.chance(0.3)) {
      const targets = this.findAttackTargets(context);
      if (targets.length > 0) {
        const target = this.random.pick(targets);
        actions.push({
          type: 'attack',
          priority: this.random.int(1, 10),
          data: { targetId: target.id },
        });
      }
    }

    // Random chance to just wait
    if (actions.length === 0 || this.random.chance(0.2)) {
      actions.push({
        type: 'wait',
        priority: 0,
        data: {},
      });
    }

    return actions;
  }
}
