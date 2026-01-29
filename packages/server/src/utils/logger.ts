import pino from 'pino';
import { config } from '../config/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logger = (pino as any)({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export type Logger = typeof logger;
