/**
 * Session State Machine Types
 * 
 * Defines the core data structures for game session state management,
 * transitions, and lifecycle handling.
 */

/**
 * Possible states for a game session.
 */
export enum SessionState {
  /** Initial state when session is created */
  INIT = 'INIT',
  /** Waiting for player to place a bet */
  AWAITING_BET = 'AWAITING_BET',
  /** Entropy has been requested from the oracle */
  ENTROPY_REQUESTED = 'ENTROPY_REQUESTED',
  /** Spin is in progress */
  SPINNING = 'SPINNING',
  /** Spin is complete, result available */
  COMPLETE = 'COMPLETE',
  /** An error occurred */
  ERROR = 'ERROR',
  /** Session has been cancelled */
  CANCELLED = 'CANCELLED',
  /** Session has expired */
  EXPIRED = 'EXPIRED'
}

/**
 * Events that trigger state transitions.
 */
export enum SessionEvent {
  /** Start the session */
  START = 'START',
  /** Place a bet */
  PLACE_BET = 'PLACE_BET',
  /** Request entropy */
  REQUEST_ENTROPY = 'REQUEST_ENTROPY',
  /** Entropy received */
  ENTROPY_RECEIVED = 'ENTROPY_RECEIVED',
  /** Start spinning */
  SPIN = 'SPIN',
  /** Spin completed */
  SPIN_COMPLETE = 'SPIN_COMPLETE',
  /** An error occurred */
  ERROR = 'ERROR',
  /** Cancel the session */
  CANCEL = 'CANCEL',
  /** Session expired */
  EXPIRE = 'EXPIRE',
  /** Reset the session */
  RESET = 'RESET'
}

/**
 * Represents a game session.
 */
export interface Session {
  /** Unique session identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Game identifier */
  gameId: string;
  /** Current state */
  state: SessionState;
  /** Session creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Session expiration timestamp */
  expiresAt: number;
  /** Session data/payload */
  data: SessionData;
  /** State transition history */
  history: StateTransition[];
  /** Error information if in ERROR state */
  error?: SessionError;
}

/**
 * Session data containing game-specific information.
 */
export interface SessionData {
  /** Bet amount */
  betAmount?: number;
  /** Currency */
  currency?: string;
  /** Entropy data */
  entropyData?: {
    value: number;
    hex: string;
    sourceHash: string;
  };
  /** Spin result */
  spinResult?: {
    reelPositions: number[];
    winAmount: number;
    multiplier: number;
  };
  /** Client seed */
  clientSeed?: string;
  /** Nonce */
  nonce?: number;
  /** Additional custom data */
  custom?: Record<string, unknown>;
}

/**
 * Represents a state transition.
 */
export interface StateTransition {
  /** Previous state */
  from: SessionState;
  /** New state */
  to: SessionState;
  /** Event that triggered the transition */
  event: SessionEvent;
  /** Timestamp of transition */
  timestamp: number;
  /** Payload data for the transition */
  payload?: Record<string, unknown>;
}

/**
 * Session error information.
 */
export interface SessionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Options for creating a session.
 */
export interface CreateSessionOptions {
  /** User identifier */
  userId: string;
  /** Game identifier */
  gameId: string;
  /** Session TTL in milliseconds */
  ttl?: number;
  /** Initial session data */
  initialData?: Partial<SessionData>;
}

/**
 * Options for transitioning state.
 */
export interface TransitionOptions {
  /** Session identifier */
  sessionId: string;
  /** Event to trigger */
  event: SessionEvent;
  /** Payload data */
  payload?: Record<string, unknown>;
}

/**
 * Result of a state transition.
 */
export interface TransitionResult {
  /** Whether the transition was successful */
  success: boolean;
  /** The session after transition */
  session: Session;
  /** Previous state */
  previousState: SessionState;
  /** New state */
  newState: SessionState;
  /** Error if transition failed */
  error?: string;
}

/**
 * Persistence layer interface for session storage.
 */
export interface SessionPersistence {
  /** Save a session */
  save(session: Session): Promise<void>;
  /** Load a session by ID */
  load(sessionId: string): Promise<Session | null>;
  /** Delete a session */
  delete(sessionId: string): Promise<void>;
  /** List sessions for a user */
  listByUser(userId: string): Promise<Session[]>;
  /** List sessions by state */
  listByState(state: SessionState): Promise<Session[]>;
}

/**
 * Event listener callback type.
 */
export type SessionEventListener = (
  session: Session,
  transition: StateTransition
) => void;

/**
 * State machine configuration.
 */
export interface StateMachineConfig {
  /** Default session TTL in milliseconds */
  defaultTTL: number;
  /** Maximum history entries to keep */
  maxHistorySize: number;
  /** Whether to emit events */
  emitEvents: boolean;
  /** Persistence layer (optional) */
  persistence?: SessionPersistence;
}
