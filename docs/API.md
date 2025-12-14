# Three-Body Entropy Slot Machine API Documentation

## Overview

This document provides comprehensive API documentation for all public methods across all modules in the Three-Body Entropy Slot Machine system.

## Table of Contents

1. [physics-engine](#physics-engine)
2. [hash-chain](#hash-chain)
3. [theta-protection](#theta-protection)
4. [session-state-machine](#session-state-machine)
5. [client-library](#client-library)
6. [entropy-oracle](#entropy-oracle)
7. [integration-examples](#integration-examples)

---

## physics-engine

### ThreeBodySimulation

#### constructor(config?)

Creates a new three-body simulation instance.

```typescript
const simulation = new ThreeBodySimulation({
  gravitationalConstant: 1.0,
  softeningParameter: 0.01
});
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| config.gravitationalConstant | number | 1.0 | Gravitational constant G |
| config.softeningParameter | number | 0.01 | Softening to prevent singularities |

#### initializeSystem(masses, positions, velocities)

Sets up the initial conditions for the three bodies.

```typescript
simulation.initializeSystem(
  [1.0, 1.0, 1.0],
  [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }],
  [{ x: 0, y: 0.5, z: 0 }, { x: 0, y: -0.5, z: 0 }, { x: 0.5, y: 0, z: 0 }]
);
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| masses | number[] | Array of 3 mass values |
| positions | Vector3D[] | Array of 3 position vectors |
| velocities | Vector3D[] | Array of 3 velocity vectors |

#### simulateForTime(duration, timeStep)

Runs the simulation for a specified duration.

```typescript
simulation.simulateForTime(10.0, 0.001);
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| duration | number | - | Simulation duration in time units |
| timeStep | number | 0.001 | Integration time step |

**Returns:** `SimulationResult` - Result containing final state and metrics

#### getEntropyValue()

Extracts the final chaotic metric from the simulation state.

```typescript
const entropy = simulation.getEntropyValue();
console.log(entropy.value); // 0.0 - 1.0
console.log(entropy.hex);   // 64-character hex string
```

**Returns:** `EntropyValue` - Normalized entropy value and hex representation

---

## hash-chain

### HKDF Functions

#### hkdfExtract(salt, inputKeyMaterial, algorithm?)

Extracts a pseudorandom key from input key material.

```typescript
const prk = hkdfExtract('salt-value', 'input-key-material');
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| salt | string | - | Salt value |
| inputKeyMaterial | string | - | Input key material |
| algorithm | string | 'sha256' | Hash algorithm |

**Returns:** `string` - Pseudorandom key (hex)

#### hkdfExpand(prk, info, length, algorithm?)

Expands a pseudorandom key to desired length.

```typescript
const okm = hkdfExpand(prk, 'context-info', 32);
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| prk | string | - | Pseudorandom key |
| info | string | - | Context information |
| length | number | - | Output length in bytes |
| algorithm | string | 'sha256' | Hash algorithm |

**Returns:** `string` - Output key material (hex)

### Commitment Functions

#### generateServerCommitment(serverSeed)

Creates the initial commitment hash for the server.

```typescript
const commitment = generateServerCommitment('server-seed-value');
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| serverSeed | string | Server's secret seed |

**Returns:** `Commitment` - Commitment object with hash and metadata

#### createCommitment(value, secret)

Creates a commitment to a value.

```typescript
const commitment = createCommitment('value-to-commit', 'secret');
```

**Returns:** `CommitmentData` - Commitment hash and reveal data

#### verifyCommitment(commitment, value, secret)

Verifies a commitment against revealed values.

```typescript
const isValid = verifyCommitment(commitment, 'value', 'secret');
```

**Returns:** `boolean` - True if commitment is valid

### Hash Chain Functions

#### generateHashChain(seed, length)

Generates a hash chain of specified length.

```typescript
const chain = generateHashChain('seed', 1000);
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| seed | string | Initial seed |
| length | number | Chain length |

**Returns:** `HashChain` - Hash chain object

#### deriveNextHash(previousHash, clientSeed, nonce)

Derives the next hash in the chain.

```typescript
const nextHash = deriveNextHash(previousHash, 'client-seed', 1);
```

**Returns:** `string` - Next hash value

#### verifyHashChain(initialCommitment, sequenceOfHashes)

Validates the integrity of a generated hash chain.

```typescript
const isValid = verifyHashChain(commitment, hashes);
```

**Returns:** `boolean` - True if chain is valid

---

## theta-protection

### generateThetaProof(entropyData, clientSeed, nonce)

Creates a cryptographic proof for the spin result.

```typescript
const proof = generateThetaProof(
  { value: 0.5, hex: 'abc123...' },
  'client-seed',
  1
);
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| entropyData | EntropyData | Entropy from oracle |
| clientSeed | string | Client's seed |
| nonce | number | Spin nonce |

**Returns:** `ThetaProof` - Cryptographic proof object

### validateThetaProof(proof, expectedResult)

Verifies the integrity and authenticity of the spin result proof.

```typescript
const result = validateThetaProof(proof, expectedResult);
console.log(result.valid); // true/false
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| proof | ThetaProof | Proof to validate |
| expectedResult | ExpectedResult | Expected spin result |

**Returns:** `ValidationResult` - Validation result with checks

---

## session-state-machine

### SessionStateMachine

#### createSession(userId, gameId)

Initializes a new game session.

```typescript
const session = stateMachine.createSession('user-123', 'game-456');
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| userId | string | User identifier |
| gameId | string | Game identifier |

**Returns:** `Session` - New session object

#### transitionState(sessionId, nextState, payload?)

Attempts a state transition with optional payload data.

```typescript
const result = stateMachine.transitionState(
  'session-id',
  SessionState.SPINNING,
  { bet: 10 }
);
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| sessionId | string | Session identifier |
| nextState | SessionState | Target state |
| payload | object | Optional transition data |

**Returns:** `TransitionResult` - Result of transition attempt

#### getCurrentState(sessionId)

Retrieves the current state of a session.

```typescript
const state = stateMachine.getCurrentState('session-id');
```

**Returns:** `SessionState` - Current session state

#### canTransition(sessionId, targetState)

Checks if a transition is valid.

```typescript
const canSpin = stateMachine.canTransition('session-id', SessionState.SPINNING);
```

**Returns:** `boolean` - True if transition is valid

---

## client-library

### SlotMachineClient

#### constructor(config?)

Creates a new slot machine client.

```typescript
const client = new SlotMachineClient({
  apiEndpoint: 'http://localhost:3000/api',
  timeout: 30000
});
```

#### setApiEndpoint(url)

Configures the backend API endpoint.

```typescript
client.setApiEndpoint('https://api.example.com');
```

#### requestSpin(sessionDetails)

Sends a request to the server to initiate a spin.

```typescript
const result = await client.requestSpin({
  sessionId: 'session-123',
  bet: 10,
  clientSeed: 'my-seed'
});
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| sessionDetails.sessionId | string | Session identifier |
| sessionDetails.bet | number | Bet amount |
| sessionDetails.clientSeed | string | Client's seed |

**Returns:** `Promise<SpinResponse>` - Spin result

#### calculateReelResult(entropyValue, reelConfiguration)

Deterministically converts entropy to reel positions.

```typescript
const result = client.calculateReelResult(
  'abc123...',
  { reelCount: 5, symbolsPerReel: 20 }
);
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| entropyValue | string | Entropy hex value |
| reelConfiguration | ReelConfiguration | Reel setup |

**Returns:** `ReelResult` - Reel positions and symbols

#### verifySpinResult(spinResult)

Verifies a spin result client-side.

```typescript
const verification = client.verifySpinResult(spinResult);
```

**Returns:** `VerificationResult` - Verification result

---

## entropy-oracle

### EntropyOracle

#### constructor(config?, serverSecret?)

Creates a new entropy oracle.

```typescript
const oracle = new EntropyOracle({
  defaultDuration: 10.0,
  defaultTimeStep: 0.001,
  cacheEnabled: true
}, 'server-secret');
```

#### requestEntropy(options)

Requests entropy from the oracle.

```typescript
const response = await oracle.requestEntropy({
  sessionId: 'session-123',
  clientSeed: 'client-seed',
  nonce: 1
});
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| options.sessionId | string | Session identifier |
| options.clientSeed | string | Client's seed (optional) |
| options.nonce | number | Nonce value (optional) |
| options.simulationParams | SimulationParams | Custom params (optional) |

**Returns:** `Promise<EntropyResponse>` - Entropy with proof

#### preGenerateEntropy(sessionId)

Pre-generates entropy for commitment.

```typescript
const commitment = await oracle.preGenerateEntropy('session-123');
```

**Returns:** `Promise<string>` - Commitment hash

#### revealEntropy(sessionId, clientSeed, nonce)

Reveals pre-generated entropy.

```typescript
const response = await oracle.revealEntropy('session-123', 'client-seed', 1);
```

**Returns:** `Promise<EntropyResponse>` - Entropy response

#### verifyProof(entropy, proof, commitment)

Verifies an entropy proof.

```typescript
const result = oracle.verifyProof(entropy, proof, commitment);
```

**Returns:** `VerificationResult` - Verification result

---

## integration-examples

### createSlotMachine(userId, gameId, reelCount, initialBalance?, serverSecret?)

Creates a complete slot machine instance.

```typescript
const machine = createSlotMachine('user', 'game', 5, 1000, 'secret');
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| userId | string | - | User identifier |
| gameId | string | - | Game identifier |
| reelCount | ReelCount | - | Number of reels (3-8) |
| initialBalance | number | 1000 | Starting balance |
| serverSecret | string | random | Server secret |

**Returns:** `SlotMachine` - Slot machine instance

### run3ReelExample()

Runs the 3-reel slot machine example.

```typescript
const result = await run3ReelExample();
```

**Returns:** `Promise<ExampleResult>` - Example execution result

### run8ReelExample()

Runs the 8-reel slot machine example.

```typescript
const result = await run8ReelExample();
```

**Returns:** `Promise<ExampleResult>` - Example execution result

### verifyFullSession(sessionData)

Verifies a complete session.

```typescript
const result = verifyFullSession(sessionData);
```

**Returns:** `VerificationResult` - Verification result

---

## Common Types

### Vector3D

```typescript
interface Vector3D {
  x: number;
  y: number;
  z: number;
}
```

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

### ReelCount

```typescript
type ReelCount = 3 | 4 | 5 | 6 | 7 | 8;
```

### VerificationResult

```typescript
interface VerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  error?: string;
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| INVALID_STATE_TRANSITION | Attempted invalid state transition |
| INSUFFICIENT_BALANCE | Bet exceeds available balance |
| INVALID_BET | Bet amount is invalid |
| SESSION_NOT_FOUND | Session does not exist |
| SESSION_EXPIRED | Session has timed out |
| VERIFICATION_FAILED | Proof verification failed |
| SIMULATION_ERROR | Physics simulation failed |
| INVALID_CONDITIONS | Invalid initial conditions |
