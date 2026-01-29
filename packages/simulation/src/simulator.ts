/**
 * Main Simulation Runner
 *
 * Runs multiple generation simulations and aggregates results.
 */

import type { SimulationConfig, SimulationResults, AgentDistribution } from './types.js';
import { GameEngine } from './engine/game.js';
import { BalanceAnalyzer } from './analysis/analyzer.js';

/** Default simulation configuration */
export const DEFAULT_CONFIG: SimulationConfig = {
  generations: 100,
  playersPerGeneration: 20,
  seed: undefined, // Random seed each run
  verbose: false,
  daysPerGeneration: 50,
  agentDistribution: {
    random: 0.1,
    aggressive: 0.25,
    defensive: 0.2,
    economic: 0.2,
    balanced: 0.25,
  },
};

/**
 * Run a full balance simulation
 */
export async function runSimulation(
  config: Partial<SimulationConfig> = {}
): Promise<SimulationResults> {
  const fullConfig: SimulationConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('\n========================================');
  console.log('  NEMETHS DOMAIN - Balance Simulation');
  console.log('========================================\n');
  console.log(`Generations: ${fullConfig.generations}`);
  console.log(`Players per generation: ${fullConfig.playersPerGeneration}`);
  console.log(`Days per generation: ${fullConfig.daysPerGeneration}`);
  console.log(`Seed: ${fullConfig.seed ?? 'random'}`);
  console.log('');

  const gameEngine = new GameEngine(fullConfig);
  const analyzer = new BalanceAnalyzer(fullConfig);

  const startTime = Date.now();

  for (let gen = 1; gen <= fullConfig.generations; gen++) {
    const result = gameEngine.runGeneration(gen);
    analyzer.addGenerationResult(result);

    // Progress update
    if (gen % 10 === 0 || gen === fullConfig.generations) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (gen / parseFloat(elapsed)).toFixed(1);
      process.stdout.write(`\rProgress: ${gen}/${fullConfig.generations} generations (${elapsed}s, ${rate}/s)`);
    }
  }

  console.log('\n');

  const results = analyzer.generateResults();

  printResults(results);

  return results;
}

/**
 * Print simulation results
 */
function printResults(results: SimulationResults): void {
  console.log('========================================');
  console.log('  SIMULATION RESULTS');
  console.log('========================================\n');

  // Balance scores
  console.log('BALANCE SCORES (0-100, higher is better):');
  console.log(`  Overall:  ${results.balanceScore.toFixed(1)}`);
  console.log(`  Race:     ${results.raceBalanceScore.toFixed(1)}`);
  console.log(`  Class:    ${results.classBalanceScore.toFixed(1)}`);
  console.log(`  Skill:    ${results.skillBalanceScore.toFixed(1)}`);
  console.log('');

  // Race statistics
  console.log('RACE STATISTICS:');
  console.log('  Race         Wins    Win%    Avg Score');
  console.log('  ' + '-'.repeat(45));
  for (const [race, stats] of Object.entries(results.raceStats)) {
    const winPct = (stats.winRate * 100).toFixed(1).padStart(5);
    const score = stats.averageScore.toFixed(0).padStart(9);
    console.log(`  ${race.padEnd(12)} ${stats.wins.toString().padStart(4)}    ${winPct}%  ${score}`);
  }
  console.log('');

  // Class statistics
  console.log('CLASS STATISTICS:');
  console.log('  Class            Wins    Win%    Captain Survival');
  console.log('  ' + '-'.repeat(52));
  for (const [cls, stats] of Object.entries(results.classStats)) {
    const winPct = (stats.winRate * 100).toFixed(1).padStart(5);
    const survival = (stats.captainSurvivalRate * 100).toFixed(1).padStart(6);
    console.log(`  ${cls.padEnd(16)} ${stats.wins.toString().padStart(4)}    ${winPct}%        ${survival}%`);
  }
  console.log('');

  // Combat statistics
  console.log('COMBAT STATISTICS:');
  console.log(`  Total combats:     ${results.combatStats.totalCombats}`);
  console.log(`  Attacker win rate: ${(results.combatStats.attackerWinRate * 100).toFixed(1)}%`);
  console.log(`  Defender win rate: ${(results.combatStats.defenderWinRate * 100).toFixed(1)}%`);
  console.log(`  Draw rate:         ${(results.combatStats.drawRate * 100).toFixed(1)}%`);
  console.log(`  Critical hits:     ${(results.combatStats.criticalHitRate * 100).toFixed(1)}%`);
  console.log(`  Critical misses:   ${(results.combatStats.criticalMissRate * 100).toFixed(1)}%`);
  console.log('');

  // Game statistics
  console.log('GAME STATISTICS:');
  console.log(`  Average game length:     ${results.averageGameLength.toFixed(1)} days`);
  console.log(`  Average winner score:    ${results.averageWinnerScore.toFixed(0)}`);
  console.log(`  Average winner territory:${results.averageTerritoryPerWinner.toFixed(1)} plots`);
  console.log(`  Average players at end:  ${results.averagePlayersRemaining.toFixed(1)}`);
  console.log('');

  // Balance issues
  if (results.issues.length > 0) {
    console.log('BALANCE ISSUES DETECTED:');
    for (const issue of results.issues) {
      const icon = issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'high' ? '🟠' :
                   issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.description}`);
      console.log(`     Suggestion: ${issue.suggestion}`);
    }
    console.log('');
  } else {
    console.log('✅ No significant balance issues detected!\n');
  }

  // Agent win rates
  console.log('AGENT TYPE WIN RATES:');
  for (const [type, wins] of Object.entries(results.winsByAgentType)) {
    const rate = ((wins / results.totalGenerations) * 100).toFixed(1);
    console.log(`  ${type.padEnd(12)} ${wins.toString().padStart(4)} wins (${rate}%)`);
  }
  console.log('');
}

/**
 * Run a quick balance check (fewer generations, less output)
 */
export async function quickBalanceCheck(
  generations: number = 50
): Promise<{ balanced: boolean; score: number; issues: string[] }> {
  const results = await runSimulation({
    generations,
    verbose: false,
  });

  return {
    balanced: results.balanceScore >= 70 && results.issues.filter((i) => i.severity === 'critical').length === 0,
    score: results.balanceScore,
    issues: results.issues.map((i) => `[${i.severity}] ${i.description}`),
  };
}

// Export types
export type { SimulationConfig, SimulationResults, AgentDistribution };
