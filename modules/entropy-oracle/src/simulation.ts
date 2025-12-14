/**
 * Three-Body Simulation for Entropy Generation
 * 
 * Implements the physics simulation that generates chaotic entropy
 * from three-body gravitational dynamics.
 */

import { createHash } from 'crypto';
import {
  Vector3D,
  Body,
  InitialConditions,
  SimulationParams,
  RawEntropyResult,
  SimulationMetadata,
  PresetConditions
} from './types';

/**
 * Default simulation parameters.
 */
const DEFAULT_PARAMS: SimulationParams = {
  duration: 10.0,
  timeStep: 0.001
};

/**
 * Default initial conditions.
 */
const DEFAULT_CONDITIONS: InitialConditions = {
  bodies: [
    { mass: 1.0, position: { x: -1, y: 0, z: 0 }, velocity: { x: 0, y: 0.5, z: 0 } },
    { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: -0.5, z: 0 } },
    { mass: 1.0, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0.5, y: 0, z: 0 } }
  ],
  gravitationalConstant: 1.0,
  softeningParameter: 0.01
};

/**
 * Vector operations.
 */
function addVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractVectors(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scaleVector(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function dotProduct(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculates gravitational acceleration on body i from all other bodies.
 */
function calculateAcceleration(
  bodies: Body[],
  index: number,
  G: number,
  softening: number
): Vector3D {
  let acceleration: Vector3D = { x: 0, y: 0, z: 0 };
  const body = bodies[index];

  for (let j = 0; j < bodies.length; j++) {
    if (j === index) continue;

    const other = bodies[j];
    const r = subtractVectors(other.position, body.position);
    const distSq = dotProduct(r, r) + softening * softening;
    const dist = Math.sqrt(distSq);
    const forceMag = (G * other.mass) / distSq;
    const forceDir = scaleVector(r, 1 / dist);
    acceleration = addVectors(acceleration, scaleVector(forceDir, forceMag));
  }

  return acceleration;
}

/**
 * Performs one RK4 integration step.
 */
function rk4Step(
  bodies: Body[],
  dt: number,
  G: number,
  softening: number
): Body[] {
  const n = bodies.length;

  // Calculate k1
  const k1v: Vector3D[] = [];
  const k1r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k1v.push(calculateAcceleration(bodies, i, G, softening));
    k1r.push(bodies[i].velocity);
  }

  // Calculate k2
  const bodies2 = bodies.map((b, i) => ({
    ...b,
    position: addVectors(b.position, scaleVector(k1r[i], dt / 2)),
    velocity: addVectors(b.velocity, scaleVector(k1v[i], dt / 2))
  }));
  const k2v: Vector3D[] = [];
  const k2r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k2v.push(calculateAcceleration(bodies2, i, G, softening));
    k2r.push(bodies2[i].velocity);
  }

  // Calculate k3
  const bodies3 = bodies.map((b, i) => ({
    ...b,
    position: addVectors(b.position, scaleVector(k2r[i], dt / 2)),
    velocity: addVectors(b.velocity, scaleVector(k2v[i], dt / 2))
  }));
  const k3v: Vector3D[] = [];
  const k3r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k3v.push(calculateAcceleration(bodies3, i, G, softening));
    k3r.push(bodies3[i].velocity);
  }

  // Calculate k4
  const bodies4 = bodies.map((b, i) => ({
    ...b,
    position: addVectors(b.position, scaleVector(k3r[i], dt)),
    velocity: addVectors(b.velocity, scaleVector(k3v[i], dt))
  }));
  const k4v: Vector3D[] = [];
  const k4r: Vector3D[] = [];
  for (let i = 0; i < n; i++) {
    k4v.push(calculateAcceleration(bodies4, i, G, softening));
    k4r.push(bodies4[i].velocity);
  }

  // Combine
  return bodies.map((b, i) => ({
    ...b,
    position: addVectors(
      b.position,
      scaleVector(
        addVectors(
          addVectors(k1r[i], scaleVector(k2r[i], 2)),
          addVectors(scaleVector(k3r[i], 2), k4r[i])
        ),
        dt / 6
      )
    ),
    velocity: addVectors(
      b.velocity,
      scaleVector(
        addVectors(
          addVectors(k1v[i], scaleVector(k2v[i], 2)),
          addVectors(scaleVector(k3v[i], 2), k4v[i])
        ),
        dt / 6
      )
    )
  }));
}

