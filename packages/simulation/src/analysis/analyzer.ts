/**
 * Balance Analyzer
 *
 * Analyzes simulation results to identify balance issues and generate statistics.
 */

import {
  RACES,
  CAPTAIN_CLASSES,
  CAPTAIN_SKILLS,
  BUILDING_TYPES,
  UNIT_TYPES,
  type Race,
  type CaptainClass,
  type CaptainSkill,
  type BuildingType,
  type UnitType,
} from '@nemeths/shared';

import type {
  SimulationConfig,
  SimulationResults,
  SimPlayer,
  SimCombat,
  RaceStatistics,
  ClassStatistics,
  SkillStatistics,
  CombatStatistics,
  EconomyStatistics,
  BalanceIssue,
  AgentType,
} from '../types.js';

import type { GenerationResult } from '../engine/game.js';

/** Acceptable variance threshold for balance (0.1 = 10%) */
const BALANCE_VARIANCE_THRESHOLD = 0.15;

/** Minimum games to consider statistics reliable */
const MIN_GAMES_FOR_RELIABILITY = 50;

export class BalanceAnalyzer {
  private config: SimulationConfig;
  private generationResults: GenerationResult[] = [];

  // Aggregated stats
  private winsByRace: Record<Race, number> = {} as Record<Race, number>;
  private winsByClass: Record<CaptainClass, number> = {} as Record<CaptainClass, number>;
  private winsBySkill: Record<CaptainSkill, number> = {} as Record<CaptainSkill, number>;
  private winsByAgentType: Record<AgentType, number> = {} as Record<AgentType, number>;

  private playsByRace: Record<Race, number> = {} as Record<Race, number>;
  private playsByClass: Record<CaptainClass, number> = {} as Record<CaptainClass, number>;
  private playsBySkill: Record<CaptainSkill, number> = {} as Record<CaptainSkill, number>;

  private raceScores: Record<Race, number[]> = {} as Record<Race, number[]>;
  private classScores: Record<CaptainClass, number[]> = {} as Record<CaptainClass, number[]>;
  private skillScores: Record<CaptainSkill, number[]> = {} as Record<CaptainSkill, number[]>;

  private allCombats: SimCombat[] = [];
  private rollDistribution: Record<number, number> = {};

  constructor(config: SimulationConfig) {
    this.config = config;
    this.initializeCounters();
  }

  /**
   * Initialize all counters
   */
  private initializeCounters(): void {
    for (const race of RACES) {
      this.winsByRace[race] = 0;
      this.playsByRace[race] = 0;
      this.raceScores[race] = [];
    }

    for (const cls of CAPTAIN_CLASSES) {
      this.winsByClass[cls] = 0;
      this.playsByClass[cls] = 0;
      this.classScores[cls] = [];
    }

    const allSkills = Object.values(
      CAPTAIN_SKILLS
    ).flat() as CaptainSkill[];
    for (const skill of allSkills) {
      this.winsBySkill[skill] = 0;
      this.playsBySkill[skill] = 0;
      this.skillScores[skill] = [];
    }

    for (const type of ['random', 'aggressive', 'defensive', 'economic', 'balanced'] as AgentType[]) {
      this.winsByAgentType[type] = 0;
    }

    for (let i = 1; i <= 20; i++) {
      this.rollDistribution[i] = 0;
    }
  }

  /**
   * Add a generation result for analysis
   */
  addGenerationResult(result: GenerationResult): void {
    this.generationResults.push(result);

    // Track plays and scores
    for (const player of result.players) {
      this.playsByRace[player.race]++;
      this.playsByClass[player.captainClass]++;
      this.playsBySkill[player.captainSkill]++;

      this.raceScores[player.race].push(player.score);
      this.classScores[player.captainClass].push(player.score);
      this.skillScores[player.captainSkill].push(player.score);
    }

    // Track winner
    if (result.winner) {
      this.winsByRace[result.winner.race]++;
      this.winsByClass[result.winner.captainClass]++;
      this.winsBySkill[result.winner.captainSkill]++;
      this.winsByAgentType[result.winner.agentType]++;
    }

    // Track combats
    for (const combat of result.combats) {
      this.allCombats.push(combat);
      this.rollDistribution[combat.attackerRoll]++;
      this.rollDistribution[combat.defenderRoll]++;
    }
  }

