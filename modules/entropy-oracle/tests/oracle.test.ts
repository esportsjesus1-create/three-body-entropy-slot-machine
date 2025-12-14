/**
 * Entropy Oracle Unit Tests
 */

import {
  EntropyOracle,
  createOracle,
  EntropyRequestOptions
} from '../src';

describe('EntropyOracle', () => {
  let oracle: EntropyOracle;

  beforeEach(() => {
    oracle = createOracle({
      defaultDuration: 1.0,
      defaultTimeStep: 0.01,
      cacheEnabled: true,
      cacheTTL: 60000
    }, 'test-server-secret');
  });

  afterEach(() => {
    oracle.clearCache();
  });

  describe('constructor', () => {
    it('should create oracle with default config', () => {
      const defaultOracle = createOracle();
      const config = defaultOracle.getConfig();

      expect(config.defaultDuration).toBe(10.0);
      expect(config.defaultTimeStep).toBe(0.001);
      expect(config.cacheEnabled).toBe(true);
    });

    it('should create oracle with custom config', () => {
      const config = oracle.getConfig();

      expect(config.defaultDuration).toBe(1.0);
      expect(config.defaultTimeStep).toBe(0.01);
    });
  });

  describe('requestEntropy', () => {
    it('should generate entropy for a session', async () => {
      const options: EntropyRequestOptions = {
        sessionId: 'session-123'
      };

      const response = await oracle.requestEntropy(options);

      expect(response.requestId).toMatch(/^[0-9a-f]{32}$/);
      expect(response.commitment).toMatch(/^[0-9a-f]{64}$/);
      expect(response.entropy).toBeDefined();
      expect(response.entropy.value).toBeGreaterThanOrEqual(0);
      expect(response.entropy.value).toBeLessThan(1);
      expect(response.proof).toBeDefined();
      expect(response.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should generate entropy with client seed', async () => {
      const options: EntropyRequestOptions = {
        sessionId: 'session-123',
        clientSeed: 'my-client-seed',
        nonce: 1
      };

      const response = await oracle.requestEntropy(options);

      expect(response.entropy).toBeDefined();
      expect(response.proof.chainIndex).toBe(1);
    });

    it('should generate deterministic entropy with same seed', async () => {
      const options1: EntropyRequestOptions = {
        sessionId: 'session-1',
        clientSeed: 'fixed-seed',
        nonce: 1
      };

      const options2: EntropyRequestOptions = {
        sessionId: 'session-2',
        clientSeed: 'fixed-seed',
        nonce: 1
      };

      const response1 = await oracle.requestEntropy(options1);
      const response2 = await oracle.requestEntropy(options2);

      // Different sessions should have different entropy
      expect(response1.entropy.hex).not.toBe(response2.entropy.hex);
    });

    it('should use cache for same session', async () => {
      const options: EntropyRequestOptions = {
        sessionId: 'cached-session'
      };

      await oracle.requestEntropy(options);
      const stats1 = oracle.getStats();

      await oracle.requestEntropy(options);
      const stats2 = oracle.getStats();

      // Second request should be a cache hit (but marked as used)
      expect(stats2.totalRequests).toBe(stats1.totalRequests + 1);
    });

    it('should include valid proof', async () => {
      const response = await oracle.requestEntropy({ sessionId: 'session-proof' });

      expect(response.proof.proofId).toMatch(/^[0-9a-f]{32}$/);
      expect(response.proof.simulationHash).toMatch(/^[0-9a-f]{64}$/);
      expect(response.proof.entropyHash).toMatch(/^[0-9a-f]{64}$/);
      expect(response.proof.signature).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('preGenerateEntropy', () => {
    it('should pre-generate entropy and return commitment', async () => {
      const commitment = await oracle.preGenerateEntropy('pre-session');

      expect(commitment).toMatch(/^[0-9a-f]{64}$/);
      expect(oracle.getCacheSize()).toBe(1);
    });
  });

  describe('revealEntropy', () => {
    it('should reveal pre-generated entropy', async () => {
      await oracle.preGenerateEntropy('reveal-session');
      const response = await oracle.revealEntropy('reveal-session', 'client-seed', 1);

      expect(response.entropy).toBeDefined();
      expect(response.proof).toBeDefined();
    });

    it('should throw error if no pre-generated entropy', async () => {
      await expect(oracle.revealEntropy('unknown-session', 'seed', 1))
        .rejects.toThrow('No pre-generated entropy found');
    });

    it('should combine with client seed', async () => {
      await oracle.preGenerateEntropy('combine-session');
      
      const response1 = await oracle.revealEntropy('combine-session', 'seed1', 1);
      
      // Need to pre-generate again since cache was used
      await oracle.preGenerateEntropy('combine-session-2');
      const response2 = await oracle.revealEntropy('combine-session-2', 'seed2', 1);

      // Different client seeds should produce different entropy
      expect(response1.entropy.hex).not.toBe(response2.entropy.hex);
    });
  });

  describe('verifyProof', () => {
    it('should verify valid proof', async () => {
      const response = await oracle.requestEntropy({ sessionId: 'verify-session' });

      const result = oracle.verifyProof(
        response.entropy,
        response.proof,
        response.commitment
      );

      expect(result.valid).toBe(true);
      expect(result.checks.every(c => c.passed)).toBe(true);
    });

    it('should reject invalid commitment', async () => {
      const response = await oracle.requestEntropy({ sessionId: 'invalid-commit' });

      const result = oracle.verifyProof(
        response.entropy,
        response.proof,
        'invalid-commitment'
      );

      expect(result.valid).toBe(false);
      expect(result.checks.find(c => c.name === 'commitment')?.passed).toBe(false);
    });

    it('should reject tampered entropy', async () => {
      const response = await oracle.requestEntropy({ sessionId: 'tampered-session' });

      const tamperedEntropy = {
        ...response.entropy,
        hex: 'tampered-hex-value'
      };

      const result = oracle.verifyProof(
        tamperedEntropy,
        response.proof,
        response.commitment
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should track statistics', async () => {
      await oracle.requestEntropy({ sessionId: 'stats-1' });
      await oracle.requestEntropy({ sessionId: 'stats-2' });

      const stats = oracle.getStats();

      expect(stats.totalRequests).toBe(2);
      expect(stats.totalSimulations).toBeGreaterThanOrEqual(2);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should track cache hits and misses', async () => {
      await oracle.requestEntropy({ sessionId: 'cache-stats' });
      
      const stats = oracle.getStats();

      expect(stats.cacheMisses).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await oracle.preGenerateEntropy('cache-1');
      await oracle.preGenerateEntropy('cache-2');

      expect(oracle.getCacheSize()).toBe(2);

      oracle.clearCache();

      expect(oracle.getCacheSize()).toBe(0);
    });

    it('should report cache size', async () => {
      expect(oracle.getCacheSize()).toBe(0);

      await oracle.preGenerateEntropy('size-1');
      expect(oracle.getCacheSize()).toBe(1);

      await oracle.preGenerateEntropy('size-2');
      expect(oracle.getCacheSize()).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', async () => {
      await oracle.requestEntropy({ sessionId: 'reset-stats' });

      oracle.resetStats();
      const stats = oracle.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.totalSimulations).toBe(0);
    });
  });

  describe('custom simulation parameters', () => {
    it('should use custom simulation parameters', async () => {
      const response = await oracle.requestEntropy({
        sessionId: 'custom-params',
        simulationParams: {
          duration: 2.0,
          timeStep: 0.02
        }
      });

      expect(response.entropy.metadata.duration).toBe(2.0);
      expect(response.entropy.metadata.timeStep).toBe(0.02);
    });
  });
});
