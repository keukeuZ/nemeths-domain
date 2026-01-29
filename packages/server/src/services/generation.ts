import { eq, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { generations } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { generateMap } from './map/index.js';
import { GENERATION_LENGTH_DAYS } from '@nemeths/shared';

// ==========================================
// GENERATION SERVICE
// ==========================================

export interface GenerationInfo {
  id: string;
  number: number;
  status: 'planning' | 'active' | 'endgame' | 'ended';
  startedAt: Date;
  endsAt: Date;
  currentDay: number;
  heartbeatDay: number;
  totalPlayers: number;
}

/**
 * Get the current active generation
 */
export async function getCurrentGeneration(): Promise<GenerationInfo | null> {
  const [gen] = await db
    .select()
    .from(generations)
    .where(eq(generations.status, 'active'))
    .limit(1);

  if (!gen) {
    // Check for planning phase
    const [planningGen] = await db
      .select()
      .from(generations)
      .where(eq(generations.status, 'planning'))
      .limit(1);

    if (planningGen) {
      return generationToInfo(planningGen);
    }

    return null;
  }

  return generationToInfo(gen);
}

/**
 * Get generation by ID
 */
export async function getGenerationById(id: string): Promise<GenerationInfo | null> {
  const [gen] = await db.select().from(generations).where(eq(generations.id, id)).limit(1);

  if (!gen) return null;

  return generationToInfo(gen);
}

/**
 * Get the latest generation (any status)
 */
export async function getLatestGeneration(): Promise<GenerationInfo | null> {
  const [gen] = await db
    .select()
    .from(generations)
    .orderBy(desc(generations.number))
    .limit(1);

  if (!gen) return null;

  return generationToInfo(gen);
}

/**
 * Create a new generation
 */
export async function createGeneration(seed?: number): Promise<GenerationInfo> {
  // Get next generation number
  const latest = await getLatestGeneration();
  const nextNumber = latest ? latest.number + 1 : 1;

  // Calculate dates
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + GENERATION_LENGTH_DAYS * 24 * 60 * 60 * 1000);

  // Create generation record
  const [gen] = await db
    .insert(generations)
    .values({
      number: nextNumber,
      status: 'planning',
      startedAt,
      endsAt,
      heartbeatDay: GENERATION_LENGTH_DAYS,
      totalPlayers: 0,
    })
    .returning();

  logger.info({ generationId: gen.id, number: nextNumber }, 'Created new generation');

  // Generate map
  await generateMap(gen.id, seed);

  return generationToInfo(gen);
}

/**
 * Update generation status based on current day
 */
export async function updateGenerationStatus(generationId: string): Promise<void> {
  const gen = await getGenerationById(generationId);
  if (!gen) return;

  let newStatus = gen.status;

  // Days 1-5: Planning
  if (gen.currentDay <= 5 && gen.status !== 'planning') {
    newStatus = 'planning';
  }
  // Days 6-45: Active
  else if (gen.currentDay > 5 && gen.currentDay <= 45 && gen.status === 'planning') {
    newStatus = 'active';
  }
  // Days 46-50: Endgame
  else if (gen.currentDay > 45 && gen.currentDay <= GENERATION_LENGTH_DAYS && gen.status === 'active') {
    newStatus = 'endgame';
  }
  // Day 50+: Ended
  else if (gen.currentDay > GENERATION_LENGTH_DAYS && gen.status !== 'ended') {
    newStatus = 'ended';
  }

  if (newStatus !== gen.status) {
    await db
      .update(generations)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(generations.id, generationId));

    logger.info(
      { generationId, oldStatus: gen.status, newStatus, day: gen.currentDay },
      'Generation status updated'
    );
  }
}

/**
 * Increment player count
 */
export async function incrementPlayerCount(generationId: string): Promise<void> {
  const gen = await getGenerationById(generationId);
  if (!gen) return;

  await db
    .update(generations)
    .set({
      totalPlayers: gen.totalPlayers + 1,
      updatedAt: new Date(),
    })
    .where(eq(generations.id, generationId));
}

/**
 * Convert database generation to GenerationInfo
 */
function generationToInfo(gen: typeof generations.$inferSelect): GenerationInfo {
  const now = new Date();
  const msSinceStart = now.getTime() - gen.startedAt.getTime();
  const currentDay = Math.floor(msSinceStart / (24 * 60 * 60 * 1000)) + 1;

  return {
    id: gen.id,
    number: gen.number,
    status: gen.status,
    startedAt: gen.startedAt,
    endsAt: gen.endsAt,
    currentDay: Math.min(currentDay, GENERATION_LENGTH_DAYS + 1),
    heartbeatDay: gen.heartbeatDay,
    totalPlayers: gen.totalPlayers,
  };
}

/**
 * Check if we're in PvP-enabled phase (day 6+)
 */
export function isPvPEnabled(generation: GenerationInfo): boolean {
  return generation.currentDay > 5 && generation.status !== 'ended';
}

/**
 * Check if a player joined recently (within 10 days for protection)
 */
export function hasNewPlayerProtection(
  generation: GenerationInfo,
  playerJoinedAt: Date
): boolean {
  const msSinceJoin = Date.now() - playerJoinedAt.getTime();
  const daysSinceJoin = msSinceJoin / (24 * 60 * 60 * 1000);
  return daysSinceJoin < 10;
}

/**
 * Calculate late joiner resource bonus
 */
export function getLateJoinerBonus(generation: GenerationInfo): number {
  // After day 5, late joiners get +25% resources
  if (generation.currentDay > 5) {
    return 0.25;
  }
  return 0;
}
