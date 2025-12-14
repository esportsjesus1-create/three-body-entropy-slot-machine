/**
 * Entropy Oracle Types
 * 
 * Defines the core data structures for the entropy oracle system
 * that orchestrates physics simulation and cryptographic operations.
 */

/**
 * Vector in 3D space.
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Body in the three-body system.
 */
export interface Body {
  mass: number;
  position: Vector3D;
  velocity: Vector3D;
}

/**
 * Initial conditions for the three-body simulation.
 */
export interface InitialConditions {
  bodies: Body[];
  gravitationalConstant?: number;
  softeningParameter?: number;
}

/**
 * Simulation parameters.
 */
export interface SimulationParams {
  duration: number;
  timeStep: number;
  initialConditions?: InitialConditions;
}

/**
 * Raw entropy result from physics simulation.
 */
export interface RawEntropyResult {
  value: number;
  hex: string;
  sourceHash: string;
  simulationId: string;
  timestamp: number;
  metadata: SimulationMetadata;
}

/**
 * Simulation metadata.
 */
export interface SimulationMetadata {
  duration: number;
  timeStep: number;
  steps: number;
  finalEnergy: number;
  energyDrift: number;
  lyapunovEstimate: number;
}

/**
 * Entropy request options.
 */
export interface EntropyRequestOptions {
  sessionId: string;
  clientSeed?: string;
  nonce?: number;
  simulationParams?: SimulationParams;
}

/**
 * Entropy response with commitment.
 */
export interface EntropyResponse {
  requestId: string;
  commitment: string;
  entropy: RawEntropyResult;
  proof: EntropyProof;
  timestamp: number;
}

/**
 * Entropy proof for verification.
 */
export interface EntropyProof {
  proofId: string;
  simulationHash: string;
  entropyHash: string;
  signature: string;
  chainIndex?: number;
}

/**
 * Oracle configuration.
 */
export interface OracleConfig {
  defaultDuration: number;
  defaultTimeStep: number;
  defaultGravitationalConstant: number;
  defaultSofteningParameter: number;
  hashAlgorithm: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

/**
 * Entropy cache entry.
 */
export interface CacheEntry {
  entropy: RawEntropyResult;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Oracle statistics.
 */
export interface OracleStats {
  totalRequests: number;
  totalSimulations: number;
  cacheHits: number;
  cacheMisses: number;
  averageSimulationTime: number;
  uptime: number;
}

/**
 * Verification result.
 */
export interface VerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  error?: string;
}

/**
 * Individual verification check.
 */
export interface VerificationCheck {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  details?: string;
}

/**
 * Preset initial conditions for common scenarios.
 */
export interface PresetConditions {
  name: string;
  description: string;
  conditions: InitialConditions;
}
