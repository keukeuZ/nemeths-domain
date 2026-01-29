import { Router } from 'express';
import { z } from 'zod';
import { UNIT_TYPES, UNIT_DEFINITIONS } from '@nemeths/shared';
import { authenticate } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import {
  trainUnits,
  getArmyById,
  getPlayerArmies,
  getArmiesInTerritory,
  moveArmy,
  splitArmy,
  mergeArmy,
  getTrainingCost,
} from '../services/army.js';
import { getPlayerByWallet } from '../services/player.js';

const router = Router();

// Validation schemas
const trainSchema = z.object({
  territoryId: z.string().uuid(),
  unitType: z.enum(UNIT_TYPES),
  quantity: z.number().int().min(1).max(100),
});

const moveSchema = z.object({
  targetTerritoryId: z.string().uuid(),
});

const splitSchema = z.object({
  units: z.array(
    z.object({
      unitType: z.enum(UNIT_TYPES),
      quantity: z.number().int().min(1),
    })
  ),
  includeCaptain: z.boolean().default(false),
});

const mergeSchema = z.object({
  targetArmyId: z.string().uuid(),
});

/**
 * GET /api/army/units
 * Get all unit definitions
 */
router.get('/units', (_req, res) => {
  res.json({
    success: true,
    data: { units: UNIT_DEFINITIONS },
  });
});

/**
 * GET /api/army/mine
 * Get all of player's armies
 */
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      res.json({ success: true, data: { armies: [] } });
      return;
    }

    const armies = await getPlayerArmies(player.id);

    res.json({
      success: true,
      data: { armies },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/army/territory/:territoryId
 * Get armies in a territory
 */
router.get('/territory/:territoryId', authenticate, async (req, res, next) => {
  try {
    const armies = await getArmiesInTerritory(req.params.territoryId);

    res.json({
      success: true,
      data: { armies },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/army/:id
 * Get army by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const army = await getArmyById(req.params.id);

    if (!army) {
      throw createAppError('Army not found', 404, 'ARMY_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { army },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/army/train
 * Train units in a territory
 */
router.post('/train', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { territoryId, unitType, quantity } = trainSchema.parse(req.body);

    // Get cost info
    const cost = getTrainingCost(unitType, quantity, player.race);

    // Train units
    const result = await trainUnits(player.id, territoryId, unitType, quantity);

    res.status(201).json({
      success: true,
      data: {
        army: result.army,
        resourcesSpent: cost,
        completesAt: result.completesAt,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('do not own')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('Insufficient') || error.message.includes('not available')) {
        next(createAppError(error.message, 400, 'CANNOT_TRAIN'));
        return;
      }
      if (error.message.includes('required')) {
        next(createAppError(error.message, 400, 'MISSING_BUILDING'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/army/:id/move
 * Move an army to another territory
 */
router.post('/:id/move', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { targetTerritoryId } = moveSchema.parse(req.body);

    const result = await moveArmy(player.id, req.params.id, targetTerritoryId);

    res.json({
      success: true,
      data: {
        army: result.army,
        arrivesAt: result.arrivesAt,
        distance: result.distance,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('do not own')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('garrison')) {
        next(createAppError(error.message, 400, 'CANNOT_MOVE_GARRISON'));
        return;
      }
      if (error.message.includes('water')) {
        next(createAppError(error.message, 400, 'INVALID_DESTINATION'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/army/:id/split
 * Split units from an army into a new army
 */
router.post('/:id/split', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { units, includeCaptain } = splitSchema.parse(req.body);

    const newArmy = await splitArmy(player.id, req.params.id, units, includeCaptain);

    res.status(201).json({
      success: true,
      data: { army: newArmy },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('do not own')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('Not enough')) {
        next(createAppError(error.message, 400, 'INSUFFICIENT_UNITS'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/army/:id/merge
 * Merge an army into another army
 */
router.post('/:id/merge', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { targetArmyId } = mergeSchema.parse(req.body);

    const mergedArmy = await mergeArmy(player.id, req.params.id, targetArmyId);

    res.json({
      success: true,
      data: { army: mergedArmy },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('do not own')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('same territory')) {
        next(createAppError(error.message, 400, 'DIFFERENT_TERRITORIES'));
        return;
      }
    }
    next(error);
  }
});

export default router;
