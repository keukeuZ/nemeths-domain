import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import {
  getCurrentGeneration,
  getGenerationById,
  createGeneration,
  isPvPEnabled,
} from '../services/generation.js';

const router = Router();

/**
 * GET /api/generation/current
 * Get current generation info
 */
router.get('/current', async (_req, res, next) => {
  try {
    const generation = await getCurrentGeneration();

    if (!generation) {
      res.json({
        success: true,
        data: { generation: null, message: 'No active generation' },
      });
      return;
    }

    // Calculate additional info
    const timeRemaining = generation.endsAt.getTime() - Date.now();
    const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        generation: {
          id: generation.id,
          number: generation.number,
          status: generation.status,
          startedAt: generation.startedAt,
          endsAt: generation.endsAt,
          currentDay: generation.currentDay,
          totalPlayers: generation.totalPlayers,
        },
        pvpEnabled: isPvPEnabled(generation),
        daysRemaining: Math.max(0, daysRemaining),
        phase:
          generation.currentDay <= 5
            ? 'planning'
            : generation.currentDay <= 20
              ? 'early'
              : generation.currentDay <= 35
                ? 'mid'
                : 'late',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/generation/:id
 * Get generation by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const generation = await getGenerationById(req.params.id);

    if (!generation) {
      throw createAppError('Generation not found', 404, 'GENERATION_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { generation },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/generation/create
 * Create a new generation (admin only)
 */
router.post('/create', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Check no active generation
    const current = await getCurrentGeneration();
    if (current && current.status !== 'ended') {
      throw createAppError('A generation is already active', 400, 'GENERATION_ACTIVE');
    }

    const seed = req.body.seed as number | undefined;
    const generation = await createGeneration(seed);

    res.status(201).json({
      success: true,
      data: { generation },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
