import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import { db } from '../db/connection.js';
import { territories, players, buildings, armies } from '../db/schema.js';
import { getCurrentGeneration } from '../services/generation.js';
import { getPlayerByWallet } from '../services/player.js';

const router = Router();

/**
 * GET /api/map/tiles
 * Get all map tiles for the current generation
 * Returns tile data needed for map rendering
 */
router.get('/tiles', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const generation = await getCurrentGeneration();
    if (!generation) {
      throw createAppError('No active generation', 400, 'NO_GENERATION');
    }

    // Get the current player (optional - for visibility filtering)
    const player = await getPlayerByWallet(req.user.sub);

    // Get all territories for this generation
    const allTerritories = await db
      .select({
        id: territories.id,
        x: territories.x,
        y: territories.y,
        zone: territories.zone,
        terrain: territories.terrain,
        ownerId: territories.ownerId,
        isForsaken: territories.isForsaken,
        forsakenStrength: territories.forsakenStrength,
      })
      .from(territories)
      .where(eq(territories.generationId, generation.id));

    // Get owner wallet addresses for owned territories
    const ownerIds = [...new Set(allTerritories.filter(t => t.ownerId).map(t => t.ownerId))];

    const owners = ownerIds.length > 0
      ? await db
          .select({ id: players.id, walletAddress: players.walletAddress })
          .from(players)
          .where(eq(players.generationId, generation.id))
      : [];

    const ownerMap = new Map(owners.map(o => [o.id, o.walletAddress]));

    // Get building counts per territory
    const buildingCounts = await db
      .select({
        territoryId: buildings.territoryId,
      })
      .from(buildings)
      .innerJoin(territories, eq(buildings.territoryId, territories.id))
      .where(eq(territories.generationId, generation.id));

    const buildingCountMap = new Map<string, number>();
    for (const b of buildingCounts) {
      buildingCountMap.set(b.territoryId, (buildingCountMap.get(b.territoryId) || 0) + 1);
    }

    // Get armies per territory
    const armyData = await db
      .select({
        territoryId: armies.territoryId,
      })
      .from(armies)
      .innerJoin(territories, eq(armies.territoryId, territories.id))
      .where(eq(territories.generationId, generation.id));

    const armySet = new Set(armyData.map(a => a.territoryId));

    // Build tile data
    const tiles = allTerritories.map(t => ({
      x: t.x,
      y: t.y,
      zone: t.zone,
      terrain: t.terrain,
      ownerId: t.ownerId,
      ownerAddress: t.ownerId ? ownerMap.get(t.ownerId) || null : null,
      isForsaken: t.isForsaken,
      forsakenStrength: t.forsakenStrength,
      tokenId: null, // On-chain token ID if applicable
      isVisible: true, // TODO: Implement fog of war based on player visibility
      buildingCount: buildingCountMap.get(t.id) || 0,
      hasArmy: armySet.has(t.id),
    }));

    res.json({
      success: true,
      data: {
        tiles,
        generation: {
          id: generation.id,
          number: generation.number,
          status: generation.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/map/tile/:x/:y
 * Get detailed info for a specific tile
 */
router.get('/tile/:x/:y', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const x = parseInt(req.params.x, 10);
    const y = parseInt(req.params.y, 10);

    if (isNaN(x) || isNaN(y) || x < 0 || x >= 100 || y < 0 || y >= 100) {
      throw createAppError('Invalid coordinates', 400, 'INVALID_COORDS');
    }

    const generation = await getCurrentGeneration();
    if (!generation) {
      throw createAppError('No active generation', 400, 'NO_GENERATION');
    }

    const [territory] = await db
      .select()
      .from(territories)
      .where(
        and(
          eq(territories.generationId, generation.id),
          eq(territories.x, x),
          eq(territories.y, y)
        )
      )
      .limit(1);

    if (!territory) {
      throw createAppError('Territory not found', 404, 'TERRITORY_NOT_FOUND');
    }

    // Get owner info if owned
    let owner = null;
    if (territory.ownerId) {
      const [ownerData] = await db
        .select({
          id: players.id,
          walletAddress: players.walletAddress,
          race: players.race,
          captainName: players.captainName,
        })
        .from(players)
        .where(eq(players.id, territory.ownerId))
        .limit(1);
      owner = ownerData || null;
    }

    // Get buildings on this territory
    const territoryBuildings = await db
      .select()
      .from(buildings)
      .where(eq(buildings.territoryId, territory.id));

    // Get armies on this territory
    const territoryArmies = await db
      .select()
      .from(armies)
      .where(eq(armies.territoryId, territory.id));

    res.json({
      success: true,
      data: {
        territory: {
          ...territory,
          owner,
          buildings: territoryBuildings,
          armies: territoryArmies,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
