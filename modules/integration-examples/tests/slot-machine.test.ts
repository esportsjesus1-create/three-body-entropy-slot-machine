/**
 * Slot Machine Unit Tests
 */

import {
  SlotMachine,
  createSlotMachine,
  createReelConfiguration
} from '../src';
import { SessionState, ReelCount } from '../src/types';

describe('SlotMachine', () => {
  let slotMachine: SlotMachine;

  beforeEach(() => {
    slotMachine = createSlotMachine('user-001', 'test-game', 3, 1000, 'test-secret');
  });

  describe('createSlotMachine', () => {
    it('should create a slot machine with default configuration', () => {
      const machine = createSlotMachine('user', 'game', 3);
      expect(machine).toBeInstanceOf(SlotMachine);
      expect(machine.getBalance()).toBe(1000);
      expect(machine.getState()).toBe(SessionState.INIT);
    });

    it('should create slot machines for all reel counts', () => {
      const reelCounts: ReelCount[] = [3, 4, 5, 6, 7, 8];
      
      for (const reelCount of reelCounts) {
        const machine = createSlotMachine('user', 'game', reelCount);
        expect(machine.getSessionData().reelConfig.reelCount).toBe(reelCount);
      }
    });

    it('should create with custom initial balance', () => {
      const machine = createSlotMachine('user', 'game', 3, 5000);
      expect(machine.getBalance()).toBe(5000);
    });
  });

  describe('createReelConfiguration', () => {
    it('should create configuration with default symbols', () => {
      const config = createReelConfiguration(5);
      expect(config.reelCount).toBe(5);
      expect(config.symbolsPerReel).toBe(20);
      expect(config.symbols.length).toBeGreaterThan(0);
      expect(config.paylines.length).toBeGreaterThan(0);
    });

    it('should create configuration with custom symbols per reel', () => {
      const config = createReelConfiguration(3, 30);
      expect(config.symbolsPerReel).toBe(30);
    });
  });

  describe('session management', () => {
    it('should have correct initial state', () => {
      expect(slotMachine.getState()).toBe(SessionState.INIT);
    });

    it('should transition to AWAITING_BET on start', () => {
      slotMachine.start();
      expect(slotMachine.getState()).toBe(SessionState.AWAITING_BET);
    });

    it('should generate unique session IDs', () => {
      const machine1 = createSlotMachine('user', 'game', 3);
      const machine2 = createSlotMachine('user', 'game', 3);
      
      expect(machine1.getSessionData().sessionId).not.toBe(machine2.getSessionData().sessionId);
    });
  });

  describe('hash chain', () => {
    it('should generate server commitment', () => {
      const commitment = slotMachine.getServerCommitment();
      expect(commitment).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should accept client seed', () => {
      slotMachine.setClientSeed('my-client-seed');
      expect(slotMachine.getSessionData().hashChain.clientSeed).toBe('my-client-seed');
    });
  });

  describe('spin', () => {
    beforeEach(() => {
      slotMachine.start();
      slotMachine.setClientSeed('test-client-seed');
    });

    it('should perform a spin successfully', async () => {
      const result = await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      expect(result.success).toBe(true);
      expect(result.spinRecord).toBeDefined();
      expect(result.newBalance).toBeDefined();
    });

    it('should deduct bet from balance', async () => {
      const initialBalance = slotMachine.getBalance();
      
      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      // Balance should be initial - bet + winAmount
      expect(slotMachine.getBalance()).toBeLessThanOrEqual(initialBalance);
    });

    it('should reject negative bet', async () => {
      const result = await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: -10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should reject bet exceeding balance', async () => {
      const result = await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10000
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('balance');
    });

    it('should increment nonce on each spin', async () => {
      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      const result2 = await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      expect(result2.spinRecord?.nonce).toBe(1);
    });

    it('should record spin in history', async () => {
      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      const history = slotMachine.getSpinHistory();
      expect(history.length).toBe(1);
    });
  });

  describe('verification', () => {
    beforeEach(() => {
      slotMachine.start();
      slotMachine.setClientSeed('test-client-seed');
    });

    it('should verify valid spin result', async () => {
      const result = await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      if (result.spinRecord) {
        const verification = slotMachine.verifySpinResult(result.spinRecord);
        expect(verification.valid).toBe(true);
      }
    });

    it('should verify full session', async () => {
      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 20
      });

      const verification = slotMachine.verifyFullSession();
      expect(verification.valid).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset session state', async () => {
      slotMachine.start();
      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      slotMachine.reset(2000);

      expect(slotMachine.getState()).toBe(SessionState.INIT);
      expect(slotMachine.getBalance()).toBe(2000);
      expect(slotMachine.getSpinHistory().length).toBe(0);
    });
  });

  describe('events', () => {
    beforeEach(() => {
      slotMachine.start();
      slotMachine.setClientSeed('test-client-seed');
    });

    it('should emit stateChange event', (done) => {
      const machine = createSlotMachine('user', 'game', 3);
      
      machine.on('stateChange', (oldState, newState) => {
        expect(oldState).toBe(SessionState.INIT);
        expect(newState).toBe(SessionState.AWAITING_BET);
        done();
      });

      machine.start();
    });

    it('should emit spin event', async () => {
      const spinHandler = jest.fn();
      slotMachine.on('spin', spinHandler);

      await slotMachine.spin({
        sessionId: slotMachine.getSessionData().sessionId,
        bet: 10
      });

      expect(spinHandler).toHaveBeenCalled();
    });
  });
});
