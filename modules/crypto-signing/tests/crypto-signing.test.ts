/**
 * Crypto Signing Module Unit Tests
 * 
 * Comprehensive tests for Ed25519 signing and verification functionality.
 */

import {
  signData,
  signResponse,
  verifySignature,
  verifySignedResponse,
  generateKeyPair,
  deriveKeyPairFromSeed,
  getServerKeyPair,
  getPublicKeyInfo,
  clearKeyCache,
  isKeyLoaded,
  SignedResponse,
  CommitResponse,
  RevealResponse,
  VerificationResponse
} from '../src';

describe('Crypto Signing Module', () => {
  beforeEach(() => {
    clearKeyCache();
    delete process.env.ED25519_PRIVATE_KEY;
  });

  afterEach(() => {
    clearKeyCache();
    delete process.env.ED25519_PRIVATE_KEY;
  });

  describe('generateKeyPair', () => {
    it('should generate a valid Ed25519 key pair', () => {
      const keyPair = generateKeyPair();
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.secretKey).toBeDefined();
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.secretKey).toBe('string');
    });

    it('should generate unique key pairs', () => {
      const keyPairs = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const keyPair = generateKeyPair();
        keyPairs.add(keyPair.publicKey);
      }
      
      expect(keyPairs.size).toBe(10);
    });

    it('should generate keys of correct length', () => {
      const keyPair = generateKeyPair();
      
      const publicKeyBytes = Buffer.from(keyPair.publicKey, 'base64');
      const secretKeyBytes = Buffer.from(keyPair.secretKey, 'base64');
      
      expect(publicKeyBytes.length).toBe(32);
      expect(secretKeyBytes.length).toBe(64);
    });
  });

  describe('deriveKeyPairFromSeed', () => {
    it('should derive deterministic key pair from seed', () => {
      const seed = 'test-seed-for-derivation';
      const keyPair1 = deriveKeyPairFromSeed(seed);
      const keyPair2 = deriveKeyPairFromSeed(seed);
      
      expect(keyPair1.publicKey).toBe(keyPair2.publicKey);
      expect(keyPair1.secretKey).toBe(keyPair2.secretKey);
    });

    it('should derive different keys for different seeds', () => {
      const keyPair1 = deriveKeyPairFromSeed('seed1');
      const keyPair2 = deriveKeyPairFromSeed('seed2');
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.secretKey).not.toBe(keyPair2.secretKey);
    });
  });

  describe('signData', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should sign data and return signature with public key', () => {
      const data = { message: 'test data' };
      const signed = signData(data);
      
      expect(signed.signature).toBeDefined();
      expect(signed.publicKey).toBeDefined();
      expect(typeof signed.signature).toBe('string');
      expect(typeof signed.publicKey).toBe('string');
    });

    it('should produce consistent signatures for same data', () => {
      const data = { message: 'test data' };
      const signed1 = signData(data);
      const signed2 = signData(data);
      
      expect(signed1.signature).toBe(signed2.signature);
      expect(signed1.publicKey).toBe(signed2.publicKey);
    });

    it('should produce different signatures for different data', () => {
      const signed1 = signData({ message: 'data1' });
      const signed2 = signData({ message: 'data2' });
      
      expect(signed1.signature).not.toBe(signed2.signature);
    });

    it('should sign various data types', () => {
      expect(() => signData('string')).not.toThrow();
      expect(() => signData(123)).not.toThrow();
      expect(() => signData([1, 2, 3])).not.toThrow();
      expect(() => signData({ nested: { data: true } })).not.toThrow();
      expect(() => signData(null)).not.toThrow();
    });

    it('should throw error when private key not set', () => {
      clearKeyCache();
      delete process.env.ED25519_PRIVATE_KEY;
      
      expect(() => signData({ test: true })).toThrow('ED25519_PRIVATE_KEY');
    });
  });

  describe('signResponse', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should create complete signed response', () => {
      const data = { commitmentHash: 'abc123', sessionId: 'session-1' };
      const response = signResponse(data);
      
      expect(response.data).toEqual(data);
      expect(response.signature).toBeDefined();
      expect(response.publicKey).toBeDefined();
      expect(response.signedAt).toBeDefined();
      expect(typeof response.signedAt).toBe('number');
    });

    it('should include timestamp close to current time', () => {
      const before = Date.now();
      const response = signResponse({ test: true });
      const after = Date.now();
      
      expect(response.signedAt).toBeGreaterThanOrEqual(before);
      expect(response.signedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('verifySignature', () => {
    let testKeyPair: { publicKey: string; secretKey: string };

    beforeEach(() => {
      testKeyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = testKeyPair.secretKey;
    });

    it('should verify valid signature', () => {
      const data = { message: 'test data' };
      const signed = signData(data);
      
      const result = verifySignature(data, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject tampered data', () => {
      const data = { message: 'original data' };
      const signed = signData(data);
      
      const tamperedData = { message: 'tampered data' };
      const result = verifySignature(tamperedData, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should reject tampered signature', () => {
      const data = { message: 'test data' };
      const signed = signData(data);
      
      const tamperedSignature = Buffer.from(signed.signature, 'base64');
      tamperedSignature[0] ^= 0xff;
      const tamperedSigBase64 = tamperedSignature.toString('base64');
      
      const result = verifySignature(data, tamperedSigBase64, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should reject wrong public key', () => {
      const data = { message: 'test data' };
      const signed = signData(data);
      
      const wrongKeyPair = generateKeyPair();
      const result = verifySignature(data, signed.signature, wrongKeyPair.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should handle invalid signature format', () => {
      const result = verifySignature({ test: true }, 'invalid-base64!@#', testKeyPair.publicKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid public key format', () => {
      const data = { message: 'test data' };
      const signed = signData(data);
      
      const result = verifySignature(data, signed.signature, 'invalid-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject signature with wrong length', () => {
      const data = { message: 'test data' };
      const shortSig = Buffer.alloc(32).toString('base64');
      
      const result = verifySignature(data, shortSig, testKeyPair.publicKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature length');
    });

    it('should reject public key with wrong length', () => {
      const data = { message: 'test data' };
      const signed = signData(data);
      const shortKey = Buffer.alloc(16).toString('base64');
      
      const result = verifySignature(data, signed.signature, shortKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid public key length');
    });
  });

  describe('verifySignedResponse', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should verify valid signed response', () => {
      const data = { sessionId: 'test-session', result: 'success' };
      const response = signResponse(data);
      
      const result = verifySignedResponse(response);
      
      expect(result.valid).toBe(true);
    });

    it('should reject tampered response data', () => {
      const response = signResponse({ original: true });
      
      const tamperedResponse: SignedResponse = {
        ...response,
        data: { tampered: true }
      };
      
      const result = verifySignedResponse(tamperedResponse);
      
      expect(result.valid).toBe(false);
    });

    it('should reject tampered timestamp', () => {
      const response = signResponse({ test: true });
      
      const tamperedResponse: SignedResponse = {
        ...response,
        signedAt: response.signedAt + 1000
      };
      
      const result = verifySignedResponse(tamperedResponse);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('getPublicKeyInfo', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should return public key info', () => {
      const info = getPublicKeyInfo();
      
      expect(info.publicKey).toBeDefined();
      expect(info.algorithm).toBe('Ed25519');
      expect(info.fingerprint).toBeDefined();
      expect(info.loadedAt).toBeDefined();
    });

    it('should return consistent fingerprint', () => {
      const info1 = getPublicKeyInfo();
      const info2 = getPublicKeyInfo();
      
      expect(info1.fingerprint).toBe(info2.fingerprint);
    });

    it('should return 16-character fingerprint', () => {
      const info = getPublicKeyInfo();
      
      expect(info.fingerprint.length).toBe(16);
      expect(info.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('Key caching', () => {
    it('should cache key pair after first load', () => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
      
      expect(isKeyLoaded()).toBe(false);
      
      getServerKeyPair();
      
      expect(isKeyLoaded()).toBe(true);
    });

    it('should clear cache when clearKeyCache is called', () => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
      
      getServerKeyPair();
      expect(isKeyLoaded()).toBe(true);
      
      clearKeyCache();
      expect(isKeyLoaded()).toBe(false);
    });

    it('should generate new key if generateIfMissing is true', () => {
      clearKeyCache();
      delete process.env.ED25519_PRIVATE_KEY;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const keyPair = getServerKeyPair({ generateIfMissing: true });
      
      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.secretKey).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('API Response Types', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should sign CommitResponse correctly', () => {
      const commitResponse: CommitResponse = {
        commitmentHash: 'abc123def456',
        sessionId: 'session-uuid-123',
        expiresAt: new Date().toISOString()
      };
      
      const signed = signResponse(commitResponse);
      const verified = verifySignedResponse(signed);
      
      expect(verified.valid).toBe(true);
      expect(signed.data).toEqual(commitResponse);
    });

    it('should sign RevealResponse correctly', () => {
      const revealResponse: RevealResponse = {
        serverSeed: 'server-seed-hex',
        clientSeed: 'client-seed-hex',
        resultHash: 'combined-result-hash',
        sessionId: 'session-uuid-123'
      };
      
      const signed = signResponse(revealResponse);
      const verified = verifySignedResponse(signed);
      
      expect(verified.valid).toBe(true);
      expect(signed.data).toEqual(revealResponse);
    });

    it('should sign VerificationResponse correctly', () => {
      const verificationResponse: VerificationResponse = {
        sessionId: 'session-uuid-123',
        valid: true,
        checks: {
          commitmentValid: true,
          entropyValid: true,
          signatureValid: true
        },
        errors: []
      };
      
      const signed = signResponse(verificationResponse);
      const verified = verifySignedResponse(signed);
      
      expect(verified.valid).toBe(true);
      expect(signed.data).toEqual(verificationResponse);
    });
  });

  describe('Tampering Detection', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should detect single bit flip in data', () => {
      const data = { value: 'AAAA' };
      const signed = signData(data);
      
      const tamperedData = { value: 'AAAB' };
      const result = verifySignature(tamperedData, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should detect added field', () => {
      const data = { original: true };
      const signed = signData(data);
      
      const tamperedData = { original: true, added: 'field' };
      const result = verifySignature(tamperedData, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should detect removed field', () => {
      const data = { field1: 'a', field2: 'b' };
      const signed = signData(data);
      
      const tamperedData = { field1: 'a' };
      const result = verifySignature(tamperedData, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should detect type change', () => {
      const data = { value: '123' };
      const signed = signData(data);
      
      const tamperedData = { value: 123 };
      const result = verifySignature(tamperedData, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });

    it('should detect array order change', () => {
      const data = { items: [1, 2, 3] };
      const signed = signData(data);
      
      const tamperedData = { items: [3, 2, 1] };
      const result = verifySignature(tamperedData, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should sign data efficiently (benchmark)', () => {
      const data = { sessionId: 'test', commitmentHash: 'abc123' };
      const iterations = 100;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        signData(data);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      const totalTime = end - start;
      
      console.log(`Sign benchmark: ${avgTime.toFixed(3)}ms avg, ${totalTime.toFixed(1)}ms total for ${iterations} iterations`);
      expect(totalTime).toBeLessThan(30000);
    });

    it('should verify signature efficiently (benchmark)', () => {
      const data = { sessionId: 'test', commitmentHash: 'abc123' };
      const signed = signData(data);
      const iterations = 100;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        verifySignature(data, signed.signature, signed.publicKey);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      const totalTime = end - start;
      
      console.log(`Verify benchmark: ${avgTime.toFixed(3)}ms avg, ${totalTime.toFixed(1)}ms total for ${iterations} iterations`);
      expect(totalTime).toBeLessThan(30000);
    });

    it('should handle large payloads', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
          nested: { a: i, b: i * 2 }
        }))
      };
      
      const start = performance.now();
      const signed = signData(largeData);
      const signTime = performance.now() - start;
      
      const verifyStart = performance.now();
      const result = verifySignature(largeData, signed.signature, signed.publicKey);
      const verifyTime = performance.now() - verifyStart;
      
      console.log(`Large payload: sign=${signTime.toFixed(1)}ms, verify=${verifyTime.toFixed(1)}ms`);
      
      expect(result.valid).toBe(true);
      expect(signTime).toBeLessThan(5000);
      expect(verifyTime).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      const keyPair = generateKeyPair();
      process.env.ED25519_PRIVATE_KEY = keyPair.secretKey;
    });

    it('should handle empty object', () => {
      const signed = signData({});
      const result = verifySignature({}, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
    });

    it('should handle empty array', () => {
      const signed = signData([]);
      const result = verifySignature([], signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const data = { message: '你好世界 🎰 مرحبا' };
      const signed = signData(data);
      const result = verifySignature(data, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
    });

    it('should handle special JSON characters', () => {
      const data = { message: 'line1\nline2\ttab"quote\\backslash' };
      const signed = signData(data);
      const result = verifySignature(data, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
    });

    it('should handle deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 'deep' }
              }
            }
          }
        }
      };
      const signed = signData(data);
      const result = verifySignature(data, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
    });

    it('should handle numeric precision', () => {
      const data = { 
        integer: 9007199254740991,
        float: 3.141592653589793,
        scientific: 1.23e-10
      };
      const signed = signData(data);
      const result = verifySignature(data, signed.signature, signed.publicKey);
      
      expect(result.valid).toBe(true);
    });
  });
});
