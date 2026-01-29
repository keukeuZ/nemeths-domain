import { eq, and, sql } from 'drizzle-orm';
import { db, pool } from '../db/connection.js';
import { players, territories, armies } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import {
  type Race,
  type CaptainClass,
  type CaptainSkill,
  type Resources,
  ENTRY_TIERS,
  CAPTAIN_SKILLS,
} from '@nemeths/shared';
import {
  getCurrentGeneration,
  getLateJoinerBonus,
  incrementPlayerCount,
} from './generation.js';
import { getAvailableStartingPositions } from './map/index.js';

// ==========================================
// PLAYER SERVICE
// ==========================================

export interface CreatePlayerInput {
  walletAddress: string;
  race: Race;
  captainName: string;
  captainClass: CaptainClass;
  captainSkill: CaptainSkill;
  isPremium: boolean;
}

export interface PlayerInfo {
  id: string;
  walletAddress: string;
  generationId: string;
  race: Race;
  captainName: string;
  captainClass: CaptainClass;
  captainSkill: CaptainSkill;
  captainAlive: boolean;
  captainWoundedUntil: Date | null;
  isPremium: boolean;
  joinedAt: Date;
  protectedUntil: Date | null;
  resources: Resources;
  totalKills: number;
  totalDeaths: number;
  battlesWon: number;
  battlesLost: number;
}

/**
 * Get player by wallet address in current generation
 */
export async function getPlayerByWallet(walletAddress: string): Promise<PlayerInfo | null> {
  const generation = await getCurrentGeneration();
  if (!generation) return null;

  const [player] = await db
    .select()
    .from(players)
    .where(
      and(
        eq(players.walletAddress, walletAddress.toLowerCase()),
        eq(players.generationId, generation.id)
      )
    )
    .limit(1);

  if (!player) return null;

  return playerToInfo(player);
}

/**
 * Get player by ID
 */
export async function getPlayerById(id: string): Promise<PlayerInfo | null> {
  const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);

  if (!player) return null;

  return playerToInfo(player);
}

/**
 * Validate captain skill matches class
 */
function validateSkillForClass(captainClass: CaptainClass, skill: CaptainSkill): boolean {
  const validSkills = CAPTAIN_SKILLS[captainClass] as readonly string[];
  return validSkills.includes(skill);
}

/**
 * Create a new player for the current generation
 */
export async function createPlayer(input: CreatePlayerInput): Promise<{
  player: PlayerInfo;
  territories: Array<{ x: number; y: number }>;
}> {
  const generation = await getCurrentGeneration();
  if (!generation) {
    throw new Error('No active generation');
  }

  // Check if player already exists in this generation
  const existing = await getPlayerByWallet(input.walletAddress);
  if (existing) {
    throw new Error('Player already registered in this generation');
  }

  // Validate skill for class
  if (!validateSkillForClass(input.captainClass, input.captainSkill)) {
    throw new Error(`Invalid skill '${input.captainSkill}' for class '${input.captainClass}'`);
  }

  // Determine entry tier
  const tier = input.isPremium ? ENTRY_TIERS.premium : ENTRY_TIERS.free;
  const plotCount = tier.plots;

  // Get existing player positions for spacing
  const existingPlayers = await db
    .select({ x: territories.x, y: territories.y })
    .from(territories)
    .where(
      and(eq(territories.generationId, generation.id), eq(territories.isForsaken, false))
    );

  const uniquePositions = new Map<string, { x: number; y: number }>();
  for (const pos of existingPlayers) {
    uniquePositions.set(`${pos.x},${pos.y}`, pos);
  }

  // Find starting positions
  const startingPositions = await getAvailableStartingPositions(
    generation.id,
    plotCount,
    Array.from(uniquePositions.values())
  );

  if (!startingPositions) {
    throw new Error('Could not find suitable starting location');
  }

  // Calculate resources with late joiner bonus
  const bonus = getLateJoinerBonus(generation);
  const resources: Resources = {
    gold: Math.floor(tier.resources.gold * (1 + bonus)),
    stone: Math.floor(tier.resources.stone * (1 + bonus)),
    wood: Math.floor(tier.resources.wood * (1 + bonus)),
    food: Math.floor(tier.resources.food * (1 + bonus)),
    mana: tier.resources.mana,
  };

  // Calculate protection period (10 days from now)
  const protectedUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  // Create player
  const [player] = await db
    .insert(players)
    .values({
      walletAddress: input.walletAddress.toLowerCase(),
      generationId: generation.id,
      race: input.race,
      captainName: input.captainName,
      captainClass: input.captainClass,
      captainSkill: input.captainSkill,
      isPremium: input.isPremium,
      resources,
      protectedUntil,
    })
    .returning();

  // Assign territories
  for (const pos of startingPositions) {
    await db
      .update(territories)
      .set({
        ownerId: player.id,
        ownerSince: new Date(),
        isForsaken: false,
        forsakenStrength: 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(territories.generationId, generation.id),
          eq(territories.x, pos.x),
          eq(territories.y, pos.y)
        )
      );
  }

  // Create initial garrison army at first territory
  const firstPos = startingPositions[0];
  const [territory] = await db
    .select()
    .from(territories)
    .where(
      and(
        eq(territories.generationId, generation.id),
        eq(territories.x, firstPos.x),
        eq(territories.y, firstPos.y)
      )
    )
    .limit(1);

  if (territory) {
    await db.insert(armies).values({
      playerId: player.id,
      territoryId: territory.id,
      units: [],
      totalStrength: 0,
      totalFoodConsumption: 0,
      isGarrison: true,
      leadedByCaptain: true,
    });
  }

  // Increment generation player count
  await incrementPlayerCount(generation.id);

  logger.info(
    {
      playerId: player.id,
      walletAddress: input.walletAddress,
      race: input.race,
      class: input.captainClass,
      skill: input.captainSkill,
      plots: plotCount,
    },
    'Player created'
  );

  return {
    player: playerToInfo(player),
    territories: startingPositions,
  };
}