  /**
   * Generate full simulation results
   */
  generateResults(): SimulationResults {
    const totalGenerations = this.generationResults.length;

    // Calculate race statistics
    const raceStats: Record<Race, RaceStatistics> = {} as Record<Race, RaceStatistics>;
    for (const race of RACES) {
      raceStats[race] = this.calculateRaceStats(race);
    }

    // Calculate class statistics
    const classStats: Record<CaptainClass, ClassStatistics> = {} as Record<
      CaptainClass,
      ClassStatistics
    >;
    for (const cls of CAPTAIN_CLASSES) {
      classStats[cls] = this.calculateClassStats(cls);
    }

    // Calculate skill statistics
    const skillStats: Record<CaptainSkill, SkillStatistics> = {} as Record<
      CaptainSkill,
      SkillStatistics
    >;
    const allSkills = Object.values(
      CAPTAIN_SKILLS
    ).flat() as CaptainSkill[];
    for (const skill of allSkills) {
      skillStats[skill] = this.calculateSkillStats(skill);
    }

    // Calculate combat statistics
    const combatStats = this.calculateCombatStats();

    // Calculate economy statistics
    const economyStats = this.calculateEconomyStats();

    // Calculate balance scores
    const raceBalanceScore = this.calculateBalanceScore(
      Object.values(raceStats).map((s) => s.winRate)
    );
    const classBalanceScore = this.calculateBalanceScore(
      Object.values(classStats).map((s) => s.winRate)
    );
    const skillBalanceScore = this.calculateBalanceScore(
      Object.values(skillStats).map((s) => s.winRate)
    );

    const balanceScore = (raceBalanceScore + classBalanceScore + skillBalanceScore) / 3;

    // Identify balance issues
    const issues = this.identifyBalanceIssues(raceStats, classStats, skillStats, combatStats);
    const warnings = issues.filter((i) => i.severity === 'low' || i.severity === 'medium').map((i) => i.description);

    // Calculate averages
    const gameLengths = this.generationResults.map((r) => r.finalDay);
    const averageGameLength = gameLengths.reduce((a, b) => a + b, 0) / gameLengths.length;

    const winnerScores = this.generationResults
      .filter((r) => r.winner)
      .map((r) => r.winner!.score);
    const averageWinnerScore = winnerScores.length > 0
      ? winnerScores.reduce((a, b) => a + b, 0) / winnerScores.length
      : 0;

    const playersRemaining = this.generationResults.map(
      (r) => r.players.filter((p) => !p.isEliminated).length
    );
    const averagePlayersRemaining = playersRemaining.reduce((a, b) => a + b, 0) / playersRemaining.length;

    const winnerTerritories = this.generationResults
      .filter((r) => r.winner)
      .map((r) => r.winner!.territories.size);
    const averageTerritoryPerWinner = winnerTerritories.length > 0
      ? winnerTerritories.reduce((a, b) => a + b, 0) / winnerTerritories.length
      : 0;

    return {
      config: this.config,
      totalGenerations,

      winsByRace: this.winsByRace,
      winsByClass: this.winsByClass,
      winsBySkill: this.winsBySkill,
      winsByAgentType: this.winsByAgentType,

      averageGameLength,
      averageWinnerScore,
      averagePlayersRemaining,
      averageTerritoryPerWinner,

      balanceScore,
      raceBalanceScore,
      classBalanceScore,
      skillBalanceScore,

      raceStats,
      classStats,
      skillStats,
      combatStats,
      economyStats,

      warnings,
      issues,
    };
  }

  /**
   * Calculate statistics for a race
   */
  private calculateRaceStats(race: Race): RaceStatistics {
    const gamesPlayed = this.playsByRace[race];
    const wins = this.winsByRace[race];
    const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    const scores = this.raceScores[race];
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Calculate survival days
    const survivalDays: number[] = [];
    const territoriesHeld: number[] = [];
    const combatsWon: number[] = [];
    const combatsLost: number[] = [];

    for (const result of this.generationResults) {
      for (const player of result.players) {
        if (player.race === race) {
          survivalDays.push(player.isEliminated ? result.finalDay / 2 : result.finalDay);
          territoriesHeld.push(player.territories.size);
          combatsWon.push(player.battlesWon);
          combatsLost.push(player.battlesLost);
        }
      }
    }

    return {
      race,
      gamesPlayed,
      wins,
      winRate,
      averageScore,
      averageTerritoriesHeld: this.average(territoriesHeld),
      averageSurvivalDays: this.average(survivalDays),
      averageCombatsWon: this.average(combatsWon),
      averageCombatsLost: this.average(combatsLost),
    };
  }