/**
 * Calculates total energy of the system.
 */
function calculateEnergy(bodies: Body[], G: number, softening: number): number {
  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < bodies.length; i++) {
    const v = bodies[i].velocity;
    kinetic += 0.5 * bodies[i].mass * dotProduct(v, v);

    for (let j = i + 1; j < bodies.length; j++) {
      const r = subtractVectors(bodies[j].position, bodies[i].position);
      const dist = Math.sqrt(dotProduct(r, r) + softening * softening);
      potential -= (G * bodies[i].mass * bodies[j].mass) / dist;
    }
  }

  return kinetic + potential;
}

/**
 * Extracts entropy value from final simulation state.
 */
function extractEntropy(bodies: Body[]): number {
  // Combine all position and velocity components
  let combined = 0;
  for (const body of bodies) {
    combined += Math.abs(body.position.x) + Math.abs(body.position.y) + Math.abs(body.position.z);
    combined += Math.abs(body.velocity.x) + Math.abs(body.velocity.y) + Math.abs(body.velocity.z);
  }

  // Normalize to [0, 1)
  const normalized = combined - Math.floor(combined);
  return normalized;
}

/**
 * Generates entropy hash from simulation state.
 */
function generateEntropyHash(bodies: Body[], simulationId: string): string {
  const hash = createHash('sha256');
  
  for (const body of bodies) {
    hash.update(body.position.x.toExponential(15));
    hash.update(body.position.y.toExponential(15));
    hash.update(body.position.z.toExponential(15));
    hash.update(body.velocity.x.toExponential(15));
    hash.update(body.velocity.y.toExponential(15));
    hash.update(body.velocity.z.toExponential(15));
  }
  
  hash.update(simulationId);
  return hash.digest('hex');
}

/**
 * Runs the three-body simulation and generates entropy.
 */
export function runSimulation(
  params: SimulationParams = DEFAULT_PARAMS,
  conditions: InitialConditions = DEFAULT_CONDITIONS
): RawEntropyResult {
  const { duration, timeStep } = params;
  const G = conditions.gravitationalConstant || 1.0;
  const softening = conditions.softeningParameter || 0.01;

  // Deep copy initial bodies
  let bodies = conditions.bodies.map(b => ({
    mass: b.mass,
    position: { ...b.position },
    velocity: { ...b.velocity }
  }));

  const initialEnergy = calculateEnergy(bodies, G, softening);
  const steps = Math.floor(duration / timeStep);
  const simulationId = createHash('sha256')
    .update(`${Date.now()}:${Math.random()}`)
    .digest('hex')
    .substring(0, 16);

  // Run simulation
  for (let i = 0; i < steps; i++) {
    bodies = rk4Step(bodies, timeStep, G, softening);
  }

  const finalEnergy = calculateEnergy(bodies, G, softening);
  const energyDrift = Math.abs((finalEnergy - initialEnergy) / initialEnergy);

  // Extract entropy
  const entropyValue = extractEntropy(bodies);
  const entropyHex = generateEntropyHash(bodies, simulationId);
  const sourceHash = createHash('sha256')
    .update(entropyHex)
    .digest('hex');

  // Estimate Lyapunov exponent (simplified)
  const lyapunovEstimate = Math.log(1 + energyDrift * 1000) / duration;

  const metadata: SimulationMetadata = {
    duration,
    timeStep,
    steps,
    finalEnergy,
    energyDrift,
    lyapunovEstimate
  };

  return {
    value: entropyValue,
    hex: entropyHex,
    sourceHash,
    simulationId,
    timestamp: Date.now(),
    metadata
  };
}

/**
 * Generates random initial conditions.
 */
