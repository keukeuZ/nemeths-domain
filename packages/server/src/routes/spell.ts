import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import {
  castSpell,
  canCastSpell,
  getAvailableSpells,
  getSpellCooldowns,
  getActiveEffects,
  calculateManaGeneration,
} from '../services/spell.js';
import { getPlayerByWallet } from '../services/player.js';

const router = Router();

// Validation schemas
const castSpellSchema = z.object({
  spellId: z.string(),
  targetId: z.string().uuid(),
  bloodSacrificeUnits: z.number().int().min(0).max(100).default(0),
});

/**
 * GET /api/spell/available
 * Get all spells available to the player
 */
router.get('/available', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const spells = getAvailableSpells(player.race);

    res.json({
      success: true,
      data: { spells },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/spell/cooldowns
 * Get player's spell cooldowns
 */
router.get('/cooldowns', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const cooldowns = getSpellCooldowns(player.id);
    const cooldownData: Record<string, string> = {};

    for (const [spellId, expiresAt] of cooldowns) {
      cooldownData[spellId] = expiresAt.toISOString();
    }

    res.json({
      success: true,
      data: { cooldowns: cooldownData },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/spell/mana
 * Get player's mana generation info
 */
router.get('/mana', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const dailyGeneration = await calculateManaGeneration(player.id);

    res.json({
      success: true,
      data: {
        currentMana: player.resources.mana,
        dailyGeneration,
        maxMana: 200, // Base cap, would calculate from buildings
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/spell/effects/:targetId
 * Get active spell effects on a target
 */
router.get('/effects/:targetId', authenticate, async (req, res, next) => {
  try {
    const effects = getActiveEffects(req.params.targetId);

    res.json({
      success: true,
      data: {
        effects: effects.map((e) => ({
          id: e.id,
          spellId: e.spellId,
          expiresAt: e.expiresAt.toISOString(),
          effectData: e.effectData,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/spell/check
 * Check if a spell can be cast
 */
router.post('/check', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { spellId } = z.object({ spellId: z.string() }).parse(req.body);

    const result = await canCastSpell(player.id, spellId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/spell/cast
 * Cast a spell
 */
router.post('/cast', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { spellId, targetId, bloodSacrificeUnits } = castSpellSchema.parse(req.body);

    // Validate blood sacrifice is only for Vaelthir
    if (bloodSacrificeUnits > 0 && player.race !== 'vaelthir') {
      throw createAppError('Only Vaelthir can perform blood sacrifice', 400, 'INVALID_SACRIFICE');
    }

    const result = await castSpell(player.id, spellId, targetId, bloodSacrificeUnits);

    if (!result.success) {
      throw createAppError(result.error || 'Failed to cast spell', 400, 'CAST_FAILED');
    }

    res.json({
      success: true,
      data: {
        ...result.result,
        message: result.result.isFizzle
          ? 'Spell fizzled!'
          : result.result.isCritical
            ? 'Critical success!'
            : 'Spell cast successfully',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('mana')) {
        next(createAppError(error.message, 400, 'INSUFFICIENT_MANA'));
        return;
      }
      if (error.message.includes('cooldown')) {
        next(createAppError(error.message, 400, 'ON_COOLDOWN'));
        return;
      }
    }
    next(error);
  }
});

export default router;
