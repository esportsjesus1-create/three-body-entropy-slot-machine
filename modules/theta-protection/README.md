# Theta Protection Module

Theta-based spin calculation security with tamper-proof validation for provably fair gaming.

## Overview

This module implements a cryptographic validation layer based on a Theta-protocol concept. It ensures the integrity of entropy-driven spin results by creating tamper-proof proofs that can be independently verified by clients. The theta value is derived from entropy data and combined with client seeds to produce deterministic, verifiable spin results.

## Features

- **Secure Spin Result Validation**: Cryptographic proofs for every spin result
- **Tamper-Proof Commitment and Reveal**: Commitment scheme prevents manipulation
- **Integration with Entropy Oracle**: Seamless integration with entropy sources
- **Theta-Based Proof Generation**: Unique theta derivation for each entropy source
- **Multi-Reel Support**: Works with 3-8 reel configurations
- **Signature Support**: Optional HMAC signatures for additional security
- **Quick Validation**: Fast validation for real-time verification

## Installation

```bash
npm install @three-body-entropy/theta-protection
```

Or if using from the monorepo:

```bash
cd modules/theta-protection
npm install
npm run build
```

## API Documentation

### generateThetaProof(options)

Creates a cryptographic proof for the spin result.

**Parameters:**
- `options.entropyData`: `EntropyData` - Entropy data from the source
- `options.clientSeed`: `string` - Client-provided seed
- `options.nonce`: `number` - Nonce value (spin number)
- `options.reelCount`: `number` - Number of reels (3-8)
- `options.symbolsPerReel`: `number` - Symbols per reel
- `options.serverSecret`: `string` (optional) - Server secret for signing

**Returns:** `ThetaProof` - Complete proof object

```typescript
const proof = generateThetaProof({
  entropyData: {
    value: 0.123456,
    hex: 'a1b2c3...',
    sourceHash: 'source-hash',
    timestamp: Date.now()
  },
  clientSeed: 'user-seed',
  nonce: 1,
  reelCount: 5,
  symbolsPerReel: 20
});
```

### validateThetaProof(options)

Verifies the integrity and authenticity of the spin result proof.

**Parameters:**
- `options.proof`: `ThetaProof` - The proof to validate
- `options.expectedResult`: `SpinResult` (optional) - Expected result for comparison
- `options.serverPublicKey`: `string` (optional) - Key for signature verification

**Returns:** `ValidationResult` - Detailed validation result

```typescript
const result = validateThetaProof({
  proof,
  expectedResult: expectedSpinResult,
  serverPublicKey: 'server-key'
});

if (result.valid) {
  console.log('Proof is valid!');
} else {
  console.log('Validation failed:', result.error);
}
```

### createThetaCommitment(entropyData)

Creates a commitment before the spin is executed.

**Parameters:**
- `entropyData`: `EntropyData` - Entropy data to commit to

**Returns:** `ThetaCommitment` - Commitment object

```typescript
const commitment = createThetaCommitment(entropyData);
// Publish commitment.hash to client before spin
```

### createThetaReveal(commitment, entropyData)

Creates a reveal after the spin is complete.

**Parameters:**
- `commitment`: `ThetaCommitment` - Original commitment
- `entropyData`: `EntropyData` - Entropy data used

**Returns:** `ThetaReveal` - Reveal object with theta value

```typescript
const reveal = createThetaReveal(commitment, entropyData);
// Client can verify reveal.theta matches the proof
```

### quickValidate(proof)

Performs fast validation of proof integrity.

**Parameters:**
- `proof`: `ThetaProof` - Proof to validate

**Returns:** `boolean` - True if valid

```typescript
if (quickValidate(proof)) {
  // Proof passes basic integrity checks
}
```

## Usage Examples

### Basic Spin with Proof

```typescript
import {
  generateThetaProof,
  validateThetaProof,
  EntropyData
} from '@three-body-entropy/theta-protection';

// Entropy from physics engine or oracle
const entropyData: EntropyData = {
  value: 0.7234567,
  hex: 'abc123def456...',
  sourceHash: 'physics-simulation-hash',
  timestamp: Date.now()
};

// Generate proof for 5-reel slot
const proof = generateThetaProof({
  entropyData,
  clientSeed: 'user-provided-seed',
  nonce: 1,
  reelCount: 5,
  symbolsPerReel: 20
});

console.log('Reel positions:', proof.result.reelPositions);
// Output: [12, 5, 18, 3, 9]

// Validate the proof
const validation = validateThetaProof({ proof });
console.log('Valid:', validation.valid);
```

### Commitment-Reveal Flow

```typescript
import {
  createThetaCommitment,
  createThetaReveal,
  generateThetaProof,
  validateThetaProof
} from '@three-body-entropy/theta-protection';

// Step 1: Server creates commitment BEFORE client provides seed
const commitment = createThetaCommitment(entropyData);
// Send commitment.hash to client

// Step 2: Client provides their seed
const clientSeed = 'client-chosen-seed';
const nonce = 1;

// Step 3: Generate spin result
const proof = generateThetaProof({
  entropyData,
  clientSeed,
  nonce,
  reelCount: 5,
  symbolsPerReel: 20
});

// Step 4: Reveal entropy data
const reveal = createThetaReveal(commitment, entropyData);

// Step 5: Client verifies
const validation = validateThetaProof({ proof });
console.log('Theta matches:', reveal.theta === proof.theta);
console.log('Proof valid:', validation.valid);
```

### Signed Proofs

```typescript
import {
  generateThetaProof,
  validateThetaProof
} from '@three-body-entropy/theta-protection';

const serverSecret = 'server-secret-key';

// Generate signed proof
const proof = generateThetaProof({
  entropyData,
  clientSeed: 'client-seed',
  nonce: 1,
  reelCount: 5,
  symbolsPerReel: 20,
  serverSecret
});

// Validate with signature verification
const validation = validateThetaProof({
  proof,
  serverPublicKey: serverSecret
});

console.log('Signature valid:', validation.checks.find(c => c.name === 'signature')?.passed);
```

### Multiple Reel Configurations

```typescript
// 3-reel classic slot
const proof3 = generateThetaProof({
  entropyData,
  clientSeed: 'seed',
  nonce: 1,
  reelCount: 3,
  symbolsPerReel: 10
});

// 8-reel modern slot
const proof8 = generateThetaProof({
  entropyData,
  clientSeed: 'seed',
  nonce: 1,
  reelCount: 8,
  symbolsPerReel: 30
});
```

## Types

### EntropyData

```typescript
interface EntropyData {
  value: number;      // Normalized entropy value (0-1)
  hex: string;        // Hexadecimal representation
  sourceHash: string; // Hash of entropy source
  timestamp: number;  // Generation timestamp
  metadata?: Record<string, unknown>;
}
```

### ThetaProof

```typescript
interface ThetaProof {
  proofId: string;      // Unique proof identifier
  commitment: string;   // Commitment hash
  theta: string;        // Derived theta value
  clientSeed: string;   // Client seed used
  nonce: number;        // Nonce value
  result: SpinResult;   // Spin result
  signature: string;    // Proof signature
  timestamp: number;    // Generation timestamp
  version: string;      // Proof format version
}
```

### SpinResult

```typescript
interface SpinResult {
  reelPositions: number[];  // Array of reel stop positions
  reelCount: number;        // Number of reels
  symbolsPerReel: number;   // Symbols per reel
  resultHash: string;       // Hash of result
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;           // Overall validity
  checks: ValidationCheck[]; // Individual check results
  error?: string;           // Error message if invalid
  timestamp: number;        // Validation timestamp
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
