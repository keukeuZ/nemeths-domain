import { Router } from 'express';
import { z } from 'zod';
import { RACES, CAPTAIN_CLASSES, CAPTAIN_SKILLS, type CaptainSkill } from '@nemeths/shared';
import { authenticate } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import {
  createPlayer,
  getPlayerByWallet,
  getPlayerById,
  getPlayerTerritories,
} from '../services/player.js';
import { getCurrentGeneration } from '../services/generation.js';

const router = Router();

// Flatten all skills for validation
const allSkills = Object.values(CAPTAIN_SKILLS).flat() as [string, ...string[]];

// Validation schemas
const createPlayerSchema = z.object({
  race: z.enum(RACES),
  captainName: z
    .string()
    .min(2, 'Captain name must be at least 2 characters')
    .max(50, 'Captain name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9\s'-]+$/, 'Captain name contains invalid characters'),
  captainClass: z.enum(CAPTAIN_CLASSES),
  captainSkill: z.enum(allSkills as [string, ...string[]]),
  isPremium: z.boolean().default(false),
});

/**
 * GET /api/player/me
 * Get current player info
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);

    if (!player) {
      res.json({
        success: true,
        data: { player: null, registered: false },
      });
      return;
    }

    const territories = await getPlayerTerritories(player.id);

    res.json({
      success: true,
      data: {
        player,
        territories,
        registered: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/player/register
 * Register a new player for the current generation
 */
router.post('/register', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    // Check if generation is active
    const generation = await getCurrentGeneration();
    if (!generation) {
      throw createAppError('No active generation', 400, 'NO_GENERATION');
    }

    if (generation.status === 'ended') {
      throw createAppError('Generation has ended', 400, 'GENERATION_ENDED');
    }

    // Validate input
    const input = createPlayerSchema.parse(req.body);

    // Check if already registered
    const existing = await getPlayerByWallet(req.user.sub);
    if (existing) {
      throw createAppError('Already registered in this generation', 400, 'ALREADY_REGISTERED');
    }

    // Create player
    const result = await createPlayer({
      walletAddress: req.user.sub,
      race: input.race,
      captainName: input.captainName,
      captainClass: input.captainClass,
      captainSkill: input.captainSkill as CaptainSkill,
      isPremium: input.isPremium,
    });

    res.status(201).json({
      success: true,
      data: {
        player: result.player,
        territories: result.territories,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/player/:id
 * Get player by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const player = await getPlayerById(req.params.id);

    if (!player) {
      throw createAppError('Player not found', 404, 'PLAYER_NOT_FOUND');
    }

    // Don't expose all info to other players
    const isOwn = req.user?.sub === player.walletAddress;

    res.json({
      success: true,
      data: {
        player: isOwn
          ? player
          : {
              id: player.id,
              race: player.race,
              captainName: player.captainName,
              captainClass: player.captainClass,
              captainAlive: player.captainAlive,
              // Hide sensitive info
            },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/player/:id/territories
 * Get player's territories
 */
router.get('/:id/territories', authenticate, async (req, res, next) => {
  try {
    const player = await getPlayerById(req.params.id);

    if (!player) {
      throw createAppError('Player not found', 404, 'PLAYER_NOT_FOUND');
    }

    const territories = await getPlayerTerritories(player.id);

    res.json({
      success: true,
      data: { territories },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
