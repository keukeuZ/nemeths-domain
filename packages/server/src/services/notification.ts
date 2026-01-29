import { broadcast } from '../socket/index.js';
import { logger } from '../utils/logger.js';
import { getPlayerById } from './player.js';
import type { Race, Resources, Combat, Territory } from '@nemeths/shared';

// ==========================================
// NOTIFICATION SERVICE
// ==========================================

/**
 * Army size categories for notifications (hides exact numbers from defender)
 */
function getArmySizeCategory(strength: number): 'small' | 'medium' | 'large' | 'massive' {
  if (strength < 500) return 'small';
  if (strength < 2000) return 'medium';
  if (strength < 5000) return 'large';
  return 'massive';
}

/**
 * Notify a player that their territory is under attack
 */
export function notifyAttackIncoming(params: {
  defenderId: string;
  targetTerritoryId: string;
  attackerRace: Race;
  armyStrength: number;
  estimatedArrivalMs?: number;
}): void {
  const { defenderId, targetTerritoryId, attackerRace, armyStrength, estimatedArrivalMs = 0 } = params;

  const armySize = getArmySizeCategory(armyStrength);
  const estimatedArrival = new Date(Date.now() + estimatedArrivalMs);

  broadcast.toPlayer(defenderId, 'notification:attack_incoming', {
    targetTerritoryId,
    attackerRace,
    estimatedArrival,
    armySize,
  });

  logger.info(
    { defenderId, targetTerritoryId, attackerRace, armySize },
    'Attack notification sent to defender'
  );
}

/**
 * Notify player of combat start
 */
export function notifyCombatStarted(params: {
  combat: Combat;
  attackerId: string;
  defenderId: string;
}): void {
  const { combat, attackerId, defenderId } = params;

  // Notify attacker
  broadcast.toPlayer(attackerId, 'combat:started', { combat });

  // Notify defender
  broadcast.toPlayer(defenderId, 'combat:started', { combat });

  // Also broadcast to combat room for spectators
  broadcast.toCombat(combat.id, 'combat:started', { combat });

  logger.info(
    { combatId: combat.id, attackerId, defenderId },
    'Combat start notification sent'
  );
}

/**
 * Notify players of combat end
 */
export function notifyCombatEnded(params: {
  combat: Combat;
  attackerId: string;
  defenderId: string;
  winnerId: string | null;
  territoryId: string;
}): void {
  const { combat, attackerId, defenderId, winnerId, territoryId } = params;

  // Notify both players
  broadcast.toPlayer(attackerId, 'combat:ended', { combat });
  broadcast.toPlayer(defenderId, 'combat:ended', { combat });

  // Broadcast to combat room
  broadcast.toCombat(combat.id, 'combat:ended', { combat });

  // Send result notification
  const attackerWon = winnerId === attackerId;
  const defenderWon = winnerId === defenderId;

  if (attackerWon) {
    // Attacker won - they gain territory
    broadcast.toPlayer(attackerId, 'notification:message', {
      type: 'success',
      title: 'Victory!',
      message: 'You have conquered the territory!',
    });
    broadcast.toPlayer(defenderId, 'notification:message', {
      type: 'error',
      title: 'Territory Lost',
      message: 'Your territory has been conquered.',
    });
    broadcast.toPlayer(defenderId, 'player:territory_lost', {
      territory: { id: territoryId } as Territory,
    });
  } else if (defenderWon) {
    // Defender won - territory defended
    broadcast.toPlayer(attackerId, 'notification:message', {
      type: 'error',
      title: 'Attack Repelled',
      message: 'Your attack has been repelled.',
    });
    broadcast.toPlayer(defenderId, 'notification:message', {
      type: 'success',
      title: 'Territory Defended',
      message: 'You have successfully defended your territory!',
    });
  }

  logger.info(
    { combatId: combat.id, winnerId, attackerWon, defenderWon },
    'Combat end notification sent'
  );
}

/**
 * Notify player of resource changes
 */
export function notifyResourcesUpdated(playerId: string, resources: Resources): void {
  broadcast.toPlayer(playerId, 'player:resources_updated', { resources });
}

/**
 * Notify player of captain status change
 */
export function notifyCaptainWounded(playerId: string, woundedUntil: Date): void {
  broadcast.toPlayer(playerId, 'player:captain_wounded', { woundedUntil });
  broadcast.toPlayer(playerId, 'notification:message', {
    type: 'warning',
    title: 'Captain Wounded',
    message: `Your captain has been wounded and will recover by ${woundedUntil.toLocaleString()}.`,
  });
}

/**
 * Notify player of captain death
 */
export function notifyCaptainDied(playerId: string): void {
  broadcast.toPlayer(playerId, 'player:captain_died', {});
  broadcast.toPlayer(playerId, 'notification:message', {
    type: 'error',
    title: 'Captain Fallen',
    message: 'Your captain has fallen in battle!',
  });
}

/**
 * Send a general notification to a player
 */
export function notifyPlayer(
  playerId: string,
  type: 'info' | 'warning' | 'success' | 'error',
  title: string,
  message: string
): void {
  broadcast.toPlayer(playerId, 'notification:message', {
    type,
    title,
    message,
  });
}

/**
 * Send alliance request notification
 */
export function notifyAllianceRequest(targetPlayerId: string, fromPlayerId: string, fromPlayerName: string): void {
  broadcast.toPlayer(targetPlayerId, 'notification:alliance_request', {
    fromPlayerId,
    fromPlayerName,
  });
  broadcast.toPlayer(targetPlayerId, 'notification:message', {
    type: 'info',
    title: 'Alliance Request',
    message: `${fromPlayerName} has invited you to join their alliance.`,
  });
}

/**
 * Notify all players about generation status change
 */
export function notifyGenerationStatusChanged(generation: {
  id: string;
  number: number;
  status: string;
  currentDay: number;
}): void {
  broadcast.toAll('generation:status_changed', {
    generation: generation as any,
  });
}

/**
 * Notify players about upcoming heartbeat (Forsaken spawning)
 */
export function notifyHeartbeatWarning(
  affectedTerritoryIds: string[],
  secondsUntilHeartbeat: number
): void {
  broadcast.toAll('generation:heartbeat_warning', {
    heartbeatIn: secondsUntilHeartbeat,
    affectedTerritories: affectedTerritoryIds,
  });
}
