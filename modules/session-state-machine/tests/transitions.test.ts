/**
 * State Transitions Unit Tests
 */

import {
  SessionState,
  SessionEvent,
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
} from '../src';

describe('State Transitions', () => {
  describe('VALID_TRANSITIONS', () => {
    it('should define transitions for all states', () => {
      const allStates = Object.values(SessionState);
      for (const state of allStates) {
        expect(VALID_TRANSITIONS[state]).toBeDefined();
      }
    });

    it('should allow INIT to transition to AWAITING_BET', () => {
      expect(VALID_TRANSITIONS[SessionState.INIT][SessionEvent.START])
        .toBe(SessionState.AWAITING_BET);
    });

    it('should allow AWAITING_BET to transition to ENTROPY_REQUESTED', () => {
      expect(VALID_TRANSITIONS[SessionState.AWAITING_BET][SessionEvent.PLACE_BET])
        .toBe(SessionState.ENTROPY_REQUESTED);
    });

    it('should allow ENTROPY_REQUESTED to transition to SPINNING', () => {
      expect(VALID_TRANSITIONS[SessionState.ENTROPY_REQUESTED][SessionEvent.ENTROPY_RECEIVED])
        .toBe(SessionState.SPINNING);
    });

    it('should allow SPINNING to transition to COMPLETE', () => {
      expect(VALID_TRANSITIONS[SessionState.SPINNING][SessionEvent.SPIN_COMPLETE])
        .toBe(SessionState.COMPLETE);
    });

    it('should allow ERROR transitions from most states', () => {
      expect(VALID_TRANSITIONS[SessionState.INIT][SessionEvent.ERROR])
        .toBe(SessionState.ERROR);
      expect(VALID_TRANSITIONS[SessionState.AWAITING_BET][SessionEvent.ERROR])
        .toBe(SessionState.ERROR);
      expect(VALID_TRANSITIONS[SessionState.SPINNING][SessionEvent.ERROR])
        .toBe(SessionState.ERROR);
    });

    it('should allow CANCEL transitions from most states', () => {
      expect(VALID_TRANSITIONS[SessionState.INIT][SessionEvent.CANCEL])
        .toBe(SessionState.CANCELLED);
      expect(VALID_TRANSITIONS[SessionState.AWAITING_BET][SessionEvent.CANCEL])
        .toBe(SessionState.CANCELLED);
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidTransition(SessionState.INIT, SessionEvent.START)).toBe(true);
      expect(isValidTransition(SessionState.AWAITING_BET, SessionEvent.PLACE_BET)).toBe(true);
      expect(isValidTransition(SessionState.SPINNING, SessionEvent.SPIN_COMPLETE)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(isValidTransition(SessionState.INIT, SessionEvent.SPIN_COMPLETE)).toBe(false);
      expect(isValidTransition(SessionState.SPINNING, SessionEvent.PLACE_BET)).toBe(false);
      expect(isValidTransition(SessionState.COMPLETE, SessionEvent.START)).toBe(false);
    });

    it('should return false for terminal states', () => {
      expect(isValidTransition(SessionState.CANCELLED, SessionEvent.START)).toBe(false);
      expect(isValidTransition(SessionState.EXPIRED, SessionEvent.RESET)).toBe(false);
    });
  });

  describe('getTargetState', () => {
    it('should return target state for valid transitions', () => {
      expect(getTargetState(SessionState.INIT, SessionEvent.START))
        .toBe(SessionState.AWAITING_BET);
      expect(getTargetState(SessionState.SPINNING, SessionEvent.SPIN_COMPLETE))
        .toBe(SessionState.COMPLETE);
    });

    it('should return undefined for invalid transitions', () => {
      expect(getTargetState(SessionState.INIT, SessionEvent.SPIN_COMPLETE)).toBeUndefined();
      expect(getTargetState(SessionState.CANCELLED, SessionEvent.START)).toBeUndefined();
    });
  });

  describe('getValidEvents', () => {
    it('should return valid events for INIT state', () => {
      const events = getValidEvents(SessionState.INIT);
      expect(events).toContain(SessionEvent.START);
      expect(events).toContain(SessionEvent.ERROR);
      expect(events).toContain(SessionEvent.CANCEL);
    });

    it('should return valid events for AWAITING_BET state', () => {
      const events = getValidEvents(SessionState.AWAITING_BET);
      expect(events).toContain(SessionEvent.PLACE_BET);
      expect(events).toContain(SessionEvent.ERROR);
    });

    it('should return empty array for terminal states', () => {
      expect(getValidEvents(SessionState.CANCELLED)).toHaveLength(0);
      expect(getValidEvents(SessionState.EXPIRED)).toHaveLength(0);
    });
  });

  describe('getSourceStates', () => {
    it('should return source states for AWAITING_BET', () => {
      const sources = getSourceStates(SessionState.AWAITING_BET);
      expect(sources).toContain(SessionState.INIT);
      expect(sources).toContain(SessionState.COMPLETE);
    });

    it('should return source states for ERROR', () => {
      const sources = getSourceStates(SessionState.ERROR);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources).toContain(SessionState.INIT);
      expect(sources).toContain(SessionState.SPINNING);
    });

    it('should return source states for CANCELLED', () => {
      const sources = getSourceStates(SessionState.CANCELLED);
      expect(sources.length).toBeGreaterThan(0);
    });
  });

  describe('isTerminalState', () => {
    it('should return true for terminal states', () => {
      expect(isTerminalState(SessionState.CANCELLED)).toBe(true);
      expect(isTerminalState(SessionState.EXPIRED)).toBe(true);
    });

    it('should return false for non-terminal states', () => {
      expect(isTerminalState(SessionState.INIT)).toBe(false);
      expect(isTerminalState(SessionState.AWAITING_BET)).toBe(false);
      expect(isTerminalState(SessionState.SPINNING)).toBe(false);
      expect(isTerminalState(SessionState.COMPLETE)).toBe(false);
    });
  });

  describe('getHappyPath', () => {
    it('should return the happy path states', () => {
      const path = getHappyPath();
      expect(path).toEqual([
        SessionState.INIT,
        SessionState.AWAITING_BET,
        SessionState.ENTROPY_REQUESTED,
        SessionState.SPINNING,
        SessionState.COMPLETE
      ]);
    });
  });

  describe('validateTransitionSequence', () => {
    it('should validate a valid sequence', () => {
      const sequence: Array<[SessionState, SessionEvent]> = [
        [SessionState.INIT, SessionEvent.START],
        [SessionState.AWAITING_BET, SessionEvent.PLACE_BET],
        [SessionState.ENTROPY_REQUESTED, SessionEvent.ENTROPY_RECEIVED],
        [SessionState.SPINNING, SessionEvent.SPIN_COMPLETE]
      ];
      expect(validateTransitionSequence(sequence)).toBe(true);
    });

    it('should reject an invalid sequence', () => {
      const sequence: Array<[SessionState, SessionEvent]> = [
        [SessionState.INIT, SessionEvent.START],
        [SessionState.AWAITING_BET, SessionEvent.SPIN_COMPLETE] // Invalid
      ];
      expect(validateTransitionSequence(sequence)).toBe(false);
    });

    it('should validate empty sequence', () => {
      expect(validateTransitionSequence([])).toBe(true);
    });
  });

  describe('getStateDescription', () => {
    it('should return descriptions for all states', () => {
      for (const state of Object.values(SessionState)) {
        const description = getStateDescription(state);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
      }
    });

    it('should return specific descriptions', () => {
      expect(getStateDescription(SessionState.INIT)).toContain('initialized');
      expect(getStateDescription(SessionState.SPINNING)).toContain('progress');
      expect(getStateDescription(SessionState.ERROR)).toContain('error');
    });
  });

  describe('getEventDescription', () => {
    it('should return descriptions for all events', () => {
      for (const event of Object.values(SessionEvent)) {
        const description = getEventDescription(event);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
      }
    });

    it('should return specific descriptions', () => {
      expect(getEventDescription(SessionEvent.START)).toContain('Start');
      expect(getEventDescription(SessionEvent.PLACE_BET)).toContain('bet');
      expect(getEventDescription(SessionEvent.SPIN_COMPLETE)).toContain('completed');
    });
  });
});
