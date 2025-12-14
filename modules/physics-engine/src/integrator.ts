/**
 * Numerical Integrator Module
 * 
 * Implements the 4th-order Runge-Kutta (RK4) integrator for high-precision
 * simulation of the three-body gravitational system.
 */

import { Body, SystemConfiguration, Vector3D } from './types';
import * as vec from './vector';

/**
 * Represents the derivative state (velocities and accelerations) of the system.
 */
interface DerivativeState {
  velocities: [Vector3D, Vector3D, Vector3D];
  accelerations: [Vector3D, Vector3D, Vector3D];
}

/**
 * Calculates the gravitational acceleration on body i due to body j.
 * Uses Newton's law of gravitation with a softening parameter to prevent
 * singularities when bodies get very close.
 */
export function calculateGravitationalAcceleration(
  bodyI: Body,
  bodyJ: Body,
  G: number,
  softening: number
): Vector3D {
  const r = vec.subtract(bodyJ.position, bodyI.position);
  const distSq = vec.magnitudeSquared(r) + softening * softening;
  const dist = Math.sqrt(distSq);
  const forceMagnitude = (G * bodyJ.mass) / (distSq * dist);
  return vec.scale(r, forceMagnitude);
}

/**
 * Calculates the total acceleration on each body in the system.
 */
export function calculateAccelerations(config: SystemConfiguration): [Vector3D, Vector3D, Vector3D] {
  const { bodies, gravitationalConstant: G, softeningParameter: softening } = config;
  const accelerations: [Vector3D, Vector3D, Vector3D] = [
    vec.zeroVector(),
    vec.zeroVector(),
    vec.zeroVector()
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i !== j) {
        const acc = calculateGravitationalAcceleration(bodies[i], bodies[j], G, softening);
        accelerations[i] = vec.add(accelerations[i], acc);
      }
    }
  }

  return accelerations;
}

/**
 * Calculates the derivative state (velocities and accelerations) for the current configuration.
 */
function calculateDerivatives(config: SystemConfiguration): DerivativeState {
  const accelerations = calculateAccelerations(config);
  return {
    velocities: [
      vec.clone(config.bodies[0].velocity),
      vec.clone(config.bodies[1].velocity),
      vec.clone(config.bodies[2].velocity)
    ],
    accelerations
  };
}

/**
 * Creates a temporary configuration by applying derivatives scaled by dt.
 */
function applyDerivatives(
  config: SystemConfiguration,
  derivatives: DerivativeState,
  dt: number
): SystemConfiguration {
  const newBodies: [Body, Body, Body] = [
    {
      mass: config.bodies[0].mass,
      position: vec.add(config.bodies[0].position, vec.scale(derivatives.velocities[0], dt)),
      velocity: vec.add(config.bodies[0].velocity, vec.scale(derivatives.accelerations[0], dt))
    },
    {
      mass: config.bodies[1].mass,
      position: vec.add(config.bodies[1].position, vec.scale(derivatives.velocities[1], dt)),
      velocity: vec.add(config.bodies[1].velocity, vec.scale(derivatives.accelerations[1], dt))
    },
    {
      mass: config.bodies[2].mass,
      position: vec.add(config.bodies[2].position, vec.scale(derivatives.velocities[2], dt)),
      velocity: vec.add(config.bodies[2].velocity, vec.scale(derivatives.accelerations[2], dt))
    }
  ];

  return {
    bodies: newBodies,
    gravitationalConstant: config.gravitationalConstant,
    softeningParameter: config.softeningParameter
  };
}

/**
 * Combines multiple derivative states with weights for RK4.
 */
function combineDerivatives(
  d1: DerivativeState,
  d2: DerivativeState,
  d3: DerivativeState,
  d4: DerivativeState
): DerivativeState {
  const combined: DerivativeState = {
    velocities: [vec.zeroVector(), vec.zeroVector(), vec.zeroVector()],
    accelerations: [vec.zeroVector(), vec.zeroVector(), vec.zeroVector()]
  };

  for (let i = 0; i < 3; i++) {
    combined.velocities[i] = vec.scale(
      vec.add(
        vec.add(d1.velocities[i], vec.scale(d2.velocities[i], 2)),
        vec.add(vec.scale(d3.velocities[i], 2), d4.velocities[i])
      ),
      1 / 6
    );
    combined.accelerations[i] = vec.scale(
      vec.add(
        vec.add(d1.accelerations[i], vec.scale(d2.accelerations[i], 2)),
        vec.add(vec.scale(d3.accelerations[i], 2), d4.accelerations[i])
      ),
      1 / 6
    );
  }

  return combined;
}

/**
 * Performs a single RK4 integration step.
 * 
 * The 4th-order Runge-Kutta method provides high accuracy by evaluating
 * the derivatives at multiple points within the time step and combining
 * them with appropriate weights.
 */
export function rk4Step(config: SystemConfiguration, dt: number): SystemConfiguration {
  // k1 = f(t, y)
  const k1 = calculateDerivatives(config);

  // k2 = f(t + dt/2, y + dt/2 * k1)
  const config2 = applyDerivatives(config, k1, dt / 2);
  const k2 = calculateDerivatives(config2);

  // k3 = f(t + dt/2, y + dt/2 * k2)
  const config3 = applyDerivatives(config, k2, dt / 2);
  const k3 = calculateDerivatives(config3);

  // k4 = f(t + dt, y + dt * k3)
  const config4 = applyDerivatives(config, k3, dt);
  const k4 = calculateDerivatives(config4);

  // Combine: y(t + dt) = y(t) + dt * (k1 + 2*k2 + 2*k3 + k4) / 6
  const combined = combineDerivatives(k1, k2, k3, k4);

  return applyDerivatives(config, combined, dt);
}

/**
 * Calculates the total kinetic energy of the system.
 */
export function calculateKineticEnergy(config: SystemConfiguration): number {
  let ke = 0;
  for (const body of config.bodies) {
    const vSquared = vec.magnitudeSquared(body.velocity);
    ke += 0.5 * body.mass * vSquared;
  }
  return ke;
}

/**
 * Calculates the total potential energy of the system.
 */
export function calculatePotentialEnergy(config: SystemConfiguration): number {
  const { bodies, gravitationalConstant: G, softeningParameter: softening } = config;
  let pe = 0;

  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const r = vec.distance(bodies[i].position, bodies[j].position);
      const softR = Math.sqrt(r * r + softening * softening);
      pe -= (G * bodies[i].mass * bodies[j].mass) / softR;
    }
  }

  return pe;
}

/**
 * Calculates the total energy (kinetic + potential) of the system.
 * This should be conserved in an ideal simulation.
 */
export function calculateTotalEnergy(config: SystemConfiguration): number {
  return calculateKineticEnergy(config) + calculatePotentialEnergy(config);
}

/**
 * Calculates the angular momentum of the system.
 * This is another conserved quantity.
 */
export function calculateAngularMomentum(config: SystemConfiguration): Vector3D {
  let L = vec.zeroVector();
  for (const body of config.bodies) {
    const r = body.position;
    const p = vec.scale(body.velocity, body.mass);
    L = vec.add(L, vec.cross(r, p));
  }
  return L;
}

/**
 * Calculates the center of mass of the system.
 */
export function calculateCenterOfMass(config: SystemConfiguration): Vector3D {
  let totalMass = 0;
  let weightedPosition = vec.zeroVector();

  for (const body of config.bodies) {
    totalMass += body.mass;
    weightedPosition = vec.add(weightedPosition, vec.scale(body.position, body.mass));
  }

  return vec.scale(weightedPosition, 1 / totalMass);
}
