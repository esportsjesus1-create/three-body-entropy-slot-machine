/**
 * Three-Body Entropy API Gateway
 * 
 * High-performance Fastify-based API gateway for the Three-Body Entropy Slot Machine.
 * Designed for sub-50ms latency with Redis caching and connection pooling.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { spinRoutes } from './routes/spin.js';
import { verifyRoutes } from './routes/verify.js';
import { analyticsRoutes } from './routes/analytics.js';
import { streamRoutes } from './routes/stream.js';
import { partnerRoutes } from './routes/partner.js';
import { RedisService } from './services/redis.js';
import { DatabaseService } from './services/database.js';
import { EntropyService } from './services/entropy.js';
import { BillingService } from './services/billing.js';
import { authMiddleware } from './middleware/auth.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined
    },
    trustProxy: true
  });

  // Initialize services
  const redis = new RedisService();
  const database = new DatabaseService();
  const entropy = new EntropyService(redis, database);
  const billing = new BillingService(redis, database);

  // Decorate fastify with services
  fastify.decorate('redis', redis);
  fastify.decorate('database', database);
  fastify.decorate('entropy', entropy);
  fastify.decorate('billing', billing);

  // Register plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
    credentials: true
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false // Allow embedding
  });

  await fastify.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers['x-api-key'] as string || request.ip;
    }
  });

  await fastify.register(websocket);

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Three-Body Entropy Slot Machine API',
        description: 'World-class API for provably fair slot machine gaming powered by three-body physics entropy',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@entropy-slots.com'
        }
      },
      servers: [
        { url: 'https://api.entropy-slots.com', description: 'Production' },
        { url: 'https://sandbox.api.entropy-slots.com', description: 'Sandbox' }
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'Partner API key for authentication'
          }
        }
      },
      security: [{ apiKey: [] }]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  });

  // Health check
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    }
  }, async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }));

  // Register API routes
  await fastify.register(async (app) => {
    // Apply auth middleware to all API routes
    app.addHook('preHandler', authMiddleware);

    await app.register(spinRoutes, { prefix: '/spin' });
    await app.register(verifyRoutes, { prefix: '/verify' });
    await app.register(analyticsRoutes, { prefix: '/analytics' });
    await app.register(streamRoutes, { prefix: '/stream' });
    await app.register(partnerRoutes, { prefix: '/partner' });
  }, { prefix: '/api/v1' });

  // Graceful shutdown
  const shutdown = async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    await redis.disconnect();
    await database.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Three-Body Entropy API Gateway running on ${HOST}:${PORT}`);
    server.log.info(`API Documentation available at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

// Type declarations for fastify decorators
declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisService;
    database: DatabaseService;
    entropy: EntropyService;
    billing: BillingService;
  }
  interface FastifyRequest {
    partner?: {
      id: string;
      apiKeyId: string;
      status: 'active' | 'suspended' | 'pending';
      rateLimit: number;
      balanceCents: number;
    };
  }
}
