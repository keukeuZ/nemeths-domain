import { Router } from 'express';
import { pool } from '../db/connection.js';
import { redis } from '../db/redis.js';
import { logger } from '../utils/logger.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

interface ServiceStatus {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (_req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'down' },
      redis: { status: 'down' },
    },
  };

  // Check database
  try {
    const start = Date.now();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    health.services.database = {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    health.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = 'unhealthy';
  }

  // Check Redis
  try {
    const start = Date.now();
    await redis.ping();
    health.services.redis = {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    health.services.redis = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 */
router.get('/live', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 */
router.get('/ready', async (_req, res) => {
  try {
    // Quick check that services are reachable
    await Promise.all([
      pool.query('SELECT 1'),
      redis.ping(),
    ]);
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
