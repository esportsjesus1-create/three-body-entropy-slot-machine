/**
 * Session State Machine Module
 * 
 * Provides game session state management with transitions and lifecycle handling
 * for slot machine sessions.
 * 
 * @packageDocumentation
 */

// Export types
export {
  SessionState,
  SessionEvent,
  Session,
  SessionData,
  StateTransition,
  SessionError,
  CreateSessionOptions,
  TransitionOptions,
  TransitionResult,
  SessionPersistence,
  SessionEventListener,
  StateMachineConfig
} from './types';

// Export transition utilities
export {
  VALID_TRANSITIONS,
  isValidTransition,
  getTargetState,
  getValidEvents,
  getSourceStates,
  isTerminalState,
  getHappyPath,
  validateTransitionSequence,
  getStateDescription,
  getEventDescription
} from './transitions';

// Export state machine
export {
  SessionStateMachine,
  createStateMachine
} from './machine';
