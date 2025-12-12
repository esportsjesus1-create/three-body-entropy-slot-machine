# Hash Chain Module

Cryptographic verification system with HKDF, commitment schemes, and hash chains for provably fair gaming.

## Overview

This module provides the cryptographic foundation for provably fair gaming systems. It implements industry-standard techniques including HKDF (HMAC-based Key Derivation Function) for secure seed derivation, commitment schemes to prevent manipulation, and hash chains for efficient verification of sequential games.

The core principle is that the server commits to a seed before the client provides their input, ensuring neither party can manipulate the outcome. After the game, the server reveals the seed, and the client can verify that the result was calculated fairly.

## Features

- **HKDF Key Derivation**: RFC 5869 compliant implementation for secure seed derivation
- **Commitment Scheme**: SHA-256 based commitments with optional nonce support
- **Hash Chain Generation**: Efficient pre-generation of sequential game seeds
- **Chain Verification**: Client-side verification of revealed hash chains
- **Combined Seed Calculation**: HMAC-based combination of server and client seeds
- **Utility Functions**: Hash-to-number and hash-to-float conversions for game logic

## Installation

```bash
npm install @three-body-entropy/hash-chain
```

Or if using from the monorepo:

```bash
cd modules/hash-chain
npm install
npm run build
```

## API Documentation

### Commitment Functions

#### generateServerSeed(length?)

Generates a cryptographically secure random server seed.

**Parameters:**
- `length`: `number` (optional) - Length in bytes (default: 32)

**Returns:** `string` - Random seed as hex string

```typescript
const serverSeed = generateServerSeed();
// Returns: "a1b2c3d4e5f6..."
```

#### generateServerCommitment(serverSeed)

Creates a commitment hash from a server seed.

**Parameters:**
- `serverSeed`: `string` - The server seed to commit to

**Returns:** `ServerCommitment` - Object with commitmentHash and timestamp

```typescript
const commitment = generateServerCommitment(serverSeed);
// Returns: { commitmentHash: "...", timestamp: 1234567890 }
```

#### verifyCommitment(serverSeed, commitment)

Verifies that a revealed server seed matches its commitment.

**Parameters:**
- `serverSeed`: `string` - The revealed server seed
- `commitment`: `ServerCommitment` - The original commitment

**Returns:** `boolean` - True if valid

```typescript
const isValid = verifyCommitment(serverSeed, commitment);
```

### Hash Chain Functions

#### generateHashChain(options)

Generates a hash chain from a terminal seed.

**Parameters:**
- `options.terminalSeed`: `string` - The end seed of the chain
- `options.length`: `number` - Number of hashes to generate
- `options.algorithm`: `string` (optional) - Hash algorithm (default: 'sha256')

**Returns:** `HashChain` - Complete hash chain

```typescript
const chain = generateHashChain({
  terminalSeed: 'secret-terminal-seed',
  length: 1000
});
```

#### verifyHashChain(initialCommitment, sequenceOfHashes)

Verifies that a sequence of hashes forms a valid chain.

**Parameters:**
- `initialCommitment`: `string` - The first hash (commitment)
- `sequenceOfHashes`: `string[]` - Array of hashes to verify

**Returns:** `VerificationResult` - Verification result with validity and details

```typescript
const result = verifyHashChain(commitment, revealedHashes);
if (result.valid) {
  console.log(`Verified ${result.verifiedCount} hashes`);
}
```

#### deriveNextHash(options)

Derives the next hash using previous hash, client seed, and nonce.

**Parameters:**
- `options.previousHash`: `string` - Previous hash in the chain
- `options.clientSeed`: `string` - Client-provided seed
- `options.nonce`: `number | string` - Nonce value

**Returns:** `DeriveHashResult` - Derived hash and inputs

```typescript
const result = deriveNextHash({
  previousHash: serverHash,
  clientSeed: 'user-seed',
  nonce: 1
});
```

### HKDF Functions

#### hkdf(options)

Complete HKDF derivation (Extract + Expand).

**Parameters:**
- `options.ikm`: `string | Buffer` - Input key material
- `options.salt`: `string | Buffer` (optional) - Salt value
- `options.info`: `string | Buffer` (optional) - Application-specific info
- `options.length`: `number` - Desired output length in bytes
- `options.algorithm`: `string` (optional) - Hash algorithm

**Returns:** `HKDFResult` - Derived key and parameters

```typescript
const result = hkdf({
  ikm: 'input-key-material',
  salt: 'salt-value',
  info: 'application-info',
  length: 32
});
```

