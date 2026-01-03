/**
 * Crypto Signing Module Types
 * 
 * Defines the core data structures for Ed25519 cryptographic signing
 * and verification operations.
 */

/**
 * Result of signing data with Ed25519.
 */
export interface SignedData {
  /** Base64-encoded Ed25519 signature */
  signature: string;
  /** Base64-encoded public key used for signing */
  publicKey: string;
}

/**
 * Complete signed response including original data.
 */
export interface SignedResponse<T = unknown> {
  /** The original data that was signed */
  data: T;
  /** Base64-encoded Ed25519 signature */
  signature: string;
  /** Base64-encoded public key used for signing */
  publicKey: string;
  /** Timestamp when signature was created */
  signedAt: number;
}

/**
 * Result of signature verification.
 */
export interface VerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Ed25519 key pair for signing operations.
 */
export interface KeyPair {
  /** 64-byte secret key (includes public key) */
  secretKey: Uint8Array;
  /** 32-byte public key */
  publicKey: Uint8Array;
}

/**
 * Options for signing data.
 */
export interface SignOptions {
  /** Whether to include timestamp in signed data */
  includeTimestamp?: boolean;
  /** Custom timestamp to use (defaults to Date.now()) */
  timestamp?: number;
}

/**
 * Server key configuration.
 */
export interface ServerKeyConfig {
  /** Base64-encoded private key from environment */
  privateKeyBase64?: string;
  /** Whether to generate a new key if none provided */
  generateIfMissing?: boolean;
}

/**
 * Public key info for client verification.
 */
export interface PublicKeyInfo {
  /** Base64-encoded public key */
  publicKey: string;
  /** Algorithm used (always 'Ed25519') */
  algorithm: string;
  /** Key fingerprint for identification */
  fingerprint: string;
  /** When the key was generated/loaded */
  loadedAt: number;
}

/**
 * Commit response data structure.
 */
export interface CommitResponse {
  /** The commitment hash */
  commitmentHash: string;
  /** Session identifier */
  sessionId: string;
  /** Expiration timestamp */
  expiresAt: string;
}

/**
 * Reveal response data structure.
 */
export interface RevealResponse {
  /** The revealed server seed */
  serverSeed: string;
  /** Client seed used */
  clientSeed: string;
  /** Combined result hash */
  resultHash: string;
  /** Session identifier */
  sessionId: string;
}

/**
 * Verification response data structure.
 */
export interface VerificationResponse {
  /** Session identifier */
  sessionId: string;
  /** Whether verification passed */
  valid: boolean;
  /** Verification details */
  checks: {
    commitmentValid: boolean;
    entropyValid: boolean;
    signatureValid: boolean;
  };
  /** Any errors encountered */
  errors: string[];
}
