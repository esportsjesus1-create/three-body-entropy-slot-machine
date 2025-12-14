/**
 * Spin Routes
 * 
 * POST /api/v1/spin - Execute a spin
 * POST /api/v1/spin/commit - Create commitment only
 * POST /api/v1/spin/reveal - Reveal with client seed
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const SpinRequestSchema = z.object({
  clientSeed: z.string().optional(),
  sessionId: z.string().optional()
});

const CommitRequestSchema = z.object({});

const RevealRequestSchema = z.object({
  sessionId: z.string(),
  clientSeed: z.string().optional()
});

export async function spinRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/spin
   * Quick spin - commit and reveal in one call
   */
  fastify.post('/', {
    schema: {
      description: 'Execute a spin with optional client seed',
      tags: ['Spin'],
      body: {
        type: 'object',
        properties: {
          clientSeed: { type: 'string', description: 'Client-provided seed for entropy mixing' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sessionId: { type: 'string' },
            commitment: { type: 'string' },
            result: {
              type: 'object',
              properties: {
                symbols: { type: 'array', items: { type: 'string' } },
                positions: { type: 'array', items: { type: 'number' } },
                winAmount: { type: 'number' },
                multiplier: { type: 'number' }
              }
            },
            proof: {
              type: 'object',
              properties: {
                thetaAngles: { type: 'array', items: { type: 'number' } },
                entropyHex: { type: 'string' },
                combinedSeedHash: { type: 'string' },
                verificationHash: { type: 'string' }
              }
            },
            houseSeed: { type: 'string' },
            testMode: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    try {
      const body = SpinRequestSchema.parse(request.body || {});
      const partner = request.partner!;

      const result = await fastify.entropy.quickSpin(
        partner.id,
        partner.apiKeyId,
        body.clientSeed
      );

      const latency = Date.now() - startTime;
      request.log.info({ latency, sessionId: result.sessionId }, 'Spin completed');

      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      request.log.error(error, 'Spin failed');
      return reply.status(500).send({
        success: false,
        error: 'Spin failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/v1/spin/commit
   * Create a commitment (first step of commit-reveal)
   */
  fastify.post('/commit', {
    schema: {
      description: 'Create a spin commitment (first step of provably fair flow)',
      tags: ['Spin'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            sessionId: { type: 'string' },
            commitment: { type: 'string' },
            expiresAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const partner = request.partner!;

      const result = await fastify.entropy.createCommitment(
        partner.id,
        partner.apiKeyId
      );

      return reply.send({
        success: true,
        ...result,
        expiresAt: result.expiresAt.toISOString()
      });
    } catch (error) {
      request.log.error(error, 'Commit failed');
      return reply.status(500).send({
        success: false,
        error: 'Commit failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/v1/spin/reveal
   * Reveal spin result with client seed
   */
  fastify.post('/reveal', {
    schema: {
      description: 'Reveal spin result with client seed (second step of provably fair flow)',
      tags: ['Spin'],
      body: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string' },
          clientSeed: { type: 'string', description: 'Client seed for entropy mixing (optional for test mode)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            result: {
              type: 'object',
              properties: {
                symbols: { type: 'array', items: { type: 'string' } },
                positions: { type: 'array', items: { type: 'number' } },
                winAmount: { type: 'number' },
                multiplier: { type: 'number' }
              }
            },
            proof: {
              type: 'object',
              properties: {
                thetaAngles: { type: 'array', items: { type: 'number' } },
                entropyHex: { type: 'string' },
                combinedSeedHash: { type: 'string' },
                verificationHash: { type: 'string' }
              }
            },
            houseSeed: { type: 'string' },
            testMode: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = RevealRequestSchema.parse(request.body);

      const result = await fastify.entropy.revealSpin(
        body.sessionId,
        body.clientSeed
      );

      return reply.send({
        success: true,
        ...result
      });
    } catch (error) {
      request.log.error(error, 'Reveal failed');
      return reply.status(500).send({
        success: false,
        error: 'Reveal failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
