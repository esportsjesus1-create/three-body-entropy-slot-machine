/**
 * Session State Machine Integration Tests
 */

import {
  SessionStateMachine,
  createStateMachine,
  SessionState,
  SessionEvent,
  SessionPersistence,
  Session
} from '../src';

describe('Session State Machine Integration', () => {
  let machine: SessionStateMachine;

  beforeEach(() => {
    machine = createStateMachine();
  });

  afterEach(() => {
    machine.clearAllSessions();
  });

  describe('Complete game session lifecycle', () => {
    it('should complete a full game session', async () => {
      // Create session
      const session = await machine.createSession({
        userId: 'player-1',
        gameId: 'slot-game-5-reel'
      });

      // Start session
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      // Place bet
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: {
          betAmount: 100,
          currency: 'USD',
          clientSeed: 'player-seed-123',
          nonce: 1
        }
      });

      // Receive entropy
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ENTROPY_RECEIVED,
        payload: {
          entropyData: {
            value: 0.7234567,
            hex: 'abc123def456',
            sourceHash: 'physics-sim-hash'
          }
        }
      });

      // Complete spin
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE,
        payload: {
          spinResult: {
            reelPositions: [5, 12, 8, 3, 15],
            winAmount: 250,
            multiplier: 2.5
          }
        }
      });

      // Verify final state
      const finalSession = await machine.getSession(session.id);
      expect(finalSession?.state).toBe(SessionState.COMPLETE);
      expect(finalSession?.data.betAmount).toBe(100);
      expect(finalSession?.data.spinResult?.winAmount).toBe(250);
      expect(finalSession?.history).toHaveLength(4);
    });

    it('should handle multiple spins in sequence', async () => {
      const session = await machine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      // First spin
      await machine.transitionState({ sessionId: session.id, event: SessionEvent.START });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 50, nonce: 1 }
      });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ENTROPY_RECEIVED,
        payload: { entropyData: { value: 0.5, hex: 'aaa', sourceHash: 'hash1' } }
      });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE,
        payload: { spinResult: { reelPositions: [1, 2, 3], winAmount: 0, multiplier: 0 } }
      });

      // Reset for second spin
      await machine.transitionState({ sessionId: session.id, event: SessionEvent.RESET });

      // Second spin
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 100, nonce: 2 }
      });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ENTROPY_RECEIVED,
        payload: { entropyData: { value: 0.9, hex: 'bbb', sourceHash: 'hash2' } }
      });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE,
        payload: { spinResult: { reelPositions: [7, 7, 7], winAmount: 1000, multiplier: 10 } }
      });

      const finalSession = await machine.getSession(session.id);
      expect(finalSession?.state).toBe(SessionState.COMPLETE);
      expect(finalSession?.data.betAmount).toBe(100);
      expect(finalSession?.data.nonce).toBe(2);
      expect(finalSession?.history.length).toBeGreaterThan(4);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle error during entropy request', async () => {
      const session = await machine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      await machine.transitionState({ sessionId: session.id, event: SessionEvent.START });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 100 }
      });

      // Simulate error
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ERROR,
        payload: {
          code: 'ENTROPY_TIMEOUT',
          message: 'Failed to receive entropy within timeout'
        }
      });

      const errorSession = await machine.getSession(session.id);
      expect(errorSession?.state).toBe(SessionState.ERROR);
      expect(errorSession?.error?.code).toBe('ENTROPY_TIMEOUT');

      // Reset and retry
      await machine.transitionState({ sessionId: session.id, event: SessionEvent.RESET });

      const resetSession = await machine.getSession(session.id);
      expect(resetSession?.state).toBe(SessionState.INIT);
    });

    it('should handle cancellation at any point', async () => {
      const session = await machine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      await machine.transitionState({ sessionId: session.id, event: SessionEvent.START });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 100 }
      });

      // Cancel mid-session
      await machine.transitionState({ sessionId: session.id, event: SessionEvent.CANCEL });

      const cancelledSession = await machine.getSession(session.id);
      expect(cancelledSession?.state).toBe(SessionState.CANCELLED);

      // Cannot transition from cancelled
      const result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.RESET
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Event-driven architecture', () => {
    it('should emit events for all state changes', async () => {
      const events: string[] = [];

      machine.on('state:changed', () => events.push('changed'));
      machine.on('state:awaiting_bet', () => events.push('awaiting_bet'));
      machine.on('state:entropy_requested', () => events.push('entropy_requested'));
      machine.on('state:spinning', () => events.push('spinning'));
      machine.on('state:complete', () => events.push('complete'));

      const session = await machine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      await machine.transitionState({ sessionId: session.id, event: SessionEvent.START });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 100 }
      });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ENTROPY_RECEIVED,
        payload: { entropyData: { value: 0.5, hex: 'abc', sourceHash: 'hash' } }
      });
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE,
        payload: { spinResult: { reelPositions: [1, 2, 3], winAmount: 0, multiplier: 0 } }
      });

      expect(events).toContain('changed');
      expect(events).toContain('awaiting_bet');
      expect(events).toContain('entropy_requested');
      expect(events).toContain('spinning');
      expect(events).toContain('complete');
    });
  });

  describe('Custom persistence layer', () => {
    it('should work with custom persistence', async () => {
      const storage: Map<string, Session> = new Map();

      const customPersistence: SessionPersistence = {
        async save(session: Session): Promise<void> {
          storage.set(session.id, { ...session });
        },
        async load(sessionId: string): Promise<Session | null> {
          return storage.get(sessionId) || null;
        },
        async delete(sessionId: string): Promise<void> {
          storage.delete(sessionId);
        },
        async listByUser(userId: string): Promise<Session[]> {
          return Array.from(storage.values()).filter(s => s.userId === userId);
        },
        async listByState(state: SessionState): Promise<Session[]> {
          return Array.from(storage.values()).filter(s => s.state === state);
        }
      };

      const customMachine = createStateMachine({
        persistence: customPersistence
      });

      const session = await customMachine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      expect(storage.has(session.id)).toBe(true);

      await customMachine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      const storedSession = storage.get(session.id);
      expect(storedSession?.state).toBe(SessionState.AWAITING_BET);
    });
  });

  describe('Concurrent sessions', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessions = await Promise.all([
        machine.createSession({ userId: 'player-1', gameId: 'game-1' }),
        machine.createSession({ userId: 'player-2', gameId: 'game-1' }),
        machine.createSession({ userId: 'player-1', gameId: 'game-2' })
      ]);

      // Transition all sessions
      await Promise.all(sessions.map(s =>
        machine.transitionState({ sessionId: s.id, event: SessionEvent.START })
      ));

      // Verify all sessions are in AWAITING_BET
      for (const session of sessions) {
        const state = await machine.getCurrentState(session.id);
        expect(state).toBe(SessionState.AWAITING_BET);
      }

      // List by user
      const player1Sessions = await machine.listUserSessions('player-1');
      expect(player1Sessions).toHaveLength(2);
    });
  });

  describe('History tracking', () => {
    it('should maintain complete transition history', async () => {
      const session = await machine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      const transitions = [
        { event: SessionEvent.START },
        { event: SessionEvent.PLACE_BET, payload: { betAmount: 100 } },
        { event: SessionEvent.ENTROPY_RECEIVED, payload: { entropyData: { value: 0.5, hex: 'a', sourceHash: 'h' } } },
        { event: SessionEvent.SPIN_COMPLETE, payload: { spinResult: { reelPositions: [1], winAmount: 0, multiplier: 0 } } }
      ];

      for (const t of transitions) {
        await machine.transitionState({
          sessionId: session.id,
          event: t.event,
          payload: t.payload
        });
      }

      const finalSession = await machine.getSession(session.id);
      expect(finalSession?.history).toHaveLength(4);

      // Verify history order
      expect(finalSession?.history[0].event).toBe(SessionEvent.START);
      expect(finalSession?.history[1].event).toBe(SessionEvent.PLACE_BET);
      expect(finalSession?.history[2].event).toBe(SessionEvent.ENTROPY_RECEIVED);
      expect(finalSession?.history[3].event).toBe(SessionEvent.SPIN_COMPLETE);
    });

    it('should trim history when exceeding max size', async () => {
      const smallHistoryMachine = createStateMachine({
        maxHistorySize: 3
      });

      const session = await smallHistoryMachine.createSession({
        userId: 'player-1',
        gameId: 'slot-game'
      });

      // Make 5 transitions
      await smallHistoryMachine.transitionState({ sessionId: session.id, event: SessionEvent.START });
      await smallHistoryMachine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 100 }
      });
      await smallHistoryMachine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ENTROPY_RECEIVED,
        payload: { entropyData: { value: 0.5, hex: 'a', sourceHash: 'h' } }
      });
      await smallHistoryMachine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE,
        payload: { spinResult: { reelPositions: [1], winAmount: 0, multiplier: 0 } }
      });
      await smallHistoryMachine.transitionState({ sessionId: session.id, event: SessionEvent.RESET });

      const finalSession = await smallHistoryMachine.getSession(session.id);
      expect(finalSession?.history.length).toBeLessThanOrEqual(3);
    });
  });
});
