import type { Territory, TerritoryWithDetails } from './territory.js';
import type { Army } from './units.js';
import type { Building } from './buildings.js';
import type { Combat, CombatRound } from './combat.js';
import type { Resources, Generation } from './game.js';
import type { Player, PlayerScore } from './player.js';

// ==========================================
// WEBSOCKET EVENT TYPES
// ==========================================

// Client -> Server events
export interface ClientEvents {
  // Connection
  'client:authenticate': { token: string };
  'client:subscribe_territory': { territoryId: string };
  'client:unsubscribe_territory': { territoryId: string };
  'client:subscribe_combat': { combatId: string };
  'client:unsubscribe_combat': { combatId: string };
  'client:ping': { timestamp: number };
}

// Server -> Client events
export interface ServerEvents {
  // Connection
  'server:authenticated': { playerId: string };
  'server:error': { code: string; message: string };
  'server:pong': { timestamp: number; serverTime: number };

  // Player updates
  'player:resources_updated': { resources: Resources };
  'player:territory_gained': { territory: Territory };
  'player:territory_lost': { territory: Territory };
  'player:captain_wounded': { woundedUntil: Date };
  'player:captain_died': {};

  // Territory updates
  'territory:ownership_changed': {
    territory: Territory;
    previousOwner: string | null;
    newOwner: string | null;
  };
  'territory:building_started': {
    territoryId: string;
    building: Building;
  };
  'territory:building_completed': {
    territoryId: string;
    building: Building;
  };
  'territory:building_destroyed': {
    territoryId: string;
    buildingId: string;
  };
  'territory:army_arrived': {
    territoryId: string;
    army: Army;
  };
  'territory:army_departed': {
    territoryId: string;
    armyId: string;
  };

  // Combat updates
  'combat:started': { combat: Combat };
  'combat:round_completed': {
    combatId: string;
    round: CombatRound;
  };
  'combat:ended': { combat: Combat };

  // Map updates (broadcast to all)
  'map:territory_updated': { territory: TerritoryWithDetails };
  'map:bulk_update': { territories: TerritoryWithDetails[] };

  // Generation events
  'generation:heartbeat_warning': {
    heartbeatIn: number; // seconds until heartbeat
    affectedTerritories: string[];
  };
  'generation:heartbeat': {
    clearedTerritories: string[];
    message: string;
  };
  'generation:status_changed': {
    generation: Generation;
  };
  'generation:ended': {
    finalLeaderboard: PlayerScore[];
    winners: Player[];
  };

  // Notifications
  'notification:attack_incoming': {
    targetTerritoryId: string;
    attackerRace: string;
    estimatedArrival: Date;
    armySize: 'small' | 'medium' | 'large' | 'massive';
  };
  'notification:alliance_request': {
    fromPlayerId: string;
    fromPlayerName: string;
  };
  'notification:message': {
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
  };
}

// Event payload helper type
export type ServerEventPayload<K extends keyof ServerEvents> = ServerEvents[K];
export type ClientEventPayload<K extends keyof ClientEvents> = ClientEvents[K];

// Room types for Socket.io
export type RoomType = 'territory' | 'combat' | 'player' | 'broadcast';

export function getRoomId(type: RoomType, id: string): string {
  return `${type}:${id}`;
}