  /**
   * Calculate statistics for a captain class
   */
  private calculateClassStats(cls: CaptainClass): ClassStatistics {
    const gamesPlayed = this.playsByClass[cls];
    const wins = this.winsByClass[cls];
    const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    const scores = this.classScores[cls];
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Calculate captain survival
    let captainsSurvived = 0;
    let captainsTotal = 0;
    let deathSaveRolls: number[] = [];

    for (const result of this.generationResults) {
      for (const player of result.players) {
        if (player.captainClass === cls) {
          captainsTotal++;
          if (player.captainAlive) {
            captainsSurvived++;
          }
        }
      }
    }

    const captainSurvivalRate = captainsTotal > 0 ? captainsSurvived / captainsTotal : 0;

    return {
      class: cls,
      gamesPlayed,
      wins,
      winRate,
      averageScore,
      captainSurvivalRate,
      averageDeathSaveRoll: 10.5, // Placeholder
    };
  }

  /**
   * Calculate statistics for a skill
   */
  private calculateSkillStats(skill: CaptainSkill): SkillStatistics {
    const gamesPlayed = this.playsBySkill[skill] || 0;
    const wins = this.winsBySkill[skill] || 0;
    const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;
    const scores = this.skillScores[skill] || [];
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Calculate effectiveness (how much the skill contributed vs baseline)
    const baselineWinRate = 1 / 12; // 1 in 12 skills
    const effectiveness = winRate > 0 ? winRate / baselineWinRate : 0;

    return {
      skill,
      gamesPlayed,
      wins,
      winRate,
      averageScore,
      skillEffectiveness: effectiveness,
    };
  }

  /**
   * Calculate combat statistics
   */
  private calculateCombatStats(): CombatStatistics {
    const totalCombats = this.allCombats.length;

    if (totalCombats === 0) {
      return {
        totalCombats: 0,
        attackerWinRate: 0,
        defenderWinRate: 0,
        drawRate: 0,
        averageCasualties: 0,
        criticalHitRate: 0,
        criticalMissRate: 0,
        rollDistribution: this.rollDistribution,
      };
    }

    const attackerWins = this.allCombats.filter((c) => c.result === 'attacker_victory').length;
    const defenderWins = this.allCombats.filter((c) => c.result === 'defender_victory').length;
    const draws = this.allCombats.filter((c) => c.result === 'draw').length;

    const totalRolls = Object.values(this.rollDistribution).reduce((a, b) => a + b, 0);
    const criticalHits = this.rollDistribution[20] || 0;
    const criticalMisses = this.rollDistribution[1] || 0;

    const totalCasualties = this.allCombats.reduce(
      (sum, c) => sum + c.attackerCasualties + c.defenderCasualties,
      0
    );

    return {
      totalCombats,
      attackerWinRate: attackerWins / totalCombats,
      defenderWinRate: defenderWins / totalCombats,
      drawRate: draws / totalCombats,
      averageCasualties: totalCasualties / totalCombats,
      criticalHitRate: totalRolls > 0 ? criticalHits / totalRolls : 0,
      criticalMissRate: totalRolls > 0 ? criticalMisses / totalRolls : 0,
      rollDistribution: this.rollDistribution,
    };
  }

  /**
   * Calculate economy statistics
   */
  private calculateEconomyStats(): EconomyStatistics {
    // This would require tracking building/unit usage during simulation
    // For now, return placeholder values
    return {
      averageGoldPerDay: 150,
      averageFoodPerDay: 50,
      averageManaPerDay: 20,
      buildingDistribution: {} as Record<BuildingType, number>,
      unitDistribution: {} as Record<UnitType, number>,
      resourceBottlenecks: [],
    };
  }

