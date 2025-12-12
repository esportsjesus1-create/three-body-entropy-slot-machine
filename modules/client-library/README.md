# Client Library Module

Universal API bridge for slot randomizers supporting 3-8 reel configurations.

## Overview

This module provides a client-side library for interacting with the Three-Body Entropy Slot Machine system. It handles API communication, deterministic conversion of entropy values to reel positions, and client-side fairness verification.

## Features

- **API Abstraction**: Clean interface for server-side spin logic
- **Deterministic Reel Calculation**: Convert entropy to reel positions
- **3-8 Reel Support**: Configurable for any reel count from 3 to 8
- **Client-Side Verification**: Verify spin results using hash chains
- **Custom Configurations**: Support for custom symbols and paylines
- **Provably Fair**: Full verification of server-provided proofs

## Installation

```bash
npm install @three-body-entropy/client-library
```

Or if using from the monorepo:

```bash
cd modules/client-library
npm install
npm run build
```

## API Documentation

### setApiEndpoint(url)

Configures the backend API endpoint.

**Parameters:**
- `url`: `string` - API endpoint URL

```typescript
client.setApiEndpoint('https://api.example.com/v1');
```

### requestSpin(sessionDetails, reelConfig)

Sends a request to the server to initiate a spin.

**Parameters:**
- `sessionDetails`: `SessionDetails` - Session information
- `reelConfig`: `ReelConfiguration` - Reel configuration

**Returns:** `Promise<SpinResponse>` - Spin response with result

```typescript
const response = await client.requestSpin(
  {
    sessionId: 'session-123',
    userId: 'user-456',
    gameId: 'slot-5-reel',
    betAmount: 100,
    currency: 'USD',
    clientSeed: 'my-seed',
    nonce: 1
  },
  {
    reelCount: 5,
    symbolsPerReel: 20
  }
);
```

### calculateReelResult(entropyValue, reelConfig, clientSeed, nonce)

Deterministically converts the final entropy value into reel stop positions.

**Parameters:**
- `entropyValue`: `number | string` - Entropy value from server
- `reelConfig`: `ReelConfiguration` - Reel configuration
- `clientSeed`: `string` - Client seed
- `nonce`: `number` - Nonce value

**Returns:** `SpinResult` - Calculated spin result

```typescript
const result = client.calculateReelResult(
  '0x1a2b3c4d...',
  { reelCount: 5, symbolsPerReel: 20 },
  'my-seed',
  1
);
console.log('Reel positions:', result.reelPositions);
```

### verifySpinResult(result, proof, entropyData, reelConfig, clientSeed, nonce)

Verifies a spin result for fairness.

**Parameters:**
- `result`: `SpinResult` - Spin result to verify
- `proof`: `ProofData` - Proof data from server
- `entropyData`: `EntropyData` - Entropy data
- `reelConfig`: `ReelConfiguration` - Reel configuration
- `clientSeed`: `string` - Client seed
- `nonce`: `number` - Nonce value

**Returns:** `VerificationResult` - Verification result

```typescript
const verification = client.verifySpinResult(
  result,
  proof,
  entropyData,
  reelConfig,
  'my-seed',
  1
);

if (verification.valid) {
  console.log('Spin is provably fair!');
}
```

## Usage Examples

### Basic 5-Reel Slot

```typescript
import { createClient, createDefaultReelConfig } from '@three-body-entropy/client-library';

const client = createClient({
  apiEndpoint: 'https://api.example.com'
});

// Generate client seed
const clientSeed = client.generateClientSeed();

// Create session
const session = {
  sessionId: 'session-123',
  userId: 'player-1',
  gameId: 'video-slots',
  betAmount: 50,
  currency: 'USD',
  clientSeed,
  nonce: 1
};

// Use default 5-reel configuration
const config = createDefaultReelConfig(5);

// Request spin
const response = await client.requestSpin(session, config);

if (response.success) {
  console.log('Reel positions:', response.result.reelPositions);
  console.log('Win amount:', response.result.winAmount);
}
```

### 3-Reel Classic Slot

```typescript
import { createClient, createDefaultReelConfig, createDefaultPaylines } from '@three-body-entropy/client-library';

const client = createClient();

const config = createDefaultReelConfig(3);
config.paylines = createDefaultPaylines(3);

const session = {
  sessionId: 'classic-session',
  userId: 'player-1',
  gameId: 'classic-3-reel',
  betAmount: 10,
  currency: 'USD',
  clientSeed: client.generateClientSeed(),
  nonce: 1
};

const response = await client.requestSpin(session, config);
console.log('Classic slot result:', response.result.reelPositions);
```

### 8-Reel Mega Slot

```typescript
import { createClient, createDefaultReelConfig, createDefaultPaylines } from '@three-body-entropy/client-library';

const client = createClient();

const config = createDefaultReelConfig(8);
config.paylines = createDefaultPaylines(8);

const session = {
  sessionId: 'mega-session',
  userId: 'player-1',
  gameId: 'mega-8-reel',
  betAmount: 200,
  currency: 'USD',
  clientSeed: client.generateClientSeed(),
  nonce: 1
};

const response = await client.requestSpin(session, config);
console.log('Mega slot result:', response.result.reelPositions);
```

### Custom Symbol Configuration

```typescript
import { createClient, ReelConfiguration } from '@three-body-entropy/client-library';

const client = createClient();

const customConfig: ReelConfiguration = {
  reelCount: 5,
  symbolsPerReel: 30,
  symbols: [
    { id: 0, name: 'Diamond', value: 500 },
    { id: 1, name: 'Ruby', value: 300 },
    { id: 2, name: 'Emerald', value: 200 },
    { id: 3, name: 'Sapphire', value: 100 },
    { id: 4, name: 'Gold', value: 50 },
    { id: 5, name: 'Silver', value: 25 },
    { id: 6, name: 'Wild', value: 1000, isWild: true },
    { id: 7, name: 'Scatter', value: 0, isScatter: true }
  ],
  paylines: [
    { id: 1, positions: [1, 1, 1, 1, 1] }, // Center line
    { id: 2, positions: [0, 0, 0, 0, 0] }, // Top line
    { id: 3, positions: [2, 2, 2, 2, 2] }, // Bottom line
    { id: 4, positions: [0, 1, 2, 1, 0] }, // V-shape
    { id: 5, positions: [2, 1, 0, 1, 2] }  // Inverted V
  ]
};

const response = await client.requestSpin(session, customConfig);
```

### Client-Side Verification

```typescript
import { createClient } from '@three-body-entropy/client-library';

const client = createClient();

// After receiving spin response
const verification = client.verifySpinResult(
  response.result,
  response.proof,
  entropyData,
  reelConfig,
  session.clientSeed,
  session.nonce
);

console.log('Verification result:', verification.valid);
for (const check of verification.checks) {
  console.log(`${check.name}: ${check.passed ? 'PASS' : 'FAIL'}`);
}
```

## Types

### ReelConfiguration

```typescript
interface ReelConfiguration {
  reelCount: 3 | 4 | 5 | 6 | 7 | 8;
  symbolsPerReel: number;
  symbols?: SymbolDefinition[];
  paylines?: Payline[];
}
```

### SessionDetails

```typescript
interface SessionDetails {
  sessionId: string;
  userId: string;
  gameId: string;
  betAmount: number;
  currency: string;
  clientSeed: string;
  nonce: number;
}
```

### SpinResult

```typescript
interface SpinResult {
  reelPositions: number[];
  symbols?: number[][];
  winAmount: number;
  multiplier: number;
  winningPaylines?: WinningPayline[];
}
```

### VerificationResult

```typescript
interface VerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  error?: string;
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
