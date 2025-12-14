/**
 * Rate Limiting Middleware
 * 
 * Implements rate limiting using Redis for distributed environments
 */

import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/database.js';

/**
 * Create a Redis-based rate limiter store
 */
class RedisStore {
  constructor() {
    this.client = null;
    this.prefix = 'rl:';
  }

  async init() {
    if (!this.client) {
      try {
        this.client = await getRedisClient();
      } catch (error) {
        console.warn('Redis not available, falling back to memory store');
        this.client = null;
      }
    }
  }

  async increment(key) {
    await this.init();
    
    if (!this.client) {
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }

    const redisKey = this.prefix + key;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    try {
      const multi = this.client.multi();
      multi.incr(redisKey);
      multi.pExpire(redisKey, windowMs);
      const results = await multi.exec();
      
      const totalHits = results[0];
      const resetTime = new Date(now + windowMs);

      return { totalHits, resetTime };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      return { totalHits: 1, resetTime: new Date(now + windowMs) };
    }
  }

  async decrement(key) {
    await this.init();
    
    if (!this.client) return;

    const redisKey = this.prefix + key;
    try {
      await this.client.decr(redisKey);
    } catch (error) {
      console.error('Redis decrement error:', error);
    }
  }

  async resetKey(key) {
    await this.init();
    
    if (!this.client) return;

    const redisKey = this.prefix + key;
    try {
      await this.client.del(redisKey);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }
}

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  }
});

/**
 * Spin endpoint rate limiter
 * 30 spins per minute per IP
 */
export const spinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too Many Requests',
    message: 'Spin rate limit exceeded. Maximum 30 spins per minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `spin:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
  }
});

/**
 * Commit endpoint rate limiter
 * 60 commits per minute per IP
 */
export const commitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Too Many Requests',
    message: 'Commit rate limit exceeded. Maximum 60 commits per minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `commit:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
  }
});

/**
 * Verification endpoint rate limiter
 * 120 verifications per minute per IP
 */
export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: {
    error: 'Too Many Requests',
    message: 'Verification rate limit exceeded. Maximum 120 verifications per minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `verify:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per minute per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded for sensitive operation.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Dynamic rate limiter based on API key limits
 */
export function dynamicLimiter(req, res, next) {
  const limit = req.apiKey?.rateLimit || 100;
  
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: limit,
    message: {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Your limit: ${limit} requests per minute.`,
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.apiKey?.id || req.ip || 'unknown';
    }
  });

  return limiter(req, res, next);
}

export default {
  generalLimiter,
  spinLimiter,
  commitLimiter,
  verifyLimiter,
  strictLimiter,
  dynamicLimiter
};