#### deriveSeed(serverSeed, clientSeed, nonce, length?)

Derives a seed from server seed, client seed, and nonce using HKDF.

**Parameters:**
- `serverSeed`: `string` - Server-provided seed
- `clientSeed`: `string` - Client-provided seed
- `nonce`: `number | string` - Nonce value
- `length`: `number` (optional) - Output length (default: 32)

**Returns:** `string` - Derived seed as hex string

```typescript
const seed = deriveSeed('server-seed', 'client-seed', 1);
```

### Utility Functions

#### hashToNumber(hash, maxValue)

Converts a hash to a numeric value in range [0, maxValue).

```typescript
const position = hashToNumber(hash, 20); // 0-19
```

#### hashToFloat(hash)

Converts a hash to a floating point value in range [0, 1).

```typescript
const probability = hashToFloat(hash); // 0.0 - 0.999...
```

## Usage Examples

### Basic Provably Fair Round

```typescript
import {
  generateServerSeed,
  generateServerCommitment,
  verifyCommitment,
  combineSeedsForResult,
  verifyCombinedResult,
  generateClientSeed
} from '@three-body-entropy/hash-chain';

// Server: Generate seed and commitment
const serverSeed = generateServerSeed();
const commitment = generateServerCommitment(serverSeed);

// Send commitment.commitmentHash to client

// Client: Generate their seed
const clientSeed = generateClientSeed('user-input');
const nonce = 1; // Round number

// Server: Calculate result
const result = combineSeedsForResult(serverSeed, clientSeed, nonce);

// Server: Reveal seed after game
// Client: Verify
const isCommitmentValid = verifyCommitment(serverSeed, commitment);
const isResultValid = verifyCombinedResult(result);

console.log('Fair game:', isCommitmentValid && isResultValid);
```

### Using Hash Chain for Multiple Games

```typescript
import {
  generateServerSeed,
  generateHashChain,
  verifyHashChain,
  deriveNextHash,
  hashToNumber
} from '@three-body-entropy/hash-chain';

// Server: Pre-generate chain for 1000 games
const terminalSeed = generateServerSeed();
const chain = generateHashChain({
  terminalSeed,
  length: 1000
});

// Publish initial commitment
const commitment = chain.initialCommitment;

// Play games
const clientSeed = 'user-seed';
const revealedHashes: string[] = [];

for (let gameNum = 0; gameNum < 10; gameNum++) {
  const serverHash = chain.hashes[gameNum].hash;
  revealedHashes.push(serverHash);
  
  // Calculate game result
  const result = deriveNextHash({
    previousHash: serverHash,
    clientSeed,
    nonce: gameNum
  });
  
  // Convert to game outcome (e.g., slot position)
  const position = hashToNumber(result.hash, 20);
  console.log(`Game ${gameNum}: Position ${position}`);
}

// Client can verify revealed portion
const verification = verifyHashChain(commitment, revealedHashes);
console.log('Chain valid:', verification.valid);
```

### Slot Machine Reel Generation

```typescript
import {
  combineSeedsForResult,
  deriveNextHash,
  hashToNumber
} from '@three-body-entropy/hash-chain';

function generateReelPositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  reelCount: number,
  symbolsPerReel: number
): number[] {
  const result = combineSeedsForResult(serverSeed, clientSeed, nonce);
  const positions: number[] = [];
  
  for (let reel = 0; reel < reelCount; reel++) {
    const reelHash = deriveNextHash({
      previousHash: result.combinedHash,
      clientSeed: `reel-${reel}`,
      nonce: reel
    });
    
    positions.push(hashToNumber(reelHash.hash, symbolsPerReel));
  }
  
  return positions;
}

// Generate positions for 5 reels with 20 symbols each
const positions = generateReelPositions(
  'server-seed',
  'client-seed',
  1,
  5,
  20
);
console.log('Reel positions:', positions);
```

## Types

### ServerCommitment

```typescript
interface ServerCommitment {
  commitmentHash: string;
  timestamp: number;
  nonce?: string;
}
```

### HashChain

```typescript
interface HashChain {
  initialCommitment: string;
  hashes: HashChainLink[];
  length: number;
  algorithm: string;
}
```

### VerificationResult

```typescript
interface VerificationResult {
  valid: boolean;
  verifiedCount: number;
  invalidIndex?: number;
  error?: string;
}
```

### CombinedSeedData

```typescript
interface CombinedSeedData {
  serverSeed: string;
  clientSeed: string;
  nonce: number | string;
  combinedHash: string;
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