  /**
   * Calculate balance score (0-100)
   */
  private calculateBalanceScore(winRates: number[]): number {
    if (winRates.length === 0) return 100;

    const expectedWinRate = 1 / winRates.length;
    const variance = this.calculateVariance(winRates);
    const maxVariance = expectedWinRate * expectedWinRate; // Worst case: one wins all

    // Score is inverted variance (lower variance = higher score)
    const score = Math.max(0, 100 * (1 - variance / maxVariance));
    return Math.round(score);
  }

  /**
   * Identify balance issues
   */
  private identifyBalanceIssues(
    raceStats: Record<Race, RaceStatistics>,
    classStats: Record<CaptainClass, ClassStatistics>,
    skillStats: Record<CaptainSkill, SkillStatistics>,
    combatStats: CombatStatistics
  ): BalanceIssue[] {
    const issues: BalanceIssue[] = [];

    // Check race balance
    const expectedRaceWinRate = 1 / RACES.length;
    for (const [race, stats] of Object.entries(raceStats)) {
      if (stats.gamesPlayed < MIN_GAMES_FOR_RELIABILITY) continue;

      const deviation = Math.abs(stats.winRate - expectedRaceWinRate) / expectedRaceWinRate;

      if (deviation > 0.5) {
        issues.push({
          severity: deviation > 0.75 ? 'critical' : 'high',
          category: 'race',
          description: `${race} has ${stats.winRate > expectedRaceWinRate ? 'high' : 'low'} win rate (${(stats.winRate * 100).toFixed(1)}% vs expected ${(expectedRaceWinRate * 100).toFixed(1)}%)`,
          data: { race, winRate: stats.winRate, expected: expectedRaceWinRate },
          suggestion: stats.winRate > expectedRaceWinRate
            ? `Consider nerfing ${race}'s unique abilities`
            : `Consider buffing ${race}'s unique abilities`,
        });
      } else if (deviation > 0.25) {
        issues.push({
          severity: 'medium',
          category: 'race',
          description: `${race} win rate is ${stats.winRate > expectedRaceWinRate ? 'above' : 'below'} average (${(stats.winRate * 100).toFixed(1)}%)`,
          data: { race, winRate: stats.winRate },
          suggestion: 'Monitor in future simulations',
        });
      }
    }

    // Check class balance
    const expectedClassWinRate = 1 / CAPTAIN_CLASSES.length;
    for (const [cls, stats] of Object.entries(classStats)) {
      if (stats.gamesPlayed < MIN_GAMES_FOR_RELIABILITY) continue;

      const deviation = Math.abs(stats.winRate - expectedClassWinRate) / expectedClassWinRate;

      if (deviation > 0.5) {
        issues.push({
          severity: deviation > 0.75 ? 'critical' : 'high',
          category: 'class',
          description: `${cls} captain class has unbalanced win rate (${(stats.winRate * 100).toFixed(1)}%)`,
          data: { class: cls, winRate: stats.winRate },
          suggestion: `Review ${cls} base abilities and skill synergies`,
        });
      }
    }

    // Check combat balance
    if (combatStats.totalCombats > 100) {
      // Attacker should win ~45-55% (slight defender advantage)
      if (combatStats.attackerWinRate > 0.6) {
        issues.push({
          severity: 'high',
          category: 'combat',
          description: `Attackers win too often (${(combatStats.attackerWinRate * 100).toFixed(1)}%)`,
          data: { attackerWinRate: combatStats.attackerWinRate },
          suggestion: 'Increase defender bonuses or wall effectiveness',
        });
      } else if (combatStats.attackerWinRate < 0.35) {
        issues.push({
          severity: 'high',
          category: 'combat',
          description: `Attackers win too rarely (${(combatStats.attackerWinRate * 100).toFixed(1)}%)`,
          data: { attackerWinRate: combatStats.attackerWinRate },
          suggestion: 'Reduce defender bonuses or improve siege effectiveness',
        });
      }

      // Critical hit/miss should be ~5% each
      if (combatStats.criticalHitRate < 0.03 || combatStats.criticalHitRate > 0.07) {
        issues.push({
          severity: 'low',
          category: 'combat',
          description: `Critical hit rate deviates from expected (${(combatStats.criticalHitRate * 100).toFixed(1)}% vs 5%)`,
          data: { criticalHitRate: combatStats.criticalHitRate },
          suggestion: 'Verify D20 roll distribution',
        });
      }
    }

    return issues;
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate average of an array
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
