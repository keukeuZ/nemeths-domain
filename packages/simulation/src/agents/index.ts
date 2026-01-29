/**
 * Agent Factory and Exports
 */

import type { AgentType } from '../types.js';
import type { SeededRandom } from '../utils/random.js';
import { BaseAgent } from './base.js';
import { RandomAgent } from './random.js';
import { AggressiveAgent } from './aggressive.js';
import { DefensiveAgent } from './defensive.js';
import { EconomicAgent } from './economic.js';
import { BalancedAgent } from './balanced.js';

export { BaseAgent } from './base.js';
export { RandomAgent } from './random.js';
export { AggressiveAgent } from './aggressive.js';
export { DefensiveAgent } from './defensive.js';
export { EconomicAgent } from './economic.js';
export { BalancedAgent } from './balanced.js';

/**
 * Create an agent of the specified type
 */
export function createAgent(type: AgentType, random: SeededRandom): BaseAgent {
  switch (type) {
    case 'random':
      return new RandomAgent(random);
    case 'aggressive':
      return new AggressiveAgent(random);
    case 'defensive':
      return new DefensiveAgent(random);
    case 'economic':
      return new EconomicAgent(random);
    case 'balanced':
      return new BalancedAgent(random);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

/**
 * Get all agent types
 */
export function getAllAgentTypes(): AgentType[] {
  return ['random', 'aggressive', 'defensive', 'economic', 'balanced'];
}
