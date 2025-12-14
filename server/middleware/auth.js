/**
 * Authentication Middleware
 * 
 * Handles API key authentication and JWT validation
 */

import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.API_SECRET_KEY || 'development-secret-key';

/**
 * Hash an API key for storage/comparison
 */
function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * API Key Authentication Middleware
 */
export async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide X-API-Key header.'
    });
  }

  try {
    const keyHash = hashApiKey(apiKey);
    const result = await query(
      'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true',
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    const apiKeyRecord = result.rows[0];
    
    // Update last used timestamp
    await query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [apiKeyRecord.id]
    );

    // Attach API key info to request
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      permissions: apiKeyRecord.permissions,
      rateLimit: apiKeyRecord.rate_limit
    };

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * JWT Authentication Middleware
 */
export function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Bearer token required'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
}

/**
 * Generate a JWT token
 */
export function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  if (!apiKey && !authHeader) {
    return next();
  }

  if (apiKey) {
    return apiKeyAuth(req, res, next);
  }

  return jwtAuth(req, res, next);
}

/**
 * Permission check middleware factory
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'API key required for this operation'
      });
    }

    const permissions = req.apiKey.permissions || [];
    if (!permissions.includes(permission) && !permissions.includes('*')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
}

export default {
  apiKeyAuth,
  jwtAuth,
  generateToken,
  optionalAuth,
  requirePermission,
  hashApiKey
};
