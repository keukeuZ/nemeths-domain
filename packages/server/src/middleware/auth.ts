import type { Request, Response, NextFunction } from 'express';
import { authService, type TokenPayload } from '../services/auth.js';
import { logger } from '../utils/logger.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = await authService.verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    logger.warn({ error }, 'Authentication failed');
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  }
}

/**
 * Optional authentication - continues even without valid token
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await authService.verifyToken(token);
      req.user = payload;
    }
  } catch {
    // Ignore auth errors for optional auth
  }

  next();
}

/**
 * Require player to be registered in current generation
 */
export async function requirePlayer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.playerId) {
    res.status(403).json({
      success: false,
      error: { code: 'PLAYER_REQUIRED', message: 'You must register a player first' },
    });
    return;
  }

  next();
}

/**
 * Admin-only addresses (contract deployer / game admins)
 * In production, these should be loaded from environment or database
 */
const ADMIN_ADDRESSES = new Set([
  process.env.ADMIN_ADDRESS?.toLowerCase(),
  // Add more admin addresses as needed
].filter(Boolean));

/**
 * Require admin privileges for sensitive operations
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.sub) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const walletAddress = req.user.sub.toLowerCase();

  if (!ADMIN_ADDRESSES.has(walletAddress)) {
    logger.warn({ walletAddress }, 'Unauthorized admin access attempt');
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
    return;
  }

  next();
}
