# Physics Engine Module

Three-body dynamics calculations with gravitational simulation for entropy generation.

## Overview

This module implements a high-precision three-body gravitational simulation using the 4th-order Runge-Kutta (RK4) numerical integrator. The three-body problem is inherently chaotic, meaning small changes in initial conditions lead to dramatically different outcomes over time. This chaotic behavior makes it an excellent source of unpredictable yet deterministic entropy for provably fair gaming systems.

The simulation computes the gravitational interactions between three celestial bodies, tracking their positions and velocities over time. The final state of the system is then used to extract a high-entropy value that can seed random number generation.

## Features

- **N-body Simulation**: Specifically optimized for 3-body gravitational dynamics
- **RK4 Integrator**: 4th-order Runge-Kutta method for high-precision numerical integration
- **Initial Condition Generation**: Utilities for creating random or predefined initial states
- **Chaotic Metric Extraction**: Calculation of final entropy value from simulation state
- **Energy Conservation**: Validation through total energy tracking
- **Softening Parameter**: Prevents numerical singularities when bodies approach closely
- **Deterministic Output**: Same initial conditions always produce same entropy
- **Predefined Configurations**: Figure-8 orbit and Lagrange triangle configurations included

## Installation

```bash
npm install @three-body-entropy/physics-engine
```

Or if using from the monorepo:

```bash
cd modules/physics-engine
npm install
npm run build
```

## API Documentation

### ThreeBodySimulation Class

The main class for running three-body simulations.

#### Constructor

```typescript
const simulation = new ThreeBodySimulation();
```

Creates a new simulation instance in an uninitialized state.

#### initializeSystem(masses, positions, velocities)

Sets up the initial conditions for the three-body system.

**Parameters:**
- `masses`: `[number, number, number]` - Masses of the three bodies (must be positive)
- `positions`: `[Vector3D, Vector3D, Vector3D]` - Initial position vectors
- `velocities`: `[Vector3D, Vector3D, Vector3D]` - Initial velocity vectors

**Returns:** `SystemConfiguration` - The initialized configuration

**Throws:** Error if masses are non-positive or vectors contain non-finite values

```typescript
const masses: [number, number, number] = [1.0, 1.0, 1.0];
const positions: [Vector3D, Vector3D, Vector3D] = [
  { x: -1, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 }
];
const velocities: [Vector3D, Vector3D, Vector3D] = [
  { x: 0, y: 0.5, z: 0 },
  { x: 0, y: -0.5, z: 0 },
  { x: 0.5, y: 0, z: 0 }
];

simulation.initializeSystem(masses, positions, velocities);
```

#### simulateForTime(duration, timeStep)

Runs the simulation for the specified duration.

**Parameters:**
- `duration`: `number` - Total time to simulate (default: 10.0)
- `timeStep`: `number` - Integration time step (default: 0.001)

**Returns:** `SimulationState` - The final simulation state

**Throws:** Error if system not initialized or parameters are non-positive

```typescript
const state = simulation.simulateForTime(5.0, 0.001);
console.log(`Simulation time: ${state.time}`);
console.log(`Total energy: ${state.totalEnergy}`);
```

#### getEntropyValue()

Extracts the entropy value from the current simulation state.

**Returns:** `EntropyResult` - Object containing:
- `value`: `number` - Normalized entropy value in range [0, 1)
- `hex`: `string` - 64-character hexadecimal representation
- `finalState`: `SimulationState` - The simulation state at extraction
- `initialConditionsHash`: `string` - SHA-256 hash of initial conditions

**Throws:** Error if system not initialized

```typescript
const entropy = simulation.getEntropyValue();
console.log(`Entropy value: ${entropy.value}`);
console.log(`Entropy hex: ${entropy.hex}`);
```

### Utility Functions

#### generateRandomInitialConditions(seed?)

Generates random initial conditions for the simulation.

**Parameters:**
- `seed`: `string` (optional) - Seed for deterministic random generation

**Returns:** `InitialConditions` - Object with masses, positions, and velocities

```typescript
// Random conditions
const randomConditions = generateRandomInitialConditions();

// Seeded conditions (reproducible)
const seededConditions = generateRandomInitialConditions('my-seed');
```

#### createFigure8Configuration()

Creates the famous figure-8 periodic orbit configuration.

