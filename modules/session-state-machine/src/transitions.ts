/**
 * State Transition Definitions
 * 
 * Defines the valid state transitions for the session state machine.
 * This enforces the game session lifecycle rules.
 */

import { SessionState, SessionEvent } from './types';

/**
 * Map of valid transitions from each state.
 * Key is the current state, value is a map of events to target states.
 */
export const VALID_TRANSITIONS: Record<SessionState, Partial<Record<SessionEvent, SessionState>>> = {
  [SessionState.INIT]: {
    [SessionEvent.START]: SessionState.AWAITING_BET,
    [SessionEvent.ERROR]: SessionState.ERROR,
    [SessionEvent.CANCEL]: SessionState.CANCELLED,
    [SessionEvent.EXPIRE]: SessionState.EXPIRED
  },
  
  [SessionState.AWAITING_BET]: {
    [SessionEvent.PLACE_BET]: SessionState.ENTROPY_REQUESTED,
    [SessionEvent.ERROR]: SessionState.ERROR,
    [SessionEvent.CANCEL]: SessionState.CANCELLED,
    [SessionEvent.EXPIRE]: SessionState.EXPIRED
  },
  
  [SessionState.ENTROPY_REQUESTED]: {
    [SessionEvent.ENTROPY_RECEIVED]: SessionState.SPINNING,
    [SessionEvent.ERROR]: SessionState.ERROR,
    [SessionEvent.CANCEL]: SessionState.CANCELLED,
    [SessionEvent.EXPIRE]: SessionState.EXPIRED
  },
  
  [SessionState.SPINNING]: {
    [SessionEvent.SPIN_COMPLETE]: SessionState.COMPLETE,
    [SessionEvent.ERROR]: SessionState.ERROR,
    [SessionEvent.CANCEL]: SessionState.CANCELLED,
    [SessionEvent.EXPIRE]: SessionState.EXPIRED
  },
  
  [SessionState.COMPLETE]: {
    [SessionEvent.RESET]: SessionState.AWAITING_BET,
    [SessionEvent.CANCEL]: SessionState.CANCELLED,
    [SessionEvent.EXPIRE]: SessionState.EXPIRED
  },
  
  [SessionState.ERROR]: {
    [SessionEvent.RESET]: SessionState.INIT,
    [SessionEvent.CANCEL]: SessionState.CANCELLED
  },
  
  [SessionState.CANCELLED]: {
    // Terminal state - no transitions out
  },
  
  [SessionState.EXPIRED]: {
    // Terminal state - no transitions out
  }
};

/**
 * Checks if a transition is valid.
 * 
 * @param currentState - Current session state
 * @param event - Event to trigger
 * @returns True if the transition is valid
 */
export function isValidTransition(currentState: SessionState, event: SessionEvent): boolean {
  const stateTransitions = VALID_TRANSITIONS[currentState];
  return stateTransitions !== undefined && event in stateTransitions;
}

/**
 * Gets the target state for a transition.
 * 
 * @param currentState - Current session state
 * @param event - Event to trigger
 * @returns Target state or undefined if invalid
 */
export function getTargetState(currentState: SessionState, event: SessionEvent): SessionState | undefined {
  const stateTransitions = VALID_TRANSITIONS[currentState];
  if (!stateTransitions) {
    return undefined;
  }
  return stateTransitions[event];
}

/**
 * Gets all valid events for a given state.
 * 
 * @param state - Current state
 * @returns Array of valid events
 */
export function getValidEvents(state: SessionState): SessionEvent[] {
  const stateTransitions = VALID_TRANSITIONS[state];
  if (!stateTransitions) {
    return [];
  }
  return Object.keys(stateTransitions) as SessionEvent[];
}

/**
 * Gets all states that can transition to a given state.
 * 
 * @param targetState - Target state
 * @returns Array of source states
 */
export function getSourceStates(targetState: SessionState): SessionState[] {
  const sources: SessionState[] = [];
  
  for (const [state, transitions] of Object.entries(VALID_TRANSITIONS)) {
    for (const target of Object.values(transitions)) {
      if (target === targetState) {
        sources.push(state as SessionState);
        break;
      }
    }
  }
  
  return sources;
}

/**
 * Checks if a state is a terminal state (no outgoing transitions).
 * 
 * @param state - State to check
 * @returns True if terminal
 */
export function isTerminalState(state: SessionState): boolean {
  const transitions = VALID_TRANSITIONS[state];
  return !transitions || Object.keys(transitions).length === 0;
}

/**
 * Gets the complete transition path from INIT to COMPLETE.
 * 
 * @returns Array of states in the happy path
 */
export function getHappyPath(): SessionState[] {
  return [
    SessionState.INIT,
    SessionState.AWAITING_BET,
    SessionState.ENTROPY_REQUESTED,
    SessionState.SPINNING,
    SessionState.COMPLETE
  ];
}

/**
 * Validates a sequence of transitions.
 * 
 * @param transitions - Array of [state, event] pairs
 * @returns True if all transitions are valid
 */
export function validateTransitionSequence(
  transitions: Array<[SessionState, SessionEvent]>
): boolean {
  for (const [state, event] of transitions) {
    if (!isValidTransition(state, event)) {
      return false;
    }
  }
  return true;
}

/**
 * Gets a human-readable description of a state.
 * 
 * @param state - State to describe
 * @returns Description string
 */
export function getStateDescription(state: SessionState): string {
  const descriptions: Record<SessionState, string> = {
    [SessionState.INIT]: 'Session initialized, waiting to start',
    [SessionState.AWAITING_BET]: 'Waiting for player to place a bet',
    [SessionState.ENTROPY_REQUESTED]: 'Entropy requested from oracle',
    [SessionState.SPINNING]: 'Spin in progress',
    [SessionState.COMPLETE]: 'Spin complete, result available',
    [SessionState.ERROR]: 'An error occurred',
    [SessionState.CANCELLED]: 'Session was cancelled',
    [SessionState.EXPIRED]: 'Session has expired'
  };
  
  return descriptions[state] || 'Unknown state';
}

/**
 * Gets a human-readable description of an event.
 * 
 * @param event - Event to describe
 * @returns Description string
 */
export function getEventDescription(event: SessionEvent): string {
  const descriptions: Record<SessionEvent, string> = {
    [SessionEvent.START]: 'Start the session',
    [SessionEvent.PLACE_BET]: 'Place a bet',
    [SessionEvent.REQUEST_ENTROPY]: 'Request entropy from oracle',
    [SessionEvent.ENTROPY_RECEIVED]: 'Entropy received',
    [SessionEvent.SPIN]: 'Start the spin',
    [SessionEvent.SPIN_COMPLETE]: 'Spin completed',
    [SessionEvent.ERROR]: 'An error occurred',
    [SessionEvent.CANCEL]: 'Cancel the session',
    [SessionEvent.EXPIRE]: 'Session expired',
    [SessionEvent.RESET]: 'Reset the session'
  };
  
  return descriptions[event] || 'Unknown event';
}
