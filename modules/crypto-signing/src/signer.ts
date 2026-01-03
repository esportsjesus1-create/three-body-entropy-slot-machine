/**
 * Ed25519 Cryptographic Signer
 * 
 * Provides Ed25519 signing and verification functionality for API responses.
 * Uses TweetNaCl for cryptographic operations.
 */

import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import { createHash } from 'crypto';
import {
  SignedData,
  SignedResponse,
  VerificationResult,
  KeyPair,
  SignOptions,
  ServerKeyConfig,
  PublicKeyInfo
} from './types';

let serverKeyPair: KeyPair | null = null;
let keyLoadedAt: number | null = null;

/**
 * Get the server's private key from environment variable.
 * The key should be stored as a base64-encoded 64-byte Ed25519 secret key.
 * 
 * @returns The 64-byte secret key as Uint8Array
 * @throws Error if ED25519_PRIVATE_KEY environment variable is not set
 */
export function getServerPrivateKey(): Uint8Array {
  const privateKeyBase64 = process.env.ED25519_PRIVATE_KEY;
  
  if (!privateKeyBase64) {
    throw new Error(
      'ED25519_PRIVATE_KEY environment variable is not set. ' +
      'Generate a key pair using generateKeyPair() and set the base64-encoded secret key.'
    );
  }
  
  try {
    const privateKey = util.decodeBase64(privateKeyBase64);
    
    if (privateKey.length !== 64) {
      throw new Error(
        `Invalid private key length: expected 64 bytes, got ${privateKey.length}. ` +
        'The key should be a base64-encoded Ed25519 secret key (64 bytes).'
      );
    }
    
    return privateKey;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid private key length')) {
      throw error;
    }
    throw new Error('Failed to decode ED25519_PRIVATE_KEY: invalid base64 encoding');
  }
}

/**
 * Initialize or get the server key pair.
 * Caches the key pair for performance.
 * 
 * @param config Optional configuration for key loading
 * @returns The server's Ed25519 key pair
 */
export function getServerKeyPair(config?: ServerKeyConfig): KeyPair {
  if (serverKeyPair) {
    return serverKeyPair;
  }
  
  try {
    const privateKey = config?.privateKeyBase64 
      ? util.decodeBase64(config.privateKeyBase64)
      : getServerPrivateKey();
    
    serverKeyPair = nacl.sign.keyPair.fromSecretKey(privateKey);
    keyLoadedAt = Date.now();
    
    return serverKeyPair;
  } catch (error) {
    if (config?.generateIfMissing) {
      serverKeyPair = nacl.sign.keyPair();
      keyLoadedAt = Date.now();
      console.warn(
        'Generated new Ed25519 key pair. For production, set ED25519_PRIVATE_KEY environment variable to:',
        util.encodeBase64(serverKeyPair.secretKey)
      );
      return serverKeyPair;
    }
    throw error;
  }
}

/**
 * Generate a new Ed25519 key pair.
 * 
 * @returns Object containing base64-encoded public and secret keys
 */
export function generateKeyPair(): { publicKey: string; secretKey: string } {
  const keyPair = nacl.sign.keyPair();
  
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    secretKey: util.encodeBase64(keyPair.secretKey)
  };
}

/**
 * Sign data using Ed25519.
 * 
 * @param data The data to sign (will be JSON stringified)
 * @param options Optional signing options
 * @returns Object containing base64-encoded signature and public key
 */
export function signData(data: unknown, options?: SignOptions): SignedData {
  const keyPair = getServerKeyPair();
  
  const dataToSign = options?.includeTimestamp
    ? { data, timestamp: options.timestamp ?? Date.now() }
    : data;
  
  const message = util.decodeUTF8(JSON.stringify(dataToSign));
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  
  return {
    signature: util.encodeBase64(signature),
    publicKey: util.encodeBase64(keyPair.publicKey)
  };
}

/**
 * Sign data and return a complete signed response.
 * 
 * @param data The data to sign
 * @returns Complete signed response with data, signature, public key, and timestamp
 */
export function signResponse<T>(data: T): SignedResponse<T> {
  const timestamp = Date.now();
  const keyPair = getServerKeyPair();
  
  const dataWithTimestamp = { data, signedAt: timestamp };
  const message = util.decodeUTF8(JSON.stringify(dataWithTimestamp));
  const signature = nacl.sign.detached(message, keyPair.secretKey);
  
  return {
    data,
    signature: util.encodeBase64(signature),
    publicKey: util.encodeBase64(keyPair.publicKey),
    signedAt: timestamp
  };
}

/**
 * Verify a signature against data.
 * 
 * @param data The original data (will be JSON stringified)
 * @param signature Base64-encoded signature
 * @param publicKey Base64-encoded public key
 * @returns Verification result with valid flag and optional error
 */
export function verifySignature(
  data: unknown,
  signature: string,
  publicKey: string
): VerificationResult {
  try {
    const message = util.decodeUTF8(JSON.stringify(data));
    const signatureBytes = util.decodeBase64(signature);
    const publicKeyBytes = util.decodeBase64(publicKey);
    
    if (signatureBytes.length !== 64) {
      return {
        valid: false,
        error: `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`
      };
    }
    
    if (publicKeyBytes.length !== 32) {
      return {
        valid: false,
        error: `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`
      };
    }
    
    const valid = nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
    
    return { valid };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

/**
 * Verify a signed response.
 * 
 * @param response The signed response to verify
 * @returns Verification result
 */
export function verifySignedResponse<T>(response: SignedResponse<T>): VerificationResult {
  const dataWithTimestamp = { data: response.data, signedAt: response.signedAt };
  return verifySignature(dataWithTimestamp, response.signature, response.publicKey);
}

/**
 * Get public key information for client verification.
 * 
 * @returns Public key info including fingerprint
 */
export function getPublicKeyInfo(): PublicKeyInfo {
  const keyPair = getServerKeyPair();
  const publicKeyBase64 = util.encodeBase64(keyPair.publicKey);
  
  const fingerprint = createHash('sha256')
    .update(keyPair.publicKey)
    .digest('hex')
    .substring(0, 16);
  
  return {
    publicKey: publicKeyBase64,
    algorithm: 'Ed25519',
    fingerprint,
    loadedAt: keyLoadedAt ?? Date.now()
  };
}

/**
 * Clear the cached server key pair.
 * Useful for testing or key rotation.
 */
export function clearKeyCache(): void {
  serverKeyPair = null;
  keyLoadedAt = null;
}

/**
 * Check if a key pair is currently loaded.
 * 
 * @returns True if a key pair is cached
 */
export function isKeyLoaded(): boolean {
  return serverKeyPair !== null;
}

/**
 * Derive a deterministic key pair from a seed.
 * Useful for testing with reproducible keys.
 * 
 * @param seed The seed string to derive from
 * @returns Object containing base64-encoded public and secret keys
 */
export function deriveKeyPairFromSeed(seed: string): { publicKey: string; secretKey: string } {
  const seedHash = createHash('sha256').update(seed).digest();
  const keyPair = nacl.sign.keyPair.fromSeed(seedHash);
  
  return {
    publicKey: util.encodeBase64(keyPair.publicKey),
    secretKey: util.encodeBase64(keyPair.secretKey)
  };
}