/**
 * Update player resources
 */
export async function updatePlayerResources(
  playerId: string,
  delta: Partial<Resources>
): Promise<Resources> {
  const player = await getPlayerById(playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  const newResources: Resources = {
    gold: Math.max(0, player.resources.gold + (delta.gold || 0)),
    stone: Math.max(0, player.resources.stone + (delta.stone || 0)),
    wood: Math.max(0, player.resources.wood + (delta.wood || 0)),
    food: Math.max(0, player.resources.food + (delta.food || 0)),
    mana: Math.max(0, player.resources.mana + (delta.mana || 0)),
  };

  await db
    .update(players)
    .set({ resources: newResources, updatedAt: new Date() })
    .where(eq(players.id, playerId));

  return newResources;
}

/**
 * Check if player can afford costs
 */
export function canAfford(playerResources: Resources, cost: Partial<Resources>): boolean {
  if (cost.gold && playerResources.gold < cost.gold) return false;
  if (cost.stone && playerResources.stone < cost.stone) return false;
  if (cost.wood && playerResources.wood < cost.wood) return false;
  if (cost.food && playerResources.food < cost.food) return false;
  if (cost.mana && playerResources.mana < cost.mana) return false;
  return true;
}

/**
 * Deduct resources from player (use after canAfford check)
 * WARNING: Not atomic - prefer deductResourcesAtomic for race-condition safety
 */
export async function deductResources(
  playerId: string,
  cost: Partial<Resources>
): Promise<Resources> {
  return updatePlayerResources(playerId, {
    gold: -(cost.gold || 0),
    stone: -(cost.stone || 0),
    wood: -(cost.wood || 0),
    food: -(cost.food || 0),
    mana: -(cost.mana || 0),
  });
}

/**
 * Atomically check and deduct resources using database transaction with row locking
 * This prevents race conditions where two requests could spend the same resources
 *
 * @returns Updated resources if successful
 * @throws Error if player not found or insufficient resources
 */
export async function deductResourcesAtomic(
  playerId: string,
  cost: Partial<Resources>
): Promise<Resources> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the player row for update - prevents concurrent modifications
    const lockResult = await client.query(
      'SELECT resources FROM players WHERE id = $1 FOR UPDATE',
      [playerId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Player not found');
    }

    const currentResources = lockResult.rows[0].resources as Resources;

    // Check if can afford
    if (cost.gold && currentResources.gold < cost.gold) {
      await client.query('ROLLBACK');
      throw new Error('Insufficient gold');
    }
    if (cost.stone && currentResources.stone < cost.stone) {
      await client.query('ROLLBACK');
      throw new Error('Insufficient stone');
    }
    if (cost.wood && currentResources.wood < cost.wood) {
      await client.query('ROLLBACK');
      throw new Error('Insufficient wood');
    }
    if (cost.food && currentResources.food < cost.food) {
      await client.query('ROLLBACK');
      throw new Error('Insufficient food');
    }
    if (cost.mana && currentResources.mana < cost.mana) {
      await client.query('ROLLBACK');
      throw new Error('Insufficient mana');
    }

    // Calculate new resources
    const newResources: Resources = {
      gold: currentResources.gold - (cost.gold || 0),
      stone: currentResources.stone - (cost.stone || 0),
      wood: currentResources.wood - (cost.wood || 0),
      food: currentResources.food - (cost.food || 0),
      mana: currentResources.mana - (cost.mana || 0),
    };

    // Update resources
    await client.query(
      'UPDATE players SET resources = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(newResources), playerId]
    );

    await client.query('COMMIT');

    logger.debug({ playerId, cost, newResources }, 'Resources deducted atomically');

    return newResources;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Atomically add resources using database transaction with row locking
 */
export async function addResourcesAtomic(
  playerId: string,
  amount: Partial<Resources>,
  options?: { maxMana?: number }
): Promise<Resources> {
  const client = await pool.connect();
  const maxMana = options?.maxMana ?? 200;

  try {
    await client.query('BEGIN');

    // Lock the player row for update
    const lockResult = await client.query(
      'SELECT resources FROM players WHERE id = $1 FOR UPDATE',
      [playerId]
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Player not found');
    }

    const currentResources = lockResult.rows[0].resources as Resources;

    // Calculate new resources (with mana cap)
    const newResources: Resources = {
      gold: currentResources.gold + (amount.gold || 0),
      stone: currentResources.stone + (amount.stone || 0),
      wood: currentResources.wood + (amount.wood || 0),
      food: currentResources.food + (amount.food || 0),
      mana: Math.min(maxMana, currentResources.mana + (amount.mana || 0)),
    };

    // Update resources
    await client.query(
      'UPDATE players SET resources = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(newResources), playerId]
    );

    await client.query('COMMIT');

    return newResources;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Mark captain as wounded
 */
export async function woundCaptain(playerId: string, hoursWounded: number = 24): Promise<void> {
  const woundedUntil = new Date(Date.now() + hoursWounded * 60 * 60 * 1000);

  await db
    .update(players)
    .set({ captainWoundedUntil: woundedUntil, updatedAt: new Date() })
    .where(eq(players.id, playerId));

  logger.info({ playerId, woundedUntil }, 'Captain wounded');
}

/**
 * Kill captain
 */
export async function killCaptain(playerId: string): Promise<void> {
  await db
    .update(players)
    .set({ captainAlive: false, updatedAt: new Date() })
    .where(eq(players.id, playerId));

  logger.info({ playerId }, 'Captain killed');
}

/**
 * Get player's territories
 */
export async function getPlayerTerritories(playerId: string): Promise<
  Array<{
    id: string;
    x: number;
    y: number;
    zone: string;
    terrain: string;
  }>
> {
  const result = await db
    .select({
      id: territories.id,
      x: territories.x,
      y: territories.y,
      zone: territories.zone,
      terrain: territories.terrain,
    })
    .from(territories)
    .where(eq(territories.ownerId, playerId));

  return result;
}

/**
 * Convert database player to PlayerInfo
 */
function playerToInfo(player: typeof players.$inferSelect): PlayerInfo {
  return {
    id: player.id,
    walletAddress: player.walletAddress,
    generationId: player.generationId,
    race: player.race,
    captainName: player.captainName,
    captainClass: player.captainClass,
    captainSkill: player.captainSkill,
    captainAlive: player.captainAlive,
    captainWoundedUntil: player.captainWoundedUntil,
    isPremium: player.isPremium,
    joinedAt: player.joinedAt,
    protectedUntil: player.protectedUntil,
    resources: player.resources,
    totalKills: player.totalKills,
    totalDeaths: player.totalDeaths,
    battlesWon: player.battlesWon,
    battlesLost: player.battlesLost,
  };
}
