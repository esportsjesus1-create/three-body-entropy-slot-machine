/**
 * Public Key Routes
 * 
 * API endpoint for exposing the server's Ed25519 public key
 * for client-side signature verification.
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/v1/public-key
 * 
 * Get the server's Ed25519 public key for signature verification.
 * 
 * Response:
 * {
 *   publicKey: string (base64),
 *   algorithm: 'Ed25519',
 *   fingerprint: string (hex, first 16 chars of SHA-256),
 *   loadedAt: number (timestamp)
 * }
 */
router.get('/', async (req, res) => {
  try {
    // Dynamic import to handle the TypeScript module
    const cryptoSigning = await import('../../modules/crypto-signing/dist/index.js');
    
    const publicKeyInfo = cryptoSigning.getPublicKeyInfo();
    
    res.status(200).json({
      success: true,
      data: publicKeyInfo
    });
  } catch (error) {
    console.error('Get public key error:', error);
    
    // Check if it's a key not configured error
    if (error.message && error.message.includes('ED25519_PRIVATE_KEY')) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Cryptographic signing is not configured'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve public key'
    });
  }
});

export default router;
