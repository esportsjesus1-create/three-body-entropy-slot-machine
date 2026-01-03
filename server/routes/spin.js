/**
 * Spin Routes
 * 
 * API endpoints for spin commit and reveal operations
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { commitLimiter, spinLimiter } from '../middleware/rateLimit.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  createSession,
  revealSession
} from '../controllers/sessionController.js';

let signData = null;
let signingEnabled = false;

// Try to load crypto-signing module
(async () => {
  try {
    const cryptoSigning = await import('../../modules/crypto-signing/dist/index.js');
    signData = cryptoSigning.signData;
    signingEnabled = true;
    console.log('Crypto signing module loaded successfully');
  } catch (error) {
    console.warn('Crypto signing module not available:', error.message);
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
 * POST /api/v1/spin/commit
 * 
 * Generate house seed using three-body physics and create commitment
 * 
 * Response:
 * {
 *   sessionId: string,
 *   commitment: string (SHA-256 hash),
 *   expiresAt: string (ISO timestamp)
 * }
 */
router.post('/commit',
  commitLimiter,
  optionalAuth,
  async (req, res) => {
    try {
      const config = req.body.config || {};
      
      const result = await createSession(config);
      const signedResult = signResponseData(result);
      
      res.status(201).json({
        success: true,
        data: signedResult
      });
    } catch (error) {
      console.error('Commit error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create commitment'
      });
    }
  }
);

/**
 * POST /api/v1/spin/reveal
 * 
 * Reveal spin result by providing client seed
 * If no clientSeed is provided, operates in test mode using only house entropy
 * 
 * Request Body:
 * {
 *   sessionId: string,
 *   clientSeed?: string (optional - if omitted, uses test mode with house entropy only),
 *   config?: { symbols, reelCount, rowCount, etc. }
 * }
 * 
 * Response:
 * {
 *   result: { grid, symbols },
 *   houseSeed: string,
 *   proof: { proofId, signature, ... },
 *   testMode: boolean
 * }
 */
router.post('/reveal',
  spinLimiter,
  optionalAuth,
  [
    body('sessionId')
      .isUUID()
      .withMessage('sessionId must be a valid UUID'),
    body('clientSeed')
      .optional()
      .isString()
      .isLength({ min: 16, max: 256 })
      .withMessage('clientSeed must be a string between 16 and 256 characters')
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors.array()
      });
    }

    try {
      const { sessionId, clientSeed = null, config = {} } = req.body;
      
      const result = await revealSession(sessionId, clientSeed, config);
      const signedResult = signResponseData(result);
      
      res.status(200).json({
        success: true,
        data: signedResult
      });
    } catch (error) {
      console.error('Reveal error:', error);
      
      // Handle specific errors
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Session not found'
        });
      }
      
      if (error.message === 'Session expired') {
        return res.status(410).json({
          success: false,
          error: 'Gone',
          message: 'Session has expired'
        });
      }
      
      if (error.message === 'Session already revealed') {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'Session has already been revealed'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to reveal spin result'
      });
    }
  }
);

/**
 * POST /api/v1/spin/quick
 * 
 * Quick spin - combines commit and reveal in one request
 * Less secure but more convenient for testing
 * If no clientSeed is provided, operates in test mode using only house entropy
 * 
 * Request Body:
 * {
 *   clientSeed?: string (optional - if omitted, uses test mode),
 *   config?: { symbols, reelCount, rowCount, etc. }
 * }
 */
router.post('/quick',
  spinLimiter,
  optionalAuth,
  [
    body('clientSeed')
      .optional()
      .isString()
      .isLength({ min: 16, max: 256 })
      .withMessage('clientSeed must be a string between 16 and 256 characters')
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
      const { clientSeed = null, config = {} } = req.body;
      
      // Determine if test mode
      const testMode = !clientSeed;
      
      // Create session with test mode flag
      const session = await createSession({ ...config, testMode });
      
      // Immediately reveal
      const result = await revealSession(session.sessionId, clientSeed, config);
      
      const responseData = {
        ...result,
        warning: testMode 
          ? 'Test mode: using house entropy only. Not suitable for production.'
          : 'Quick spin is less secure. Use commit/reveal flow for production.'
      };
      const signedResult = signResponseData(responseData);
      
      res.status(200).json({
        success: true,
        data: signedResult
      });
    } catch (error) {
      console.error('Quick spin error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to perform quick spin'
      });
    }
  }
);

export default router;
