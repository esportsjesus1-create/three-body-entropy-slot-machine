# Cryptographic Signing with Ed25519

This document describes the cryptographic signing system used in the Three-Body Entropy Slot Machine to ensure non-repudiation and tamper detection for all API responses.

## Overview

All API responses from the Three-Body Entropy system are digitally signed using Ed25519, a modern elliptic curve digital signature algorithm. This provides cryptographic proof that responses originated from the legitimate server and have not been tampered with.

## How Ed25519 Works

Ed25519 is an Edwards-curve Digital Signature Algorithm (EdDSA) using Curve25519. It provides several advantages over other signature schemes:

**Security Properties:**
- 128-bit security level (equivalent to RSA-3072)
- Resistant to timing attacks
- Small key and signature sizes (32-byte public keys, 64-byte signatures)
- Fast signing and verification operations

**Algorithm Details:**
1. A 32-byte seed is used to derive a 64-byte secret key
2. The public key (32 bytes) is derived from the secret key
3. Messages are signed using the secret key, producing a 64-byte signature
4. Signatures are verified using only the public key and message

## Key Generation Process

### Generating a New Key Pair

```typescript
import { generateKeyPair } from '@three-body-entropy/crypto-signing';

const { publicKey, secretKey } = generateKeyPair();
// publicKey: Base64-encoded 32-byte public key
// secretKey: Base64-encoded 64-byte secret key
```

### Storing the Private Key

The private key must be stored securely and never committed to version control:

```bash
# Set as environment variable
export ED25519_PRIVATE_KEY="your-base64-encoded-secret-key"

# Or use a secrets manager (recommended for production)
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### Deterministic Key Derivation (Testing Only)

For testing purposes, you can derive a deterministic key pair from a seed:

```typescript
import { deriveKeyPairFromSeed } from '@three-body-entropy/crypto-signing';

const { publicKey, secretKey } = deriveKeyPairFromSeed('test-seed');
// Same seed always produces same key pair
```

## Signing Process

### How Responses Are Signed

1. The response data is serialized to JSON
2. The JSON string is converted to UTF-8 bytes
3. Ed25519 signature is computed over the bytes
4. Signature and public key are Base64-encoded and added to response

```typescript
import { signData } from '@three-body-entropy/crypto-signing';

const response = {
  commitmentHash: 'abc123...',
  sessionId: 'uuid-here',
  expiresAt: '2024-01-01T00:00:00Z'
};

const { signature, publicKey } = signData(response);

// Final response includes:
// { ...response, signature, publicKey }
```

### Signed Response Format

All API responses include these additional fields when signing is enabled:

```json
{
  "success": true,
  "data": {
    "commitmentHash": "abc123...",
    "sessionId": "uuid-here",
    "expiresAt": "2024-01-01T00:00:00Z",
    "signature": "Base64-encoded-64-byte-signature",
    "publicKey": "Base64-encoded-32-byte-public-key"
  }
}
```

## Client-Side Verification

### Using the Crypto Signing Module

```typescript
import { verifySignature } from '@three-body-entropy/crypto-signing';

// Extract signature and publicKey from response
const { signature, publicKey, ...data } = response.data;

const result = verifySignature(data, signature, publicKey);
if (result.valid) {
  console.log('Response is authentic and untampered');
} else {
  console.error('Verification failed:', result.error);
}
```

### Using TweetNaCl Directly (Browser/Node.js)

```javascript
import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';

function verifyResponse(data, signature, publicKey) {
  // Convert data to same format used for signing
  const message = util.decodeUTF8(JSON.stringify(data));
  const signatureBytes = util.decodeBase64(signature);
  const publicKeyBytes = util.decodeBase64(publicKey);
  
  return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
}

// Usage
const { signature, publicKey, ...data } = response.data;
const isValid = verifyResponse(data, signature, publicKey);
```

### Using Other Languages

Ed25519 is widely supported. Here are examples for other languages:

**Python (PyNaCl):**
```python
import nacl.signing
import json
import base64

