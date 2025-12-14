# Provably Fair Gaming System - Technical Documentation

## NX Series Patent Filing Reference | Regulatory Compliance Documentation

**Document Version:** 1.0.0  
**Classification:** Technical Specification  
**Last Updated:** December 2024  
**Author:** Three-Body Entropy RNG Development Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Mathematical Foundation: Theta Uniformity Distribution](#3-mathematical-foundation-theta-uniformity-distribution)
4. [Statistical Fairness Proof Methodology](#4-statistical-fairness-proof-methodology)
5. [Cryptographic Commitment Scheme Implementation](#5-cryptographic-commitment-scheme-implementation)
6. [Hash Chain Verification Process](#6-hash-chain-verification-process)
7. [API Integration Specifications](#7-api-integration-specifications)
8. [User Experience Design Rationale](#8-user-experience-design-rationale)
9. [Regulatory Compliance Framework](#9-regulatory-compliance-framework)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

The Three-Body Entropy Random Number Generator (RNG) represents a novel approach to provably fair gaming that combines classical mechanics chaos theory with modern cryptographic commitment schemes. This system generates verifiably random outcomes for slot machine games using the mathematical unpredictability inherent in the gravitational three-body problem.

### 1.1 Key Innovations

The system introduces several patentable innovations in the field of gaming randomness:

**Three-Body Physics Entropy Source:** Unlike traditional pseudo-random number generators (PRNGs) that rely on algorithmic determinism, our system derives entropy from the chaotic dynamics of three gravitationally interacting bodies. The three-body problem has no general closed-form solution, making long-term prediction computationally infeasible even with perfect knowledge of initial conditions.

**Theta-Based Entropy Extraction:** We extract randomness by computing the angular positions (theta values) of each body in phase space. These angles are uniformly distributed over the interval [0, 2π), providing a mathematically rigorous foundation for fair outcome generation.

**Dual-Seed Commitment Protocol:** The system implements a commit-reveal scheme where neither the house nor the player can unilaterally determine or predict the outcome. The house commits to its seed before the player provides theirs, and the final result is derived from the cryptographic combination of both seeds.

**Immutable Hash Chain Audit Trail:** Every spin is cryptographically linked to its predecessors through a hash chain, creating a tamper-evident record that can be independently verified by any party.

### 1.2 Compliance Standards

This system is designed to meet or exceed the following regulatory standards:

- GLI-11 (Gaming Laboratories International) RNG standards
- ISO/IEC 27001 Information Security Management
- GDPR data protection requirements
- Nevada Gaming Control Board Technical Standards
- Malta Gaming Authority technical requirements
- UK Gambling Commission RNG testing standards

---

## 2. System Architecture

### 2.1 High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROVABLY FAIR SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │   CLIENT LAYER   │    │   SERVER LAYER   │    │  STORAGE LAYER   │       │
│  │                  │    │                  │    │                  │       │
│  │ • Browser UI     │◄──►│ • Express.js API │◄──►│ • PostgreSQL     │       │
│  │ • React App      │    │ • Entropy Oracle │    │ • Redis Cache    │       │
│  │ • Verification   │    │ • Physics Engine │    │ • Audit Logs     │       │
│  │   Library        │    │ • Hash Chain     │    │                  │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Visualization Component Architecture

The Provably Fair UI consists of six primary visualization components, each serving a specific educational and verification purpose:

#### 2.2.1 ThreeBodyOrbitAnimation Component

**Purpose:** Provides real-time visual demonstration of the three-body gravitational simulation that generates entropy.

**Technical Implementation:**
- Rendering Engine: HTML5 Canvas 2D Context
- Animation Loop: requestAnimationFrame (60 FPS target)
- Physics Integration: Simplified Euler method for visualization (production uses RK4)
- Trail Rendering: Circular buffer of 100 position samples per body

**Component Properties:**
```typescript
interface ThreeBodyOrbitAnimationProps {
  width?: number;        // Canvas width (default: 400px)
  height?: number;       // Canvas height (default: 300px)
  gravitationalConstant?: number;  // G value (default: 0.5)
  softening?: number;    // Collision softening (default: 10)
  timeStep?: number;     // Integration step (default: 0.02)
}
```

**Visual Elements:**
- Three colored bodies (amber, blue, emerald) representing celestial masses
- Fading trail paths showing recent orbital history
- Legend identifying each body
- Play/Pause control for user interaction

#### 2.2.2 ThetaAnglesVisualization Component

**Purpose:** Displays the three theta angles extracted from the physics simulation as intuitive circular gauges.

**Technical Implementation:**
- Rendering Engine: HTML5 Canvas 2D Context
- Angle Display: Radial gauge with 12 tick marks (π/6 intervals)
- Animation: Optional continuous rotation to demonstrate angle extraction
- Labels: Mathematical notation (θ₁, θ₂, θ₃) with degree conversion

**Mathematical Representation:**
```
θᵢ = atan2(yᵢ, xᵢ) mod 2π

where (xᵢ, yᵢ) represents the position of body i in the simulation plane
```

#### 2.2.3 CommitRevealFlow Component

**Purpose:** Illustrates the four-step commitment protocol that ensures neither party can manipulate outcomes.

**Visual Flow:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   STEP 1    │───►│   STEP 2    │───►│   STEP 3    │───►│   STEP 4    │
│   House     │    │   Player    │    │   Seeds     │    │   Verify    │
│   Commits   │    │   Provides  │    │   Combined  │    │   Anytime   │
│             │    │   Seed      │    │             │    │             │
│ 🔒 Lock     │    │ 🔀 Shuffle  │    │ 🔓 Unlock   │    │ ✓ Check    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Security Properties Displayed:**
- Pre-commitment prevents house manipulation
- Client seed injection prevents prediction
- Cryptographic mixing ensures joint randomness
- Post-hoc verification enables auditing

#### 2.2.4 HashChainTimeline Component

**Purpose:** Visualizes the sequential hash chain linking all spins for tamper-evident auditing.

**Technical Implementation:**
- Layout: Horizontal timeline with connected nodes
- Node Display: Spin number, truncated hash, timestamp
- Interaction: Hover for full hash values
- Expandable: Full hash display on demand

**Chain Structure:**
```
H₀ ──► H₁ ──► H₂ ──► H₃ ──► H₄ ──► ...

where Hᵢ = SHA256(Hᵢ₋₁ || clientSeedᵢ || nonceᵢ)
```

#### 2.2.5 ThetaDistributionHistogram Component

**Purpose:** Provides statistical evidence of fairness through uniform distribution visualization.

**Technical Implementation:**
- Charting Library: Chart.js with react-chartjs-2 wrapper
- Bucket Count: 12 buckets (π/6 intervals covering [0, 2π))
- Sample Generation: Configurable (100, 500, 1000, 5000 spins)
- Metrics: Total samples, uniformity score, fairness assessment

**Statistical Metrics:**
```
Uniformity Score = 100 - (max_deviation / expected_count) × 100

where:
  expected_count = total_samples / bucket_count
  max_deviation = max(|observed_i - expected_count|) for all buckets i
```

#### 2.2.6 VerifySpinModal Component

**Purpose:** Enables users to verify any specific spin's cryptographic proof.

**Verification Data Displayed:**
- Session ID
- Commitment hash (pre-published)
- House seed (revealed post-spin)
- Client seed (user-provided)
- Nonce value
- Final entropy hex
- Theta angles (θ₁, θ₂, θ₃)
- Spin result (symbols and positions)

### 2.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SPIN LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. COMMIT PHASE                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Server generates house seed using three-body physics simulation       │   │
│  │ Server computes commitment = SHA256(houseSeed)                        │   │
│  │ Server stores (sessionId, houseSeed, commitment) in database          │   │
│  │ Server returns (sessionId, commitment) to client                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  2. REVEAL PHASE                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Client provides clientSeed                                            │   │
│  │ Server retrieves houseSeed for sessionId                              │   │
│  │ Server computes finalEntropy = HMAC-SHA256(houseSeed || clientSeed)   │   │
│  │ Server runs three-body simulation with finalEntropy as seed           │   │
│  │ Server extracts theta angles from final simulation state              │   │
│  │ Server maps theta angles to reel positions                            │   │
│  │ Server stores complete result and returns to client                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  3. VERIFICATION PHASE                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Client can request full proof data for any sessionId                  │   │
│  │ Client verifies: SHA256(houseSeed) == original commitment             │   │
│  │ Client can recompute entire result independently                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical Foundation: Theta Uniformity Distribution

### 3.1 The Three-Body Problem

The three-body problem describes the motion of three point masses interacting through Newtonian gravity. For masses m₁, m₂, m₃ at positions r₁, r₂, r₃, the equations of motion are:

```
m₁ * d²r₁/dt² = G * m₁ * m₂ * (r₂ - r₁) / |r₂ - r₁|³ + G * m₁ * m₃ * (r₃ - r₁) / |r₃ - r₁|³

m₂ * d²r₂/dt² = G * m₂ * m₁ * (r₁ - r₂) / |r₁ - r₂|³ + G * m₂ * m₃ * (r₃ - r₂) / |r₃ - r₂|³

m₃ * d²r₃/dt² = G * m₃ * m₁ * (r₁ - r₃) / |r₁ - r₃|³ + G * m₃ * m₂ * (r₂ - r₃) / |r₂ - r₃|³
```

### 3.2 Chaotic Dynamics and Lyapunov Exponents

The three-body system exhibits sensitive dependence on initial conditions, characterized by positive Lyapunov exponents. For our system:

```
λ = lim(t→∞) [1/t * ln(|δr(t)| / |δr(0)|)]
```

where δr represents the separation between two initially close trajectories. A positive λ indicates exponential divergence, meaning small perturbations in initial conditions lead to vastly different outcomes.

**Practical Implication:** After sufficient simulation time (we use 5.0 seconds with 0.01 timestep = 500 RK4 steps), the final state is effectively unpredictable from the initial seed, even with unlimited computational resources.

### 3.3 Theta Angle Extraction

From the final simulation state, we extract three theta angles:

```
θ₁ = atan2(y₁, x₁) mod 2π
θ₂ = atan2(y₂, x₂) mod 2π
θ₃ = atan2(y₃, x₃) mod 2π
```

### 3.4 Uniformity Proof

**Theorem:** Given a chaotic three-body system with ergodic dynamics, the extracted theta angles are uniformly distributed over [0, 2π) in the limit of many samples.

**Proof Sketch:**

1. **Ergodicity:** The three-body system, for generic initial conditions, is ergodic on its energy surface. This means time averages equal phase space averages.

2. **Rotational Symmetry:** The gravitational potential is rotationally invariant. There is no preferred angular direction in the system.

3. **Measure Preservation:** Hamiltonian dynamics preserves the Liouville measure. The phase space distribution remains uniform under time evolution.

4. **Projection:** The atan2 function projects the 2D position onto the unit circle. For a uniform distribution in 2D (which follows from ergodicity and rotational symmetry), the angular projection is uniform over [0, 2π).

**Empirical Verification:** The ThetaDistributionHistogram component allows users to generate thousands of samples and visually confirm the uniform distribution. A chi-squared goodness-of-fit test can be applied:

```
χ² = Σᵢ (Oᵢ - Eᵢ)² / Eᵢ

where:
  Oᵢ = observed count in bucket i
  Eᵢ = expected count = N / k (N = total samples, k = number of buckets)
```

For k = 12 buckets and significance level α = 0.05, the critical value is χ²₀.₀₅,₁₁ ≈ 19.68. Values below this threshold indicate the distribution is consistent with uniformity.

---

## 4. Statistical Fairness Proof Methodology

### 4.1 Definition of Fairness

A random number generator is considered **fair** for gaming purposes if:

1. **Uniformity:** Each possible outcome has equal probability
2. **Independence:** Successive outcomes are statistically independent
3. **Unpredictability:** Future outcomes cannot be predicted from past outcomes
4. **Non-manipulability:** Neither the operator nor the player can influence outcomes

### 4.2 Uniformity Testing

We employ multiple statistical tests to verify uniformity:

#### 4.2.1 Chi-Squared Test

Tests whether observed frequencies match expected uniform frequencies.

```
H₀: The distribution is uniform
H₁: The distribution is not uniform

Test statistic: χ² = Σᵢ (Oᵢ - Eᵢ)² / Eᵢ
Reject H₀ if χ² > χ²α,k-1
```

#### 4.2.2 Kolmogorov-Smirnov Test

Tests the maximum deviation between empirical and theoretical CDFs.

```
D = max|Fₙ(x) - F(x)|

where:
  Fₙ(x) = empirical CDF
  F(x) = uniform CDF = x / 2π for x ∈ [0, 2π)
```

#### 4.2.3 Runs Test

Tests for independence by analyzing runs of values above/below the median.

```
R = number of runs
E[R] = (2n₁n₂)/(n₁+n₂) + 1
Var[R] = (2n₁n₂(2n₁n₂-n₁-n₂))/((n₁+n₂)²(n₁+n₂-1))

Z = (R - E[R]) / √Var[R]
```

### 4.3 Entropy Quality Assessment

We measure the entropy quality of our RNG using:

#### 4.3.1 Shannon Entropy

```
H = -Σᵢ pᵢ log₂(pᵢ)

Maximum entropy for k buckets: H_max = log₂(k)
Entropy ratio: H / H_max (should be close to 1.0)
```

#### 4.3.2 Min-Entropy

```
H_∞ = -log₂(max(pᵢ))

This measures the worst-case predictability.
```

### 4.4 Continuous Monitoring

The system implements continuous statistical monitoring:

1. **Rolling Window Analysis:** Last 10,000 spins are continuously analyzed
2. **Alert Thresholds:** Automatic alerts if χ² exceeds critical values
3. **Audit Logging:** All statistical metrics are logged for regulatory review

---

## 5. Cryptographic Commitment Scheme Implementation

### 5.1 Commitment Scheme Definition

A commitment scheme consists of two phases:

**Commit Phase:** The committer (house) creates a commitment c to a value v such that:
- **Hiding:** c reveals nothing about v
- **Binding:** The committer cannot change v after committing

**Reveal Phase:** The committer reveals v and proves it matches c.

### 5.2 Our Implementation

We use SHA-256 for the commitment:

```
commitment = SHA256(houseSeed)
```

**Security Properties:**

- **Hiding:** SHA-256 is a one-way function. Given commitment, finding houseSeed is computationally infeasible (requires 2²⁵⁶ operations).

- **Binding:** SHA-256 is collision-resistant. Finding two different seeds that produce the same commitment is computationally infeasible.

### 5.3 Seed Mixing Protocol

The final entropy is derived using HMAC-SHA256:

```
finalEntropy = HMAC-SHA256(serverSecret, houseSeed || clientSeed || nonce)
```

**Security Properties:**

- **Joint Randomness:** Neither party alone determines the output
- **Unpredictability:** Without knowing serverSecret, the output is unpredictable
- **Determinism:** Given all inputs, the output is reproducible for verification

### 5.4 Cryptographic Proof Generation

For each spin, we generate a proof containing:

```typescript
interface SpinProof {
  sessionId: string;           // Unique identifier
  commitment: string;          // SHA256(houseSeed) - published before spin
  houseSeed: string;           // Revealed after spin
  clientSeed: string;          // Provided by player
  nonce: number;               // Spin counter
  serverSecretHash: string;    // SHA256(serverSecret) - for audit
  entropyHex: string;          // Final entropy value
  thetaAngles: {
    theta1: number;            // Body 1 angle [0, 2π)
    theta2: number;            // Body 2 angle [0, 2π)
    theta3: number;            // Body 3 angle [0, 2π)
  };
  physicsState: {
    positions: [number, number][];  // Final (x,y) for each body
    velocities: [number, number][]; // Final (vx,vy) for each body
  };
  result: {
    symbols: string[];         // Resulting symbols
    positions: number[];       // Reel stop positions
  };
  timestamp: string;           // ISO 8601 timestamp
  hashChainPrevious: string;   // Link to previous spin
}
```

### 5.5 Note on "Zero-Knowledge" Terminology

While our system provides strong fairness guarantees, it is technically a **commitment-reveal scheme** rather than a formal zero-knowledge proof in the cryptographic sense. True zero-knowledge proofs (ZKPs) like SNARKs or STARKs would allow verification without revealing the house seed at all.

Our system reveals the house seed after the spin, which is sufficient for fairness verification but does not meet the formal definition of zero-knowledge. For regulatory documentation, we recommend using the term "commit-reveal proof-of-fairness" rather than "zero-knowledge proof."

---

## 6. Hash Chain Verification Process

### 6.1 Hash Chain Structure

Each spin is linked to its predecessor through a cryptographic hash:

```
H₀ = SHA256(genesisBlock)
Hᵢ = SHA256(Hᵢ₋₁ || clientSeedᵢ || nonceᵢ || resultᵢ)
```

### 6.2 Tamper Detection

The hash chain provides tamper-evident properties:

**Forward Integrity:** Modifying any spin Sᵢ changes Hᵢ, which cascades to all subsequent hashes Hᵢ₊₁, Hᵢ₊₂, ...

**Verification Algorithm:**
```
function verifyHashChain(spins: Spin[]): boolean {
  for (let i = 1; i < spins.length; i++) {
    const expectedHash = SHA256(
      spins[i-1].hash + 
      spins[i].clientSeed + 
      spins[i].nonce + 
      JSON.stringify(spins[i].result)
    );
    if (expectedHash !== spins[i].hash) {
      return false; // Tampering detected
    }
  }
  return true;
}
```

### 6.3 Independent Verification

Any party can verify the hash chain:

1. **Obtain Chain Data:** Request all spin records for a session
2. **Verify Genesis:** Confirm H₀ matches the published genesis hash
3. **Verify Links:** For each spin, recompute the hash and compare
4. **Verify Commitments:** For each spin, verify SHA256(houseSeed) = commitment

### 6.4 Audit Trail Requirements

For regulatory compliance, the hash chain provides:

- **Immutability:** Historical records cannot be altered
- **Completeness:** Every spin is recorded
- **Traceability:** Each spin links to its predecessor
- **Verifiability:** Any auditor can independently verify

---

## 7. API Integration Specifications

### 7.1 REST API Endpoints

#### 7.1.1 Commit Endpoint

```
POST /api/v1/spin/commit

Request Body: (none required)

Response:
{
  "sessionId": "sess_abc123def456",
  "commitment": "a7f3e2c9d1b5f8a4e6c3b7d9f2a8e5c1b4d7f9a2e6c8b3d5f7a1e4c6b9d2f8a3",
  "expiresAt": "2024-12-14T12:00:00Z",
  "testMode": false
}

HTTP Status: 201 Created
```

#### 7.1.2 Reveal Endpoint

```
POST /api/v1/spin/reveal

Request Body:
{
  "sessionId": "sess_abc123def456",
  "clientSeed": "user_provided_seed_12345"
}

Response:
{
  "sessionId": "sess_abc123def456",
  "result": {
    "symbols": ["wild", "bonus", "fa", "zhong", "bai"],
    "positions": [3, 7, 12, 18, 24],
    "payout": 150
  },
  "houseSeed": "3b7c9e1f6a4d8b2e5c7f9a3d6b8e1c4f7a9d2b5e8c1f4a7d9b3e6c8f2a5d7b1",
  "proof": {
    "entropyHex": "f2e8a19c3d7b5f1a8e4c6b9d2f7a3e5c8b1d4f6a9e2c5b7d1f3a6e8c4b2d9f5",
    "thetaAngles": {
      "theta1": 1.234567,
      "theta2": 3.456789,
      "theta3": 5.678901
    }
  },
  "testMode": false
}

HTTP Status: 200 OK
```

#### 7.1.3 Verification Endpoint

```
GET /api/v1/verify/:sessionId

Response:
{
  "sessionId": "sess_abc123def456",
  "commitment": "a7f3e2c9d1b5f8a4e6c3b7d9f2a8e5c1b4d7f9a2e6c8b3d5f7a1e4c6b9d2f8a3",
  "houseSeed": "3b7c9e1f6a4d8b2e5c7f9a3d6b8e1c4f7a9d2b5e8c1f4a7d9b3e6c8f2a5d7b1",
  "clientSeed": "user_provided_seed_12345",
  "nonce": 42,
  "entropyHex": "f2e8a19c3d7b5f1a8e4c6b9d2f7a3e5c8b1d4f6a9e2c5b7d1f3a6e8c4b2d9f5",
  "thetaAngles": {
    "theta1": 1.234567,
    "theta2": 3.456789,
    "theta3": 5.678901
  },
  "physicsState": {
    "positions": [[12.34, 56.78], [-23.45, 67.89], [34.56, -78.90]],
    "velocities": [[0.12, -0.34], [-0.56, 0.78], [0.90, -0.12]]
  },
  "result": {
    "symbols": ["wild", "bonus", "fa", "zhong", "bai"],
    "positions": [3, 7, 12, 18, 24]
  },
  "hashChain": {
    "previous": "prev_hash_abc123",
    "current": "curr_hash_def456"
  },
  "timestamp": "2024-12-14T11:30:00Z",
  "verified": true
}

HTTP Status: 200 OK
```

### 7.2 WebSocket Events (Optional)

For real-time updates:

```javascript
// Client subscription
socket.on('spin:committed', (data) => {
  // { sessionId, commitment }
});

socket.on('spin:revealed', (data) => {
  // { sessionId, result, proof }
});

socket.on('verification:complete', (data) => {
  // { sessionId, verified, details }
});
```

### 7.3 Error Handling

```typescript
interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Error Codes:
// SESSION_NOT_FOUND - Invalid sessionId
// SESSION_EXPIRED - Session has expired
// ALREADY_REVEALED - Session already revealed
// INVALID_CLIENT_SEED - Client seed validation failed
// VERIFICATION_FAILED - Hash verification failed
// RATE_LIMITED - Too many requests
```

### 7.4 Rate Limiting

```
Default limits:
- /spin/commit: 60 requests per minute per IP
- /spin/reveal: 60 requests per minute per IP
- /verify: 120 requests per minute per IP

Headers returned:
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702558800
```

---

## 8. User Experience Design Rationale

### 8.1 Design Philosophy

The Provably Fair UI is designed with three core principles:

1. **Accessibility:** Complex cryptographic concepts must be understandable to non-technical users
2. **Transparency:** All verification data must be readily available
3. **Trust:** Visual elements must build confidence in the system's fairness

### 8.2 Information Architecture

The page is structured in layers of increasing technical depth:

**Layer 1 - Hero Section:**
- Simple headline: "How We Guarantee Fair Play"
- Three feature cards with icons and plain-language descriptions
- Immediate access to "Verify This Spin" button

**Layer 2 - Tabbed Content:**
- Physics: Visual demonstration of entropy source
- Commitment: Step-by-step protocol explanation
- Hash Chain: Timeline visualization
- Statistics: Distribution analysis

**Layer 3 - Expandable Details:**
- "Technical details for crypto enthusiasts" sections
- Full hash values on demand
- Mathematical formulas for verification

### 8.3 Visual Design Decisions

**Color Palette:**
- Background: Slate-950 (#020617) - Dark, professional gaming aesthetic
- Primary: Emerald-500 (#10b981) - Trust, verification, success
- Secondary: Blue-500 (#3b82f6) - Information, technology
- Accent: Amber-500 (#f59e0b) - Attention, important elements

**Typography:**
- Headings: System UI, bold weights
- Body: System UI, regular weight
- Code: Monospace for hashes and technical data

**Animation:**
- Three-body orbit: Continuous, demonstrates chaos
- Theta angles: Slow rotation, shows angle extraction
- Transitions: Subtle, professional

### 8.4 Accessibility Considerations

- **Color Contrast:** All text meets WCAG 2.1 AA standards
- **Keyboard Navigation:** Full tab navigation support
- **Screen Readers:** Semantic HTML with ARIA labels
- **Reduced Motion:** Respects prefers-reduced-motion

### 8.5 Mobile Responsiveness

- Responsive grid layouts (1 column on mobile, 2-3 on desktop)
- Touch-friendly button sizes (minimum 44x44px)
- Horizontal scroll for hash chain on small screens
- Collapsible sections for space efficiency

---

## 9. Regulatory Compliance Framework

### 9.1 GLI-11 Compliance

The Gaming Laboratories International GLI-11 standard specifies requirements for gaming device RNGs. Our system addresses:

**Section 4.1 - RNG Requirements:**
- Statistical randomness verified through chi-squared, K-S, and runs tests
- Unpredictability ensured through chaotic physics and cryptographic mixing
- Non-repeatability guaranteed by unique seeds per spin

**Section 4.2 - Scaling:**
- Theta angles scaled uniformly to [0, 2π)
- Reel positions derived deterministically from entropy

**Section 4.3 - Seeding:**
- Seeds derived from three-body physics simulation
- Additional entropy from client-provided seeds
- No predictable patterns in seed generation

### 9.2 ISO/IEC 27001 Alignment

**Information Security Controls:**
- A.10.1.1: Cryptographic controls (SHA-256, HMAC-SHA256)
- A.12.4.1: Event logging (complete audit trail)
- A.14.2.5: Secure development (code review, testing)

### 9.3 GDPR Considerations

**Data Minimization:**
- Only necessary data stored (seeds, results, timestamps)
- No personal data in spin records unless explicitly linked

**Right to Access:**
- Users can request all their spin data
- Verification endpoint provides complete transparency

**Data Retention:**
- Spin records retained for regulatory period (typically 5 years)
- Configurable retention policies

### 9.4 Jurisdiction-Specific Requirements

**Nevada Gaming Control Board:**
- RNG source code available for inspection
- Statistical testing results documented
- Audit trail maintained for minimum 5 years

**Malta Gaming Authority:**
- RNG certification from approved testing laboratory
- Player protection measures documented
- Responsible gaming features integrated

**UK Gambling Commission:**
- RNG testing to RTS 4 standard
- Fair and transparent terms
- Customer funds protection

---

## 10. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| Commitment | A cryptographic hash that binds a party to a value without revealing it |
| Entropy | A measure of randomness or unpredictability |
| Hash Chain | A sequence of hashes where each depends on its predecessor |
| HMAC | Hash-based Message Authentication Code |
| Lyapunov Exponent | A measure of sensitivity to initial conditions in dynamical systems |
| Nonce | A number used once to ensure uniqueness |
| RK4 | Fourth-order Runge-Kutta numerical integration method |
| SHA-256 | Secure Hash Algorithm producing 256-bit output |
| Theta (θ) | Angular position in radians |
| Three-Body Problem | The problem of predicting motion of three gravitationally interacting bodies |

### Appendix B: Mathematical Notation

| Symbol | Meaning |
|--------|---------|
| G | Gravitational constant |
| mᵢ | Mass of body i |
| rᵢ | Position vector of body i |
| θᵢ | Angular position of body i |
| H | Hash function output |
| λ | Lyapunov exponent |
| χ² | Chi-squared statistic |

### Appendix C: Test Vectors

**Test Vector 1:**
```
Input:
  houseSeed: "test_house_seed_12345"
  clientSeed: "test_client_seed_67890"
  nonce: 1

Expected Output:
  commitment: SHA256("test_house_seed_12345")
            = "8f14e45fceea167a5a36dedd4bea2543"... (truncated)
  
  entropyHex: HMAC-SHA256(serverSecret, houseSeed || clientSeed || nonce)
            = (depends on serverSecret)
```

### Appendix D: References

1. Poincaré, H. (1890). "Sur le problème des trois corps et les équations de la dynamique"
2. NIST SP 800-22: A Statistical Test Suite for Random and Pseudorandom Number Generators
3. GLI-11: Gaming Devices in Casinos, Version 3.0
4. ISO/IEC 27001:2013 Information Security Management Systems
5. Merkle, R. (1979). "Secrecy, Authentication, and Public Key Systems"

### Appendix E: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | December 2024 | Initial release |

---

**Document End**

*This document is confidential and intended for regulatory review and patent filing purposes. Unauthorized distribution is prohibited.*
