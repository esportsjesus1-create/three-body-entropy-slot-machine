/**
 * Session State Machine
 * 
 * Core FSM implementation for game session lifecycle management.
 */

import { EventEmitter } from 'eventemitter3';
import { randomBytes } from 'crypto';
import {
  Session,
  SessionState,
  SessionEvent,
  SessionData,
  StateTransition,
  SessionError,
  CreateSessionOptions,
  TransitionOptions,
  TransitionResult,
  SessionPersistence,
  StateMachineConfig,
  SessionEventListener
} from './types';
import {
  isValidTransition,
  getTargetState,
  getValidEvents,
  isTerminalState
} from './transitions';

/**
 * Default configuration for the state machine.
 */
const DEFAULT_CONFIG: StateMachineConfig = {
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxHistorySize: 100,
  emitEvents: true
};

/**
 * In-memory session storage for when no persistence layer is provided.
 */
class InMemoryPersistence implements SessionPersistence {
  private sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  async load(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : null;
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async listByUser(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId);
  }

  async listByState(state: SessionState): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(s => s.state === state);
  }

  clear(): void {
    this.sessions.clear();
  }
}

/**
 * Session State Machine class.
 * Manages game session lifecycle with enforced state transitions.
 */
export class SessionStateMachine extends EventEmitter {
  private config: StateMachineConfig;
  private persistence: SessionPersistence;
  private inMemory: InMemoryPersistence;

  constructor(config: Partial<StateMachineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.inMemory = new InMemoryPersistence();
    this.persistence = this.config.persistence || this.inMemory;
  }

  /**
   * Generates a unique session ID.
   */
  private generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Creates a new game session.
   * 
   * @param options - Session creation options
   * @returns The created session
   */
  async createSession(options: CreateSessionOptions): Promise<Session> {
    const { userId, gameId, ttl, initialData } = options;

    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required');
    }

    if (!gameId || gameId.trim() === '') {
      throw new Error('Game ID is required');
    }

    const now = Date.now();
    const sessionTTL = ttl || this.config.defaultTTL;

    const session: Session = {
      id: this.generateSessionId(),
      userId,
      gameId,
      state: SessionState.INIT,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + sessionTTL,
      data: initialData || {},
      history: []
    };

    await this.persistence.save(session);

    if (this.config.emitEvents) {
      this.emit('session:created', session);
    }

