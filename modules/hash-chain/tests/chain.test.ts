/**
 * Hash Chain Unit Tests
 */

import {
  computeHash,
  generateHashChain,
  verifyHashChain,
  verifyChainLink,
  deriveNextHash,
  getHashAtIndex,
  getHashRange,
  getRemainingHashes,
  createPartialChain,
  extendHashChain,
  hashToNumber,
  hashToFloat
} from '../src/chain';

describe('Hash Chain', () => {
  describe('computeHash', () => {
    it('should compute SHA-256 hash by default', () => {
      const hash = computeHash('test data');
      
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const hash1 = computeHash('test data');
      const hash2 = computeHash('test data');
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = computeHash('data1');
      const hash2 = computeHash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should support different algorithms', () => {
      const hash256 = computeHash('test data', 'sha256');
      const hash512 = computeHash('test data', 'sha512');
      
      expect(hash256.length).toBe(64);
      expect(hash512.length).toBe(128);
    });
  });

  describe('generateHashChain', () => {
    it('should generate a hash chain of specified length', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(chain.hashes).toHaveLength(10);
      expect(chain.length).toBe(10);
    });

    it('should set initial commitment to first hash', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(chain.initialCommitment).toBe(chain.hashes[0].hash);
    });

    it('should create valid chain links', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      // Each hash should be the hash of the next hash
      for (let i = 0; i < chain.length - 1; i++) {
        const expectedHash = computeHash(chain.hashes[i + 1].hash);
        expect(chain.hashes[i].hash).toBe(expectedHash);
      }
    });

    it('should be deterministic', () => {
      const chain1 = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const chain2 = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(chain1.hashes.map(h => h.hash)).toEqual(chain2.hashes.map(h => h.hash));
    });

    it('should throw error for empty terminal seed', () => {
      expect(() => generateHashChain({
        terminalSeed: '',
        length: 10
      })).toThrow('Terminal seed cannot be empty');
    });

    it('should throw error for non-positive length', () => {
      expect(() => generateHashChain({
        terminalSeed: 'seed',
        length: 0
      })).toThrow('Chain length must be positive');
      
      expect(() => generateHashChain({
        terminalSeed: 'seed',
        length: -1
      })).toThrow('Chain length must be positive');
    });

    it('should throw error for excessive length', () => {
      expect(() => generateHashChain({
        terminalSeed: 'seed',
        length: 10000001
      })).toThrow('exceeds maximum');
    });

    it('should support different algorithms', () => {
      const chain256 = generateHashChain({
        terminalSeed: 'seed',
        length: 5,
        algorithm: 'sha256'
      });
      
      const chain512 = generateHashChain({
        terminalSeed: 'seed',
        length: 5,
        algorithm: 'sha512'
      });
      
      expect(chain256.algorithm).toBe('sha256');
      expect(chain512.algorithm).toBe('sha512');
      expect(chain256.hashes[0].hash.length).toBe(64);
      expect(chain512.hashes[0].hash.length).toBe(128);
    });
  });

  describe('verifyHashChain', () => {
    it('should verify valid chain', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const hashes = chain.hashes.map(h => h.hash);
      const result = verifyHashChain(chain.initialCommitment, hashes);
      
      expect(result.valid).toBe(true);
      expect(result.verifiedCount).toBe(10);
    });

    it('should reject chain with wrong initial commitment', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const hashes = chain.hashes.map(h => h.hash);
      const result = verifyHashChain('wrong-commitment', hashes);
      
      expect(result.valid).toBe(false);
      expect(result.invalidIndex).toBe(0);
    });

    it('should reject chain with tampered hash', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const hashes = chain.hashes.map(h => h.hash);
      hashes[5] = 'tampered-hash';
      
      const result = verifyHashChain(chain.initialCommitment, hashes);
      
      expect(result.valid).toBe(false);
      expect(result.invalidIndex).toBeDefined();
    });

    it('should return error for empty commitment', () => {
      const result = verifyHashChain('', ['hash1', 'hash2']);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should return error for empty sequence', () => {
      const result = verifyHashChain('commitment', []);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('verifyChainLink', () => {
    it('should verify valid link', () => {
      const nextHash = 'some-hash-value';
      const currentHash = computeHash(nextHash);
      
      expect(verifyChainLink(currentHash, nextHash)).toBe(true);
    });

    it('should reject invalid link', () => {
      expect(verifyChainLink('current-hash', 'next-hash')).toBe(false);
    });
  });

  describe('deriveNextHash', () => {
    it('should derive hash from inputs', () => {
      const result = deriveNextHash({
        previousHash: 'previous-hash',
        clientSeed: 'client-seed',
        nonce: 1
      });
      
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.inputs.previousHash).toBe('previous-hash');
      expect(result.inputs.clientSeed).toBe('client-seed');
      expect(result.inputs.nonce).toBe('1');
    });

    it('should be deterministic', () => {
      const result1 = deriveNextHash({
        previousHash: 'previous-hash',
        clientSeed: 'client-seed',
        nonce: 1
      });
      
      const result2 = deriveNextHash({
        previousHash: 'previous-hash',
        clientSeed: 'client-seed',
        nonce: 1
      });
      
      expect(result1.hash).toBe(result2.hash);
    });

    it('should include additional data when provided', () => {
      const result1 = deriveNextHash({
        previousHash: 'previous-hash',
        clientSeed: 'client-seed',
        nonce: 1
      });
      
      const result2 = deriveNextHash({
        previousHash: 'previous-hash',
        clientSeed: 'client-seed',
        nonce: 1,
        additionalData: 'extra'
      });
      
      expect(result1.hash).not.toBe(result2.hash);
      expect(result2.inputs.additionalData).toBe('extra');
    });

    it('should throw error for empty previous hash', () => {
      expect(() => deriveNextHash({
        previousHash: '',
        clientSeed: 'client-seed',
        nonce: 1
      })).toThrow('Previous hash cannot be empty');
    });

    it('should throw error for empty client seed', () => {
      expect(() => deriveNextHash({
        previousHash: 'previous-hash',
        clientSeed: '',
        nonce: 1
      })).toThrow('Client seed cannot be empty');
    });
  });

  describe('getHashAtIndex', () => {
    it('should return hash at specified index', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const hash = getHashAtIndex(chain, 5);
      
      expect(hash).toBe(chain.hashes[5].hash);
    });

    it('should throw error for out of bounds index', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(() => getHashAtIndex(chain, -1)).toThrow('out of bounds');
      expect(() => getHashAtIndex(chain, 10)).toThrow('out of bounds');
    });
  });

  describe('getHashRange', () => {
    it('should return range of hashes', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const range = getHashRange(chain, 2, 5);
      
      expect(range).toHaveLength(3);
      expect(range[0]).toBe(chain.hashes[2].hash);
      expect(range[2]).toBe(chain.hashes[4].hash);
    });

    it('should throw error for invalid start index', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(() => getHashRange(chain, -1, 5)).toThrow('out of bounds');
      expect(() => getHashRange(chain, 10, 15)).toThrow('out of bounds');
    });

    it('should throw error for invalid end index', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(() => getHashRange(chain, 5, 3)).toThrow('invalid');
      expect(() => getHashRange(chain, 5, 11)).toThrow('invalid');
    });
  });

  describe('getRemainingHashes', () => {
    it('should return remaining hash count', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(getRemainingHashes(chain, 0)).toBe(9);
      expect(getRemainingHashes(chain, 5)).toBe(4);
      expect(getRemainingHashes(chain, 9)).toBe(0);
    });

    it('should throw error for out of bounds index', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      expect(() => getRemainingHashes(chain, -1)).toThrow('out of bounds');
      expect(() => getRemainingHashes(chain, 10)).toThrow('out of bounds');
    });
  });

  describe('createPartialChain', () => {
    it('should create partial chain from range', () => {
      const chain = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const partial = createPartialChain(chain, 2, 5);
      
      expect(partial.length).toBe(3);
      expect(partial.initialCommitment).toBe(chain.hashes[2].hash);
      expect(partial.hashes[0].index).toBe(0);
    });
  });

  describe('extendHashChain', () => {
    it('should extend chain with additional hashes', () => {
      const chain1 = generateHashChain({
        terminalSeed: 'terminal-seed',
        length: 10
      });
      
      const chain2 = extendHashChain('terminal-seed', 10, 5);
      
      expect(chain2.length).toBe(15);
      // The last 10 hashes should match the original chain
      for (let i = 0; i < 10; i++) {
        expect(chain2.hashes[i + 5].hash).toBe(chain1.hashes[i].hash);
      }
    });
  });

  describe('hashToNumber', () => {
    it('should convert hash to number in range', () => {
      const hash = computeHash('test');
      const num = hashToNumber(hash, 100);
      
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(100);
    });

    it('should be deterministic', () => {
      const hash = computeHash('test');
      const num1 = hashToNumber(hash, 100);
      const num2 = hashToNumber(hash, 100);
      
      expect(num1).toBe(num2);
    });

    it('should throw error for non-positive max value', () => {
      const hash = computeHash('test');
      
      expect(() => hashToNumber(hash, 0)).toThrow('Max value must be positive');
      expect(() => hashToNumber(hash, -1)).toThrow('Max value must be positive');
    });
  });

  describe('hashToFloat', () => {
    it('should convert hash to float in range [0, 1)', () => {
      const hash = computeHash('test');
      const float = hashToFloat(hash);
      
      expect(float).toBeGreaterThanOrEqual(0);
      expect(float).toBeLessThan(1);
    });

    it('should be deterministic', () => {
      const hash = computeHash('test');
      const float1 = hashToFloat(hash);
      const float2 = hashToFloat(hash);
      
      expect(float1).toBe(float2);
    });

    it('should produce different values for different hashes', () => {
      const hash1 = computeHash('test1');
      const hash2 = computeHash('test2');
      
      expect(hashToFloat(hash1)).not.toBe(hashToFloat(hash2));
    });
  });
});
