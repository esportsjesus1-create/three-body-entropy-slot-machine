/**
 * Hash Chain Module
 * 
 * Provides cryptographic verification functionality for provably fair gaming,
 * including HKDF key derivation, commitment schemes, and hash chain generation.
 * 
 * @packageDocumentation
 */

// Export types
export {
  ServerCommitment,
  ServerReveal,
  HashChainLink,
  HashChain,
  HKDFOptions,
  HKDFResult,
  DeriveHashOptions,
  DeriveHashResult,
  VerificationResult,
  GenerateChainOptions,
  CombinedSeedData
} from './types';

// Export HKDF functions
export {
  hkdf,
  hkdfExtract,
  hkdfExpand,
  deriveSeed,
  deriveMultipleSeeds
} from './hkdf';

// Export commitment functions
export {
  generateServerSeed,
  generateServerCommitment,
  generateServerCommitmentWithNonce,
  verifyCommitment,
  createServerReveal,
  combineSeedsForResult,
  verifyCombinedResult,
  generateClientSeed,
  createProvablyFairRound
} from './commitment';

// Export chain functions
export {
  computeHash,
  generateHashChain,
  verifyHashChain,
  verifyChainLink,
  deriveNextHash,
  getHashAtIndex,
  getHashRange,
  getRemainingHashes,
  createPartialChain,
  extendHashChain,
  hashToNumber,
  hashToFloat
} from './chain';