    return session;
  }

  /**
   * Attempts a state transition.
   * 
   * @param options - Transition options
   * @returns Transition result
   */
  async transitionState(options: TransitionOptions): Promise<TransitionResult> {
    const { sessionId, event, payload } = options;

    const session = await this.persistence.load(sessionId);

    if (!session) {
      return {
        success: false,
        session: null as unknown as Session,
        previousState: SessionState.INIT,
        newState: SessionState.INIT,
        error: `Session not found: ${sessionId}`
      };
    }

    // Check if session has expired
    if (Date.now() > session.expiresAt && event !== SessionEvent.EXPIRE) {
      // Auto-expire the session
      return this.transitionState({
        sessionId,
        event: SessionEvent.EXPIRE,
        payload: { reason: 'Session TTL exceeded' }
      });
    }

    const previousState = session.state;

    // Check if transition is valid
    if (!isValidTransition(previousState, event)) {
      const validEvents = getValidEvents(previousState);
      return {
        success: false,
        session,
        previousState,
        newState: previousState,
        error: `Invalid transition: cannot trigger ${event} from ${previousState}. Valid events: ${validEvents.join(', ')}`
      };
    }

    const newState = getTargetState(previousState, event);

    if (!newState) {
      return {
        success: false,
        session,
        previousState,
        newState: previousState,
        error: `No target state defined for ${event} from ${previousState}`
      };
    }

    // Create transition record
    const transition: StateTransition = {
      from: previousState,
      to: newState,
      event,
      timestamp: Date.now(),
      payload
    };

    // Update session
    session.state = newState;
    session.updatedAt = Date.now();
    session.history.push(transition);

    // Trim history if needed
    if (session.history.length > this.config.maxHistorySize) {
      session.history = session.history.slice(-this.config.maxHistorySize);
    }

    // Handle error state
    if (newState === SessionState.ERROR && payload) {
      session.error = {
        code: (payload.code as string) || 'UNKNOWN_ERROR',
        message: (payload.message as string) || 'An error occurred',
        timestamp: Date.now(),
        details: payload
      };
    }

    // Update session data based on event
    this.updateSessionData(session, event, payload);

    await this.persistence.save(session);

    if (this.config.emitEvents) {
      this.emit('state:changed', session, transition);
      this.emit(`state:${newState.toLowerCase()}`, session, transition);
    }

    return {
      success: true,
      session,
      previousState,
      newState
    };
  }

  /**
   * Updates session data based on the event.
   */
  private updateSessionData(
    session: Session,
    event: SessionEvent,
    payload?: Record<string, unknown>
  ): void {
    if (!payload) return;

    switch (event) {
      case SessionEvent.PLACE_BET:
        if (payload.betAmount !== undefined) {
          session.data.betAmount = payload.betAmount as number;
        }
        if (payload.currency !== undefined) {
          session.data.currency = payload.currency as string;
        }
        if (payload.clientSeed !== undefined) {
          session.data.clientSeed = payload.clientSeed as string;
        }
        if (payload.nonce !== undefined) {
          session.data.nonce = payload.nonce as number;
        }
        break;

      case SessionEvent.ENTROPY_RECEIVED:
        if (payload.entropyData !== undefined) {
          session.data.entropyData = payload.entropyData as SessionData['entropyData'];
        }
        break;

      case SessionEvent.SPIN_COMPLETE:
        if (payload.spinResult !== undefined) {
          session.data.spinResult = payload.spinResult as SessionData['spinResult'];
        }
        break;

      default:
        // Store any custom data
        if (payload.custom !== undefined) {
          session.data.custom = {
            ...session.data.custom,
            ...(payload.custom as Record<string, unknown>)
          };
        }
    }
  }

  /**
   * Gets the current state of a session.
   * 
   * @param sessionId - Session identifier
   * @returns Current session state or null if not found
   */
  async getCurrentState(sessionId: string): Promise<SessionState | null> {
    const session = await this.persistence.load(sessionId);
    return session ? session.state : null;
  }

  /**
   * Gets a session by ID.
   * 
   * @param sessionId - Session identifier
   * @returns Session or null if not found
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.persistence.load(sessionId);
  }

  /**
   * Deletes a session.
   * 
   * @param sessionId - Session identifier
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.persistence.delete(sessionId);

    if (this.config.emitEvents) {
      this.emit('session:deleted', sessionId);
    }
  }

  /**
   * Lists sessions for a user.
   * 
   * @param userId - User identifier
   * @returns Array of sessions
   */
  async listUserSessions(userId: string): Promise<Session[]> {
    return this.persistence.listByUser(userId);
  }

  /**
   * Lists sessions by state.
   * 
   * @param state - Session state
   * @returns Array of sessions
   */
  async listSessionsByState(state: SessionState): Promise<Session[]> {
    return this.persistence.listByState(state);
  }

  /**
   * Checks if a session can transition to a given event.
   * 
   * @param sessionId - Session identifier
   * @param event - Event to check
   * @returns True if transition is valid
   */
  async canTransition(sessionId: string, event: SessionEvent): Promise<boolean> {
    const session = await this.persistence.load(sessionId);
    if (!session) return false;
    return isValidTransition(session.state, event);
  }

  /**
   * Gets valid events for a session.
   * 
   * @param sessionId - Session identifier
   * @returns Array of valid events
   */
  async getValidEventsForSession(sessionId: string): Promise<SessionEvent[]> {
    const session = await this.persistence.load(sessionId);
    if (!session) return [];
    return getValidEvents(session.state);
  }

  /**
   * Checks if a session is in a terminal state.
   * 
   * @param sessionId - Session identifier
   * @returns True if terminal
   */
  async isSessionTerminal(sessionId: string): Promise<boolean> {
    const session = await this.persistence.load(sessionId);
    if (!session) return true;
    return isTerminalState(session.state);
  }

  /**
   * Adds an event listener for state changes.
   * 
   * @param listener - Event listener callback
   */
  onStateChange(listener: SessionEventListener): void {
    this.on('state:changed', listener);
  }

  /**
   * Removes an event listener.
   * 
   * @param listener - Event listener callback
   */
  offStateChange(listener: SessionEventListener): void {
    this.off('state:changed', listener);
  }

  /**
   * Clears all sessions (for testing).
   */
  clearAllSessions(): void {
    if (this.inMemory) {
      this.inMemory.clear();
    }
  }

  /**
   * Gets the configuration.
   */
  getConfig(): StateMachineConfig {
    return { ...this.config };
  }
}

/**
 * Creates a new session state machine instance.
 * 
 * @param config - Optional configuration
 * @returns SessionStateMachine instance
 */
export function createStateMachine(config?: Partial<StateMachineConfig>): SessionStateMachine {
  return new SessionStateMachine(config);
}
