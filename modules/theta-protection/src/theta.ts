/**
 * Theta Calculation and Proof Generation
 * 
 * Implements the theta-based spin calculation security system.
 * The theta value is derived from entropy data and combined with
 * client seeds to produce tamper-proof spin results.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import {
  EntropyData,
  ThetaProof,
  SpinResult,
  GenerateProofOptions,
  ThetaCommitment,
  ThetaReveal,
  ThetaConfig
} from './types';

/**
 * Default configuration for theta protection.
 */
const DEFAULT_CONFIG: ThetaConfig = {
  hashAlgorithm: 'sha256',
  commitmentTTL: 60000, // 1 minute
  requireSignatures: false,
  proofVersion: '1.0.0'
};

/**
 * Current configuration.
 */
let config: ThetaConfig = { ...DEFAULT_CONFIG };

/**
 * Sets the theta protection configuration.
 */
export function setConfig(newConfig: Partial<ThetaConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Gets the current configuration.
 */
export function getConfig(): ThetaConfig {
  return { ...config };
}

/**
 * Resets configuration to defaults.
 */
export function resetConfig(): void {
  config = { ...DEFAULT_CONFIG };
}

/**
 * Generates a unique proof ID.
 */
function generateProofId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Calculates the theta value from entropy data.
 * Theta is a derived value that combines the entropy with additional
 * cryptographic transformations for security.
 * 
 * @param entropyData - The entropy data from the source
 * @returns Theta value as hex string
 */
export function calculateTheta(entropyData: EntropyData): string {
  const hash = createHash(config.hashAlgorithm);
  
  // Combine entropy components
  const data = [
    entropyData.hex,
    entropyData.sourceHash,
    entropyData.value.toExponential(15),
    entropyData.timestamp.toString()
  ].join(':');
  
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Derives reel positions from theta, client seed, and nonce.
 * 
 * @param theta - The theta value
 * @param clientSeed - Client-provided seed
 * @param nonce - Nonce value
 * @param reelCount - Number of reels
 * @param symbolsPerReel - Symbols per reel
 * @returns Array of reel positions
 */
export function deriveReelPositions(
  theta: string,
  clientSeed: string,
  nonce: number,
  reelCount: number,
  symbolsPerReel: number
): number[] {
  if (reelCount < 3 || reelCount > 8) {
    throw new Error(`Reel count must be between 3 and 8, got ${reelCount}`);
  }
  
  if (symbolsPerReel < 1) {
    throw new Error('Symbols per reel must be at least 1');
  }

  const positions: number[] = [];
  
  for (let reel = 0; reel < reelCount; reel++) {
    // Create HMAC for each reel
    const hmac = createHmac(config.hashAlgorithm, theta);
    hmac.update(`${clientSeed}:${nonce}:${reel}`);
    const reelHash = hmac.digest('hex');
    
    // Convert first 8 hex chars to number and mod by symbols
    const numericValue = parseInt(reelHash.substring(0, 8), 16);
    const position = numericValue % symbolsPerReel;
    positions.push(position);
  }
  
  return positions;
}

/**
 * Calculates the result hash for verification.
 * 
 * @param positions - Reel positions
 * @param theta - Theta value
 * @param clientSeed - Client seed
 * @param nonce - Nonce value
 * @returns Result hash
 */
export function calculateResultHash(
  positions: number[],
  theta: string,
  clientSeed: string,
  nonce: number
): string {
  const hash = createHash(config.hashAlgorithm);
  const data = [
    positions.join(','),
    theta,
    clientSeed,
    nonce.toString()
  ].join(':');
  
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Creates a spin result from reel positions.
 * 
 * @param positions - Reel positions
 * @param symbolsPerReel - Symbols per reel
 * @param theta - Theta value
 * @param clientSeed - Client seed
 * @param nonce - Nonce value
 * @returns Spin result
 */
export function createSpinResult(
  positions: number[],
  symbolsPerReel: number,
  theta: string,
  clientSeed: string,
  nonce: number
): SpinResult {
  return {
    reelPositions: positions,
    reelCount: positions.length,
    symbolsPerReel,
    resultHash: calculateResultHash(positions, theta, clientSeed, nonce)
  };
}

/**
 * Signs the proof data using HMAC.
 * 
 * @param proofData - Data to sign
 * @param secret - Server secret
 * @returns Signature
 */
export function signProof(proofData: string, secret: string): string {
  const hmac = createHmac(config.hashAlgorithm, secret);
  hmac.update(proofData);
  return hmac.digest('hex');
}

/**
 * Generates a theta proof for a spin result.
 * 
 * @param options - Proof generation options
 * @returns Theta proof
 */
export function generateThetaProof(options: GenerateProofOptions): ThetaProof {
  const {
    entropyData,
    clientSeed,
    nonce,
    reelCount,
    symbolsPerReel,
    serverSecret
  } = options;

  // Validate inputs
  if (!entropyData || !entropyData.hex) {
    throw new Error('Entropy data is required');
  }
  
  if (!clientSeed || clientSeed.length === 0) {
    throw new Error('Client seed is required');
  }
  
  if (nonce < 0) {
    throw new Error('Nonce must be non-negative');
  }

  // Calculate theta
  const theta = calculateTheta(entropyData);
  
  // Create commitment
  const commitmentHash = createHash(config.hashAlgorithm);
  commitmentHash.update(`${theta}:${entropyData.sourceHash}`);
  const commitment = commitmentHash.digest('hex');
  
  // Derive reel positions
  const positions = deriveReelPositions(
    theta,
    clientSeed,
    nonce,
    reelCount,
    symbolsPerReel
  );
  
  // Create spin result
  const result = createSpinResult(positions, symbolsPerReel, theta, clientSeed, nonce);
  
  // Generate proof ID
  const proofId = generateProofId();
  const timestamp = Date.now();
  
  // Create proof data for signing
  const proofData = [
    proofId,
    commitment,
    theta,
    clientSeed,
    nonce.toString(),
    result.resultHash,
    timestamp.toString()
  ].join(':');
  
  // Sign if secret provided
  const signature = serverSecret 
    ? signProof(proofData, serverSecret)
    : createHash(config.hashAlgorithm).update(proofData).digest('hex');

  return {
    proofId,
    commitment,
    theta,
    clientSeed,
    nonce,
    result,
    signature,
    timestamp,
    version: config.proofVersion
  };
}

/**
 * Creates a theta commitment before the spin.
 * 
 * @param entropyData - Entropy data to commit to
 * @returns Theta commitment
 */
export function createThetaCommitment(entropyData: EntropyData): ThetaCommitment {
  const theta = calculateTheta(entropyData);
  
  const hash = createHash(config.hashAlgorithm);
  hash.update(`${theta}:${entropyData.sourceHash}`);
  
  const timestamp = Date.now();
  
  return {
    hash: hash.digest('hex'),
    entropySourceId: entropyData.sourceHash,
    timestamp,
    expiresAt: timestamp + config.commitmentTTL
  };
}

/**
 * Creates a theta reveal after the spin.
 * 
 * @param commitment - The original commitment
 * @param entropyData - The entropy data
 * @returns Theta reveal
 */
export function createThetaReveal(
  commitment: ThetaCommitment,
  entropyData: EntropyData
): ThetaReveal {
  const theta = calculateTheta(entropyData);
  
  // Verify commitment matches
  const expectedHash = createHash(config.hashAlgorithm);
  expectedHash.update(`${theta}:${entropyData.sourceHash}`);
  
  if (expectedHash.digest('hex') !== commitment.hash) {
    throw new Error('Entropy data does not match commitment');
  }
  
  return {
    commitment,
    entropyData,
    theta,
    timestamp: Date.now()
  };
}

/**
 * Verifies that a theta value matches the entropy data.
 * 
 * @param theta - Theta value to verify
 * @param entropyData - Original entropy data
 * @returns True if theta is valid
 */
export function verifyTheta(theta: string, entropyData: EntropyData): boolean {
  const expectedTheta = calculateTheta(entropyData);
  return theta === expectedTheta;
}

/**
 * Verifies that reel positions match the expected derivation.
 * 
 * @param positions - Reel positions to verify
 * @param theta - Theta value
 * @param clientSeed - Client seed
 * @param nonce - Nonce value
 * @param symbolsPerReel - Symbols per reel
 * @returns True if positions are valid
 */
export function verifyReelPositions(
  positions: number[],
  theta: string,
  clientSeed: string,
  nonce: number,
  symbolsPerReel: number
): boolean {
  try {
    const expectedPositions = deriveReelPositions(
      theta,
      clientSeed,
      nonce,
      positions.length,
      symbolsPerReel
    );
    
    return positions.every((pos, i) => pos === expectedPositions[i]);
  } catch {
    return false;
  }
}
