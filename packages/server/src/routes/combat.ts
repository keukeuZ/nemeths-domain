import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import { initiateCombat, resolveCombat, getCombatById } from '../services/combat.js';
import { getPlayerByWallet } from '../services/player.js';

const router = Router();

// Validation schemas
const attackSchema = z.object({
  armyId: z.string().uuid(),
  targetTerritoryId: z.string().uuid(),
});

/**
 * GET /api/combat/:id
 * Get combat details
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const combat = await getCombatById(req.params.id);

    if (!combat) {
      throw createAppError('Combat not found', 404, 'COMBAT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { combat },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/combat/attack
 * Initiate an attack
 */
router.post('/attack', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { armyId, targetTerritoryId } = attackSchema.parse(req.body);

    const combatId = await initiateCombat(player.id, armyId, targetTerritoryId);

    res.status(201).json({
      success: true,
      data: {
        combatId,
        message: 'Combat initiated',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Not your army')) {
        next(createAppError(error.message, 403, 'NOT_OWNER'));
        return;
      }
      if (error.message.includes('PvP') || error.message.includes('protection')) {
        next(createAppError(error.message, 400, 'COMBAT_NOT_ALLOWED'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/combat/:id/resolve
 * Resolve a pending combat (admin only)
 */
router.post('/:id/resolve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await resolveCombat(req.params.id);

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already resolved')) {
        next(createAppError(error.message, 400, 'ALREADY_RESOLVED'));
        return;
      }
    }
    next(error);
  }
});

export default router;
