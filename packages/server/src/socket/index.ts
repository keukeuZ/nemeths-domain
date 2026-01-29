import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authService } from '../services/auth.js';
import { logger } from '../utils/logger.js';
import type { ClientEvents, ServerEvents } from '@nemeths/shared';

// Custom socket with user data
interface AuthenticatedSocket extends Socket<ClientEvents, ServerEvents> {
  data: {
    walletAddress?: string;
    playerId?: string;
    authenticated: boolean;
  };
}

let io: Server<ClientEvents, ServerEvents>;

export function initializeSocketServer(httpServer: HttpServer): Server<ClientEvents, ServerEvents> {
  io = new Server<ClientEvents, ServerEvents>(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.data = { authenticated: false };

    logger.debug({ socketId: socket.id }, 'Socket connected');

    // Handle authentication
    socket.on('client:authenticate', async ({ token }) => {
      try {
        const payload = await authService.verifyToken(token);
        socket.data.walletAddress = payload.sub;
        socket.data.playerId = payload.playerId;
        socket.data.authenticated = true;

        // Join player-specific room
        if (payload.playerId) {
          await socket.join(`player:${payload.playerId}`);
        }

        socket.emit('server:authenticated', {
          playerId: payload.playerId || '',
        });

        logger.debug(
          { socketId: socket.id, walletAddress: payload.sub },
          'Socket authenticated'
        );
      } catch (error) {
        socket.emit('server:error', {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
        });
        logger.warn({ socketId: socket.id, error }, 'Socket authentication failed');
      }
    });

    // Subscribe to territory updates
    socket.on('client:subscribe_territory', async ({ territoryId }) => {
      if (!socket.data.authenticated) {
        socket.emit('server:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Must authenticate first',
        });
        return;
      }
      await socket.join(`territory:${territoryId}`);
      logger.debug({ socketId: socket.id, territoryId }, 'Subscribed to territory');
    });

    socket.on('client:unsubscribe_territory', async ({ territoryId }) => {
      await socket.leave(`territory:${territoryId}`);
      logger.debug({ socketId: socket.id, territoryId }, 'Unsubscribed from territory');
    });

    // Subscribe to combat updates
    socket.on('client:subscribe_combat', async ({ combatId }) => {
      if (!socket.data.authenticated) {
        socket.emit('server:error', {
          code: 'NOT_AUTHENTICATED',
          message: 'Must authenticate first',
        });
        return;
      }
      await socket.join(`combat:${combatId}`);
      logger.debug({ socketId: socket.id, combatId }, 'Subscribed to combat');
    });

    socket.on('client:unsubscribe_combat', async ({ combatId }) => {
      await socket.leave(`combat:${combatId}`);
      logger.debug({ socketId: socket.id, combatId }, 'Unsubscribed from combat');
    });

    // Ping/pong for latency measurement
    socket.on('client:ping', ({ timestamp }) => {
      socket.emit('server:pong', {
        timestamp,
        serverTime: Date.now(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

export function getSocketServer(): Server<ClientEvents, ServerEvents> {
  if (!io) {
    throw new Error('Socket server not initialized');
  }
  return io;
}

// Broadcast helpers
export const broadcast = {
  toPlayer(playerId: string, event: keyof ServerEvents, data: unknown): void {
    io.to(`player:${playerId}`).emit(event, data as never);
  },

  toTerritory(territoryId: string, event: keyof ServerEvents, data: unknown): void {
    io.to(`territory:${territoryId}`).emit(event, data as never);
  },

  toCombat(combatId: string, event: keyof ServerEvents, data: unknown): void {
    io.to(`combat:${combatId}`).emit(event, data as never);
  },

  toAll(event: keyof ServerEvents, data: unknown): void {
    io.emit(event, data as never);
  },
};
