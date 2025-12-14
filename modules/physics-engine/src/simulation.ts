/**
 * Three-Body Simulation Module
 * 
 * Main simulation class that orchestrates the three-body gravitational
 * dynamics and extracts entropy values from the chaotic system.
 */

import { createHash } from 'crypto';
import {
  Body,
  EntropyResult,
  InitialConditions,
  SimulationOptions,
  SimulationState,
  SystemConfiguration,
  Vector3D
} from './types';
import * as vec from './vector';
import {
  rk4Step,
  calculateTotalEnergy,
  calculateAngularMomentum,
  calculateCenterOfMass
} from './integrator';

/**
 * Default simulation parameters.
 */
const DEFAULT_GRAVITATIONAL_CONSTANT = 1.0;
const DEFAULT_SOFTENING_PARAMETER = 0.01;
const DEFAULT_TIME_STEP = 0.001;
const DEFAULT_DURATION = 10.0;

/**
 * ThreeBodySimulation class manages the complete lifecycle of a three-body
 * gravitational simulation for entropy generation.
 */
export class ThreeBodySimulation {
  private configuration: SystemConfiguration;
  private time: number = 0;
  private stepCount: number = 0;
  private initialConditionsHash: string = '';
  private initialized: boolean = false;

  constructor() {
    this.configuration = this.createDefaultConfiguration();
  }

  /**
   * Creates a default system configuration.
   */
  private createDefaultConfiguration(): SystemConfiguration {
    return {
      bodies: [
        { mass: 1, position: vec.zeroVector(), velocity: vec.zeroVector() },
        { mass: 1, position: vec.zeroVector(), velocity: vec.zeroVector() },
        { mass: 1, position: vec.zeroVector(), velocity: vec.zeroVector() }
      ],
      gravitationalConstant: DEFAULT_GRAVITATIONAL_CONSTANT,
      softeningParameter: DEFAULT_SOFTENING_PARAMETER
    };
  }

  /**
   * Initializes the three-body system with the specified masses, positions, and velocities.
   * 
   * @param masses - Array of three masses for each body
   * @param positions - Array of three position vectors
   * @param velocities - Array of three velocity vectors
   * @returns The initialized system configuration
   */
  initializeSystem(
    masses: [number, number, number],
    positions: [Vector3D, Vector3D, Vector3D],
    velocities: [Vector3D, Vector3D, Vector3D]
  ): SystemConfiguration {
    // Validate inputs
    this.validateMasses(masses);
    this.validateVectors(positions, 'positions');
    this.validateVectors(velocities, 'velocities');

    // Create bodies
    const bodies: [Body, Body, Body] = [
      { mass: masses[0], position: vec.clone(positions[0]), velocity: vec.clone(velocities[0]) },
      { mass: masses[1], position: vec.clone(positions[1]), velocity: vec.clone(velocities[1]) },
      { mass: masses[2], position: vec.clone(positions[2]), velocity: vec.clone(velocities[2]) }
    ];

    this.configuration = {
      bodies,
      gravitationalConstant: this.configuration.gravitationalConstant,
      softeningParameter: this.configuration.softeningParameter
    };

    // Reset simulation state
    this.time = 0;
    this.stepCount = 0;
    this.initialized = true;

    // Calculate hash of initial conditions for verification
    this.initialConditionsHash = this.hashInitialConditions(masses, positions, velocities);

    return this.cloneConfiguration();
  }

  /**
   * Validates that all masses are positive.
   */
  private validateMasses(masses: [number, number, number]): void {
    for (let i = 0; i < 3; i++) {
      if (masses[i] <= 0) {
        throw new Error(`Mass at index ${i} must be positive, got ${masses[i]}`);
      }
      if (!Number.isFinite(masses[i])) {
        throw new Error(`Mass at index ${i} must be finite, got ${masses[i]}`);
      }
    }
  }

