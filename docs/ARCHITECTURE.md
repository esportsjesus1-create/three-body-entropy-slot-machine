# Three-Body Entropy Slot Machine Architecture

## System Overview

The Three-Body Entropy Slot Machine is a provably fair gaming system that generates cryptographically secure randomness using chaotic three-body gravitational dynamics. The system consists of 7 modular components that work together to provide verifiable, tamper-proof slot machine results.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│  │   client-library    │    │       integration-examples          │    │
│  │  ─────────────────  │    │  ─────────────────────────────────  │    │
│  │  • API abstraction  │    │  • 3-reel example                   │    │
│  │  • Reel calculation │    │  • 8-reel example                   │    │
│  │  • Verification     │    │  • Full lifecycle demo              │    │
│  └──────────┬──────────┘    └──────────────────┬──────────────────┘    │
│             │                                   │                       │
└─────────────┼───────────────────────────────────┼───────────────────────┘
              │                                   │
              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│  │ session-state-machine│    │         theta-protection            │    │
│  │  ─────────────────── │    │  ─────────────────────────────────  │    │
│  │  • FSM lifecycle     │    │  • Proof generation                 │    │
│  │  • State transitions │    │  • Tamper-proof validation          │    │
│  │  • Event emission    │    │  • Theta-based security             │    │
│  └──────────┬───────────┘    └──────────────────┬──────────────────┘    │
│             │                                   │                       │
│             ▼                                   ▼                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       entropy-oracle                              │  │
│  │  ────────────────────────────────────────────────────────────────  │  │
│  │  • Orchestrates physics simulation                                │  │
│  │  • Manages cryptographic commitments                              │  │
│  │  • Caches pre-generated entropy                                   │  │
│  │  • Provides verification APIs                                     │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CORE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│  │   physics-engine    │    │           hash-chain                 │    │
│  │  ─────────────────  │    │  ─────────────────────────────────  │    │
│  │  • 3-body simulation│    │  • HKDF key derivation              │    │
│  │  • RK4 integration  │    │  • Commitment schemes               │    │
│  │  • Entropy extraction│   │  • Chain generation                 │    │
│  └─────────────────────┘    └─────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Module Descriptions

### 1. physics-engine

The physics engine implements a three-body gravitational simulation using the Runge-Kutta 4th-order (RK4) numerical integrator. The chaotic nature of the three-body problem ensures that small changes in initial conditions lead to vastly different outcomes, providing high-quality entropy.

**Key Components:**
- `Vector3D`: 3D vector operations (add, subtract, scale, magnitude, dot product)
- `ThreeBodySimulation`: Main simulation class with RK4 integration
- `InitialConditionGenerator`: Creates random or deterministic starting conditions

**Entropy Generation:**
1. Initialize three bodies with positions, velocities, and masses
2. Run simulation for specified duration using RK4 integration
3. Extract final state (positions + velocities) as raw entropy
4. Hash the state to produce cryptographic entropy value

### 2. hash-chain

The hash chain module provides cryptographic primitives for provably fair gaming. It implements HKDF for key derivation, commitment schemes for server fairness, and hash chain generation for sequence verification.

**Key Components:**
- `HKDF`: Extract-and-Expand key derivation function
- `CommitmentScheme`: HMAC-based commitment and reveal
- `HashChain`: Pre-computed chain for sequential reveals

**Provably Fair Flow:**
1. Server generates hash chain before game starts
2. Server commits to first hash (sends commitment to client)
3. Client provides their seed
4. Server reveals hash combined with client seed
5. Client can verify the reveal matches the commitment

### 3. theta-protection

The theta protection module implements a cryptographic validation layer that ensures the integrity of entropy-driven spin results. It uses theta-based proof generation for tamper-proof validation.

**Key Components:**
- `ThetaProof`: Cryptographic proof structure
- `ProofGenerator`: Creates proofs from entropy and seeds
- `ProofValidator`: Verifies proof integrity

**Security Features:**
- Deterministic proof generation from entropy data
- Multiple validation checks (commitment, hash, signature)
- Tamper detection through hash verification

### 4. session-state-machine

The session state machine manages the game session lifecycle using a finite state machine (FSM). It enforces valid state transitions and emits events on state changes.

**States:**
```
INIT → AWAITING_BET → ENTROPY_REQUESTED → SPINNING → RESULT_READY → COMPLETE
                ↑                                          │
                └──────────────────────────────────────────┘
```

**Key Features:**
- Enforced state transitions (prevents invalid operations)
- Event emission on state changes
- Persistence layer interface (Redis integration hook)
- Session timeout handling

### 5. client-library

The client library provides a universal API bridge for slot randomizers supporting 3-8 reel configurations. It handles communication with the server and provides client-side verification utilities.

