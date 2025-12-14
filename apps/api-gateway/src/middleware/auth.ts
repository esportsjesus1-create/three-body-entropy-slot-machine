/**
 * Authentication Middleware
 * 
 * Validates API keys and checks partner status for all API requests.
 * Designed for sub-50ms latency with Redis caching.
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header'
    });
  }

  try {
    // Check cache first for fast auth
    const cachedPartner = await request.server.redis.get(`apikey:${apiKey}`);
    
    if (cachedPartner) {
      const partner = JSON.parse(cachedPartner);
      
      if (partner.status === 'suspended') {
        return reply.status(402).send({
          error: 'Payment Required',
          message: 'Account suspended due to billing issues. Please contact support.'
        });
      }

      request.partner = partner;
      return;
    }

    // Fall back to database lookup
    const result = await request.server.database.getPartnerByApiKey(apiKey);
    
    if (!result) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    const { partner, apiKeyRecord } = result;

    if (apiKeyRecord.status !== 'active') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'API key is not active'
      });
    }

    if (partner.status === 'suspended') {
      return reply.status(402).send({
        error: 'Payment Required',
        message: 'Account suspended due to billing issues. Please contact support.'
      });
    }

    // Get balance
    const balance = await request.server.database.getPartnerBalance(partner.id);

    // Build partner context
    const partnerContext = {
      id: partner.id,
      apiKeyId: apiKeyRecord.id,
      status: partner.status,
      rateLimit: apiKeyRecord.rateLimit,
      balanceCents: balance
    };

    // Cache for 60 seconds
    await request.server.redis.set(
      `apikey:${apiKey}`,
      JSON.stringify(partnerContext),
      60
    );

    // Update last used timestamp
    await request.server.database.updateApiKeyLastUsed(apiKey);

    request.partner = partnerContext;
  } catch (error) {
    request.log.error(error, 'Auth middleware error');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional auth middleware for public endpoints
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return; // Continue without auth
  }

  // If API key is provided, validate it
  return authMiddleware(request, reply);
}
