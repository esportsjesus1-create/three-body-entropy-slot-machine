/**
 * HKDF Unit Tests
 */

import {
  hkdf,
  hkdfExtract,
  hkdfExpand,
  deriveSeed,
  deriveMultipleSeeds
} from '../src/hkdf';

describe('HKDF', () => {
  describe('hkdfExtract', () => {
    it('should extract a pseudorandom key from input key material', () => {
      const ikm = Buffer.from('input key material');
      const salt = Buffer.from('salt value');
      
      const prk = hkdfExtract('sha256', ikm, salt);
      
      expect(prk).toBeInstanceOf(Buffer);
      expect(prk.length).toBe(32); // SHA-256 output length
    });

    it('should use zero salt when not provided', () => {
      const ikm = Buffer.from('input key material');
      
      const prk1 = hkdfExtract('sha256', ikm);
      const prk2 = hkdfExtract('sha256', ikm, undefined);
      
      expect(prk1.toString('hex')).toBe(prk2.toString('hex'));
    });

    it('should produce different PRKs for different salts', () => {
      const ikm = Buffer.from('input key material');
      const salt1 = Buffer.from('salt1');
      const salt2 = Buffer.from('salt2');
      
      const prk1 = hkdfExtract('sha256', ikm, salt1);
      const prk2 = hkdfExtract('sha256', ikm, salt2);
      
      expect(prk1.toString('hex')).not.toBe(prk2.toString('hex'));
    });

    it('should throw error for unsupported algorithm', () => {
      const ikm = Buffer.from('input key material');
      
      expect(() => {
        hkdfExtract('md5', ikm);
      }).toThrow('Unsupported algorithm');
    });
  });

  describe('hkdfExpand', () => {
    it('should expand PRK to desired length', () => {
      const prk = Buffer.alloc(32, 'a');
      const info = Buffer.from('info');
      
      const okm = hkdfExpand('sha256', prk, info, 64);
      
      expect(okm).toBeInstanceOf(Buffer);
      expect(okm.length).toBe(64);
    });

    it('should throw error for length exceeding maximum', () => {
      const prk = Buffer.alloc(32, 'a');
      const info = Buffer.from('info');
      
      expect(() => {
        hkdfExpand('sha256', prk, info, 255 * 32 + 1);
      }).toThrow('exceeds maximum');
    });

    it('should throw error for non-positive length', () => {
      const prk = Buffer.alloc(32, 'a');
      const info = Buffer.from('info');
      
      expect(() => {
        hkdfExpand('sha256', prk, info, 0);
      }).toThrow('Length must be positive');
      
      expect(() => {
        hkdfExpand('sha256', prk, info, -1);
      }).toThrow('Length must be positive');
    });

    it('should throw error for unsupported algorithm', () => {
      const prk = Buffer.alloc(32, 'a');
      const info = Buffer.from('info');
      
      expect(() => {
        hkdfExpand('md5', prk, info, 32);
      }).toThrow('Unsupported algorithm');
    });
  });

  describe('hkdf', () => {
    it('should derive key from string inputs', () => {
      const result = hkdf({
        ikm: 'input key material',
        salt: 'salt',
        info: 'info',
        length: 32
      });
      
      expect(result.key).toMatch(/^[0-9a-f]{64}$/);
      expect(result.keyBuffer.length).toBe(32);
    });

    it('should derive key from buffer inputs', () => {
      const result = hkdf({
        ikm: Buffer.from('input key material'),
        salt: Buffer.from('salt'),
        info: Buffer.from('info'),
        length: 32
      });
      
      expect(result.key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should work without salt and info', () => {
      const result = hkdf({
        ikm: 'input key material',
        length: 32
      });
      
      expect(result.key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should use specified algorithm', () => {
      const result256 = hkdf({
        ikm: 'input key material',
        length: 32,
        algorithm: 'sha256'
      });
      
      const result512 = hkdf({
        ikm: 'input key material',
        length: 32,
        algorithm: 'sha512'
      });
      
      expect(result256.key).not.toBe(result512.key);
    });

    it('should include params in result', () => {
      const result = hkdf({
        ikm: 'input key material',
        salt: 'salt',
        info: 'info',
        length: 32,
        algorithm: 'sha256'
      });
      
      expect(result.params.length).toBe(32);
      expect(result.params.algorithm).toBe('sha256');
    });

    it('should be deterministic', () => {
      const result1 = hkdf({
        ikm: 'input key material',
        salt: 'salt',
        info: 'info',
        length: 32
      });
      
      const result2 = hkdf({
        ikm: 'input key material',
        salt: 'salt',
        info: 'info',
        length: 32
      });
      
      expect(result1.key).toBe(result2.key);
    });
  });

  describe('deriveSeed', () => {
    it('should derive seed from server seed, client seed, and nonce', () => {
      const seed = deriveSeed('server-seed', 'client-seed', 1);
      
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different seeds for different inputs', () => {
      const seed1 = deriveSeed('server-seed', 'client-seed', 1);
      const seed2 = deriveSeed('server-seed', 'client-seed', 2);
      const seed3 = deriveSeed('server-seed', 'different-client', 1);
      
      expect(seed1).not.toBe(seed2);
      expect(seed1).not.toBe(seed3);
    });

    it('should be deterministic', () => {
      const seed1 = deriveSeed('server-seed', 'client-seed', 1);
      const seed2 = deriveSeed('server-seed', 'client-seed', 1);
      
      expect(seed1).toBe(seed2);
    });

    it('should accept string nonce', () => {
      const seed = deriveSeed('server-seed', 'client-seed', 'nonce-string');
      
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should allow custom length', () => {
      const seed = deriveSeed('server-seed', 'client-seed', 1, 16);
      
      expect(seed).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('deriveMultipleSeeds', () => {
    it('should derive multiple seeds from single input', () => {
      const seeds = deriveMultipleSeeds('input-key-material', 5);
      
      expect(seeds).toHaveLength(5);
      seeds.forEach(seed => {
        expect(seed).toMatch(/^[0-9a-f]{64}$/);
      });
    });

    it('should produce unique seeds', () => {
      const seeds = deriveMultipleSeeds('input-key-material', 10);
      const uniqueSeeds = new Set(seeds);
      
      expect(uniqueSeeds.size).toBe(10);
    });

    it('should be deterministic', () => {
      const seeds1 = deriveMultipleSeeds('input-key-material', 5);
      const seeds2 = deriveMultipleSeeds('input-key-material', 5);
      
      expect(seeds1).toEqual(seeds2);
    });

    it('should throw error for non-positive count', () => {
      expect(() => {
        deriveMultipleSeeds('input', 0);
      }).toThrow('Count must be positive');
      
      expect(() => {
        deriveMultipleSeeds('input', -1);
      }).toThrow('Count must be positive');
    });

    it('should allow custom seed length', () => {
      const seeds = deriveMultipleSeeds('input-key-material', 3, 16);
      
      expect(seeds).toHaveLength(3);
      seeds.forEach(seed => {
        expect(seed).toMatch(/^[0-9a-f]{32}$/);
      });
    });
  });
});
