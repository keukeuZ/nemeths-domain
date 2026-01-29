/**
 * Simulation Framework Types
 */

import type {
  Race,
  CaptainClass,
  CaptainSkill,
  Resources,
  Zone,
  Terrain,
  UnitType,
  BuildingType,
} from '@nemeths/shared';

// ==========================================
// SIMULATION CONFIGURATION
// ==========================================

export interface SimulationConfig {
  /** Number of generations to simulate */
  generations: number;
  /** Players per generation (6-100) */
  playersPerGeneration: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Enable verbose logging */
  verbose: boolean;
  /** Days per generation (default 50) */
  daysPerGeneration: number;
  /** Distribution of player types */
  agentDistribution: AgentDistribution;
  /** Balance parameters to test */
  balanceParams?: BalanceParams;
}

export interface AgentDistribution {
  random: number;      // 0-1, proportion of random agents
  aggressive: number;  // 0-1, proportion of aggressive agents
  defensive: number;   // 0-1, proportion of defensive agents
  economic: number;    // 0-1, proportion of economy-focused agents
  balanced: number;    // 0-1, proportion of balanced agents
}

export interface BalanceParams {
  /** Override D20 roll weights */
  d20Weights?: Record<number, number>;
  /** Override race bonuses */
  raceBonuses?: Partial<Record<Race, RaceBonus>>;
  /** Override unit stats */
  unitOverrides?: Partial<Record<UnitType, UnitStatOverride>>;
}

export interface RaceBonus {
  attackModifier: number;
  defenseModifier: number;
  economyModifier: number;
  foodConsumption: number;
}

export interface UnitStatOverride {
  atk?: number;
  def?: number;
  hp?: number;
  cost?: number;
}

// ==========================================
// SIMULATION STATE
// ==========================================

export interface SimulationState {
  generationId: number;
  day: number;
  phase: 'planning' | 'active' | 'endgame';
  players: Map<string, SimPlayer>;
  territories: Map<string, SimTerritory>;
  combatLog: SimCombat[];
  events: SimEvent[];
}

export interface SimPlayer {
  id: string;
  race: Race;
  captainClass: CaptainClass;
  captainSkill: CaptainSkill;
  captainAlive: boolean;
  resources: Resources;
  territories: Set<string>;
  armies: SimArmy[];
  buildings: SimBuilding[];
  score: number;
  agentType: AgentType;
  isEliminated: boolean;
  joinedDay: number;
  isPremium: boolean;
  morale: number;
  battlesWon: number;
  battlesLost: number;
  totalKills: number;
  totalDeaths: number;
}

export interface SimTerritory {
  id: string;
  x: number;
  y: number;
  zone: Zone;
  terrain: Terrain;
  ownerId: string | null;
  isForsaken: boolean;
  forsakenStrength: number;
  buildings: SimBuilding[];
  garrison: SimArmy | null;
}

export interface SimArmy {
  id: string;
  ownerId: string;
  territoryId: string;
  units: SimUnit[];
  totalStrength: number;
  totalFoodConsumption: number;
  hasCaptain: boolean;
}

export interface SimUnit {
  type: UnitType;
  quantity: number;
  currentHp: number;
}

export interface SimBuilding {
  type: BuildingType;
  territoryId: string;
  completed: boolean;
  completionDay: number;
}

export interface SimCombat {
  id: string;
  day: number;
  territoryId: string;
  attackerId: string;
  defenderId: string | null; // null for Forsaken
  attackerStrength: number;
  defenderStrength: number;
  attackerRoll: number;
  defenderRoll: number;
  attackerModifier: number;
  defenderModifier: number;
  result: 'attacker_victory' | 'defender_victory' | 'draw';
  attackerCasualties: number;
  defenderCasualties: number;
  attackerCaptainDied: boolean;
  defenderCaptainDied: boolean;
}

export interface SimEvent {
  day: number;
  type: SimEventType;
  playerId?: string;
  data: Record<string, unknown>;
}

export type SimEventType =
  | 'player_joined'
  | 'player_eliminated'
  | 'territory_claimed'
  | 'territory_lost'
  | 'combat'
  | 'building_completed'
  | 'captain_died'
  | 'generation_phase_change'
  | 'forsaken_spawned';

