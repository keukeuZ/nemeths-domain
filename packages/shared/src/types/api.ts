import type { Race, CaptainClass, CaptainSkill, Resources, Generation } from './game.js';
import type { Player, PlayerScore, EntryTier } from './player.js';
import type { Territory, TerritoryWithDetails } from './territory.js';
import type { Army, UnitType } from './units.js';
import type { BuildingType, Building } from './buildings.js';
import type { Combat } from './combat.js';

// ==========================================
// API TYPES
// ==========================================

// Generic API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ==========================================
// AUTH
// ==========================================

export interface AuthNonceRequest {
  walletAddress: string;
}

export interface AuthNonceResponse {
  nonce: string;
  expiresAt: Date;
}

export interface AuthVerifyRequest {
  walletAddress: string;
  signature: string;
  nonce: string;
}

export interface AuthVerifyResponse {
  token: string;
  expiresAt: Date;
  player: Player | null;
}

// ==========================================
// PLAYER
// ==========================================

export interface CreatePlayerRequest {
  race: Race;
  captainName: string;
  captainClass: CaptainClass;
  captainSkill: CaptainSkill;
  entryTier: EntryTier;
  selectedTerritories: { x: number; y: number }[];
}

export interface CreatePlayerResponse {
  player: Player;
  territories: Territory[];
}

export interface PlayerProfileResponse {
  player: Player;
  territories: TerritoryWithDetails[];
  armies: Army[];
  score: PlayerScore;
}

// ==========================================
// TERRITORY
// ==========================================

export interface GetTerritoryRequest {
  x: number;
  y: number;
}

export interface GetTerritoryResponse {
  territory: TerritoryWithDetails;
  buildings: Building[];
  army: Army | null;
}

export interface ClaimTerritoryRequest {
  x: number;
  y: number;
}

export interface ClaimTerritoryResponse {
  territory: Territory;
  remainingClaims: number;
}

// ==========================================
// BUILDINGS
// ==========================================

export interface BuildRequest {
  territoryId: string;
  buildingType: BuildingType;
}

export interface BuildResponse {
  building: Building;
  resourcesSpent: Partial<Resources>;
  completesAt: Date;
}

export interface DestroyBuildingRequest {
  buildingId: string;
}

export interface DestroyBuildingResponse {
  refundedResources: Partial<Resources>;
}

// ==========================================
// UNITS
// ==========================================

export interface TrainUnitsRequest {
  territoryId: string;
  unitType: UnitType;
  quantity: number;
}

export interface TrainUnitsResponse {
  army: Army;
  resourcesSpent: Partial<Resources>;
  completesAt: Date;
}

export interface MoveArmyRequest {
  armyId: string;
  targetTerritoryId: string;
}

export interface MoveArmyResponse {
  army: Army;
  arrivesAt: Date;
  path: { x: number; y: number }[];
}

// ==========================================
// COMBAT
// ==========================================

export interface AttackRequest {
  armyId: string;
  targetTerritoryId: string;
}

export interface AttackResponse {
  combat: Combat;
  startsAt: Date;
}

export interface GetCombatRequest {
  combatId: string;
}

export interface GetCombatResponse {
  combat: Combat;
}

// ==========================================
// GAME STATE
// ==========================================

export interface GetGenerationResponse {
  generation: Generation;
  dayNumber: number;
  nextHeartbeat: Date | null;
}

export interface GetLeaderboardRequest extends PaginationParams {
  sortBy?: 'score' | 'territories' | 'armies' | 'kills';
}

export interface GetLeaderboardResponse extends PaginatedResponse<PlayerScore> {}

export interface GetMapStateRequest {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface GetMapStateResponse {
  territories: TerritoryWithDetails[];
  lastUpdated: Date;
}