def verify_response(data, signature, public_key):
    message = json.dumps(data, separators=(',', ':')).encode('utf-8')
    sig_bytes = base64.b64decode(signature)
    pk_bytes = base64.b64decode(public_key)
    
    verify_key = nacl.signing.VerifyKey(pk_bytes)
    try:
        verify_key.verify(message, sig_bytes)
        return True
    except nacl.exceptions.BadSignature:
        return False
```

**Go:**
```go
import (
    "crypto/ed25519"
    "encoding/base64"
    "encoding/json"
)

func verifyResponse(data interface{}, signature, publicKey string) bool {
    message, _ := json.Marshal(data)
    sigBytes, _ := base64.StdEncoding.DecodeString(signature)
    pkBytes, _ := base64.StdEncoding.DecodeString(publicKey)
    
    return ed25519.Verify(pkBytes, message, sigBytes)
}
```

## Public Key Endpoint

The server exposes its public key via a dedicated endpoint:

```
GET /api/v1/public-key
```

Response:
```json
{
  "success": true,
  "data": {
    "publicKey": "Base64-encoded-public-key",
    "algorithm": "Ed25519",
    "fingerprint": "first-16-chars-of-sha256",
    "loadedAt": 1704067200000
  }
}
```

### Fingerprint Verification

The fingerprint is the first 16 characters of the SHA-256 hash of the public key. This can be used to quickly verify you're using the correct public key:

```typescript
import { createHash } from 'crypto';

function getFingerprint(publicKeyBase64) {
  const publicKeyBytes = Buffer.from(publicKeyBase64, 'base64');
  return createHash('sha256')
    .update(publicKeyBytes)
    .digest('hex')
    .substring(0, 16);
}
```

## Security Properties

### Non-Repudiation

Once a response is signed, the server cannot deny having sent it. The signature proves:
1. The response was created by someone with access to the private key
2. The response has not been modified since signing

### Tamper Detection

Any modification to the signed data will cause verification to fail:
- Changing any field value
- Adding or removing fields
- Changing field order (JSON serialization is deterministic)
- Modifying whitespace in string values

### Replay Protection

While signatures alone don't prevent replay attacks, the system includes:
- Session IDs that are single-use
- Expiration timestamps on commitments
- Timestamp in signed responses (when using `signResponse()`)

Clients should validate that timestamps are recent and session IDs haven't been seen before.

## Key Rotation

To rotate the signing key:

1. Generate a new key pair
2. Update the `ED25519_PRIVATE_KEY` environment variable
3. Restart the server (or call `clearKeyCache()` if hot-reloading)
4. Update any clients that have cached the old public key

During rotation, consider:
- Announcing the new public key in advance
- Supporting both old and new keys temporarily
- Logging key fingerprints for audit purposes

## Troubleshooting

### "ED25519_PRIVATE_KEY environment variable is not set"

The server requires a private key to sign responses. Generate one:

```typescript
import { generateKeyPair } from '@three-body-entropy/crypto-signing';
const { secretKey } = generateKeyPair();
console.log('Set this as ED25519_PRIVATE_KEY:', secretKey);
```

### "Invalid private key length"

The private key must be exactly 64 bytes when decoded from Base64. Ensure you're using the full secret key, not just the seed.

### Verification Fails for Valid Response

Common causes:
1. **JSON serialization differences**: Ensure you're using the same JSON serialization (no extra whitespace, consistent key ordering)
2. **Character encoding**: Use UTF-8 encoding for the message
3. **Wrong data**: Verify you're signing/verifying the same data structure (excluding signature and publicKey fields)

### Performance Issues

Ed25519 is very fast, but if you're seeing performance issues:
1. Ensure the key pair is cached (don't reload from environment on every request)
2. For bulk operations, consider batch signing
3. Profile to identify if JSON serialization is the bottleneck

## References

- [Ed25519 Paper](https://ed25519.cr.yp.to/ed25519-20110926.pdf)
- [TweetNaCl.js](https://tweetnacl.js.org/)
- [RFC 8032 - Edwards-Curve Digital Signature Algorithm](https://tools.ietf.org/html/rfc8032)
