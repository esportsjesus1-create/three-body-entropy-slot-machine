/**
 * Three-Body Physics Engine
 * 
 * This module provides a high-precision three-body gravitational simulation
 * for generating chaotic entropy values. The three-body problem is inherently
 * chaotic, making it an excellent source of unpredictable yet deterministic
 * entropy for provably fair gaming systems.
 * 
 * @packageDocumentation
 */

// Export types
export {
  Vector3D,
  Body,
  SystemConfiguration,
  SimulationState,
  SimulationOptions,
  EntropyResult,
  InitialConditions
} from './types';

// Export vector operations
export * as vector from './vector';

// Export integrator functions
export {
  calculateGravitationalAcceleration,
  calculateAccelerations,
  rk4Step,
  calculateKineticEnergy,
  calculatePotentialEnergy,
  calculateTotalEnergy,
  calculateAngularMomentum,
  calculateCenterOfMass
} from './integrator';

// Export simulation class and utilities
export {
  ThreeBodySimulation,
  generateRandomInitialConditions,
  createFigure8Configuration,
  createLagrangeConfiguration
} from './simulation';
