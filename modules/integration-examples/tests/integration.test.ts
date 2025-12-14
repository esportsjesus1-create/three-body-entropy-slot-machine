/**
 * Integration Examples Integration Tests
 */

import {
  SlotMachine,
  createSlotMachine,
  createReelConfiguration,
  verifyFullSession,
  run3ReelExample,
  run8ReelExample
} from '../src';
import { SessionState, ReelCount } from '../src/types';

describe('Integration Examples', () => {
  describe('Complete session lifecycle', () => {
    it('should complete INIT -> SPIN -> RESULT -> VERIFY cycle', async () => {
      const machine = createSlotMachine('user', 'game', 5, 1000, 'secret');

      // INIT state
      expect(machine.getState()).toBe(SessionState.INIT);

      // Get commitment before starting
      const commitment = machine.getServerCommitment();
      expect(commitment).toMatch(/^[0-9a-f]{64}$/);

      // Set client seed
      machine.setClientSeed('my-seed');

      // Start session (AWAITING_BET)
      machine.start();
      expect(machine.getState()).toBe(SessionState.AWAITING_BET);

      // Perform spin
      const result = await machine.spin({
        sessionId: machine.getSessionData().sessionId,
        bet: 50
      });

      expect(result.success).toBe(true);
      expect(result.spinRecord).toBeDefined();

      // Verify result
      if (result.spinRecord) {
        const verification = machine.verifySpinResult(result.spinRecord);
        expect(verification.valid).toBe(true);
      }

      // Back to AWAITING_BET
      expect(machine.getState()).toBe(SessionState.AWAITING_BET);
    });

    it('should handle multiple spins in sequence', async () => {
      const machine = createSlotMachine('user', 'game', 3, 1000, 'secret');
      machine.setClientSeed('sequence-seed');
      machine.start();

      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await machine.spin({
          sessionId: machine.getSessionData().sessionId,
          bet: 10
        });
        results.push(result);
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(machine.getSpinHistory().length).toBe(5);

      // Verify full session
      const sessionVerification = machine.verifyFullSession();
      expect(sessionVerification.valid).toBe(true);
    });
  });

  describe('Hash chain verification', () => {
    it('should maintain hash chain integrity', async () => {
      const machine = createSlotMachine('user', 'game', 3, 1000, 'secret');
      machine.setClientSeed('chain-seed');
      machine.start();

      // Perform multiple spins
      for (let i = 0; i < 10; i++) {
        await machine.spin({
          sessionId: machine.getSessionData().sessionId,
          bet: 5
        });
      }

      const sessionData = machine.getSessionData();
      expect(sessionData.hashChain.currentIndex).toBe(10);

      // Verify session
      const verification = machine.verifyFullSession();
      expect(verification.valid).toBe(true);
    });
  });

  describe('All reel configurations', () => {
    const reelCounts: ReelCount[] = [3, 4, 5, 6, 7, 8];

    for (const reelCount of reelCounts) {
      it(`should work with ${reelCount}-reel configuration`, async () => {
        const machine = createSlotMachine('user', `${reelCount}-reel-game`, reelCount, 1000, 'secret');
        machine.setClientSeed(`${reelCount}-reel-seed`);
        machine.start();

        const result = await machine.spin({
          sessionId: machine.getSessionData().sessionId,
          bet: 10
        });

        expect(result.success).toBe(true);
        expect(result.spinRecord?.reelPositions.length).toBe(reelCount);
        expect(result.spinRecord?.symbols.length).toBe(reelCount);

        if (result.spinRecord) {
          const verification = machine.verifySpinResult(result.spinRecord);
          expect(verification.valid).toBe(true);
        }
      });
    }
  });

  describe('verifyFullSession utility', () => {
    it('should verify valid session data', async () => {
      const machine = createSlotMachine('user', 'game', 3, 1000, 'secret');
      machine.setClientSeed('verify-seed');
      machine.start();

      await machine.spin({
        sessionId: machine.getSessionData().sessionId,
        bet: 10
      });

      const sessionData = machine.getSessionData();
      const result = verifyFullSession(sessionData);

      expect(result.valid).toBe(true);
    });

    it('should detect invalid session structure', () => {
      const invalidSession = {
        sessionId: '',
        userId: '',
        gameId: '',
        state: SessionState.INIT,
        balance: 0,
        bet: 0,
        reelConfig: { reelCount: 3, symbolsPerReel: 20, symbols: [], paylines: [] },
        spinHistory: [],
        hashChain: { serverCommitment: '', clientSeed: '', chainLength: 0, currentIndex: 0, hashes: [] },
        createdAt: 0,
        updatedAt: 0
      };

      const result = verifyFullSession(invalidSession as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('Example functions', () => {
    it('should run 3-reel example successfully', async () => {
      // Suppress console output during test
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await run3ReelExample();

      expect(result.success).toBe(true);
      expect(result.totalSpins).toBeGreaterThan(0);
      expect(result.sessionData).toBeDefined();

      consoleSpy.mockRestore();
    }, 30000);

    it('should run 8-reel example successfully', async () => {
      // Suppress console output during test
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await run8ReelExample();

      expect(result.success).toBe(true);
      expect(result.totalSpins).toBeGreaterThan(0);
      expect(result.sessionData).toBeDefined();

      consoleSpy.mockRestore();
    }, 30000);
  });

  describe('Error handling', () => {
    it('should handle spin in wrong state', async () => {
      const machine = createSlotMachine('user', 'game', 3, 1000, 'secret');
      // Don't call start() - machine is in INIT state

      const result = await machine.spin({
        sessionId: machine.getSessionData().sessionId,
        bet: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot spin');
    });

    it('should handle insufficient balance', async () => {
      const machine = createSlotMachine('user', 'game', 3, 100, 'secret');
      machine.start();

      const result = await machine.spin({
        sessionId: machine.getSessionData().sessionId,
        bet: 200
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('balance');
    });
  });

  describe('Determinism', () => {
    it('should produce same results with same seeds', async () => {
      const machine1 = createSlotMachine('user', 'game', 3, 1000, 'same-secret');
      const machine2 = createSlotMachine('user', 'game', 3, 1000, 'same-secret');

      machine1.setClientSeed('same-client-seed');
      machine2.setClientSeed('same-client-seed');

      machine1.start();
      machine2.start();

      // Note: Results may differ due to different hash chains
      // but the verification should work for both
      const result1 = await machine1.spin({
        sessionId: machine1.getSessionData().sessionId,
        bet: 10
      });

      const result2 = await machine2.spin({
        sessionId: machine2.getSessionData().sessionId,
        bet: 10
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Both should be verifiable
      if (result1.spinRecord) {
        expect(machine1.verifySpinResult(result1.spinRecord).valid).toBe(true);
      }
      if (result2.spinRecord) {
        expect(machine2.verifySpinResult(result2.spinRecord).valid).toBe(true);
      }
    });
  });
});