export function generateRandomConditions(seed?: string): InitialConditions {
  const hash = seed
    ? createHash('sha256').update(seed).digest('hex')
    : createHash('sha256').update(`${Date.now()}:${Math.random()}`).digest('hex');

  // Use hash to generate deterministic "random" values
  const values: number[] = [];
  for (let i = 0; i < 18; i++) {
    const hexPart = hash.substring(i * 3, i * 3 + 3);
    values.push((parseInt(hexPart, 16) / 4095) * 2 - 1); // Range [-1, 1]
  }

  return {
    bodies: [
      {
        mass: 1.0 + Math.abs(values[0]) * 0.5,
        position: { x: values[1], y: values[2], z: values[3] * 0.1 },
        velocity: { x: values[4] * 0.5, y: values[5] * 0.5, z: values[6] * 0.1 }
      },
      {
        mass: 1.0 + Math.abs(values[7]) * 0.5,
        position: { x: values[8], y: values[9], z: values[10] * 0.1 },
        velocity: { x: values[11] * 0.5, y: values[12] * 0.5, z: values[13] * 0.1 }
      },
      {
        mass: 1.0 + Math.abs(values[14]) * 0.5,
        position: { x: values[15], y: values[16], z: values[17] * 0.1 },
        velocity: { x: -values[4] * 0.5 - values[11] * 0.5, y: -values[5] * 0.5 - values[12] * 0.5, z: 0 }
      }
    ],
    gravitationalConstant: 1.0,
    softeningParameter: 0.01
  };
}

/**
 * Preset initial conditions for common scenarios.
 */
export const PRESET_CONDITIONS: PresetConditions[] = [
  {
    name: 'figure-eight',
    description: 'Famous figure-eight periodic orbit',
    conditions: {
      bodies: [
        { mass: 1.0, position: { x: -0.97000436, y: 0.24308753, z: 0 }, velocity: { x: 0.4662036850, y: 0.4323657300, z: 0 } },
        { mass: 1.0, position: { x: 0.97000436, y: -0.24308753, z: 0 }, velocity: { x: 0.4662036850, y: 0.4323657300, z: 0 } },
        { mass: 1.0, position: { x: 0, y: 0, z: 0 }, velocity: { x: -0.93240737, y: -0.86473146, z: 0 } }
      ],
      gravitationalConstant: 1.0,
      softeningParameter: 0.001
    }
  },
  {
    name: 'lagrange',
    description: 'Lagrange equilateral triangle configuration',
    conditions: {
      bodies: [
        { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0.5, z: 0 } },
        { mass: 1.0, position: { x: -0.5, y: 0.866, z: 0 }, velocity: { x: -0.433, y: -0.25, z: 0 } },
        { mass: 1.0, position: { x: -0.5, y: -0.866, z: 0 }, velocity: { x: 0.433, y: -0.25, z: 0 } }
      ],
      gravitationalConstant: 1.0,
      softeningParameter: 0.01
    }
  },
  {
    name: 'chaotic',
    description: 'Highly chaotic initial conditions',
    conditions: {
      bodies: [
        { mass: 1.0, position: { x: -1, y: 0, z: 0 }, velocity: { x: 0, y: 0.6, z: 0.1 } },
        { mass: 1.2, position: { x: 1, y: 0.5, z: 0 }, velocity: { x: -0.3, y: -0.4, z: 0 } },
        { mass: 0.8, position: { x: 0, y: -1, z: 0.2 }, velocity: { x: 0.3, y: -0.2, z: -0.1 } }
      ],
      gravitationalConstant: 1.0,
      softeningParameter: 0.01
    }
  }
];

/**
 * Gets preset conditions by name.
 */
export function getPresetConditions(name: string): InitialConditions | undefined {
  const preset = PRESET_CONDITIONS.find(p => p.name === name);
  return preset?.conditions;
}

/**
 * Validates initial conditions.
 */
export function validateConditions(conditions: InitialConditions): boolean {
  if (!conditions.bodies || conditions.bodies.length !== 3) {
    return false;
  }

  for (const body of conditions.bodies) {
    if (body.mass <= 0) return false;
    if (!isFinite(body.position.x) || !isFinite(body.position.y) || !isFinite(body.position.z)) return false;
    if (!isFinite(body.velocity.x) || !isFinite(body.velocity.y) || !isFinite(body.velocity.z)) return false;
  }

  return true;
}
