/**
 * Entropy Oracle Integration Tests
 */

import {
  EntropyOracle,
  createOracle,
  runSimulation,
  generateRandomConditions,
  getPresetConditions,
  PRESET_CONDITIONS
} from '../src';

describe('Entropy Oracle Integration', () => {
  let oracle: EntropyOracle;

  beforeEach(() => {
    oracle = createOracle({
      defaultDuration: 1.0,
      defaultTimeStep: 0.01,
      cacheEnabled: true,
      cacheTTL: 60000
    }, 'integration-test-secret');
  });

  afterEach(() => {
    oracle.clearCache();
  });

  describe('Complete entropy generation workflow', () => {
    it('should complete full entropy request cycle', async () => {
      // Step 1: Request entropy
      const response = await oracle.requestEntropy({
        sessionId: 'workflow-session',
        clientSeed: 'user-seed',
        nonce: 1
      });

      expect(response.entropy).toBeDefined();
      expect(response.commitment).toBeDefined();
      expect(response.proof).toBeDefined();

      // Step 2: Verify the proof
      const verification = oracle.verifyProof(
        response.entropy,
        response.proof,
        response.commitment
      );

      expect(verification.valid).toBe(true);
    });

    it('should complete commitment-reveal workflow', async () => {
      // Step 1: Pre-generate entropy (server commits before client seed)
      const commitment = await oracle.preGenerateEntropy('commit-reveal-session');
      expect(commitment).toMatch(/^[0-9a-f]{64}$/);

      // Step 2: Client provides seed
      const clientSeed = 'client-provided-seed';
      const nonce = 42;

      // Step 3: Reveal entropy combined with client seed
      const response = await oracle.revealEntropy('commit-reveal-session', clientSeed, nonce);

      expect(response.entropy).toBeDefined();
      expect(response.proof.chainIndex).toBe(nonce);

      // Step 4: Verify
      const verification = oracle.verifyProof(
        response.entropy,
        response.proof,
        response.commitment
      );

      expect(verification.valid).toBe(true);
    });
  });

  describe('Multiple sessions', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessions = ['session-1', 'session-2', 'session-3', 'session-4', 'session-5'];

      const responses = await Promise.all(
        sessions.map(sessionId =>
          oracle.requestEntropy({ sessionId, clientSeed: 'seed', nonce: 1 })
        )
      );

      // All responses should be unique
      const entropyHexes = new Set(responses.map(r => r.entropy.hex));
      expect(entropyHexes.size).toBe(sessions.length);

      // All should be verifiable
      for (const response of responses) {
        const verification = oracle.verifyProof(
          response.entropy,
          response.proof,
          response.commitment
        );
        expect(verification.valid).toBe(true);
      }
    });

    it('should handle sequential spins with incrementing nonce', async () => {
      const sessionId = 'sequential-session';
      const clientSeed = 'fixed-seed';
      const results: string[] = [];

      for (let nonce = 1; nonce <= 10; nonce++) {
        const response = await oracle.requestEntropy({
          sessionId: `${sessionId}-${nonce}`,
          clientSeed,
          nonce
        });

        results.push(response.entropy.hex);

        const verification = oracle.verifyProof(
          response.entropy,
          response.proof,
          response.commitment
        );
        expect(verification.valid).toBe(true);
      }

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);
    });
  });

  describe('Simulation with presets', () => {
    it('should work with all preset conditions', async () => {
      for (const preset of PRESET_CONDITIONS) {
        const response = await oracle.requestEntropy({
          sessionId: `preset-${preset.name}`,
          simulationParams: {
            duration: 1.0,
            timeStep: 0.01,
            initialConditions: preset.conditions
          }
        });

        expect(response.entropy.value).toBeGreaterThanOrEqual(0);
        expect(response.entropy.value).toBeLessThan(1);

        const verification = oracle.verifyProof(
          response.entropy,
          response.proof,
          response.commitment
        );
        expect(verification.valid).toBe(true);
      }
    });
  });

  describe('Entropy quality', () => {
    it('should produce well-distributed entropy values', async () => {
      const values: number[] = [];

      for (let i = 0; i < 20; i++) {
        const response = await oracle.requestEntropy({
          sessionId: `distribution-${i}`
        });
        values.push(response.entropy.value);
      }

      // Check distribution (should cover range reasonably)
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      expect(range).toBeGreaterThan(0.1); // Should have some spread
    });

    it('should produce unique entropy hashes', async () => {
      const hashes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const response = await oracle.requestEntropy({
          sessionId: `unique-${i}`
        });
        hashes.push(response.entropy.hex);
      }

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);
    });
  });

  describe('Statistics tracking', () => {
    it('should accurately track statistics', async () => {
      oracle.resetStats();

      // Make several requests
      await oracle.requestEntropy({ sessionId: 'stats-1' });
      await oracle.requestEntropy({ sessionId: 'stats-2' });
      await oracle.requestEntropy({ sessionId: 'stats-3' });

      const stats = oracle.getStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSimulations).toBeGreaterThanOrEqual(3);
      expect(stats.averageSimulationTime).toBeGreaterThan(0);
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe('Direct simulation usage', () => {
    it('should run simulation directly', () => {
      const result = runSimulation(
        { duration: 1.0, timeStep: 0.01 },
        generateRandomConditions('test-seed')
      );

      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
      expect(result.hex).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should run simulation with preset conditions', () => {
      const conditions = getPresetConditions('chaotic');
      expect(conditions).toBeDefined();

      const result = runSimulation(
        { duration: 1.0, timeStep: 0.01 },
        conditions!
      );

      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.metadata.energyDrift).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid initial conditions', async () => {
      await expect(oracle.requestEntropy({
        sessionId: 'invalid-conditions',
        simulationParams: {
          duration: 1.0,
          timeStep: 0.01,
          initialConditions: {
            bodies: [
              { mass: -1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
              { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
              { mass: 1, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
            ]
          }
        }
      })).rejects.toThrow('Invalid initial conditions');
    });
  });

  describe('Cache behavior', () => {
    it('should cache and reuse entropy', async () => {
      const sessionId = 'cache-test';

      // Pre-generate
      await oracle.preGenerateEntropy(sessionId);
      expect(oracle.getCacheSize()).toBe(1);

      // Reveal (uses cache)
      await oracle.revealEntropy(sessionId, 'seed', 1);

      // Cache entry should be marked as used
      // Trying to reveal again should fail
      await expect(oracle.revealEntropy(sessionId, 'seed', 2))
        .rejects.toThrow('No pre-generated entropy found');
    });

    it('should clear cache properly', async () => {
      await oracle.preGenerateEntropy('clear-1');
      await oracle.preGenerateEntropy('clear-2');

      expect(oracle.getCacheSize()).toBe(2);

      oracle.clearCache();

      expect(oracle.getCacheSize()).toBe(0);
    });
  });
});
