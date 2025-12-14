# Session State Machine Module

Game session state management with transitions and lifecycle handling for slot machine sessions.

## Overview

This module implements a Finite State Machine (FSM) for managing the lifecycle of slot machine game sessions. It enforces valid state transitions, maintains session history, emits events on state changes, and provides a persistence layer interface for state saving.

## Features

- **Finite State Machine Implementation**: Complete FSM for session lifecycle management
- **Enforced State Transitions**: Cannot make invalid transitions (e.g., SPINNING to AWAITING_BET)
- **Persistence Layer Interface**: Pluggable storage backend (Redis, database, etc.)
- **Event Emission**: Events emitted on every state change
- **Session History**: Complete audit trail of all state transitions
- **Auto-Expiration**: Sessions automatically expire after TTL
- **Concurrent Session Support**: Handle multiple sessions simultaneously

## Installation

```bash
npm install @three-body-entropy/session-state-machine
```

Or if using from the monorepo:

```bash
cd modules/session-state-machine
npm install
npm run build
```

## Session States

| State | Description |
|-------|-------------|
| `INIT` | Session initialized, waiting to start |
| `AWAITING_BET` | Waiting for player to place a bet |
| `ENTROPY_REQUESTED` | Entropy requested from oracle |
| `SPINNING` | Spin in progress |
| `COMPLETE` | Spin complete, result available |
| `ERROR` | An error occurred |
| `CANCELLED` | Session was cancelled |
| `EXPIRED` | Session has expired |

## State Transition Diagram

```
INIT ──START──> AWAITING_BET ──PLACE_BET──> ENTROPY_REQUESTED
                     ↑                              │
                     │                      ENTROPY_RECEIVED
                   RESET                            │
                     │                              ↓
                COMPLETE <──SPIN_COMPLETE── SPINNING

Any state can transition to ERROR, CANCELLED, or EXPIRED
```

## API Documentation

### createSession(options)

Initializes a new game session.

**Parameters:**
- `options.userId`: `string` - User identifier
- `options.gameId`: `string` - Game identifier
- `options.ttl`: `number` (optional) - Session TTL in milliseconds
- `options.initialData`: `SessionData` (optional) - Initial session data

**Returns:** `Promise<Session>` - The created session

```typescript
const session = await machine.createSession({
  userId: 'player-123',
  gameId: 'slot-5-reel',
  ttl: 1800000, // 30 minutes
  initialData: {
    currency: 'USD'
  }
});
```

### transitionState(options)

Attempts a state transition with optional payload data.

**Parameters:**
- `options.sessionId`: `string` - Session identifier
- `options.event`: `SessionEvent` - Event to trigger
- `options.payload`: `object` (optional) - Payload data

**Returns:** `Promise<TransitionResult>` - Transition result

```typescript
const result = await machine.transitionState({
  sessionId: session.id,
  event: SessionEvent.PLACE_BET,
  payload: {
    betAmount: 100,
    currency: 'USD',
    clientSeed: 'user-seed'
  }
});

if (result.success) {
  console.log(`Transitioned from ${result.previousState} to ${result.newState}`);
}
```

### getCurrentState(sessionId)

Retrieves the current state of a session.

**Parameters:**
- `sessionId`: `string` - Session identifier

**Returns:** `Promise<SessionState | null>` - Current state or null

```typescript
const state = await machine.getCurrentState(session.id);
console.log(`Current state: ${state}`);
```

### getSession(sessionId)

Gets a session by ID.

**Parameters:**
- `sessionId`: `string` - Session identifier

**Returns:** `Promise<Session | null>` - Session or null

```typescript
const session = await machine.getSession(sessionId);
```

### canTransition(sessionId, event)

Checks if a transition is valid.

**Parameters:**
- `sessionId`: `string` - Session identifier
- `event`: `SessionEvent` - Event to check

**Returns:** `Promise<boolean>` - True if valid

```typescript
if (await machine.canTransition(session.id, SessionEvent.SPIN_COMPLETE)) {
  // Safe to transition
}
```

## Usage Examples

### Basic Session Lifecycle

```typescript
import {
  createStateMachine,
  SessionEvent
} from '@three-body-entropy/session-state-machine';

const machine = createStateMachine();

// Create session
const session = await machine.createSession({
  userId: 'player-1',
  gameId: 'slot-game'
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
    clientSeed: 'my-seed',
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
      hex: 'abc123...',
      sourceHash: 'physics-hash'
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

// Get final session
const finalSession = await machine.getSession(session.id);
console.log('Win amount:', finalSession.data.spinResult.winAmount);
```

### Event Listeners

```typescript
const machine = createStateMachine();

// Listen to all state changes
machine.onStateChange((session, transition) => {
  console.log(`Session ${session.id}: ${transition.from} -> ${transition.to}`);
});

// Listen to specific states
machine.on('state:complete', (session, transition) => {
  console.log('Spin complete!', session.data.spinResult);
});

machine.on('state:error', (session, transition) => {
  console.error('Error:', session.error);
});
```

### Custom Persistence Layer

```typescript
import { SessionPersistence, Session, SessionState } from '@three-body-entropy/session-state-machine';
import Redis from 'ioredis';

class RedisPersistence implements SessionPersistence {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async save(session: Session): Promise<void> {
    await this.redis.set(
      `session:${session.id}`,
      JSON.stringify(session),
      'PX',
      session.expiresAt - Date.now()
    );
  }

  async load(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  async listByUser(userId: string): Promise<Session[]> {
    // Implementation depends on your indexing strategy
  }

  async listByState(state: SessionState): Promise<Session[]> {
    // Implementation depends on your indexing strategy
  }
}

const machine = createStateMachine({
  persistence: new RedisPersistence('redis://localhost:6379')
});
```

### Error Handling

```typescript
// Handle errors gracefully
const result = await machine.transitionState({
  sessionId: session.id,
  event: SessionEvent.ENTROPY_RECEIVED,
  payload: { entropyData }
});

if (!result.success) {
  console.error('Transition failed:', result.error);
  
  // Transition to error state
  await machine.transitionState({
    sessionId: session.id,
    event: SessionEvent.ERROR,
    payload: {
      code: 'ENTROPY_ERROR',
      message: result.error
    }
  });
}
```

## Types

### Session

```typescript
interface Session {
  id: string;
  userId: string;
  gameId: string;
  state: SessionState;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  data: SessionData;
  history: StateTransition[];
  error?: SessionError;
}
```

### SessionData

```typescript
interface SessionData {
  betAmount?: number;
  currency?: string;
  entropyData?: {
    value: number;
    hex: string;
    sourceHash: string;
  };
  spinResult?: {
    reelPositions: number[];
    winAmount: number;
    multiplier: number;
  };
  clientSeed?: string;
  nonce?: number;
  custom?: Record<string, unknown>;
}
```

### TransitionResult

```typescript
interface TransitionResult {
  success: boolean;
  session: Session;
  previousState: SessionState;
  newState: SessionState;
  error?: string;
}
```

## Configuration

```typescript
interface StateMachineConfig {
  defaultTTL: number;      // Default: 30 minutes
  maxHistorySize: number;  // Default: 100
  emitEvents: boolean;     // Default: true
  persistence?: SessionPersistence;
}

const machine = createStateMachine({
  defaultTTL: 60 * 60 * 1000, // 1 hour
  maxHistorySize: 50,
  emitEvents: true
});
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## License

MIT
