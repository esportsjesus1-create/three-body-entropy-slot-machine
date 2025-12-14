/**
 * Verify Routes
 * 
 * GET /api/v1/verify/:spinId - Verify a spin's fairness
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface VerifyParams {
  spinId: string;
}

export async function verifyRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/verify/:spinId
   * Verify the fairness of a specific spin
   */
  fastify.get<{ Params: VerifyParams }>('/:spinId', {
    schema: {
      description: 'Verify the fairness of a spin result',
      tags: ['Verification'],
      params: {
        type: 'object',
        required: ['spinId'],
        properties: {
          spinId: { type: 'string', description: 'Session ID of the spin to verify' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            valid: { type: 'boolean' },
            spin: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                sessionId: { type: 'string' },
                commitment: { type: 'string' },
                houseSeed: { type: 'string' },
                clientSeed: { type: 'string' },
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
                createdAt: { type: 'string' },
                revealedAt: { type: 'string' }
              }
            },
            verification: {
              type: 'object',
              properties: {
                commitmentValid: { type: 'boolean' },
                proofValid: { type: 'boolean' },
                resultValid: { type: 'boolean' }
              }
            },
            instructions: {
              type: 'object',
              properties: {
                step1: { type: 'string' },
                step2: { type: 'string' },
                step3: { type: 'string' },
                step4: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: VerifyParams }>, reply: FastifyReply) => {
    try {
      const { spinId } = request.params;

      const result = await fastify.entropy.verifySpin(spinId);

      if (!result.spin) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Spin not found or has expired'
        });
      }

      return reply.send({
        success: true,
        valid: result.valid,
        spin: {
          id: result.spin.id,
          sessionId: result.spin.sessionId,
          commitment: result.spin.commitment,
          houseSeed: result.spin.houseSeed,
          clientSeed: result.spin.clientSeed,
          result: result.spin.result,
          proof: result.spin.proof,
          createdAt: result.spin.createdAt.toISOString(),
          revealedAt: result.spin.revealedAt?.toISOString()
        },
        verification: result.verification,
        instructions: {
          step1: 'Verify commitment: SHA256(houseSeed) should equal commitment',
          step2: 'Verify combined seed: HMAC-SHA256(houseSeed, clientSeed) produces entropyHex',
          step3: 'Verify proof hash: SHA256(houseSeed + clientSeed) should equal verificationHash',
          step4: 'Verify result: Apply entropy to theta angles to reproduce symbols'
        }
      });
    } catch (error) {
      request.log.error(error, 'Verification failed');
      return reply.status(500).send({
        success: false,
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/v1/verify/manual
   * Manual verification with provided seeds
   */
  fastify.post('/manual', {
    schema: {
      description: 'Manually verify a spin with provided seeds',
      tags: ['Verification'],
      body: {
        type: 'object',
        required: ['houseSeed', 'clientSeed', 'commitment'],
        properties: {
          houseSeed: { type: 'string' },
          clientSeed: { type: 'string' },
          commitment: { type: 'string' },
          expectedSymbols: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            valid: { type: 'boolean' },
            computedCommitment: { type: 'string' },
            commitmentMatches: { type: 'boolean' },
            computedResult: {
              type: 'object',
              properties: {
                symbols: { type: 'array', items: { type: 'string' } },
                positions: { type: 'array', items: { type: 'number' } }
              }
            },
            resultMatches: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        houseSeed: string;
        clientSeed: string;
        commitment: string;
        expectedSymbols?: string[];
      };

      const crypto = await import('crypto');
      
      // Compute commitment
      const computedCommitment = crypto.createHash('sha256')
        .update(body.houseSeed)
        .digest('hex');
      
      const commitmentMatches = computedCommitment === body.commitment;

      // Compute result
      const combinedSeed = crypto.createHmac('sha256', body.houseSeed)
        .update(body.clientSeed)
        .digest('hex');

      // Simplified result computation (matches entropy service)
      const hash = crypto.createHash('sha256').update(body.houseSeed).digest();
      const theta1 = (hash.readUInt32BE(0) / 0xFFFFFFFF) * Math.PI * 2;
      const theta2 = (hash.readUInt32BE(4) / 0xFFFFFFFF) * Math.PI * 2;
      const theta3 = (hash.readUInt32BE(8) / 0xFFFFFFFF) * Math.PI * 2;
      const thetaAngles = [theta1, theta2, theta3];

      const SYMBOLS = ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'];
      const resultHash = crypto.createHash('sha256').update(combinedSeed).digest();
      const positions: number[] = [];
      const symbols: string[] = [];

      for (let i = 0; i < 5; i++) {
        const thetaIndex = i % 3;
        const hashByte = resultHash[i * 4];
        const position = Math.floor(((thetaAngles[thetaIndex] / (Math.PI * 2)) + (hashByte / 255)) * SYMBOLS.length) % SYMBOLS.length;
        positions.push(position);
        symbols.push(SYMBOLS[position]);
      }

      const resultMatches = body.expectedSymbols 
        ? JSON.stringify(symbols) === JSON.stringify(body.expectedSymbols)
        : true;

      return reply.send({
        success: true,
        valid: commitmentMatches && resultMatches,
        computedCommitment,
        commitmentMatches,
        computedResult: { symbols, positions },
        resultMatches
      });
    } catch (error) {
      request.log.error(error, 'Manual verification failed');
      return reply.status(500).send({
        success: false,
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
