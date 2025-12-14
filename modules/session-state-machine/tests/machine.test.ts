/**
 * Session State Machine Unit Tests
 */

import {
  SessionStateMachine,
  createStateMachine,
  SessionState,
  SessionEvent,
  Session
} from '../src';

describe('SessionStateMachine', () => {
  let machine: SessionStateMachine;

  beforeEach(() => {
    machine = createStateMachine();
  });

  afterEach(() => {
    machine.clearAllSessions();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.gameId).toBe('game-456');
      expect(session.state).toBe(SessionState.INIT);
      expect(session.history).toHaveLength(0);
    });

    it('should create session with custom TTL', async () => {
      const ttl = 60000; // 1 minute
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456',
        ttl
      });

      expect(session.expiresAt - session.createdAt).toBe(ttl);
    });

    it('should create session with initial data', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456',
        initialData: {
          currency: 'USD',
          custom: { theme: 'dark' }
        }
      });

      expect(session.data.currency).toBe('USD');
      expect(session.data.custom).toEqual({ theme: 'dark' });
    });

    it('should throw error for missing userId', async () => {
      await expect(machine.createSession({
        userId: '',
        gameId: 'game-456'
      })).rejects.toThrow('User ID is required');
    });

    it('should throw error for missing gameId', async () => {
      await expect(machine.createSession({
        userId: 'user-123',
        gameId: ''
      })).rejects.toThrow('Game ID is required');
    });

    it('should emit session:created event', async () => {
      const listener = jest.fn();
      machine.on('session:created', listener);

      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      expect(listener).toHaveBeenCalledWith(session);
    });
  });

  describe('transitionState', () => {
    let session: Session;

    beforeEach(async () => {
      session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });
    });

    it('should transition from INIT to AWAITING_BET', async () => {
      const result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      expect(result.success).toBe(true);
      expect(result.previousState).toBe(SessionState.INIT);
      expect(result.newState).toBe(SessionState.AWAITING_BET);
    });

    it('should transition through happy path', async () => {
      // INIT -> AWAITING_BET
      let result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });
      expect(result.newState).toBe(SessionState.AWAITING_BET);

      // AWAITING_BET -> ENTROPY_REQUESTED
      result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: { betAmount: 100, currency: 'USD' }
      });
      expect(result.newState).toBe(SessionState.ENTROPY_REQUESTED);

      // ENTROPY_REQUESTED -> SPINNING
      result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ENTROPY_RECEIVED,
        payload: {
          entropyData: {
            value: 0.123,
            hex: 'abc123',
            sourceHash: 'hash123'
          }
        }
      });
      expect(result.newState).toBe(SessionState.SPINNING);

      // SPINNING -> COMPLETE
      result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE,
        payload: {
          spinResult: {
            reelPositions: [1, 2, 3, 4, 5],
            winAmount: 500,
            multiplier: 5
          }
        }
      });
      expect(result.newState).toBe(SessionState.COMPLETE);
    });

    it('should reject invalid transitions', async () => {
      const result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.SPIN_COMPLETE
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should return error for non-existent session', async () => {
      const result = await machine.transitionState({
        sessionId: 'non-existent',
        event: SessionEvent.START
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should record transition history', async () => {
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      const updatedSession = await machine.getSession(session.id);
      expect(updatedSession?.history).toHaveLength(1);
      expect(updatedSession?.history[0].from).toBe(SessionState.INIT);
      expect(updatedSession?.history[0].to).toBe(SessionState.AWAITING_BET);
      expect(updatedSession?.history[0].event).toBe(SessionEvent.START);
    });

    it('should update session data on PLACE_BET', async () => {
      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET,
        payload: {
          betAmount: 100,
          currency: 'USD',
          clientSeed: 'my-seed',
          nonce: 42
        }
      });

      const updatedSession = await machine.getSession(session.id);
      expect(updatedSession?.data.betAmount).toBe(100);
      expect(updatedSession?.data.currency).toBe('USD');
      expect(updatedSession?.data.clientSeed).toBe('my-seed');
      expect(updatedSession?.data.nonce).toBe(42);
    });

    it('should handle ERROR transition', async () => {
      const result = await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.ERROR,
        payload: {
          code: 'TEST_ERROR',
          message: 'Test error message'
        }
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(SessionState.ERROR);

      const updatedSession = await machine.getSession(session.id);
      expect(updatedSession?.error?.code).toBe('TEST_ERROR');
      expect(updatedSession?.error?.message).toBe('Test error message');
    });

    it('should emit state:changed event', async () => {
      const listener = jest.fn();
      machine.on('state:changed', listener);

      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should emit state-specific events', async () => {
      const listener = jest.fn();
      machine.on('state:awaiting_bet', listener);

      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getCurrentState', () => {
    it('should return current state', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      const state = await machine.getCurrentState(session.id);
      expect(state).toBe(SessionState.INIT);
    });

    it('should return null for non-existent session', async () => {
      const state = await machine.getCurrentState('non-existent');
      expect(state).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return session by ID', async () => {
      const created = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      const retrieved = await machine.getSession(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent session', async () => {
      const session = await machine.getSession('non-existent');
      expect(session).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      await machine.deleteSession(session.id);

      const retrieved = await machine.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should emit session:deleted event', async () => {
      const listener = jest.fn();
      machine.on('session:deleted', listener);

      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      await machine.deleteSession(session.id);

      expect(listener).toHaveBeenCalledWith(session.id);
    });
  });

  describe('listUserSessions', () => {
    it('should list sessions for a user', async () => {
      await machine.createSession({ userId: 'user-1', gameId: 'game-1' });
      await machine.createSession({ userId: 'user-1', gameId: 'game-2' });
      await machine.createSession({ userId: 'user-2', gameId: 'game-1' });

      const sessions = await machine.listUserSessions('user-1');
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.userId === 'user-1')).toBe(true);
    });
  });

  describe('listSessionsByState', () => {
    it('should list sessions by state', async () => {
      const session1 = await machine.createSession({ userId: 'user-1', gameId: 'game-1' });
      const session2 = await machine.createSession({ userId: 'user-2', gameId: 'game-2' });

      await machine.transitionState({
        sessionId: session1.id,
        event: SessionEvent.START
      });

      const initSessions = await machine.listSessionsByState(SessionState.INIT);
      const awaitingSessions = await machine.listSessionsByState(SessionState.AWAITING_BET);

      expect(initSessions).toHaveLength(1);
      expect(awaitingSessions).toHaveLength(1);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      const canStart = await machine.canTransition(session.id, SessionEvent.START);
      expect(canStart).toBe(true);
    });

    it('should return false for invalid transitions', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      const canSpin = await machine.canTransition(session.id, SessionEvent.SPIN_COMPLETE);
      expect(canSpin).toBe(false);
    });

    it('should return false for non-existent session', async () => {
      const can = await machine.canTransition('non-existent', SessionEvent.START);
      expect(can).toBe(false);
    });
  });

  describe('getValidEventsForSession', () => {
    it('should return valid events for session', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      const events = await machine.getValidEventsForSession(session.id);
      expect(events).toContain(SessionEvent.START);
      expect(events).toContain(SessionEvent.ERROR);
    });

    it('should return empty array for non-existent session', async () => {
      const events = await machine.getValidEventsForSession('non-existent');
      expect(events).toHaveLength(0);
    });
  });

  describe('isSessionTerminal', () => {
    it('should return false for non-terminal states', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      const isTerminal = await machine.isSessionTerminal(session.id);
      expect(isTerminal).toBe(false);
    });

    it('should return true for terminal states', async () => {
      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.CANCEL
      });

      const isTerminal = await machine.isSessionTerminal(session.id);
      expect(isTerminal).toBe(true);
    });

    it('should return true for non-existent session', async () => {
      const isTerminal = await machine.isSessionTerminal('non-existent');
      expect(isTerminal).toBe(true);
    });
  });

  describe('event listeners', () => {
    it('should add and remove state change listeners', async () => {
      const listener = jest.fn();
      machine.onStateChange(listener);

      const session = await machine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      expect(listener).toHaveBeenCalledTimes(1);

      machine.offStateChange(listener);

      await machine.transitionState({
        sessionId: session.id,
        event: SessionEvent.PLACE_BET
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customMachine = createStateMachine({
        defaultTTL: 60000,
        maxHistorySize: 50,
        emitEvents: false
      });

      const config = customMachine.getConfig();
      expect(config.defaultTTL).toBe(60000);
      expect(config.maxHistorySize).toBe(50);
      expect(config.emitEvents).toBe(false);
    });
  });

  describe('session expiration', () => {
    it('should auto-expire sessions past TTL', async () => {
      const shortTTLMachine = createStateMachine({
        defaultTTL: 1 // 1ms TTL
      });

      const session = await shortTTLMachine.createSession({
        userId: 'user-123',
        gameId: 'game-456'
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await shortTTLMachine.transitionState({
        sessionId: session.id,
        event: SessionEvent.START
      });

      expect(result.newState).toBe(SessionState.EXPIRED);
    });
  });
});
