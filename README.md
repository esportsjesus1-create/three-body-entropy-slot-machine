# Three-Body Entropy RNG

Provably fair random number generation using three-body gravitational dynamics for slot machine games.

## Overview

This system generates cryptographically secure random numbers by simulating chaotic three-body gravitational dynamics. The inherent unpredictability of the three-body problem provides high-quality entropy that is combined with client-provided seeds to ensure provably fair gaming.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Slot Machine   │────▶│  Three-Body RNG  │────▶│   PostgreSQL    │
│    Frontend     │     │    API Server    │     │    Database     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │      Redis       │
                        │     (Cache)      │
                        └──────────────────┘
```

## Modules

| Module | Description |
|--------|-------------|
| `physics-engine` | Three-body gravitational dynamics with RK4 integration |
| `hash-chain` | Cryptographic verification with HKDF and commitment schemes |
| `theta-protection` | Theta-based spin validation and proof generation |
| `session-state-machine` | FSM for session lifecycle management |
| `client-library` | API bridge for 3-8 reel configurations |
| `entropy-oracle` | Wrapper/orchestrator for entropy generation |
| `integration-examples` | Complete slot machine examples |
| `slot-machine-adapter` | Integration adapter for simple-slot-machine-game |

## Quick Start

### Installation

```bash
# Install server dependencies
cd server && npm install

# Install module dependencies
make install
```

### Development

```bash
# Start development server
make dev

# Run tests
make test
```

### Environment Variables

Create a `.env` file in the `/server` directory:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://10.157.66.3/three_body_rng
REDIS_URL=redis://10.157.64.3:6379
API_SECRET_KEY=your-secret-key
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## API Documentation

### Base URL

```
Production: https://three-body-rng.ebisu-games.com/api/v1
Development: http://localhost:3000/api/v1
```

### Endpoints

#### POST /spin/commit

Generate a server commitment before the spin.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "commitment": "sha256-hash",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /spin/reveal

Reveal the spin result with client seed.

**Request:**
```json
{
  "sessionId": "uuid",
  "clientSeed": "client-provided-random-string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "result": {
      "grid": [["fa", "zhong", ...], ...],
      "symbols": ["fa", "zhong", "bai", ...]
    },
    "houseSeed": "server-seed",
    "proof": {
      "proofId": "proof-id",
      "signature": "hmac-signature",
      "nonce": 1234567890
    }
  }
}
```

#### GET /verify/:sessionId

Get full session data for verification.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "commitment": "sha256-hash",
    "houseSeed": "server-seed",
    "clientSeed": "client-seed",
    "result": { ... },
    "proof": { ... }
  }
}
```

#### POST /verify/:sessionId

Verify a spin result server-side.

**Response:**
```json
{
  "success": true,
  "data": {
    "verification": {
      "valid": true,
      "checks": {
        "commitmentValid": true,
        "entropyValid": true,
        "signatureValid": true
      }
    }
  }
}
```

## Provably Fair Workflow

1. **Commit Phase**: Server generates a house seed using three-body physics simulation and sends the SHA-256 hash (commitment) to the client.

2. **Client Seed**: Client generates their own random seed after seeing the commitment. This prevents the server from manipulating results.

3. **Reveal Phase**: Client sends their seed. Server combines both seeds using three-body physics simulation to generate final entropy.

4. **Verification**: Server reveals the original house seed. Client can verify:
   - The commitment hash matches the revealed house seed
   - The combined entropy was correctly calculated
   - The spin result matches the entropy

## Integration with Slot Machine

### Using the Adapter

```javascript
import { 
  initSlotMachineRNG, 
  generateClientSeed,
  performProvablyFairSpin 
} from './modules/slot-machine-adapter/src/integration-adapter.js';

// Initialize
const rng = await initSlotMachineRNG({
  symbols: ['fa', 'zhong', 'bai', 'bawan', 'wusuo', 'wutong', 'liangsuo', 'liangtong', 'wild', 'bonus'],
  reelCount: 5,
  rowCount: 6,
  bufferRows: 4
});

// Perform a provably fair spin
const result = await performProvablyFairSpin();
console.log(result.grid);        // The spin result grid
console.log(result.isValid);     // Verification passed
console.log(result.proof);       // Cryptographic proof
```

### Replacing Math.random() in gameHelpers.js

See `modules/slot-machine-adapter/src/example-integration.js` for detailed integration instructions.

## Deployment

### Docker

```bash
# Build image
make docker-build

# Push to registry
make docker-push

# Run locally
make docker-run
```

### Kubernetes (GKE)

```bash
# Get cluster credentials
make gke-auth

# Deploy
make deploy

# Check status
make status

# View logs
make logs
```

### Cloud Build

```bash
# Trigger Cloud Build
make cloudbuild
```

## Database Schema

```sql
CREATE TABLE spin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment VARCHAR(64) NOT NULL,
  house_seed VARCHAR(128) NOT NULL,
  client_seed VARCHAR(128),
  result JSONB,
  proof JSONB,
  physics_state JSONB,
  theta_angles JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  revealed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_commitment ON spin_sessions(commitment);
CREATE INDEX idx_created ON spin_sessions(created_at);
```

Run migrations:
```bash
make migrate
```

## Infrastructure

| Component | Value |
|-----------|-------|
| GCP Project | ornate-time-270711 |
| GKE Cluster | w2e-dev |
| Namespace | ebisu-games-stg |
| Image Registry | us-west1-docker.pkg.dev/ornate-time-270711/docker/three-body-rng |
| Database | postgresql://10.157.66.3/three_body_rng |
| Redis | redis://10.157.64.3:6379 |

## Security

- All spin results are cryptographically signed
- Server seeds are committed before client seeds are revealed
- Rate limiting prevents abuse (30 spins/minute, 60 commits/minute)
- API key authentication for production use
- Network policies restrict pod communication

## License

MIT
