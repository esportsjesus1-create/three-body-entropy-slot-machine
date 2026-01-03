/**
 * Verification Routes
 * 
 * API endpoints for spin verification and audit
 */

import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { verifyLimiter } from '../middleware/rateLimit.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  getSessionForVerification,
  verifySession,
  getSessionHistory,
  getSessionStats
} from '../controllers/sessionController.js';

let signData = null;
let signingEnabled = false;

// Try to load crypto-signing module
(async () => {
  try {
    const cryptoSigning = await import('../../modules/crypto-signing/dist/index.js');
    signData = cryptoSigning.signData;
    signingEnabled = true;
  } catch (error) {
    console.warn('Crypto signing module not available for verify routes:', error.message);
  }
})();

// Helper function to sign response data
const signResponseData = (data) => {
  if (signingEnabled && signData) {
    try {
      const signed = signData(data);
      return { ...data, ...signed };
    } catch (error) {
      console.warn('Failed to sign response:', error.message);
      return data;
    }
  }
  return data;
};

const router = Router();

/**
 * GET /api/v1/verify/:sessionId
 * 
 * Get full session data for client-side verification
 * 
 * Response:
 * {
 *   sessionId: string,
 *   commitment: string,
 *   houseSeed: string,
 *   clientSeed: string,
 *   result: object,
 *   proof: object,
 *   physicsState: object,
 *   thetaAngles: array,
 *   createdAt: string,
 *   revealedAt: string
 * }
 */
router.get('/:sessionId',
  verifyLimiter,
  [
    param('sessionId')
      .isUUID()
      .withMessage('sessionId must be a valid UUID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors.array()
      });
    }

    try {
      const { sessionId } = req.params;
      const session = await getSessionForVerification(sessionId);
      const signedSession = signResponseData(session);
      
      res.status(200).json({
        success: true,
        data: signedSession
      });
    } catch (error) {
      console.error('Get session error:', error);
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Session not found'
        });
      }
      
      if (error.message === 'Session not yet revealed') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Session has not been revealed yet'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve session'
      });
    }
  }
);

/**
 * POST /api/v1/verify/:sessionId
 * 
 * Verify a spin result server-side
 * 
 * Response:
 * {
 *   sessionId: string,
 *   verification: {
 *     valid: boolean,
 *     checks: { commitmentValid, entropyValid, signatureValid },
 *     errors: string[]
 *   },
 *   session: { commitment, houseSeed, clientSeed, proof, ... }
 * }
 */
router.post('/:sessionId',
  verifyLimiter,
  [
    param('sessionId')
      .isUUID()
      .withMessage('sessionId must be a valid UUID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors.array()
      });
    }

    try {
      const { sessionId } = req.params;
      const clientIp = req.ip || req.headers['x-forwarded-for'];
      
      const result = await verifySession(sessionId, clientIp);
      const signedResult = signResponseData(result);
      
      res.status(200).json({
        success: true,
        data: signedResult
      });
    } catch (error) {
      console.error('Verify session error:', error);
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Session not found'
        });
      }
      
      if (error.message === 'Session not yet revealed') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Session has not been revealed yet'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify session'
      });
    }
  }
);

/**
 * GET /api/v1/verify/history
 * 
 * Get spin history (for audit purposes)
 * 
 * Query params:
 * - limit: number (default 50, max 100)
 * - offset: number (default 0)
 */
router.get('/',
  verifyLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;
      
      const history = await getSessionHistory(limit, offset);
      
      const responseData = {
        history,
        pagination: {
          limit,
          offset,
          count: history.length
        }
      };
      const signedData = signResponseData(responseData);
      
      res.status(200).json({
        success: true,
        data: signedData
      });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve history'
      });
    }
  }
);

/**
 * GET /api/v1/verify/stats
 * 
 * Get session statistics
 */
router.get('/stats',
  verifyLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const stats = await getSessionStats();
      const signedStats = signResponseData(stats);
      
      res.status(200).json({
        success: true,
        data: signedStats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve statistics'
      });
    }
  }
);

export default router;
