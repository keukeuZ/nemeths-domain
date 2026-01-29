import { eq, lt, and, gt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { generations, players, territories, armies, buildings, activeSpellEffects, spellCooldowns } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { runDailyTick, processBreathBornDecay, processStarvation } from './resources.js';
import { processPackAlphaSummon } from './captain.js';
import { cleanupExpiredEffects, calculateManaGeneration } from './spell.js';
import { getPlayerById, updatePlayerResources } from './player.js';
import { GENERATION_LENGTH_DAYS, type GenerationStatus } from '@nemeths/shared';

// ==========================================
// SCHEDULER SERVICE - GENERATION LIFECYCLE
// ==========================================

// Generation phase thresholds (days)
const PLANNING_PHASE_END = 5; // Days 1-5: Planning
const ACTIVE_PHASE_END = 45; // Days 6-45: Active
const ENDGAME_PHASE_END = 50; // Days 46-50: Endgame

// Daily tick schedule (in ms since midnight)
const DAILY_TICK_TIME = 0; // Midnight UTC

// Heartbeat intervals
const HEARTBEAT_INTERVAL_DAYS = 7; // Every 7 days

// Leadership decay (endgame)
const LEADERSHIP_DECAY_START_DAY = 46;
const LEADERSHIP_DECAY_PERCENT = 0.05; // 5% per day

export interface GenerationState {
  id: string;
  number: number;
  status: GenerationStatus;
  currentDay: number;
  daysRemaining: number;
  nextPhase: GenerationStatus | null;
  nextHeartbeat: Date | null;
}

/**
 * Get current generation state
 */
export async function getGenerationState(generationId: string): Promise<GenerationState | null> {
  const [generation] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (!generation) return null;

  const now = new Date();
  const startTime = generation.startedAt.getTime();
  const currentTime = now.getTime();
  const msPerDay = 24 * 60 * 60 * 1000;

  const currentDay = Math.floor((currentTime - startTime) / msPerDay) + 1;
  const daysRemaining = Math.max(0, GENERATION_LENGTH_DAYS - currentDay);

  // Determine next phase
  let nextPhase: GenerationStatus | null = null;
  if (generation.status === 'planning' && currentDay >= PLANNING_PHASE_END) {
    nextPhase = 'active';
  } else if (generation.status === 'active' && currentDay >= ACTIVE_PHASE_END) {
    nextPhase = 'endgame';
  } else if (generation.status === 'endgame' && currentDay >= ENDGAME_PHASE_END) {
    nextPhase = 'ended';
  }

  // Calculate next heartbeat
  const nextHeartbeatDay =
    Math.ceil(currentDay / HEARTBEAT_INTERVAL_DAYS) * HEARTBEAT_INTERVAL_DAYS;
  const nextHeartbeat = new Date(startTime + nextHeartbeatDay * msPerDay);

  return {
    id: generation.id,
    number: generation.number,
    status: generation.status,
    currentDay,
    daysRemaining,
    nextPhase,
    nextHeartbeat: nextHeartbeatDay <= GENERATION_LENGTH_DAYS ? nextHeartbeat : null,
  };
}

/**
 * Process daily tick for a generation
 */
export async function processDailyTick(generationId: string): Promise<{
  processed: boolean;
  playersProcessed: number;
  phaseChanged: boolean;
  newPhase?: GenerationStatus;
}> {
  const state = await getGenerationState(generationId);
  if (!state) {
    return { processed: false, playersProcessed: 0, phaseChanged: false };
  }

  logger.info(
    { generationId, currentDay: state.currentDay, status: state.status },
    'Processing daily tick'
  );

  // Check for phase transition
  let phaseChanged = false;
  let newPhase: GenerationStatus | undefined;

  if (state.nextPhase && state.nextPhase !== state.status) {
    await transitionPhase(generationId, state.nextPhase);
    phaseChanged = true;
    newPhase = state.nextPhase;
  }

  // Process resource tick
  const tickResult = await runDailyTick(generationId);

  // Process special daily effects
  await processDailySpecialEffects(generationId, state.currentDay);

  // Cleanup expired spell effects
  cleanupExpiredEffects();

  // Process mana regeneration
  await processDailyManaRegeneration(generationId);

  logger.info(
    {
      generationId,
      playersProcessed: tickResult.playersProcessed,
      phaseChanged,
      newPhase,
    },
    'Daily tick completed'
  );

  return {
    processed: true,
    playersProcessed: tickResult.playersProcessed,
    phaseChanged,
    newPhase,
  };
}

/**
 * Transition generation to new phase
 */
async function transitionPhase(
  generationId: string,
  newPhase: GenerationStatus
): Promise<void> {
  await db
    .update(generations)
    .set({ status: newPhase, updatedAt: new Date() })
    .where(eq(generations.id, generationId));

  logger.info({ generationId, newPhase }, 'Generation phase transitioned');

  // Phase-specific actions
  switch (newPhase) {
    case 'active':
      // Planning phase ended - PvP enabled
      await onActivePhaseStart(generationId);
      break;
    case 'endgame':
      // Endgame starts - leadership decay begins
      await onEndgamePhaseStart(generationId);
      break;
    case 'ended':
      // Generation ended - finalize scores
      await onGenerationEnd(generationId);
      break;
  }
}

/**
 * Actions when active phase starts
 */
async function onActivePhaseStart(generationId: string): Promise<void> {
  // Remove new player protection for players who joined during planning
  const planningPlayers = await db
    .select()
    .from(players)
    .where(eq(players.generationId, generationId));

  for (const player of planningPlayers) {
    // Reset protection to standard 10 days from now
    const protectedUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await db
      .update(players)
      .set({ protectedUntil, updatedAt: new Date() })
      .where(eq(players.id, player.id));
  }

  logger.info({ generationId }, 'Active phase started - PvP enabled');
}

/**
 * Actions when endgame phase starts
 */
async function onEndgamePhaseStart(generationId: string): Promise<void> {
  // No immediate action - leadership decay handled in daily tick
  logger.info({ generationId }, 'Endgame phase started - leadership decay begins');
}

/**
 * Actions when generation ends
 */
async function onGenerationEnd(generationId: string): Promise<void> {
  // Calculate final scores and rankings
  const allPlayers = await db
    .select()
    .from(players)
    .where(eq(players.generationId, generationId));

  const rankings: Array<{
    playerId: string;
    score: number;
    territories: number;
    kills: number;
    battlesWon: number;
  }> = [];

  for (const player of allPlayers) {
    const playerTerritories = await db
      .select()
      .from(territories)
      .where(eq(territories.ownerId, player.id));

    // Calculate score (simplified)
    const score =
      playerTerritories.length * 100 +
      player.totalKills * 10 +
      player.battlesWon * 50 +
      player.resources.gold;

    rankings.push({
      playerId: player.id,
      score,
      territories: playerTerritories.length,
      kills: player.totalKills,
      battlesWon: player.battlesWon,
    });
  }

  // Sort by score
  rankings.sort((a, b) => b.score - a.score);

  // Log winners (top 3)
  logger.info(
    {
      generationId,
      first: rankings[0],
      second: rankings[1],
      third: rankings[2],
    },
    'Generation ended - final rankings'
  );

  // In production, this would record to Titan's Witness on-chain
}

/**
 * Process daily special effects
 */
async function processDailySpecialEffects(
  generationId: string,
  currentDay: number
): Promise<void> {
  const allPlayers = await db
    .select()
    .from(players)
    .where(eq(players.generationId, generationId));

  for (const player of allPlayers) {
    // Pack Alpha wolf summon
    if (player.captainSkill === 'packalpha') {
      await processPackAlphaSummon(player.id);
    }

    // Breath-Born building decay
    if (player.race === 'breathborn') {
      await processBreathBornDecay(player.id);
    }

    // Leadership decay in endgame
    if (currentDay >= LEADERSHIP_DECAY_START_DAY) {
      await processLeadershipDecay(player.id, currentDay);
    }

    // Starvation effects
    await processStarvation(player.id);
  }
}

/**
 * Process leadership decay (endgame mechanic)
 */
async function processLeadershipDecay(
  playerId: string,
  currentDay: number
): Promise<void> {
  const player = await getPlayerById(playerId);
  if (!player) return;

  // Get player's territories
  const playerTerritories = await db
    .select()
    .from(territories)
    .where(eq(territories.ownerId, playerId));

  // Calculate decay - larger empires decay faster
  const territoryCount = playerTerritories.length;
  if (territoryCount <= 5) return; // Small players don't decay

  // Decay chance increases with territory count
  const decayChance = Math.min(0.3, (territoryCount - 5) * 0.02);

  for (const territory of playerTerritories) {
    if (Math.random() < decayChance * LEADERSHIP_DECAY_PERCENT) {
      // Territory becomes Forsaken
      await db
        .update(territories)
        .set({
          ownerId: null,
          ownerSince: null,
          isForsaken: true,
          forsakenStrength: Math.floor(100 + Math.random() * 200),
          updatedAt: new Date(),
        })
        .where(eq(territories.id, territory.id));

      logger.info(
        { playerId, territoryId: territory.id },
        'Territory lost to leadership decay'
      );
    }
  }
}

/**
 * Process daily mana regeneration
 */
async function processDailyManaRegeneration(generationId: string): Promise<void> {
  const allPlayers = await db
    .select()
    .from(players)
    .where(eq(players.generationId, generationId));

  for (const player of allPlayers) {
    const manaGain = await calculateManaGeneration(player.id);

    // Get current mana cap (based on buildings)
    const maxMana = 200; // Would calculate from mage towers

    const newMana = Math.min(maxMana, player.resources.mana + manaGain);

    await db
      .update(players)
      .set({
        resources: { ...player.resources, mana: newMana },
        updatedAt: new Date(),
      })
      .where(eq(players.id, player.id));
  }

  logger.debug({ generationId }, 'Mana regeneration processed');
}

/**
 * Process heartbeat event (every 7 days)
 */
export async function processHeartbeat(generationId: string): Promise<{
  processed: boolean;
  forsakenSpawned: number;
}> {
  const state = await getGenerationState(generationId);
  if (!state) {
    return { processed: false, forsakenSpawned: 0 };
  }

  // Check if it's heartbeat day
  if (state.currentDay % HEARTBEAT_INTERVAL_DAYS !== 0) {
    return { processed: false, forsakenSpawned: 0 };
  }

  logger.info(
    { generationId, day: state.currentDay },
    'Processing heartbeat event'
  );

  // Spawn Forsaken in unclaimed territories
  const unclaimedTerritories = await db
    .select()
    .from(territories)
    .where(
      and(
        eq(territories.generationId, generationId),
        eq(territories.ownerId, null as any),
        eq(territories.isForsaken, false)
      )
    );

  let forsakenSpawned = 0;

  // 10% of unclaimed become Forsaken
  const spawnCount = Math.floor(unclaimedTerritories.length * 0.1);
  const toSpawn = unclaimedTerritories
    .sort(() => Math.random() - 0.5)
    .slice(0, spawnCount);

  for (const territory of toSpawn) {
    // Forsaken strength based on zone
    let strength: number;
    switch (territory.zone) {
      case 'heart':
        strength = 500 + Math.floor(Math.random() * 500);
        break;
      case 'inner':
        strength = 300 + Math.floor(Math.random() * 300);
        break;
      case 'middle':
        strength = 150 + Math.floor(Math.random() * 150);
        break;
      default:
        strength = 50 + Math.floor(Math.random() * 100);
    }

    await db
      .update(territories)
      .set({
        isForsaken: true,
        forsakenStrength: strength,
        updatedAt: new Date(),
      })
      .where(eq(territories.id, territory.id));

    forsakenSpawned++;
  }

  // Update generation heartbeat counter
  await db
    .update(generations)
    .set({
      heartbeatDay: state.currentDay,
      updatedAt: new Date(),
    })
    .where(eq(generations.id, generationId));

  logger.info({ generationId, forsakenSpawned }, 'Heartbeat processed');

  return { processed: true, forsakenSpawned };
}

/**
 * Create new generation
 */
export async function createNewGeneration(): Promise<string> {
  // Get next generation number
  const [lastGeneration] = await db
    .select()
    .from(generations)
    .orderBy((g) => g.number)
    .limit(1);

  const nextNumber = (lastGeneration?.number || 0) + 1;

  // Calculate end date
  const startedAt = new Date();
  const endsAt = new Date(
    startedAt.getTime() + GENERATION_LENGTH_DAYS * 24 * 60 * 60 * 1000
  );

  // Create generation
  const [generation] = await db
    .insert(generations)
    .values({
      number: nextNumber,
      status: 'planning',
      startedAt,
      endsAt,
      heartbeatDay: 0,
      totalPlayers: 0,
    })
    .returning();

  logger.info(
    { generationId: generation.id, number: nextNumber },
    'New generation created'
  );

  return generation.id;
}

/**
 * Start scheduler loop (call from server startup)
 */
export function startScheduler(): void {
  // Run daily tick at midnight UTC
  const checkInterval = 60 * 1000; // Check every minute

  setInterval(async () => {
    try {
      // Get active generation
      const [activeGen] = await db
        .select()
        .from(generations)
        .where(eq(generations.status, 'active' as any))
        .limit(1);

      if (!activeGen) {
        // Check for planning generation
        const [planningGen] = await db
          .select()
          .from(generations)
          .where(eq(generations.status, 'planning' as any))
          .limit(1);

        if (planningGen) {
          // Check if should transition to active
          const state = await getGenerationState(planningGen.id);
          if (state && state.nextPhase === 'active') {
            await processDailyTick(planningGen.id);
          }
        }
        return;
      }

      // Check if it's time for daily tick (midnight UTC)
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMinute = now.getUTCMinutes();

      if (utcHour === 0 && utcMinute === 0) {
        await processDailyTick(activeGen.id);

        // Check for heartbeat
        await processHeartbeat(activeGen.id);
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler error');
    }
  }, checkInterval);

  logger.info('Scheduler started');
}
