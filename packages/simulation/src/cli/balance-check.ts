#!/usr/bin/env node
/**
 * CLI: Quick Balance Check
 *
 * A quick check that returns pass/fail status for CI integration.
 *
 * Usage:
 *   pnpm balance-check           # Quick check (50 generations)
 *   pnpm balance-check --strict  # Strict check (require 80+ balance score)
 */

import { quickBalanceCheck } from '../simulator.js';

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const generations = args.includes('--generations')
    ? parseInt(args[args.indexOf('--generations') + 1], 10)
    : 50;

  console.log('\n🎮 Nemeths Domain - Balance Check\n');
  console.log(`Running ${generations} generation simulation...\n`);

  try {
    const result = await quickBalanceCheck(generations);

    const threshold = strict ? 80 : 70;
    const passed = result.score >= threshold && result.balanced;

    console.log('\n' + '='.repeat(40));
    console.log('BALANCE CHECK RESULT');
    console.log('='.repeat(40) + '\n');

    console.log(`Balance Score: ${result.score.toFixed(1)} / 100`);
    console.log(`Threshold:     ${threshold}`);
    console.log(`Status:        ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (result.issues.length > 0) {
      console.log('\nIssues found:');
      for (const issue of result.issues) {
        console.log(`  - ${issue}`);
      }
    }

    console.log('');

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('Balance check failed:', error);
    process.exit(1);
  }
}

main();
