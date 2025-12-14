# Integration Examples Module

Sample implementations for 3-8 reel slot machines using Three-Body Entropy.

## Overview

This module provides complete, runnable examples demonstrating how to use all modules in the Three-Body Entropy Slot Machine system. It showcases the full session lifecycle from initialization through spinning to verification, demonstrating provably fair gaming mechanics.

## Features

- **Complete 3-Reel Example**: Classic slot machine with standard symbols
- **Complete 8-Reel Example**: Extended cosmic-themed slot with custom symbols
- **Full Session Lifecycle**: INIT -> AWAITING_BET -> SPINNING -> RESULT -> VERIFY
- **Hash Chain Demonstration**: Setup and verification of cryptographic commitments
- **Provably Fair Verification**: Client-side verification of all spin results
- **Event-Driven Architecture**: Real-time state change and win notifications
- **Configurable Reel Layouts**: Support for 3, 4, 5, 6, 7, and 8 reel configurations

## Installation

```bash
npm install @three-body-entropy/integration-examples
```

Or if using from the monorepo:

```bash
cd modules/integration-examples
npm install
npm run build
```

## API Documentation

### createSlotMachine(userId, gameId, reelCount, initialBalance?, serverSecret?)

Creates a new slot machine instance.

**Parameters:**
- `userId`: `string` - User identifier
- `gameId`: `string` - Game identifier
- `reelCount`: `ReelCount` (3-8) - Number of reels
- `initialBalance`: `number` (optional) - Starting balance (default: 1000)
- `serverSecret`: `string` (optional) - Server secret for proofs

**Returns:** `SlotMachine` - Slot machine instance

```typescript
const machine = createSlotMachine('user-001', 'classic-3-reel', 3, 1000);
```

### createReelConfiguration(reelCount, symbolsPerReel?, symbols?, paylines?)

Creates a reel configuration.

**Parameters:**
- `reelCount`: `ReelCount` - Number of reels (3-8)
- `symbolsPerReel`: `number` (optional) - Symbols per reel (default: 20)
- `symbols`: `Symbol[]` (optional) - Custom symbols
- `paylines`: `Payline[]` (optional) - Custom paylines

**Returns:** `ReelConfiguration` - Reel configuration

### run3ReelExample()

Runs the complete 3-reel slot machine example.

**Returns:** `Promise<ExampleResult>` - Example execution result

### run8ReelExample()

Runs the complete 8-reel slot machine example.

**Returns:** `Promise<ExampleResult>` - Example execution result

### verifyFullSession(sessionData)

Verifies a complete session with all spin records.

**Parameters:**
- `sessionData`: `SessionData` - Session data to verify

**Returns:** `VerificationResult` - Verification result

## Usage Examples

### Basic 3-Reel Slot Machine

```typescript
import { createSlotMachine } from '@three-body-entropy/integration-examples';

// Create slot machine
const machine = createSlotMachine('player-001', 'classic-slots', 3, 1000);

// Get server commitment (send to client before they provide seed)
const commitment = machine.getServerCommitment();
console.log('Server Commitment:', commitment);

// Client provides their seed
machine.setClientSeed('client-chosen-seed');

// Start session
machine.start();

// Perform spin
const result = await machine.spin({
  sessionId: machine.getSessionData().sessionId,
  bet: 10
});

if (result.success) {
  console.log('Symbols:', result.spinRecord.symbols);
  console.log('Win:', result.spinRecord.winAmount);
  console.log('Balance:', result.newBalance);
  
  // Verify the spin
  const verification = machine.verifySpinResult(result.spinRecord);
  console.log('Verified:', verification.valid);
}
```

### 8-Reel Cosmic Slot Machine

```typescript
import { SlotMachine, createReelConfiguration } from '@three-body-entropy/integration-examples';

// Custom symbols
const cosmicSymbols = [
  { id: 'star', name: 'Star', value: 1 },
  { id: 'moon', name: 'Moon', value: 2 },
  { id: 'planet', name: 'Planet', value: 5 },
  { id: 'galaxy', name: 'Galaxy', value: 15 },
  { id: 'blackhole', name: 'Black Hole', value: 50 }
];

// Create configuration
const config = createReelConfiguration(8, 30, cosmicSymbols);

// Create slot machine with custom config
const machine = new SlotMachine(
  'cosmic-player',
  'cosmic-slots',
  config,
  5000,
  'server-secret'
);

machine.setClientSeed('cosmic-seed');
machine.start();

// Perform multiple spins
for (let i = 0; i < 10; i++) {
  const result = await machine.spin({
    sessionId: machine.getSessionData().sessionId,
    bet: 50
  });
  console.log(`Spin ${i + 1}:`, result.spinRecord?.symbols.join(' | '));
}

// Verify full session
const sessionVerification = machine.verifyFullSession();
console.log('Session Valid:', sessionVerification.valid);
```

### Event Handling

```typescript
import { createSlotMachine } from '@three-body-entropy/integration-examples';

const machine = createSlotMachine('player', 'game', 5);

// Listen for state changes
machine.on('stateChange', (oldState, newState) => {
  console.log(`State: ${oldState} -> ${newState}`);
});

// Listen for spins
machine.on('spin', (spinRecord) => {
  console.log('Spin completed:', spinRecord.spinId);
});

// Listen for wins
machine.on('win', (amount, spinRecord) => {
  console.log(`WIN! $${amount} on spin ${spinRecord.spinId}`);
});

// Listen for errors
machine.on('error', (error) => {
  console.error('Error:', error.message);
});

machine.start();
```

### Running Examples

```bash
# Run 3-reel example
npm run run:3reel

# Run 8-reel example
npm run run:8reel

# Run all examples
npm run run:all
```

## Session Lifecycle

```
┌─────────┐
│  INIT   │ ← Initial state
└────┬────┘
     │ start()
     ▼
┌─────────────────┐
│  AWAITING_BET   │ ← Ready for spin
└────────┬────────┘
         │ spin() - bet placed
         ▼
┌─────────────────────┐
│  ENTROPY_REQUESTED  │ ← Getting entropy
└──────────┬──────────┘
           │
           ▼
┌──────────────┐
│   SPINNING   │ ← Calculating result
└──────┬───────┘
       │
       ▼
┌───────────────┐
│  RESULT_READY │ ← Result available
└───────┬───────┘
        │
        ▼
┌─────────────────┐
│  AWAITING_BET   │ ← Ready for next spin
└─────────────────┘
```

## Types

### SessionState

```typescript
enum SessionState {
  INIT = 'INIT',
  AWAITING_BET = 'AWAITING_BET',
  ENTROPY_REQUESTED = 'ENTROPY_REQUESTED',
  SPINNING = 'SPINNING',
  RESULT_READY = 'RESULT_READY',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
```

### SpinResult

```typescript
interface SpinResult {
  success: boolean;
  spinRecord?: SpinRecord;
  newBalance?: number;
  error?: string;
}
```

### SpinRecord

```typescript
interface SpinRecord {
  spinId: string;
  nonce: number;
  bet: number;
  entropyValue: number;
  entropyHex: string;
  reelPositions: number[];
  symbols: string[];
  winAmount: number;
  timestamp: number;
  proof: SpinProof;
}
```

### ExampleResult

```typescript
interface ExampleResult {
  success: boolean;
  sessionData: SessionData;
  spinResults: SpinResult[];
  verificationResults: VerificationResult[];
  totalSpins: number;
  totalWins: number;
  totalLosses: number;
  finalBalance: number;
  executionTime: number;
}
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