**Returns:** `InitialConditions` - Figure-8 orbit initial conditions

```typescript
const figure8 = createFigure8Configuration();
simulation.initializeSystem(figure8.masses, figure8.positions, figure8.velocities);
```

#### createLagrangeConfiguration()

Creates a Lagrange equilateral triangle configuration.

**Returns:** `InitialConditions` - Lagrange configuration initial conditions

```typescript
const lagrange = createLagrangeConfiguration();
simulation.initializeSystem(lagrange.masses, lagrange.positions, lagrange.velocities);
```

## Usage Examples

### Basic Entropy Generation

```typescript
import {
  ThreeBodySimulation,
  generateRandomInitialConditions
} from '@three-body-entropy/physics-engine';

// Create simulation
const simulation = new ThreeBodySimulation();

// Generate random initial conditions with a seed
const conditions = generateRandomInitialConditions('user-session-12345');

// Initialize the system
simulation.initializeSystem(
  conditions.masses,
  conditions.positions,
  conditions.velocities
);

// Run simulation
simulation.simulateForTime(10, 0.001);

// Extract entropy
const entropy = simulation.getEntropyValue();

console.log(`Generated entropy: ${entropy.hex}`);
console.log(`Normalized value: ${entropy.value}`);
```

### Reproducible Entropy for Verification

```typescript
import { ThreeBodySimulation, Vector3D } from '@three-body-entropy/physics-engine';

// Fixed initial conditions for verification
const masses: [number, number, number] = [1.0, 1.2, 0.8];
const positions: [Vector3D, Vector3D, Vector3D] = [
  { x: -1.5, y: 0.3, z: 0.1 },
  { x: 1.2, y: -0.5, z: 0.2 },
  { x: 0.3, y: 1.1, z: -0.3 }
];
const velocities: [Vector3D, Vector3D, Vector3D] = [
  { x: 0.1, y: 0.4, z: 0.05 },
  { x: -0.2, y: -0.3, z: 0.1 },
  { x: 0.3, y: 0.1, z: -0.15 }
];

// First simulation
const sim1 = new ThreeBodySimulation();
sim1.initializeSystem(masses, positions, velocities);
sim1.simulateForTime(5, 0.001);
const entropy1 = sim1.getEntropyValue();

// Second simulation (verification)
const sim2 = new ThreeBodySimulation();
sim2.initializeSystem(masses, positions, velocities);
sim2.simulateForTime(5, 0.001);
const entropy2 = sim2.getEntropyValue();

// These will be identical
console.log(`Match: ${entropy1.hex === entropy2.hex}`); // true
```

### Energy Conservation Check

```typescript
import { ThreeBodySimulation, createLagrangeConfiguration } from '@three-body-entropy/physics-engine';

const simulation = new ThreeBodySimulation();
const config = createLagrangeConfiguration();

simulation.initializeSystem(config.masses, config.positions, config.velocities);

const initialEnergy = simulation.getTotalEnergy();
console.log(`Initial energy: ${initialEnergy}`);

simulation.simulateForTime(100, 0.0001);

const finalEnergy = simulation.getTotalEnergy();
console.log(`Final energy: ${finalEnergy}`);

const drift = Math.abs(finalEnergy - initialEnergy) / Math.abs(initialEnergy);
console.log(`Energy drift: ${(drift * 100).toFixed(4)}%`);
```

## Types

### Vector3D

```typescript
interface Vector3D {
  x: number;
  y: number;
  z: number;
}
```

### Body

```typescript
interface Body {
  mass: number;
  position: Vector3D;
  velocity: Vector3D;
}
```

### SystemConfiguration

```typescript
interface SystemConfiguration {
  bodies: [Body, Body, Body];
  gravitationalConstant: number;
  softeningParameter: number;
}
```

### SimulationState

```typescript
interface SimulationState {
  time: number;
  configuration: SystemConfiguration;
  totalEnergy: number;
  stepCount: number;
}
```

### EntropyResult

```typescript
interface EntropyResult {
  value: number;
  hex: string;
  finalState: SimulationState;
  initialConditionsHash: string;
}
```

### InitialConditions

```typescript
interface InitialConditions {
  masses: [number, number, number];
  positions: [Vector3D, Vector3D, Vector3D];
  velocities: [Vector3D, Vector3D, Vector3D];
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