**Key Components:**
- `SlotMachineClient`: API abstraction for server communication
- `ReelCalculator`: Deterministic entropy-to-reel conversion
- `VerificationUtils`: Client-side fairness verification

**Supported Configurations:**
- 3, 4, 5, 6, 7, and 8 reel layouts
- Configurable symbols per reel
- Custom payline definitions

### 6. entropy-oracle

The entropy oracle is the central orchestrator that combines the physics engine with cryptographic operations. It manages entropy generation, caching, and verification.

**Key Features:**
- Pre-generation and caching of entropy
- Commitment-reveal scheme implementation
- Proof generation and verification
- Statistics tracking

**Workflow:**
1. Pre-generate entropy using physics simulation
2. Create commitment hash
3. Wait for client seed
4. Combine entropy with client seed
5. Generate proof
6. Return result with proof

### 7. integration-examples

The integration examples module provides complete, runnable demonstrations of the entire system. It showcases the full session lifecycle and verification process.

**Examples:**
- 3-reel classic slot machine
- 8-reel cosmic slot machine
- Full session lifecycle demonstration
- Hash chain setup and verification

## Data Flow

### Spin Request Flow

```
1. Client                    2. Server                    3. Oracle
   │                            │                            │
   │──── requestSpin() ────────>│                            │
   │                            │──── requestEntropy() ─────>│
   │                            │                            │
   │                            │                     ┌──────┴──────┐
   │                            │                     │ Run physics │
   │                            │                     │ simulation  │
   │                            │                     └──────┬──────┘
   │                            │                            │
   │                            │<──── EntropyResponse ──────│
   │                            │                            │
   │                     ┌──────┴──────┐                     │
   │                     │ Calculate   │                     │
   │                     │ reel result │                     │
   │                     └──────┬──────┘                     │
   │                            │                            │
   │<──── SpinResult ───────────│                            │
   │                            │                            │
```

### Verification Flow

```
1. Client                    2. Server
   │                            │
   │──── verifySpinResult() ───>│
   │                            │
   │                     ┌──────┴──────┐
   │                     │ Verify:     │
   │                     │ • Commitment│
   │                     │ • Entropy   │
   │                     │ • Signature │
   │                     │ • Positions │
   │                     └──────┬──────┘
   │                            │
   │<──── VerificationResult ───│
   │                            │
```

## Security Model

### Provably Fair Guarantees

1. **Server Cannot Cheat**: Server commits to entropy before knowing client seed
2. **Client Cannot Predict**: Entropy is derived from chaotic physics simulation
3. **Results Are Verifiable**: All data needed for verification is provided
4. **Tamper Detection**: Any modification invalidates cryptographic proofs

### Cryptographic Primitives

- **Hash Function**: SHA-256 for all hashing operations
- **HMAC**: HMAC-SHA256 for signatures and commitments
- **HKDF**: RFC 5869 compliant key derivation
- **Random Generation**: Node.js crypto.randomBytes for seeds

## Performance Considerations

### Simulation Performance

- Default simulation: 10,000 steps (10s duration, 0.001s timestep)
- Typical execution time: 50-200ms depending on hardware
- Can be tuned via duration and timestep parameters

### Caching Strategy

- Pre-generate entropy during idle time
- Cache with configurable TTL (default: 60 seconds)
- Mark entries as used to prevent reuse

### Scalability

- Stateless oracle design allows horizontal scaling
- Session state can be persisted to Redis
- Hash chains can be pre-computed in batches

## Error Handling

### State Machine Errors

- Invalid state transitions throw errors
- Session timeouts trigger ERROR state
- Recovery possible by transitioning to INIT

### Simulation Errors

- Invalid initial conditions are rejected
- Energy drift monitoring for numerical stability
- Fallback to cached entropy on simulation failure

### Verification Errors

- Detailed error messages for each check
- Partial verification results available
- Logging of all verification attempts

## Extensibility

### Adding New Reel Configurations

1. Define symbols in `Symbol[]` array
2. Create paylines in `Payline[]` array
3. Use `createReelConfiguration()` with custom parameters

### Custom Initial Conditions

1. Implement `InitialConditions` interface
2. Add to `PRESET_CONDITIONS` array
3. Use `getPresetConditions()` to retrieve

### Persistence Integration

1. Implement `PersistenceLayer` interface
2. Pass to `SessionStateMachine` constructor
3. State changes automatically persisted

## Testing Strategy

### Unit Tests

- Each module has comprehensive unit tests
- 80%+ code coverage requirement
- Mocking of external dependencies

### Integration Tests

- Cross-module interaction tests
- Full session lifecycle tests
- Verification workflow tests

### System Tests

- End-to-end slot machine simulation
- Performance benchmarks
- Stress testing with concurrent sessions
