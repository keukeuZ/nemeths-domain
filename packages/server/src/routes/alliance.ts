import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import {
  createAlliance,
  getAllianceById,
  getPlayerAlliance,
  getAllianceMembers,
  inviteToAlliance,
  leaveAlliance,
  kickFromAlliance,
  transferLeadership,
  promoteMember,
  demoteMember,
  disbandAlliance,
  getGenerationAlliances,
} from '../services/alliance.js';
import { getPlayerByWallet } from '../services/player.js';
import { getActiveGeneration } from '../services/generation.js';

const router = Router();

// Validation schemas
const createAllianceSchema = z.object({
  name: z.string().min(3).max(50),
  tag: z.string().regex(/^[A-Z]{3,5}$/, 'Tag must be 3-5 uppercase letters'),
});

const inviteSchema = z.object({
  playerId: z.string().uuid(),
});

const transferSchema = z.object({
  newLeaderId: z.string().uuid(),
});

const memberActionSchema = z.object({
  targetPlayerId: z.string().uuid(),
});

/**
 * GET /api/alliance
 * Get all alliances in current generation
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const generation = await getActiveGeneration();
    if (!generation) {
      throw createAppError('No active generation', 400, 'NO_GENERATION');
    }

    const alliances = await getGenerationAlliances(generation.id);

    res.json({
      success: true,
      data: { alliances },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alliance/mine
 * Get player's current alliance
 */
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      res.json({ success: true, data: { alliance: null } });
      return;
    }

    const alliance = await getPlayerAlliance(player.id);
    const members = alliance ? await getAllianceMembers(alliance.id) : [];

    res.json({
      success: true,
      data: {
        alliance,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/alliance/:id
 * Get alliance details
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const alliance = await getAllianceById(req.params.id);

    if (!alliance) {
      throw createAppError('Alliance not found', 404, 'ALLIANCE_NOT_FOUND');
    }

    const members = await getAllianceMembers(alliance.id);

    res.json({
      success: true,
      data: {
        alliance,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alliance
 * Create a new alliance
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { name, tag } = createAllianceSchema.parse(req.body);

    const alliance = await createAlliance(player.id, name, tag);

    res.status(201).json({
      success: true,
      data: { alliance },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already in an alliance')) {
        next(createAppError(error.message, 400, 'ALREADY_IN_ALLIANCE'));
        return;
      }
      if (error.message.includes('tag')) {
        next(createAppError(error.message, 400, 'INVALID_TAG'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/invite
 * Invite a player to alliance
 */
router.post('/invite', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const alliance = await getPlayerAlliance(player.id);
    if (!alliance) {
      throw createAppError('You are not in an alliance', 400, 'NOT_IN_ALLIANCE');
    }

    const { playerId } = inviteSchema.parse(req.body);

    const result = await inviteToAlliance(player.id, alliance.id, playerId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invite')) {
        next(createAppError(error.message, 403, 'CANNOT_INVITE'));
        return;
      }
      if (error.message.includes('already in')) {
        next(createAppError(error.message, 400, 'ALREADY_IN_ALLIANCE'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/leave
 * Leave current alliance
 */
router.post('/leave', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    await leaveAlliance(player.id);

    res.json({
      success: true,
      data: { message: 'Left alliance' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Leader')) {
        next(createAppError(error.message, 400, 'LEADER_CANNOT_LEAVE'));
        return;
      }
      if (error.message.includes('Not in')) {
        next(createAppError(error.message, 400, 'NOT_IN_ALLIANCE'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/kick
 * Kick a member from alliance
 */
router.post('/kick', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { targetPlayerId } = memberActionSchema.parse(req.body);

    await kickFromAlliance(player.id, targetPlayerId);

    res.json({
      success: true,
      data: { message: 'Member kicked' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Only')) {
        next(createAppError(error.message, 403, 'CANNOT_KICK'));
        return;
      }
      if (error.message.includes('leader')) {
        next(createAppError(error.message, 400, 'CANNOT_KICK_LEADER'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/transfer
 * Transfer leadership to another member
 */
router.post('/transfer', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { newLeaderId } = transferSchema.parse(req.body);

    await transferLeadership(player.id, newLeaderId);

    res.json({
      success: true,
      data: { message: 'Leadership transferred' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Only the leader')) {
        next(createAppError(error.message, 403, 'NOT_LEADER'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/promote
 * Promote a member to officer
 */
router.post('/promote', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { targetPlayerId } = memberActionSchema.parse(req.body);

    await promoteMember(player.id, targetPlayerId);

    res.json({
      success: true,
      data: { message: 'Member promoted to officer' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Only the leader')) {
        next(createAppError(error.message, 403, 'NOT_LEADER'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/demote
 * Demote an officer to member
 */
router.post('/demote', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    const { targetPlayerId } = memberActionSchema.parse(req.body);

    await demoteMember(player.id, targetPlayerId);

    res.json({
      success: true,
      data: { message: 'Officer demoted to member' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Only the leader')) {
        next(createAppError(error.message, 403, 'NOT_LEADER'));
        return;
      }
    }
    next(error);
  }
});

/**
 * POST /api/alliance/disband
 * Disband the alliance
 */
router.post('/disband', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      throw createAppError('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const player = await getPlayerByWallet(req.user.sub);
    if (!player) {
      throw createAppError('Player not registered', 403, 'PLAYER_REQUIRED');
    }

    await disbandAlliance(player.id);

    res.json({
      success: true,
      data: { message: 'Alliance disbanded' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Only the leader')) {
        next(createAppError(error.message, 403, 'NOT_LEADER'));
        return;
      }
    }
    next(error);
  }
});

export default router;
