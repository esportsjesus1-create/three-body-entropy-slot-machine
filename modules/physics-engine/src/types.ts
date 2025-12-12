/**
 * Three-Body Physics Engine Types
 * 
 * Defines the core data structures for the three-body gravitational simulation
 * used to generate chaotic entropy values.
 */

/**
 * Represents a 3D vector with x, y, z components.
 * Used for positions, velocities, and accelerations.
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents a celestial body in the simulation.
 * Each body has mass, position, and velocity.
 */
export interface Body {
  /** Mass of the body (in arbitrary units) */
  mass: number;
  /** Current position vector */
  position: Vector3D;
  /** Current velocity vector */
  velocity: Vector3D;
}

/**
 * Configuration for the three-body system.
 * Contains all three bodies and simulation parameters.
 */
export interface SystemConfiguration {
  /** Array of exactly 3 bodies */
  bodies: [Body, Body, Body];
  /** Gravitational constant (default: 1.0) */
  gravitationalConstant: number;
  /** Softening parameter to prevent singularities */
  softeningParameter: number;
}

/**
 * State of the simulation at a given time.
 */
export interface SimulationState {
  /** Current time in the simulation */
  time: number;
  /** Current configuration of all bodies */
  configuration: SystemConfiguration;
  /** Total energy of the system (for validation) */
  totalEnergy: number;
  /** Number of integration steps performed */
  stepCount: number;
}

/**
 * Options for running the simulation.
 */
export interface SimulationOptions {
  /** Duration to simulate (in time units) */
  duration: number;
  /** Time step for integration */
  timeStep: number;
  /** Whether to use adaptive time stepping */
  adaptiveTimeStep?: boolean;
  /** Tolerance for adaptive time stepping */
  tolerance?: number;
}

/**
 * Result of entropy extraction from the simulation.
 */
export interface EntropyResult {
  /** The raw entropy value (high-precision floating point) */
  value: number;
  /** Hexadecimal representation of the entropy */
  hex: string;
  /** The simulation state at extraction time */
  finalState: SimulationState;
  /** Hash of the initial conditions (for verification) */
  initialConditionsHash: string;
}

/**
 * Initial conditions for setting up the system.
 */
export interface InitialConditions {
  /** Masses of the three bodies */
  masses: [number, number, number];
  /** Initial positions of the three bodies */
  positions: [Vector3D, Vector3D, Vector3D];
  /** Initial velocities of the three bodies */
  velocities: [Vector3D, Vector3D, Vector3D];
}
