/**
 * Hash Chain Module Types
 * 
 * Defines the core data structures for cryptographic verification,
 * commitment schemes, and hash chain operations.
 */

/**
 * Represents a server commitment for provably fair verification.
 */
export interface ServerCommitment {
  /** The commitment hash (SHA-256 of server seed) */
  commitmentHash: string;
  /** Timestamp when commitment was created */
  timestamp: number;
  /** Optional nonce for additional entropy */
  nonce?: string;
}

/**
 * Represents a revealed server seed after game completion.
 */
export interface ServerReveal {
  /** The original server seed */
  serverSeed: string;
  /** The commitment hash for verification */
  commitmentHash: string;
  /** Timestamp of reveal */
  timestamp: number;
}

/**
 * Represents a single hash in the chain.
 */
export interface HashChainLink {
  /** The hash value */
  hash: string;
  /** Index in the chain (0 = terminal hash) */
  index: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a complete hash chain.
 */
export interface HashChain {
  /** The initial commitment (first revealed hash) */
  initialCommitment: string;
  /** Array of hashes in the chain */
  hashes: HashChainLink[];
  /** Total length of the chain */
  length: number;
  /** Algorithm used for hashing */
  algorithm: string;
}

/**
 * Options for HKDF key derivation.
 */
export interface HKDFOptions {
  /** Input key material */
  ikm: string | Buffer;
  /** Salt value (optional, defaults to zeros) */
  salt?: string | Buffer;
  /** Application-specific info */
  info?: string | Buffer;
  /** Desired output length in bytes */
  length: number;
  /** Hash algorithm to use */
  algorithm?: 'sha256' | 'sha384' | 'sha512';
}

/**
 * Result of HKDF derivation.
 */
export interface HKDFResult {
  /** Derived key as hex string */
  key: string;
  /** Derived key as Buffer */
  keyBuffer: Buffer;
  /** Parameters used for derivation */
  params: {
    saltHex: string;
    infoHex: string;
    length: number;
    algorithm: string;
  };
}

/**
 * Options for deriving the next hash in a chain.
 */
export interface DeriveHashOptions {
  /** Previous hash in the chain */
  previousHash: string;
  /** Client seed for combining */
  clientSeed: string;
  /** Nonce value */
  nonce: number | string;
  /** Optional additional data */
  additionalData?: string;
}

/**
 * Result of hash derivation.
 */
export interface DeriveHashResult {
  /** The derived hash */
  hash: string;
  /** Input data used for derivation */
  inputs: {
    previousHash: string;
    clientSeed: string;
    nonce: string;
    additionalData?: string;
  };
}

/**
 * Result of hash chain verification.
 */
export interface VerificationResult {
  /** Whether the chain is valid */
  valid: boolean;
  /** Number of hashes verified */
  verifiedCount: number;
  /** Index of first invalid hash (if any) */
  invalidIndex?: number;
  /** Error message if invalid */
  error?: string;
}

/**
 * Options for generating a hash chain.
 */
export interface GenerateChainOptions {
  /** The terminal seed (end of chain) */
  terminalSeed: string;
  /** Number of hashes to generate */
  length: number;
  /** Hash algorithm to use */
  algorithm?: 'sha256' | 'sha384' | 'sha512';
}

/**
 * Combined seed data for final result calculation.
 */
export interface CombinedSeedData {
  /** Server seed */
  serverSeed: string;
  /** Client seed */
  clientSeed: string;
  /** Nonce value */
  nonce: number | string;
  /** Combined hash result */
  combinedHash: string;
}