// ==========================================
// AI AGENTS
// ==========================================

export type AgentType = 'random' | 'aggressive' | 'defensive' | 'economic' | 'balanced';

export interface AgentAction {
  type: AgentActionType;
  priority: number;
  data: Record<string, unknown>;
}

export type AgentActionType =
  | 'build'
  | 'train'
  | 'attack'
  | 'move'
  | 'defend'
  | 'expand'
  | 'upgrade'
  | 'wait';

// ==========================================
// SIMULATION RESULTS
// ==========================================

export interface SimulationResults {
  config: SimulationConfig;
  totalGenerations: number;

  // Win statistics
  winsByRace: Record<Race, number>;
  winsByClass: Record<CaptainClass, number>;
  winsBySkill: Record<CaptainSkill, number>;
  winsByAgentType: Record<AgentType, number>;

  // Performance metrics
  averageGameLength: number;
  averageWinnerScore: number;
  averagePlayersRemaining: number;
  averageTerritoryPerWinner: number;

  // Balance metrics
  balanceScore: number;
  raceBalanceScore: number;
  classBalanceScore: number;
  skillBalanceScore: number;

  // Detailed statistics
  raceStats: Record<Race, RaceStatistics>;
  classStats: Record<CaptainClass, ClassStatistics>;
  skillStats: Record<CaptainSkill, SkillStatistics>;

  // Combat statistics
  combatStats: CombatStatistics;

  // Economy statistics
  economyStats: EconomyStatistics;

  // Warnings and issues
  warnings: string[];
  issues: BalanceIssue[];
}

export interface RaceStatistics {
  race: Race;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  averageScore: number;
  averageTerritoriesHeld: number;
  averageSurvivalDays: number;
  averageCombatsWon: number;
  averageCombatsLost: number;
}

export interface ClassStatistics {
  class: CaptainClass;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  averageScore: number;
  captainSurvivalRate: number;
  averageDeathSaveRoll: number;
}

export interface SkillStatistics {
  skill: CaptainSkill;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  averageScore: number;
  skillEffectiveness: number; // How much the skill contributed to wins
}

export interface CombatStatistics {
  totalCombats: number;
  attackerWinRate: number;
  defenderWinRate: number;
  drawRate: number;
  averageCasualties: number;
  criticalHitRate: number;
  criticalMissRate: number;
  rollDistribution: Record<number, number>; // D20 roll counts
}

export interface EconomyStatistics {
  averageGoldPerDay: number;
  averageFoodPerDay: number;
  averageManaPerDay: number;
  buildingDistribution: Record<BuildingType, number>;
  unitDistribution: Record<UnitType, number>;
  resourceBottlenecks: string[];
}

export interface BalanceIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'race' | 'class' | 'skill' | 'unit' | 'building' | 'combat' | 'economy';
  description: string;
  data: Record<string, unknown>;
  suggestion: string;
}

// ==========================================
// D20 SYSTEM
// ==========================================

/** D20 weighted modifiers (from game design) */
export const D20_WEIGHTED_MODIFIERS: Record<number, number> = {
  1: 50,   // Critical fail
  2: 70,
  3: 70,
  4: 70,
  5: 85,
  6: 85,
  7: 85,
  8: 85,
  9: 100,
  10: 100,
  11: 100,
  12: 100,
  13: 110,
  14: 110,
  15: 110,
  16: 110,
  17: 125,
  18: 125,
  19: 125,
  20: 150, // Critical success
};

/** Roll probability distribution (weighted D20) */
export const D20_PROBABILITIES: Record<number, number> = {
  1: 0.05,   // 5% crit fail
  2: 0.025,
  3: 0.025,
  4: 0.025,
  5: 0.05,
  6: 0.05,
  7: 0.05,
  8: 0.05,
  9: 0.10,
  10: 0.10,
  11: 0.10,
  12: 0.10,
  13: 0.0625,
  14: 0.0625,
  15: 0.0625,
  16: 0.0625,
  17: 0.025,
  18: 0.025,
  19: 0.025,
  20: 0.05,  // 5% crit success
};
