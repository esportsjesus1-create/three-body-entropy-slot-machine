/**
 * Theta Protection Module Types
 * 
 * Defines the core data structures for theta-based spin calculation security
 * and tamper-proof validation.
 */

/**
 * Entropy data from the physics engine or entropy oracle.
 */
export interface EntropyData {
  /** The raw entropy value (normalized 0-1) */
  value: number;
  /** Hexadecimal representation of the entropy */
  hex: string;
  /** Hash of the initial conditions that generated this entropy */
  sourceHash: string;
  /** Timestamp when entropy was generated */
  timestamp: number;
  /** Optional metadata about the entropy source */
  metadata?: Record<string, unknown>;
}

/**
 * Theta proof for spin result validation.
 */
export interface ThetaProof {
  /** Unique identifier for this proof */
  proofId: string;
  /** The commitment hash (published before spin) */
  commitment: string;
  /** The theta value derived from entropy */
  theta: string;
  /** Client seed used in calculation */
  clientSeed: string;
  /** Nonce value (spin number) */
  nonce: number;
  /** The final spin result */
  result: SpinResult;
  /** Signature of the proof data */
  signature: string;
  /** Timestamp when proof was generated */
  timestamp: number;
  /** Version of the proof format */
  version: string;
}

/**
 * Spin result containing reel positions and outcome.
 */
export interface SpinResult {
  /** Array of reel stop positions */
  reelPositions: number[];
  /** Number of reels */
  reelCount: number;
  /** Symbols per reel */
  symbolsPerReel: number;
  /** Hash of the result for verification */
  resultHash: string;
}

/**
 * Validation result for a theta proof.
 */
export interface ValidationResult {
  /** Whether the proof is valid */
  valid: boolean;
  /** Detailed validation checks */
  checks: ValidationCheck[];
  /** Error message if invalid */
  error?: string;
  /** Timestamp of validation */
  timestamp: number;
}

/**
 * Individual validation check result.
 */
export interface ValidationCheck {
  /** Name of the check */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Expected value */
  expected?: string;
  /** Actual value */
  actual?: string;
  /** Additional details */
  details?: string;
}

/**
 * Options for generating a theta proof.
 */
export interface GenerateProofOptions {
  /** Entropy data from the source */
  entropyData: EntropyData;
  /** Client-provided seed */
  clientSeed: string;
  /** Nonce value (spin number) */
  nonce: number;
  /** Number of reels in the slot machine */
  reelCount: number;
  /** Number of symbols per reel */
  symbolsPerReel: number;
  /** Optional server secret for signing */
  serverSecret?: string;
}

/**
 * Options for validating a theta proof.
 */
export interface ValidateProofOptions {
  /** The proof to validate */
  proof: ThetaProof;
  /** Expected result (optional, for result verification) */
  expectedResult?: SpinResult;
  /** Server public key for signature verification (optional) */
  serverPublicKey?: string;
}

/**
 * Commitment data for the theta protocol.
 */
export interface ThetaCommitment {
  /** The commitment hash */
  hash: string;
  /** Entropy source identifier */
  entropySourceId: string;
  /** Timestamp of commitment */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt: number;
}

/**
 * Reveal data for the theta protocol.
 */
export interface ThetaReveal {
  /** The original commitment */
  commitment: ThetaCommitment;
  /** The revealed entropy data */
  entropyData: EntropyData;
  /** The theta value */
  theta: string;
  /** Timestamp of reveal */
  timestamp: number;
}

/**
 * Configuration for the theta protection system.
 */
export interface ThetaConfig {
  /** Hash algorithm to use */
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  /** Commitment expiration time in milliseconds */
  commitmentTTL: number;
  /** Whether to require signatures */
  requireSignatures: boolean;
  /** Proof format version */
  proofVersion: string;
}
