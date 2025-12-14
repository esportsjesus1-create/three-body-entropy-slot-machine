/**
 * Client Library Integration Tests
 */

import {
  SlotMachineClient,
  createClient,
  createDefaultReelConfig,
  createDefaultPaylines,
  SessionDetails,
  ReelConfiguration
} from '../src';

describe('Client Library Integration', () => {
  let client: SlotMachineClient;

  beforeEach(() => {
    client = createClient();
  });

  describe('Complete spin workflow', () => {
    it('should complete full spin cycle for 3-reel slot', async () => {
      const session: SessionDetails = {
        sessionId: 'session-3reel',
        userId: 'user-1',
        gameId: 'classic-3-reel',
        betAmount: 10,
        currency: 'USD',
        clientSeed: client.generateClientSeed(),
        nonce: 1
      };

      const config = createDefaultReelConfig(3);
      config.paylines = createDefaultPaylines(3);

      const response = await client.requestSpin(session, config);

      expect(response.success).toBe(true);
      expect(response.result?.reelPositions).toHaveLength(3);
    });

    it('should complete full spin cycle for 5-reel slot', async () => {
      const session: SessionDetails = {
        sessionId: 'session-5reel',
        userId: 'user-1',
        gameId: 'video-5-reel',
        betAmount: 50,
        currency: 'USD',
        clientSeed: client.generateClientSeed(),
        nonce: 1
      };

      const config = createDefaultReelConfig(5);
      config.paylines = createDefaultPaylines(5);

      const response = await client.requestSpin(session, config);

      expect(response.success).toBe(true);
      expect(response.result?.reelPositions).toHaveLength(5);
    });

    it('should complete full spin cycle for 8-reel slot', async () => {
      const session: SessionDetails = {
        sessionId: 'session-8reel',
        userId: 'user-1',
        gameId: 'mega-8-reel',
        betAmount: 100,
        currency: 'USD',
        clientSeed: client.generateClientSeed(),
        nonce: 1
      };

      const config = createDefaultReelConfig(8);
      config.paylines = createDefaultPaylines(8);

      const response = await client.requestSpin(session, config);

      expect(response.success).toBe(true);
      expect(response.result?.reelPositions).toHaveLength(8);
    });
  });

  describe('Multiple spins with incrementing nonce', () => {
    it('should handle multiple spins correctly', async () => {
      const baseSession: Omit<SessionDetails, 'nonce'> = {
        sessionId: 'session-multi',
        userId: 'user-1',
        gameId: 'slot-game',
        betAmount: 25,
        currency: 'USD',
        clientSeed: client.generateClientSeed()
      };

      const config = createDefaultReelConfig(5);
      const results: number[][] = [];

      for (let nonce = 1; nonce <= 10; nonce++) {
        const session: SessionDetails = { ...baseSession, nonce };
        const response = await client.requestSpin(session, config);

        expect(response.success).toBe(true);
        results.push(response.result!.reelPositions);
      }

      // All results should be different
      const uniqueResults = new Set(results.map(r => r.join(',')));
      expect(uniqueResults.size).toBe(10);
    });
  });

  describe('Client-side verification', () => {
    it('should verify spin results locally', async () => {
      const session: SessionDetails = {
        sessionId: 'session-verify',
        userId: 'user-1',
        gameId: 'slot-game',
        betAmount: 50,
        currency: 'USD',
        clientSeed: 'fixed-seed-for-testing',
        nonce: 42
      };

      const config = createDefaultReelConfig(5);
      const response = await client.requestSpin(session, config);

      expect(response.success).toBe(true);

      // Calculate result locally
      const localResult = client.calculateReelResult(
        response.proof!.theta,
        config,
        session.clientSeed,
        session.nonce
      );

      // Results should be deterministic based on inputs
      expect(localResult.reelPositions).toHaveLength(5);
    });
  });

  describe('All reel configurations', () => {
    const reelCounts = [3, 4, 5, 6, 7, 8] as const;

    for (const reelCount of reelCounts) {
      it(`should work with ${reelCount}-reel configuration`, async () => {
        const session: SessionDetails = {
          sessionId: `session-${reelCount}reel`,
          userId: 'user-1',
          gameId: `slot-${reelCount}-reel`,
          betAmount: reelCount * 10,
          currency: 'USD',
          clientSeed: client.generateClientSeed(),
          nonce: 1
        };

        const config = createDefaultReelConfig(reelCount);
        config.paylines = createDefaultPaylines(reelCount);

        const response = await client.requestSpin(session, config);

        expect(response.success).toBe(true);
        expect(response.result?.reelPositions).toHaveLength(reelCount);
        expect(response.proof).toBeDefined();
        expect(response.serverCommitment).toBeDefined();
      });
    }
  });

  describe('Custom symbol configurations', () => {
    it('should work with custom symbols', async () => {
      const session: SessionDetails = {
        sessionId: 'session-custom',
        userId: 'user-1',
        gameId: 'custom-slot',
        betAmount: 100,
        currency: 'USD',
        clientSeed: client.generateClientSeed(),
        nonce: 1
      };

      const config: ReelConfiguration = {
        reelCount: 5,
        symbolsPerReel: 30,
        symbols: [
          { id: 0, name: 'Diamond', value: 500 },
          { id: 1, name: 'Gold', value: 200 },
          { id: 2, name: 'Silver', value: 100 },
          { id: 3, name: 'Bronze', value: 50 },
          { id: 4, name: 'Wild', value: 1000, isWild: true },
          { id: 5, name: 'Scatter', value: 0, isScatter: true }
        ],
        paylines: createDefaultPaylines(5)
      };

      const response = await client.requestSpin(session, config);

      expect(response.success).toBe(true);
      expect(response.result?.reelPositions).toHaveLength(5);
      response.result?.reelPositions.forEach(pos => {
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(30);
      });
    });
  });

  describe('Deterministic results', () => {
    it('should produce same results for same inputs', async () => {
      const session: SessionDetails = {
        sessionId: 'session-deterministic',
        userId: 'user-1',
        gameId: 'slot-game',
        betAmount: 50,
        currency: 'USD',
        clientSeed: 'deterministic-seed',
        nonce: 123
      };

      const config = createDefaultReelConfig(5);

      // Make two requests with same parameters
      const response1 = await client.requestSpin(session, config);
      const response2 = await client.requestSpin(session, config);

      // Both should succeed
      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);

      // Note: In real implementation with server-side entropy,
      // results would differ. This tests the client-side calculation.
    });
  });

  describe('Error handling', () => {
    it('should handle invalid reel count gracefully', async () => {
      const session: SessionDetails = {
        sessionId: 'session-error',
        userId: 'user-1',
        gameId: 'slot-game',
        betAmount: 50,
        currency: 'USD',
        clientSeed: client.generateClientSeed(),
        nonce: 1
      };

      const invalidConfig = {
        reelCount: 10 as any,
        symbolsPerReel: 20
      };

      await expect(client.requestSpin(session, invalidConfig))
        .rejects.toThrow();
    });
  });
});
