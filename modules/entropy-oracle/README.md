# Entropy Oracle Module

Wrapper/orchestrator using physics-engine and cryptographic modules for provably fair entropy generation.

## Overview

This module serves as the central entropy generation system for the Three-Body Entropy Slot Machine. It orchestrates three-body gravitational simulations to produce chaotic, unpredictable entropy values that are cryptographically secured and verifiable. The oracle provides commitment-reveal schemes for provably fair gaming.

## Features

- **Three-Body Physics Simulation**: RK4 integration of gravitational dynamics
- **Chaotic Entropy Generation**: Leverages sensitive dependence on initial conditions
- **Commitment-Reveal Scheme**: Server commits before client provides seed
- **Cryptographic Proofs**: Verifiable proofs for all entropy values
- **Caching System**: Pre-generate entropy for low-latency responses
- **Multiple Preset Conditions**: Figure-eight, Lagrange, and chaotic configurations
- **Statistics Tracking**: Monitor oracle performance and usage

## Installation

```bash
npm install @three-body-entropy/entropy-oracle
```

Or if using from the monorepo:

```bash
cd modules/entropy-oracle
npm install
npm run build
```

## API Documentation

### createOracle(config?, serverSecret?)

Creates a new entropy oracle instance.

**Parameters:**
- `config`: `Partial<OracleConfig>` (optional) - Configuration options
- `serverSecret`: `string` (optional) - Server secret for signing proofs

**Returns:** `EntropyOracle` - Oracle instance

```typescript
const oracle = createOracle({
  defaultDuration: 10.0,
  defaultTimeStep: 0.001,
  cacheEnabled: true,
  cacheTTL: 60000
}, 'server-secret');
```

### oracle.requestEntropy(options)

Requests entropy from the oracle.

**Parameters:**
- `options.sessionId`: `string` - Session identifier
- `options.clientSeed`: `string` (optional) - Client-provided seed
- `options.nonce`: `number` (optional) - Nonce value
- `options.simulationParams`: `SimulationParams` (optional) - Custom simulation parameters

**Returns:** `Promise<EntropyResponse>` - Entropy response with proof

```typescript
const response = await oracle.requestEntropy({
  sessionId: 'session-123',
  clientSeed: 'user-seed',
  nonce: 1
});

console.log('Entropy value:', response.entropy.value);
console.log('Commitment:', response.commitment);
```

### oracle.preGenerateEntropy(sessionId)

Pre-generates entropy for commitment before client seed.

**Parameters:**
- `sessionId`: `string` - Session identifier

**Returns:** `Promise<string>` - Commitment hash

```typescript
const commitment = await oracle.preGenerateEntropy('session-123');
// Send commitment to client before they provide their seed
```

### oracle.revealEntropy(sessionId, clientSeed, nonce)

Reveals pre-generated entropy combined with client seed.

**Parameters:**
- `sessionId`: `string` - Session identifier
- `clientSeed`: `string` - Client-provided seed
- `nonce`: `number` - Nonce value

**Returns:** `Promise<EntropyResponse>` - Entropy response

```typescript
const response = await oracle.revealEntropy('session-123', 'client-seed', 1);
```

### oracle.verifyProof(entropy, proof, commitment)

Verifies an entropy proof.

**Parameters:**
- `entropy`: `RawEntropyResult` - Entropy data
- `proof`: `EntropyProof` - Proof data
- `commitment`: `string` - Commitment hash

**Returns:** `VerificationResult` - Verification result

```typescript
const result = oracle.verifyProof(
  response.entropy,
  response.proof,
  response.commitment
);

if (result.valid) {
  console.log('Entropy is verified!');
}
```

## Usage Examples

### Basic Entropy Request

```typescript
import { createOracle } from '@three-body-entropy/entropy-oracle';

const oracle = createOracle();

const response = await oracle.requestEntropy({
  sessionId: 'game-session-1',
  clientSeed: 'player-seed',
  nonce: 1
});

console.log('Entropy:', response.entropy.value);
console.log('Hex:', response.entropy.hex);
```

### Commitment-Reveal Flow

```typescript
import { createOracle } from '@three-body-entropy/entropy-oracle';

const oracle = createOracle({}, 'server-secret');

// Step 1: Server pre-generates entropy and commits
const commitment = await oracle.preGenerateEntropy('session-123');
// Send commitment to client

// Step 2: Client provides their seed
const clientSeed = 'client-chosen-seed';
const nonce = 1;

// Step 3: Reveal entropy combined with client seed
const response = await oracle.revealEntropy('session-123', clientSeed, nonce);

// Step 4: Verify
const verification = oracle.verifyProof(
  response.entropy,
  response.proof,
  response.commitment
);

console.log('Verified:', verification.valid);
```

### Custom Simulation Parameters

```typescript
import { createOracle, getPresetConditions } from '@three-body-entropy/entropy-oracle';

const oracle = createOracle();

// Use chaotic preset for maximum entropy
const chaoticConditions = getPresetConditions('chaotic');

const response = await oracle.requestEntropy({
  sessionId: 'custom-session',
  simulationParams: {
    duration: 20.0,
    timeStep: 0.0001,
    initialConditions: chaoticConditions
  }
});
```

### Direct Simulation

```typescript
import { runSimulation, generateRandomConditions } from '@three-body-entropy/entropy-oracle';

// Generate random initial conditions
const conditions = generateRandomConditions('seed-value');

// Run simulation
const result = runSimulation(
  { duration: 10.0, timeStep: 0.001 },
  conditions
);

console.log('Entropy value:', result.value);
console.log('Energy drift:', result.metadata.energyDrift);
console.log('Lyapunov estimate:', result.metadata.lyapunovEstimate);
```

## Types

### EntropyResponse

```typescript
interface EntropyResponse {
  requestId: string;
  commitment: string;
  entropy: RawEntropyResult;
  proof: EntropyProof;
  timestamp: number;
}
```

### RawEntropyResult

```typescript
interface RawEntropyResult {
  value: number;        // Normalized entropy value [0, 1)
  hex: string;          // 64-character hex hash
  sourceHash: string;   // Hash of entropy source
  simulationId: string; // Unique simulation identifier
  timestamp: number;    // Generation timestamp
  metadata: SimulationMetadata;
}
```

### OracleConfig

```typescript
interface OracleConfig {
  defaultDuration: number;           // Default: 10.0
  defaultTimeStep: number;           // Default: 0.001
  defaultGravitationalConstant: number; // Default: 1.0
  defaultSofteningParameter: number; // Default: 0.01
  hashAlgorithm: string;             // Default: 'sha256'
  cacheEnabled: boolean;             // Default: true
  cacheTTL: number;                  // Default: 60000 (1 minute)
}
```

## Preset Conditions

| Name | Description |
|------|-------------|
| `figure-eight` | Famous figure-eight periodic orbit |
| `lagrange` | Lagrange equilateral triangle configuration |
| `chaotic` | Highly chaotic initial conditions |

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
