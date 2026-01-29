#!/usr/bin/env node
/**
 * CLI: Run Balance Simulation
 *
 * Usage:
 *   pnpm simulate                      # Run with defaults (100 generations)
 *   pnpm simulate --generations 1000   # Run 1000 generations
 *   pnpm simulate --seed 12345         # Use specific seed for reproducibility
 *   pnpm simulate --verbose            # Show detailed output
 *   pnpm simulate --players 50         # 50 players per generation
 */

import { runSimulation } from '../simulator.js';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const config: Record<string, number | boolean | undefined> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--generations' || arg === '-g') {
      config.generations = parseInt(args[++i], 10);
    } else if (arg === '--seed' || arg === '-s') {
      config.seed = parseInt(args[++i], 10);
    } else if (arg === '--players' || arg === '-p') {
      config.playersPerGeneration = parseInt(args[++i], 10);
    } else if (arg === '--days' || arg === '-d') {
      config.daysPerGeneration = parseInt(args[++i], 10);
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  try {
    await runSimulation(config);
  } catch (error) {
    console.error('Simulation failed:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Nemeths Domain - Balance Simulation

Usage:
  pnpm simulate [options]

Options:
  -g, --generations <n>  Number of generations to simulate (default: 100)
  -p, --players <n>      Players per generation (default: 20)
  -d, --days <n>         Days per generation (default: 50)
  -s, --seed <n>         Random seed for reproducibility
  -v, --verbose          Show detailed output for each generation
  -h, --help             Show this help message

Examples:
  pnpm simulate                        # Run 100 generations
  pnpm simulate -g 1000                # Run 1000 generations
  pnpm simulate -g 500 -s 42           # Run 500 generations with seed 42
  pnpm simulate -g 100 -p 50 -v        # 100 gens, 50 players, verbose
`);
}

main();
