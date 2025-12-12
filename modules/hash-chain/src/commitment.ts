/**
 * Commitment Scheme Implementation
 * 
 * Provides cryptographic commitment functionality for provably fair gaming.
 * The server commits to a seed before the client provides their input,
 * ensuring the server cannot manipulate results.
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import { ServerCommitment, ServerReveal, CombinedSeedData } from './types';

/**
 * Generates a cryptographically secure random server seed.
 * 
 * @param length - Length of the seed in bytes (default: 32)
 * @returns Random seed as hex string
 */
export function generateServerSeed(length: number = 32): string {
  if (length <= 0) {
    throw new Error('Seed length must be positive');
  }
  return randomBytes(length).toString('hex');
}

/**
 * Creates a commitment hash from a server seed.
 * The commitment is the SHA-256 hash of the seed.
 * 
 * @param serverSeed - The server seed to commit to
 * @returns Server commitment object
 */
export function generateServerCommitment(serverSeed: string): ServerCommitment {
  if (!serverSeed || serverSeed.length === 0) {
    throw new Error('Server seed cannot be empty');
  }

  const hash = createHash('sha256');
  hash.update(serverSeed);
  const commitmentHash = hash.digest('hex');

  return {
    commitmentHash,
    timestamp: Date.now()
  };
}

/**
 * Creates a commitment with an additional nonce for extra entropy.
 * 
 * @param serverSeed - The server seed to commit to
 * @param nonce - Additional nonce value
 * @returns Server commitment object with nonce
 */
export function generateServerCommitmentWithNonce(
  serverSeed: string,
  nonce: string
): ServerCommitment {
  if (!serverSeed || serverSeed.length === 0) {
    throw new Error('Server seed cannot be empty');
  }
  if (!nonce || nonce.length === 0) {
    throw new Error('Nonce cannot be empty');
  }

  const hash = createHash('sha256');
  hash.update(`${serverSeed}:${nonce}`);
  const commitmentHash = hash.digest('hex');

  return {
    commitmentHash,
    timestamp: Date.now(),
    nonce
  };
}

/**
 * Verifies that a revealed server seed matches its commitment.
 * 
 * @param serverSeed - The revealed server seed
 * @param commitment - The original commitment
 * @returns True if the seed matches the commitment
 */
export function verifyCommitment(
  serverSeed: string,
  commitment: ServerCommitment
): boolean {
  if (!serverSeed || serverSeed.length === 0) {
    return false;
  }

  const hash = createHash('sha256');
  
  if (commitment.nonce) {
    hash.update(`${serverSeed}:${commitment.nonce}`);
  } else {
    hash.update(serverSeed);
  }
  
  const calculatedHash = hash.digest('hex');
  return calculatedHash === commitment.commitmentHash;
}

/**
 * Creates a reveal object for a server seed.
 * 
 * @param serverSeed - The server seed to reveal
 * @param commitment - The original commitment
 * @returns Server reveal object
 */
export function createServerReveal(
  serverSeed: string,
  commitment: ServerCommitment
): ServerReveal {
  if (!verifyCommitment(serverSeed, commitment)) {
    throw new Error('Server seed does not match commitment');
  }

  return {
    serverSeed,
    commitmentHash: commitment.commitmentHash,
    timestamp: Date.now()
  };
}

/**
 * Combines server seed, client seed, and nonce to produce a final hash.
 * This is the core of the provably fair mechanism.
 * 
 * @param serverSeed - Server-provided seed
 * @param clientSeed - Client-provided seed
 * @param nonce - Nonce value (typically spin/round number)
 * @returns Combined seed data with final hash
 */
export function combineSeedsForResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number | string
): CombinedSeedData {
  if (!serverSeed || serverSeed.length === 0) {
    throw new Error('Server seed cannot be empty');
  }
  if (!clientSeed || clientSeed.length === 0) {
    throw new Error('Client seed cannot be empty');
  }

  // Use HMAC with server seed as key and client seed + nonce as message
  const hmac = createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const combinedHash = hmac.digest('hex');

  return {
    serverSeed,
    clientSeed,
    nonce,
    combinedHash
  };
}

/**
 * Verifies a combined result by recalculating the hash.
 * 
 * @param data - The combined seed data to verify
 * @returns True if the combined hash is correct
 */
export function verifyCombinedResult(data: CombinedSeedData): boolean {
  const recalculated = combineSeedsForResult(
    data.serverSeed,
    data.clientSeed,
    data.nonce
  );
  return recalculated.combinedHash === data.combinedHash;
}

/**
 * Generates a client seed from user input or randomly.
 * 
 * @param userInput - Optional user-provided input
 * @returns Client seed as hex string
 */
export function generateClientSeed(userInput?: string): string {
  if (userInput && userInput.length > 0) {
    // Hash user input to create a fixed-length seed
    const hash = createHash('sha256');
    hash.update(userInput);
    return hash.digest('hex');
  }
  
  // Generate random client seed
  return randomBytes(16).toString('hex');
}

/**
 * Creates a complete provably fair round with commitment and reveal.
 * 
 * @param clientSeed - Client-provided seed
 * @param nonce - Round nonce
 * @returns Object with commitment, reveal function, and verify function
 */
export function createProvablyFairRound(clientSeed: string, nonce: number | string) {
  const serverSeed = generateServerSeed();
  const commitment = generateServerCommitment(serverSeed);
  
  let revealed = false;
  let result: CombinedSeedData | null = null;

  return {
    commitment,
    
    /**
     * Reveals the server seed and calculates the result.
     */
    reveal: (): CombinedSeedData => {
      if (revealed) {
        throw new Error('Round has already been revealed');
      }
      revealed = true;
      result = combineSeedsForResult(serverSeed, clientSeed, nonce);
      return result;
    },
    
    /**
     * Gets the reveal data for verification.
     */
    getReveal: (): ServerReveal => {
      if (!revealed) {
        throw new Error('Round has not been revealed yet');
      }
      return createServerReveal(serverSeed, commitment);
    },
    
    /**
     * Verifies the round result.
     */
    verify: (): boolean => {
      if (!revealed || !result) {
        throw new Error('Round has not been revealed yet');
      }
      return (
        verifyCommitment(serverSeed, commitment) &&
        verifyCombinedResult(result)
      );
    },
    
    /**
     * Checks if the round has been revealed.
     */
    isRevealed: (): boolean => revealed
  };
}