  /**
   * Validates that all vectors have finite components.
   */
  private validateVectors(vectors: [Vector3D, Vector3D, Vector3D], name: string): void {
    for (let i = 0; i < 3; i++) {
      const v = vectors[i];
      if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) {
        throw new Error(`${name}[${i}] contains non-finite values: (${v.x}, ${v.y}, ${v.z})`);
      }
    }
  }

  /**
   * Creates a cryptographic hash of the initial conditions.
   */
  private hashInitialConditions(
    masses: [number, number, number],
    positions: [Vector3D, Vector3D, Vector3D],
    velocities: [Vector3D, Vector3D, Vector3D]
  ): string {
    const data = JSON.stringify({ masses, positions, velocities });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Runs the simulation for the specified duration.
   * 
   * @param duration - Total time to simulate
   * @param timeStep - Integration time step (smaller = more accurate but slower)
   * @returns The final simulation state
   */
  simulateForTime(
    duration: number = DEFAULT_DURATION,
    timeStep: number = DEFAULT_TIME_STEP
  ): SimulationState {
    if (!this.initialized) {
      throw new Error('System must be initialized before simulation. Call initializeSystem() first.');
    }

    if (duration <= 0) {
      throw new Error(`Duration must be positive, got ${duration}`);
    }

    if (timeStep <= 0) {
      throw new Error(`Time step must be positive, got ${timeStep}`);
    }

    const targetTime = this.time + duration;
    
    while (this.time < targetTime) {
      // Adjust final step to hit exact target time
      const dt = Math.min(timeStep, targetTime - this.time);
      
      // Perform RK4 integration step
      this.configuration = rk4Step(this.configuration, dt);
      this.time += dt;
      this.stepCount++;

      // Check for numerical instability
      this.checkNumericalStability();
    }

    return this.getCurrentState();
  }

  /**
   * Checks for numerical instability in the simulation.
   */
  private checkNumericalStability(): void {
    for (let i = 0; i < 3; i++) {
      const body = this.configuration.bodies[i];
      const pos = body.position;
      const vel = body.velocity;

      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) {
        throw new Error(`Numerical instability detected: body ${i} position is not finite`);
      }

      if (!Number.isFinite(vel.x) || !Number.isFinite(vel.y) || !Number.isFinite(vel.z)) {
        throw new Error(`Numerical instability detected: body ${i} velocity is not finite`);
      }
    }
  }

  /**
   * Extracts the entropy value from the current simulation state.
   * 
   * The entropy is derived from the chaotic positions and velocities of the
   * three bodies, which are highly sensitive to initial conditions.
   * 
   * @returns The entropy result containing the value and metadata
   */
  getEntropyValue(): EntropyResult {
    if (!this.initialized) {
      throw new Error('System must be initialized before extracting entropy. Call initializeSystem() first.');
    }

    // Combine all position and velocity components into a single value
    const components: number[] = [];
    
    for (const body of this.configuration.bodies) {
      components.push(body.position.x, body.position.y, body.position.z);
      components.push(body.velocity.x, body.velocity.y, body.velocity.z);
    }

    // Create a hash of all components for the entropy value
    const dataString = components.map(c => c.toExponential(15)).join(':');
    const hash = createHash('sha256').update(dataString).digest();

    // Convert first 8 bytes to a normalized floating-point value [0, 1)
    const highBits = hash.readUInt32BE(0);
    const lowBits = hash.readUInt32BE(4);
    const combined = highBits * 0x100000000 + lowBits;
    const normalizedValue = combined / 0x10000000000000000;

    // Also create a raw chaotic metric from the positions
    const chaoticMetric = this.calculateChaoticMetric();

    return {
      value: chaoticMetric,
      hex: hash.toString('hex'),
      finalState: this.getCurrentState(),
      initialConditionsHash: this.initialConditionsHash
    };
  }

  /**
   * Calculates a chaotic metric from the current state.
   * This metric is highly sensitive to initial conditions.
   */
  private calculateChaoticMetric(): number {
    const bodies = this.configuration.bodies;
    
    // Calculate various chaotic indicators
    const distances = [
      vec.distance(bodies[0].position, bodies[1].position),
      vec.distance(bodies[1].position, bodies[2].position),
      vec.distance(bodies[2].position, bodies[0].position)
    ];

    const speeds = [
      vec.magnitude(bodies[0].velocity),
      vec.magnitude(bodies[1].velocity),
      vec.magnitude(bodies[2].velocity)
    ];

    // Combine into a single metric using fractional parts
    let metric = 0;
    for (let i = 0; i < 3; i++) {
      metric += (distances[i] % 1) * Math.pow(10, -i * 5);
      metric += (speeds[i] % 1) * Math.pow(10, -(i * 5 + 2));
    }

    // Normalize to [0, 1)
    return Math.abs(metric % 1);
  }

  /**
   * Gets the current simulation state.
   */
  getCurrentState(): SimulationState {
    return {
      time: this.time,
      configuration: this.cloneConfiguration(),
      totalEnergy: calculateTotalEnergy(this.configuration),
      stepCount: this.stepCount
    };
  }

  /**
   * Gets the current system configuration.
   */
  getConfiguration(): SystemConfiguration {
    return this.cloneConfiguration();
  }

  /**
   * Creates a deep clone of the current configuration.
   */
  private cloneConfiguration(): SystemConfiguration {
    return {
      bodies: [
        {
          mass: this.configuration.bodies[0].mass,
          position: vec.clone(this.configuration.bodies[0].position),
          velocity: vec.clone(this.configuration.bodies[0].velocity)
        },
        {
          mass: this.configuration.bodies[1].mass,
          position: vec.clone(this.configuration.bodies[1].position),
          velocity: vec.clone(this.configuration.bodies[1].velocity)
        },
        {
          mass: this.configuration.bodies[2].mass,
          position: vec.clone(this.configuration.bodies[2].position),
          velocity: vec.clone(this.configuration.bodies[2].velocity)
        }
      ],
      gravitationalConstant: this.configuration.gravitationalConstant,
      softeningParameter: this.configuration.softeningParameter
    };
  }

  /**
   * Sets the gravitational constant.
   */
  setGravitationalConstant(G: number): void {
    if (G <= 0) {
      throw new Error(`Gravitational constant must be positive, got ${G}`);
    }
    this.configuration.gravitationalConstant = G;
  }

  /**
   * Sets the softening parameter.
   */
  setSofteningParameter(softening: number): void {
    if (softening < 0) {
      throw new Error(`Softening parameter must be non-negative, got ${softening}`);
    }
    this.configuration.softeningParameter = softening;
  }

  /**
   * Resets the simulation to its initial state.
   */
  reset(): void {
    this.configuration = this.createDefaultConfiguration();
    this.time = 0;
    this.stepCount = 0;
    this.initialConditionsHash = '';
    this.initialized = false;
  }

  /**
   * Gets the current simulation time.
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Gets the total number of integration steps performed.
   */
  getStepCount(): number {
    return this.stepCount;
  }

  /**
   * Checks if the system has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the center of mass of the system.
   */
  getCenterOfMass(): Vector3D {
    return calculateCenterOfMass(this.configuration);
  }

  /**
   * Gets the total angular momentum of the system.
   */
  getAngularMomentum(): Vector3D {
    return calculateAngularMomentum(this.configuration);
  }

  /**
   * Gets the total energy of the system.
   */
  getTotalEnergy(): number {
    return calculateTotalEnergy(this.configuration);
  }
}

