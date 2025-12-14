/**
 * Entropy Oracle Module
 * 
 * Wrapper/orchestrator using physics-engine and cryptographic modules
 * for provably fair entropy generation.
 * 
 * @packageDocumentation
 */

// Export types
export {
  Vector3D,
  Body,
  InitialConditions,
  SimulationParams,
  RawEntropyResult,
  SimulationMetadata,
  EntropyRequestOptions,
  EntropyResponse,
  EntropyProof,
  OracleConfig,
  CacheEntry,
  OracleStats,
  VerificationResult,
  VerificationCheck,
  PresetConditions
} from './types';

// Export simulation functions
export {
  runSimulation,
  generateRandomConditions,
  getPresetConditions,
  validateConditions,
  PRESET_CONDITIONS
} from './simulation';

// Export oracle
export {
  EntropyOracle,
  createOracle
} from './oracle';
