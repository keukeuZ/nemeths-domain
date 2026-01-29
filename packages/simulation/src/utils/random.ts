/**
 * Seeded Random Number Generator (Mulberry32)
 * Allows reproducible simulations for balance testing
 */

export class SeededRandom {
  private state: number;
  private initialSeed: number;

  constructor(seed?: number) {
    this.initialSeed = seed ?? Date.now();
    this.state = this.initialSeed;
  }

  /** Get the initial seed */
  getSeed(): number {
    return this.initialSeed;
  }

  /** Reset to initial state */
  reset(): void {
    this.state = this.initialSeed;
  }

  /** Generate a random number between 0 and 1 */
  random(): number {
    // Mulberry32 algorithm
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Generate a random integer between min (inclusive) and max (inclusive) */
  int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /** Roll a D20 (1-20) */
  d20(): number {
    return this.int(1, 20);
  }

  /** Roll a weighted D20 based on game probabilities */
  weightedD20(): number {
    const r = this.random();
    let cumulative = 0;

    // Weighted distribution from game design (normalized to sum to 1.0)
    // Critical fail (1): 5%, Critical success (20): 5%
    // Low rolls (2-4): 7.5% total, High rolls (17-19): 7.5% total
    // Low-mid (5-8): 15% total, High-mid (13-16): 20% total
    // Middle (9-12): 40% total - most common
    const weights: [number, number][] = [
      [1, 0.05],    // 5% crit fail
      [2, 0.025],   // 2.5%
      [3, 0.025],   // 2.5%
      [4, 0.025],   // 2.5%
      [5, 0.0375],  // 3.75%
      [6, 0.0375],  // 3.75%
      [7, 0.0375],  // 3.75%
      [8, 0.0375],  // 3.75%
      [9, 0.10],    // 10%
      [10, 0.10],   // 10%
      [11, 0.10],   // 10%
      [12, 0.10],   // 10%
      [13, 0.05],   // 5%
      [14, 0.05],   // 5%
      [15, 0.05],   // 5%
      [16, 0.05],   // 5%
      [17, 0.025],  // 2.5%
      [18, 0.025],  // 2.5%
      [19, 0.025],  // 2.5%
      [20, 0.05],   // 5% crit success
    ];
    // Total: 0.05 + 0.075 + 0.15 + 0.40 + 0.20 + 0.075 + 0.05 = 1.0 ✓

    for (const [roll, weight] of weights) {
      cumulative += weight;
      if (r < cumulative) {
        return roll;
      }
    }

    return 20; // Fallback
  }

  /** Pick a random element from an array */
  pick<T>(array: readonly T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  /** Shuffle an array (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Return true with given probability (0-1) */
  chance(probability: number): boolean {
    return this.random() < probability;
  }

  /** Pick a weighted random element */
  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = this.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /** Generate a normally distributed random number (Box-Muller) */
  normal(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

/** Global random instance (can be replaced with seeded version) */
let globalRandom = new SeededRandom();

export function getGlobalRandom(): SeededRandom {
  return globalRandom;
}

export function setGlobalSeed(seed: number): void {
  globalRandom = new SeededRandom(seed);
}

export function resetGlobalRandom(): void {
  globalRandom.reset();
}
