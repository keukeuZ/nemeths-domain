import { Router } from 'express';
import { z } from 'zod';
import { BUILDING_TYPES, BUILDING_DEFINITIONS } from '@nemeths/shared';
import { authenticate, requirePlayer } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import {
  startConstruction,
  destroyBuilding,
  repairBuilding,
  getBuildingsInTerritory,
  getBuildingById,
  getBuildingCost,
} from '../services/building.js';
import { getPlayerByWallet } from '../services/player.js';

const router = Router();

// Validation schemas
const buildSchema = z.object({
  territoryId: z.string().uuid(),
  buildingType: z.enum(BUILDING_TYPES),
});

const buildingIdSchema = z.object({
  buildingId: z.string().uuid(),
});

/**
 * GET /api/building/definitions
 * Get all building definitions
 */
router.get('/definitions', (_req, res) => {
  res.json({
    success: true,
    data: { buildings: BUILDING_DEFINITIONS },
  });
});

/**
 * GET /api/building/territory/:territoryId
 * Get all buildings in a territory
 */
router.get('/territory/:territoryId', authenticate, async (req, res, next) => {
  try {
    const buildings = await getBuildingsInTerritory(req.params.territoryId);

    res.json({
      success: true,
      data: { buildings },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/building/:id
 * Get building by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const building = await getBuildingById(req.params.id);

    if (!building) {
      throw createAppError('Building not found', 404, 'BUILDING_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { building },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/building/build
 * Start building construction
 */
router.post('/build', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { territoryId, buildingType } = buildSchema.parse(req.body);

    // Get building cost
    const cost = await getBuildingCost(player.id, buildingType);

    // Start construction
    const building = await startConstruction(player.id, territoryId, buildingType);

    res.status(201).json({
      success: true,
      data: {
        building,
        resourcesSpent: cost,
        completesAt: building.constructionComplete,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('do not own')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('Insufficient')) {
        next(createAppError(error.message, 400, 'INSUFFICIENT_RESOURCES'));
        return;
      }
      if (error.message.includes('Maximum') || error.message.includes('Requires')) {
        next(createAppError(error.message, 400, 'BUILD_CONSTRAINT'));
        return;
      }
    }
    next(error);
  }
});

/**
 * DELETE /api/building/:id
 * Destroy a building
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const refund = await destroyBuilding(player.id, req.params.id);

    res.json({
      success: true,
      data: { refundedResources: refund },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('do not own')) {
      next(createAppError(error.message, 403, 'NOT_OWNER'));
      return;
    }
    next(error);
  }
});

/**
 * POST /api/building/:id/repair
 * Repair a damaged building
 */
router.post('/:id/repair', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const result = await repairBuilding(player.id, req.params.id);

    res.json({
      success: true,
      data: {
        hp: result.hp,
        goldSpent: result.cost,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('do not own')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('not damaged')) {
        next(createAppError(error.message, 400, 'NOT_DAMAGED'));
        return;
      }
      if (error.message.includes('Insufficient')) {
        next(createAppError(error.message, 400, 'INSUFFICIENT_RESOURCES'));
        return;
      }
    }
    next(error);
  }
});

export default router;
