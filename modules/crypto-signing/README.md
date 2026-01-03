# Crypto Signing Module

Ed25519 cryptographic signing module for API response non-repudiation in the Three-Body Entropy Slot Machine system.

## Overview

This module provides Ed25519 digital signatures for all API responses, ensuring:

- **Non-repudiation**: Server cannot deny having sent a response
- **Tamper detection**: Any modification to signed data is detectable
- **Authenticity**: Clients can verify responses came from the legitimate server

## Installation

```bash
cd modules/crypto-signing
npm install
```

## Key Generation

Generate a new Ed25519 key pair for your server:

```typescript
import { generateKeyPair } from '@three-body-entropy/crypto-signing';

const { publicKey, secretKey } = generateKeyPair();
console.log('Public Key:', publicKey);
console.log('Secret Key:', secretKey);
```

Set the secret key as an environment variable:

```bash
export ED25519_PRIVATE_KEY="your-base64-encoded-secret-key"
```

## Usage

### Signing Data

```typescript
import { signData, signResponse } from '@three-body-entropy/crypto-signing';

// Simple signing - returns signature and public key
const data = { commitmentHash: 'abc123', sessionId: 'session-1' };
const { signature, publicKey } = signData(data);

// Full response signing - includes timestamp
const signedResponse = signResponse(data);
// Returns: { data, signature, publicKey, signedAt }
```

### Verifying Signatures

```typescript
import { verifySignature, verifySignedResponse } from '@three-body-entropy/crypto-signing';

// Verify simple signature
const result = verifySignature(data, signature, publicKey);
if (result.valid) {
  console.log('Signature is valid');
} else {
  console.log('Verification failed:', result.error);
}

// Verify signed response
const responseResult = verifySignedResponse(signedResponse);
```

### Getting Public Key Info

```typescript
import { getPublicKeyInfo } from '@three-body-entropy/crypto-signing';

const info = getPublicKeyInfo();
// Returns: { publicKey, algorithm: 'Ed25519', fingerprint, loadedAt }
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `signData(data, options?)` | Sign data and return signature + public key |
| `signResponse<T>(data)` | Sign data with timestamp, return full signed response |
| `verifySignature(data, signature, publicKey)` | Verify a signature against data |
| `verifySignedResponse<T>(response)` | Verify a complete signed response |
| `generateKeyPair()` | Generate a new Ed25519 key pair |
| `deriveKeyPairFromSeed(seed)` | Derive deterministic key pair from seed |
| `getPublicKeyInfo()` | Get server's public key information |
| `clearKeyCache()` | Clear cached key pair (for testing/rotation) |
| `isKeyLoaded()` | Check if a key pair is currently cached |

### Types

```typescript
interface SignedData {
  signature: string;  // Base64-encoded Ed25519 signature
  publicKey: string;  // Base64-encoded public key
}

interface SignedResponse<T> {
  data: T;
  signature: string;
  publicKey: string;
  signedAt: number;   // Unix timestamp
}

interface VerificationResult {
  valid: boolean;
  error?: string;
}

interface PublicKeyInfo {
  publicKey: string;
  algorithm: string;  // Always 'Ed25519'
  fingerprint: string;
  loadedAt: number;
}
```

## Integration with API Routes

### Express.js Example

```javascript
import { signResponse } from '@three-body-entropy/crypto-signing';

router.post('/commit', async (req, res) => {
  const result = await createSession(req.body.config);
  
  // Sign the response
  const signedResult = signResponse(result);
  
  res.status(201).json({
    success: true,
    ...signedResult
  });
});
```

### Next.js API Route Example

```typescript
import { signData } from '@/modules/crypto-signing';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const response = { commitmentHash, sessionId, expiresAt };
  const signed = signData(response);
  
  return NextResponse.json({ ...response, ...signed });
}
```

## Client-Side Verification

Clients can verify signatures using the same library or any Ed25519 implementation:

```typescript
// Using this library
import { verifySignature } from '@three-body-entropy/crypto-signing';

const isValid = verifySignature(
  response.data,
  response.signature,
  response.publicKey
).valid;

// Using TweetNaCl directly
import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';

const message = util.decodeUTF8(JSON.stringify(data));
const signatureBytes = util.decodeBase64(signature);
const publicKeyBytes = util.decodeBase64(publicKey);

const isValid = nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
```

## Security Considerations

1. **Private Key Storage**: Never commit the private key to version control. Use environment variables or a secrets manager.

2. **Key Rotation**: Implement key rotation by:
   - Generating a new key pair
   - Updating the environment variable
   - Calling `clearKeyCache()` to reload

3. **Public Key Distribution**: Expose the public key via a dedicated endpoint (`/api/public-key`) for client verification.

4. **Timestamp Validation**: When using `signResponse()`, clients should validate that `signedAt` is recent to prevent replay attacks.

## Testing

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

## Performance

Ed25519 is highly efficient:
- Signing: ~0.03ms per operation (typical)
- Verification: ~0.06ms per operation (typical)

Performance may vary based on payload size and system resources.

## License

MIT
