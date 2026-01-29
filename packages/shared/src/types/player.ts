import type { Race, CaptainClass, CaptainSkill, Resources } from './game.js';

// ==========================================
// PLAYER TYPES
// ==========================================

export interface Player {
  id: string;
  walletAddress: string;
  generationId: string;

  // Character
  race: Race;
  captainName: string;
  captainClass: CaptainClass;
  captainSkill: CaptainSkill;

  // Status
  captainAlive: boolean;
  captainWoundedUntil: Date | null;
  isPremium: boolean;
  joinedAt: Date;
  protectedUntil: Date | null; // Attack protection for late joiners

  // Resources
  resources: Resources;

  // Statistics
  totalTerritories: number;
  totalArmySize: number;
  totalKills: number;
  totalDeaths: number;
  battlesWon: number;
  battlesLost: number;
}

export interface PlayerStats {
  playerId: string;
  territoriesOwned: number;
  territoriesLost: number;
  buildingsConstructed: number;
  unitsTrainedTotal: number;
  killsTotal: number;
  deathsTotal: number;
  battlesWon: number;
  battlesLost: number;
  resourcesGathered: Resources;
  resourcesSpent: Resources;
  damageDealt: number;
  damageReceived: number;
}

export interface PlayerScore {
  playerId: string;
  walletAddress: string;
  captainName: string;
  race: Race;
  score: number;
  rank: number;
  territoriesControlled: number;
  armyStrength: number;
}

// Entry tiers
export const ENTRY_TIERS = {
  free: {
    plots: 2,
    cost: 0,
    resources: { gold: 1000, stone: 400, wood: 400, food: 200, mana: 0 },
  },
  premium: {
    plots: 10,
    cost: 10, // USDC
    resources: { gold: 5000, stone: 2000, wood: 2000, food: 1000, mana: 0 },
  },
} as const;

export type EntryTier = keyof typeof ENTRY_TIERS;
