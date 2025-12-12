/**
 * HKDF (HMAC-based Key Derivation Function) Implementation
 * 
 * Implements RFC 5869 HKDF for secure key derivation from input key material.
 * Used to derive cryptographically secure seeds from various inputs.
 */

import { createHmac } from 'crypto';
import { HKDFOptions, HKDFResult } from './types';

/**
 * Hash output lengths in bytes for supported algorithms.
 */
const HASH_LENGTHS: Record<string, number> = {
  sha256: 32,
  sha384: 48,
  sha512: 64
};

/**
 * HKDF Extract step - extracts a pseudorandom key from input key material.
 * 
 * @param algorithm - Hash algorithm to use
 * @param ikm - Input key material
 * @param salt - Salt value (optional)
 * @returns Pseudorandom key (PRK)
 */
export function hkdfExtract(
  algorithm: string,
  ikm: Buffer,
  salt?: Buffer
): Buffer {
  const hashLen = HASH_LENGTHS[algorithm];
  if (!hashLen) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  // If salt is not provided, use a string of zeros
  const actualSalt = salt && salt.length > 0 ? salt : Buffer.alloc(hashLen, 0);

  const hmac = createHmac(algorithm, actualSalt);
  hmac.update(ikm);
  return hmac.digest();
}

/**
 * HKDF Expand step - expands the PRK to the desired length.
 * 
 * @param algorithm - Hash algorithm to use
 * @param prk - Pseudorandom key from extract step
 * @param info - Application-specific info
 * @param length - Desired output length in bytes
 * @returns Derived key material
 */
export function hkdfExpand(
  algorithm: string,
  prk: Buffer,
  info: Buffer,
  length: number
): Buffer {
  const hashLen = HASH_LENGTHS[algorithm];
  if (!hashLen) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  if (length > 255 * hashLen) {
    throw new Error(`Requested length ${length} exceeds maximum ${255 * hashLen}`);
  }

  if (length <= 0) {
    throw new Error('Length must be positive');
  }

  const n = Math.ceil(length / hashLen);
  const okm: Buffer[] = [];
  let t = Buffer.alloc(0);

  for (let i = 1; i <= n; i++) {
    const hmac = createHmac(algorithm, prk);
    hmac.update(t);
    hmac.update(info);
    hmac.update(Buffer.from([i]));
    t = hmac.digest();
    okm.push(t);
  }

  return Buffer.concat(okm).subarray(0, length);
}

/**
 * Complete HKDF derivation (Extract + Expand).
 * 
 * @param options - HKDF options
 * @returns HKDF result with derived key
 */
export function hkdf(options: HKDFOptions): HKDFResult {
  const algorithm = options.algorithm || 'sha256';
  
  // Convert inputs to buffers
  const ikm = typeof options.ikm === 'string' 
    ? Buffer.from(options.ikm, 'utf-8') 
    : options.ikm;
  
  const salt = options.salt 
    ? (typeof options.salt === 'string' ? Buffer.from(options.salt, 'utf-8') : options.salt)
    : undefined;
  
  const info = options.info
    ? (typeof options.info === 'string' ? Buffer.from(options.info, 'utf-8') : options.info)
    : Buffer.alloc(0);

  // Extract
  const prk = hkdfExtract(algorithm, ikm, salt);

  // Expand
  const okm = hkdfExpand(algorithm, prk, info, options.length);

  return {
    key: okm.toString('hex'),
    keyBuffer: okm,
    params: {
      saltHex: salt ? salt.toString('hex') : '',
      infoHex: info.toString('hex'),
      length: options.length,
      algorithm
    }
  };
}

/**
 * Derives a seed from server seed, client seed, and nonce using HKDF.
 * 
 * @param serverSeed - Server-provided seed
 * @param clientSeed - Client-provided seed
 * @param nonce - Nonce value (typically spin number)
 * @param length - Desired output length (default: 32)
 * @returns Derived seed as hex string
 */
export function deriveSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: number | string,
  length: number = 32
): string {
  const ikm = `${serverSeed}:${clientSeed}:${nonce}`;
  const info = 'three-body-entropy-seed';
  
  const result = hkdf({
    ikm,
    info,
    length,
    algorithm: 'sha256'
  });

  return result.key;
}

/**
 * Derives multiple seeds from a single input using HKDF.
 * Useful for generating multiple independent values from one source.
 * 
 * @param ikm - Input key material
 * @param count - Number of seeds to derive
 * @param seedLength - Length of each seed in bytes
 * @returns Array of derived seeds as hex strings
 */
export function deriveMultipleSeeds(
  ikm: string,
  count: number,
  seedLength: number = 32
): string[] {
  if (count <= 0) {
    throw new Error('Count must be positive');
  }

  const totalLength = count * seedLength;
  const result = hkdf({
    ikm,
    info: 'multi-seed-derivation',
    length: totalLength,
    algorithm: 'sha256'
  });

  const seeds: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * seedLength * 2; // hex string, so 2 chars per byte
    const end = start + seedLength * 2;
    seeds.push(result.key.substring(start, end));
  }

  return seeds;
}
