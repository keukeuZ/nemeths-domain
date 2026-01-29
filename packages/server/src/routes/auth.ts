import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.js';
import { createAppError } from '../middleware/errorHandler.js';

const router = Router();

// Simple in-memory rate limiter for auth endpoints
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = rateLimitStore.get(key);

    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
      for (const [k, v] of rateLimitStore) {
        if (v.resetAt < now) rateLimitStore.delete(k);
      }
    }

    if (!record || record.resetAt < now) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
      });
      return;
    }

    next();
  };
}

// Validation schemas
const nonceSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
});

const verifySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  signature: z.string().min(130).max(132, 'Invalid signature length'), // 65 bytes hex = 130 chars + optional 0x
  nonce: z.string().length(64).regex(/^[a-f0-9]+$/i, 'Invalid nonce format'), // Must be valid hex
});

/**
 * POST /api/auth/nonce
 * Generate a nonce for wallet signature
 * Rate limited: 10 requests per minute per IP
 */
router.post('/nonce', rateLimit(10, 60000), async (req, res, next) => {
  try {
    const { walletAddress } = nonceSchema.parse(req.body);
    const result = await authService.generateNonce(walletAddress);

    res.json({
      success: true,
      data: {
        nonce: result.nonce,
        message: authService.createSignMessage(result.nonce),
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify
 * Verify signature and return JWT token
 * Rate limited: 5 requests per minute per IP (stricter for security)
 */
router.post('/verify', rateLimit(5, 60000), async (req, res, next) => {
  try {
    const { walletAddress, signature, nonce } = verifySchema.parse(req.body);

    const result = await authService.verifySignature(walletAddress, signature, nonce);

    res.json({
      success: true,
      data: {
        token: result.token,
        expiresAt: result.expiresAt,
        playerId: result.playerId,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid or expired nonce') {
        next(createAppError(error.message, 400, 'INVALID_NONCE'));
        return;
      }
      if (error.message === 'Invalid signature') {
        next(createAppError(error.message, 401, 'INVALID_SIGNATURE'));
        return;
      }
    }
    next(error);
  }
});

export default router;
