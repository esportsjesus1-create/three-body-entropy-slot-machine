/**
 * Client Library Module
 * 
 * Universal API bridge for slot randomizers supporting 3-8 reel configurations.
 * 
 * @packageDocumentation
 */

// Export types
export {
  ReelCount,
  ReelConfiguration,
  SymbolDefinition,
  Payline,
  SessionDetails,
  SpinRequest,
  SpinResponse,
  SpinResult,
  WinningPayline,
  ProofData,
  VerificationResult,
  VerificationCheck,
  ClientConfig,
  RetryConfig,
  EntropyData,
  HashChainData
} from './types';

// Export reel calculator functions
export {
  validateReelCount,
  validateReelConfiguration,
  calculateReelPositions,
  calculateReelResult,
  generateResultHash,
  verifyReelPositions,
  createDefaultReelConfig,
  createDefaultPaylines
} from './reel-calculator';

// Export client
export {
  SlotMachineClient,
  createClient
} from './client';
