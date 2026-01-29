import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { connectRedis, disconnectRedis } from './db/redis.js';
import { initializeSocketServer } from './socket/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

async function main() {
  logger.info('Starting Nemeths Domain server...');

  // Create Express app
  const app = express();
  const httpServer = createServer(app);

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health/live' || req.url === '/health/ready',
      },
    })
  );

  // Connect to databases
  await connectDatabase();
  await connectRedis();

  // Initialize Socket.io
  initializeSocketServer(httpServer);

  // Mount API routes
  app.use('/api', routes);

  // Health check at root level too
  app.use('/health', routes);

  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Start server
  httpServer.listen(config.port, config.host, () => {
    logger.info(
      { port: config.port, host: config.host, env: config.nodeEnv },
      'Server started successfully'
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      await disconnectDatabase();
      await disconnectRedis();

      logger.info('Server shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
