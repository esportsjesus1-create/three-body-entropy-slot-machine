/**
 * Crypto Signing Module
 * 
 * Provides Ed25519 cryptographic signing functionality for API responses,
 * enabling non-repudiation and tamper detection for provably fair gaming.
 * 
 * @packageDocumentation
 */

// Export types
export {
  SignedData,
  SignedResponse,
  VerificationResult,
  KeyPair,
  SignOptions,
  ServerKeyConfig,
  PublicKeyInfo,
  CommitResponse,
  RevealResponse,
  VerificationResponse
} from './types';

// Export signer functions
export {
  signData,
  signResponse,
  verifySignature,
  verifySignedResponse,
  generateKeyPair,
  deriveKeyPairFromSeed,
  getServerKeyPair,
  getServerPrivateKey,
  getPublicKeyInfo,
  clearKeyCache,
  isKeyLoaded
} from './signer';
