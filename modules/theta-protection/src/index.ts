/**
 * Theta Protection Module
 * 
 * Provides theta-based spin calculation security with tamper-proof validation
 * for provably fair gaming systems.
 * 
 * @packageDocumentation
 */

// Export types
export {
  EntropyData,
  ThetaProof,
  SpinResult,
  ValidationResult,
  ValidationCheck,
  GenerateProofOptions,
  ValidateProofOptions,
  ThetaCommitment,
  ThetaReveal,
  ThetaConfig
} from './types';

// Export theta functions
export {
  setConfig,
  getConfig,
  resetConfig,
  calculateTheta,
  deriveReelPositions,
  calculateResultHash,
  createSpinResult,
  signProof,
  generateThetaProof,
  createThetaCommitment,
  createThetaReveal,
  verifyTheta,
  verifyReelPositions
} from './theta';

// Export validation functions
export {
  validateThetaProof,
  validateThetaCommitment,
  quickValidate,
  getValidationSummary
} from './validation';
