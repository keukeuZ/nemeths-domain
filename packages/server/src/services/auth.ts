import { ethers } from 'ethers';
import * as jose from 'jose';
import { randomBytes } from 'crypto';
import { eq, and, lt, gt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { authNonces, players } from '../db/schema.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const NONCE_EXPIRY_MINUTES = 5;
const JWT_ALGORITHM = 'HS256';

// JWT secret as Uint8Array
const jwtSecret = new TextEncoder().encode(config.jwtSecret);

export interface TokenPayload {
  sub: string; // wallet address
  playerId?: string;
  iat: number;
  exp: number;
}

export const authService = {
  /**
   * Generate a nonce for wallet signature verification
   */
  async generateNonce(walletAddress: string): Promise<{ nonce: string; expiresAt: Date }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(authNonces).values({
      walletAddress: normalizedAddress,
      nonce,
      expiresAt,
    });

    logger.debug({ walletAddress: normalizedAddress }, 'Generated auth nonce');

    return { nonce, expiresAt };
  },

  /**
   * Create the message that users need to sign
   */
  createSignMessage(nonce: string): string {
    return `Sign this message to authenticate with Nemeths Domain.\n\nNonce: ${nonce}`;
  },

  /**
   * Verify a wallet signature and return a JWT token
   */
  async verifySignature(
    walletAddress: string,
    signature: string,
    nonce: string
  ): Promise<{ token: string; expiresAt: Date; playerId: string | null }> {
    const normalizedAddress = walletAddress.toLowerCase();

    // Find and validate nonce
    const [nonceRecord] = await db
      .select()
      .from(authNonces)
      .where(
        and(
          eq(authNonces.nonce, nonce),
          eq(authNonces.walletAddress, normalizedAddress),
          eq(authNonces.used, false),
          gt(authNonces.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!nonceRecord) {
      throw new Error('Invalid or expired nonce');
    }

    // Verify signature
    const message = this.createSignMessage(nonce);
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      throw new Error('Invalid signature');
    }

    // Mark nonce as used
    await db
      .update(authNonces)
      .set({ used: true })
      .where(eq(authNonces.id, nonceRecord.id));

    // Check if player exists in current generation
    // TODO: Get current generation ID
    const [player] = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.walletAddress, normalizedAddress))
      .limit(1);

    // Generate JWT
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const token = await new jose.SignJWT({
      sub: normalizedAddress,
      playerId: player?.id ?? undefined,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(jwtSecret);

    logger.info({ walletAddress: normalizedAddress, hasPlayer: !!player }, 'User authenticated');

    return {
      token,
      expiresAt,
      playerId: player?.id ?? null,
    };
  },

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jose.jwtVerify(token, jwtSecret);
      return payload as unknown as TokenPayload;
    } catch {
      throw new Error('Invalid token');
    }
  },

  /**
   * Clean up expired nonces
   */
  async cleanupExpiredNonces(): Promise<number> {
    const result = await db
      .delete(authNonces)
      .where(lt(authNonces.expiresAt, new Date()));

    logger.debug('Cleaned up expired nonces');
    return result.rowCount ?? 0;
  },
};