/**
 * Generates random initial conditions for the three-body system.
 * Useful for creating varied entropy sources.
 * 
 * @param seed - Optional seed for reproducible random generation
 * @returns Initial conditions for the system
 */
export function generateRandomInitialConditions(seed?: string): InitialConditions {
  // Use seed to create deterministic random values if provided
  let randomSource: () => number;
  
  if (seed) {
    const hash = createHash('sha256').update(seed).digest();
    let index = 0;
    randomSource = () => {
      const value = hash.readUInt8(index % 32) / 255;
      index++;
      return value;
    };
  } else {
    randomSource = Math.random;
  }

  const randomInRange = (min: number, max: number) => min + randomSource() * (max - min);
  const randomVector = (scale: number): Vector3D => ({
    x: randomInRange(-scale, scale),
    y: randomInRange(-scale, scale),
    z: randomInRange(-scale, scale)
  });

  return {
    masses: [
      randomInRange(0.5, 2.0),
      randomInRange(0.5, 2.0),
      randomInRange(0.5, 2.0)
    ],
    positions: [
      randomVector(5),
      randomVector(5),
      randomVector(5)
    ],
    velocities: [
      randomVector(1),
      randomVector(1),
      randomVector(1)
    ]
  };
}

/**
 * Creates a figure-8 orbit configuration, a known stable periodic solution.
 * Useful for testing and demonstration.
 */
export function createFigure8Configuration(): InitialConditions {
  // Figure-8 orbit initial conditions (discovered by Moore, 1993)
  const p1 = 0.347111;
  const p2 = 0.532728;

  return {
    masses: [1, 1, 1],
    positions: [
      { x: -1, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 }
    ],
    velocities: [
      { x: p1, y: p2, z: 0 },
      { x: p1, y: p2, z: 0 },
      { x: -2 * p1, y: -2 * p2, z: 0 }
    ]
  };
}

/**
 * Creates a Lagrange equilateral triangle configuration.
 */
export function createLagrangeConfiguration(): InitialConditions {
  const r = 1.0;
  const v = Math.sqrt(1 / r);
  const angle1 = 0;
  const angle2 = (2 * Math.PI) / 3;
  const angle3 = (4 * Math.PI) / 3;

  return {
    masses: [1, 1, 1],
    positions: [
      { x: r * Math.cos(angle1), y: r * Math.sin(angle1), z: 0 },
      { x: r * Math.cos(angle2), y: r * Math.sin(angle2), z: 0 },
      { x: r * Math.cos(angle3), y: r * Math.sin(angle3), z: 0 }
    ],
    velocities: [
      { x: -v * Math.sin(angle1), y: v * Math.cos(angle1), z: 0 },
      { x: -v * Math.sin(angle2), y: v * Math.cos(angle2), z: 0 },
      { x: -v * Math.sin(angle3), y: v * Math.cos(angle3), z: 0 }
    ]
  };
}
