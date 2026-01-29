/**
 * Nemeths Domain - Balance Simulation Framework
 *
 * This package provides tools for running automated game simulations
 * to validate balance and discover degenerate strategies.
 *
 * Usage:
 *   // Run full simulation
 *   import { runSimulation } from '@nemeths/simulation';
 *   const results = await runSimulation({ generations: 1000 });
 *
 *   // Quick balance check
 *   import { quickBalanceCheck } from '@nemeths/simulation';
 *   const { balanced, score, issues } = await quickBalanceCheck();
 *
 * CLI:
 *   pnpm simulate              # Run 100 generation simulation
 *   pnpm simulate -g 1000      # Run 1000 generations
 *   pnpm balance-check         # Quick pass/fail check for CI
 */

// Main exports
export { runSimulation, quickBalanceCheck, DEFAULT_CONFIG } from './simulator.js';

// Types
export type {
  SimulationConfig,
  SimulationResults,
  AgentDistribution,
  SimPlayer,
  SimTerritory,
  SimArmy,
  SimCombat,
  RaceStatistics,
  ClassStatistics,
  SkillStatistics,
  CombatStatistics,
  EconomyStatistics,
  BalanceIssue,
  AgentType,
} from './types.js';

// Engines (for advanced usage)
export { GameEngine, type GenerationResult } from './engine/game.js';
export { CombatEngine } from './engine/combat.js';
export { EconomyEngine } from './engine/economy.js';
export { MapEngine } from './engine/map.js';

// Agents (for custom simulations)
export {
  createAgent,
  BaseAgent,
  RandomAgent,
  AggressiveAgent,
  DefensiveAgent,
  EconomicAgent,
  BalancedAgent,
} from './agents/index.js';

// Analysis
export { BalanceAnalyzer } from './analysis/analyzer.js';

// Utilities
export { SeededRandom, setGlobalSeed, getGlobalRandom } from './utils/random.js';
