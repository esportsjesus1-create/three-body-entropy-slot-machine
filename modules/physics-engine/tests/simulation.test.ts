/**
 * Simulation Unit Tests
 */

import {
  ThreeBodySimulation,
  generateRandomInitialConditions,
  createFigure8Configuration,
  createLagrangeConfiguration
} from '../src/simulation';
import { Vector3D } from '../src/types';

describe('ThreeBodySimulation', () => {
  let simulation: ThreeBodySimulation;

  beforeEach(() => {
    simulation = new ThreeBodySimulation();
  });

  describe('constructor', () => {
    it('should create an uninitialized simulation', () => {
      expect(simulation.isInitialized()).toBe(false);
    });

    it('should have zero time initially', () => {
      expect(simulation.getTime()).toBe(0);
    });

    it('should have zero step count initially', () => {
      expect(simulation.getStepCount()).toBe(0);
    });
  });

  describe('initializeSystem', () => {
    const masses: [number, number, number] = [1, 1, 1];
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

    it('should initialize the system with given parameters', () => {
      const config = simulation.initializeSystem(masses, positions, velocities);
      
      expect(simulation.isInitialized()).toBe(true);
      expect(config.bodies).toHaveLength(3);
    });

    it('should set correct masses', () => {
      const config = simulation.initializeSystem(masses, positions, velocities);
      
      expect(config.bodies[0].mass).toBe(1);
      expect(config.bodies[1].mass).toBe(1);
      expect(config.bodies[2].mass).toBe(1);
    });

    it('should set correct positions', () => {
      const config = simulation.initializeSystem(masses, positions, velocities);
      
      expect(config.bodies[0].position).toEqual(positions[0]);
      expect(config.bodies[1].position).toEqual(positions[1]);
      expect(config.bodies[2].position).toEqual(positions[2]);
    });

    it('should set correct velocities', () => {
      const config = simulation.initializeSystem(masses, positions, velocities);
      
      expect(config.bodies[0].velocity).toEqual(velocities[0]);
      expect(config.bodies[1].velocity).toEqual(velocities[1]);
      expect(config.bodies[2].velocity).toEqual(velocities[2]);
    });

    it('should throw error for non-positive mass', () => {
      const invalidMasses: [number, number, number] = [1, 0, 1];
      
      expect(() => {
        simulation.initializeSystem(invalidMasses, positions, velocities);
      }).toThrow('Mass at index 1 must be positive');
    });

    it('should throw error for negative mass', () => {
      const invalidMasses: [number, number, number] = [1, -1, 1];
      
      expect(() => {
        simulation.initializeSystem(invalidMasses, positions, velocities);
      }).toThrow('Mass at index 1 must be positive');
    });

    it('should throw error for non-finite mass', () => {
      const invalidMasses: [number, number, number] = [1, Infinity, 1];
      
      expect(() => {
        simulation.initializeSystem(invalidMasses, positions, velocities);
      }).toThrow('Mass at index 1 must be finite');
    });

    it('should throw error for non-finite position', () => {
      const invalidPositions: [Vector3D, Vector3D, Vector3D] = [
        { x: NaN, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }
      ];
      
      expect(() => {
        simulation.initializeSystem(masses, invalidPositions, velocities);
      }).toThrow('positions[0] contains non-finite values');
    });

    it('should throw error for non-finite velocity', () => {
      const invalidVelocities: [Vector3D, Vector3D, Vector3D] = [
        { x: 0, y: 0.5, z: 0 },
        { x: Infinity, y: -0.5, z: 0 },
        { x: 0.5, y: 0, z: 0 }
      ];
      
      expect(() => {
        simulation.initializeSystem(masses, positions, invalidVelocities);
      }).toThrow('velocities[1] contains non-finite values');
    });

    it('should reset time and step count', () => {
      simulation.initializeSystem(masses, positions, velocities);
      simulation.simulateForTime(1, 0.01);
      
      expect(simulation.getTime()).toBeGreaterThan(0);
      expect(simulation.getStepCount()).toBeGreaterThan(0);
      
      simulation.initializeSystem(masses, positions, velocities);
      
      expect(simulation.getTime()).toBe(0);
      expect(simulation.getStepCount()).toBe(0);
    });
  });

  describe('simulateForTime', () => {
    beforeEach(() => {
      const masses: [number, number, number] = [1, 1, 1];
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
    });

    it('should throw error if not initialized', () => {
      const uninitializedSim = new ThreeBodySimulation();
      
      expect(() => {
        uninitializedSim.simulateForTime(1, 0.01);
      }).toThrow('System must be initialized');
    });

    it('should throw error for non-positive duration', () => {
      expect(() => {
        simulation.simulateForTime(0, 0.01);
      }).toThrow('Duration must be positive');
      
      expect(() => {
        simulation.simulateForTime(-1, 0.01);
      }).toThrow('Duration must be positive');
    });

    it('should throw error for non-positive time step', () => {
      expect(() => {
        simulation.simulateForTime(1, 0);
      }).toThrow('Time step must be positive');
      
      expect(() => {
        simulation.simulateForTime(1, -0.01);
      }).toThrow('Time step must be positive');
    });

    it('should advance simulation time', () => {
      simulation.simulateForTime(1, 0.01);
      
      expect(simulation.getTime()).toBeCloseTo(1, 5);
    });

    it('should increment step count', () => {
      simulation.simulateForTime(1, 0.01);
      
      expect(simulation.getStepCount()).toBeGreaterThan(0);
    });

    it('should return simulation state', () => {
      const state = simulation.simulateForTime(1, 0.01);
      
      expect(state.time).toBeCloseTo(1, 5);
      expect(state.configuration).toBeDefined();
      expect(state.totalEnergy).toBeDefined();
      expect(state.stepCount).toBeGreaterThan(0);
    });

    it('should accumulate time over multiple calls', () => {
      simulation.simulateForTime(1, 0.01);
      simulation.simulateForTime(1, 0.01);
      
      expect(simulation.getTime()).toBeCloseTo(2, 5);
    });
  });

  describe('getEntropyValue', () => {
    beforeEach(() => {
      const masses: [number, number, number] = [1, 1, 1];
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
    });

    it('should throw error if not initialized', () => {
      const uninitializedSim = new ThreeBodySimulation();
      
      expect(() => {
        uninitializedSim.getEntropyValue();
      }).toThrow('System must be initialized');
    });

    it('should return entropy result', () => {
      simulation.simulateForTime(1, 0.01);
      const entropy = simulation.getEntropyValue();
      
      expect(entropy.value).toBeDefined();
      expect(entropy.hex).toBeDefined();
      expect(entropy.finalState).toBeDefined();
      expect(entropy.initialConditionsHash).toBeDefined();
    });

    it('should return value in range [0, 1)', () => {
      simulation.simulateForTime(1, 0.01);
      const entropy = simulation.getEntropyValue();
      
      expect(entropy.value).toBeGreaterThanOrEqual(0);
      expect(entropy.value).toBeLessThan(1);
    });

    it('should return hex string of correct length', () => {
      simulation.simulateForTime(1, 0.01);
      const entropy = simulation.getEntropyValue();
      
      expect(entropy.hex).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different entropy for different simulations', () => {
      simulation.simulateForTime(1, 0.01);
      const entropy1 = simulation.getEntropyValue();
      
      simulation.simulateForTime(1, 0.01);
      const entropy2 = simulation.getEntropyValue();
      
      expect(entropy1.hex).not.toBe(entropy2.hex);
    });

    it('should be deterministic for same initial conditions', () => {
      const masses: [number, number, number] = [1, 1, 1];
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

      const sim1 = new ThreeBodySimulation();
      sim1.initializeSystem(masses, positions, velocities);
      sim1.simulateForTime(1, 0.01);
      const entropy1 = sim1.getEntropyValue();

      const sim2 = new ThreeBodySimulation();
      sim2.initializeSystem(masses, positions, velocities);
      sim2.simulateForTime(1, 0.01);
      const entropy2 = sim2.getEntropyValue();

      expect(entropy1.hex).toBe(entropy2.hex);
    });
  });

  describe('setGravitationalConstant', () => {
    it('should set gravitational constant', () => {
      simulation.setGravitationalConstant(2.0);
      const config = simulation.getConfiguration();
      
      expect(config.gravitationalConstant).toBe(2.0);
    });

    it('should throw error for non-positive value', () => {
      expect(() => {
        simulation.setGravitationalConstant(0);
      }).toThrow('Gravitational constant must be positive');
      
      expect(() => {
        simulation.setGravitationalConstant(-1);
      }).toThrow('Gravitational constant must be positive');
    });
  });

  describe('setSofteningParameter', () => {
    it('should set softening parameter', () => {
      simulation.setSofteningParameter(0.1);
      const config = simulation.getConfiguration();
      
      expect(config.softeningParameter).toBe(0.1);
    });

    it('should allow zero softening', () => {
      simulation.setSofteningParameter(0);
      const config = simulation.getConfiguration();
      
      expect(config.softeningParameter).toBe(0);
    });

    it('should throw error for negative value', () => {
      expect(() => {
        simulation.setSofteningParameter(-0.1);
      }).toThrow('Softening parameter must be non-negative');
    });
  });

  describe('reset', () => {
    it('should reset simulation to initial state', () => {
      const masses: [number, number, number] = [1, 1, 1];
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
      simulation.simulateForTime(1, 0.01);
      simulation.reset();
      
      expect(simulation.isInitialized()).toBe(false);
      expect(simulation.getTime()).toBe(0);
      expect(simulation.getStepCount()).toBe(0);
    });
  });

  describe('getCenterOfMass', () => {
    it('should return center of mass', () => {
      const masses: [number, number, number] = [1, 1, 1];
      const positions: [Vector3D, Vector3D, Vector3D] = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 0, y: 3, z: 0 }
      ];
      const velocities: [Vector3D, Vector3D, Vector3D] = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 }
      ];
      
      simulation.initializeSystem(masses, positions, velocities);
      const com = simulation.getCenterOfMass();
      
      expect(com.x).toBeCloseTo(1);
      expect(com.y).toBeCloseTo(1);
      expect(com.z).toBeCloseTo(0);
    });
  });

  describe('getAngularMomentum', () => {
    it('should return angular momentum vector', () => {
      const masses: [number, number, number] = [1, 1, 1];
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
      const L = simulation.getAngularMomentum();
      
      expect(typeof L.x).toBe('number');
      expect(typeof L.y).toBe('number');
      expect(typeof L.z).toBe('number');
    });
  });

  describe('getTotalEnergy', () => {
    it('should return total energy', () => {
      const masses: [number, number, number] = [1, 1, 1];
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
      const energy = simulation.getTotalEnergy();
      
      expect(typeof energy).toBe('number');
      expect(Number.isFinite(energy)).toBe(true);
    });
  });
});

describe('generateRandomInitialConditions', () => {
  it('should generate valid initial conditions', () => {
    const conditions = generateRandomInitialConditions();
    
    expect(conditions.masses).toHaveLength(3);
    expect(conditions.positions).toHaveLength(3);
    expect(conditions.velocities).toHaveLength(3);
  });

  it('should generate positive masses', () => {
    const conditions = generateRandomInitialConditions();
    
    conditions.masses.forEach(mass => {
      expect(mass).toBeGreaterThan(0);
    });
  });

  it('should be deterministic with seed', () => {
    const conditions1 = generateRandomInitialConditions('test-seed');
    const conditions2 = generateRandomInitialConditions('test-seed');
    
    expect(conditions1.masses).toEqual(conditions2.masses);
    expect(conditions1.positions).toEqual(conditions2.positions);
    expect(conditions1.velocities).toEqual(conditions2.velocities);
  });

  it('should produce different results with different seeds', () => {
    const conditions1 = generateRandomInitialConditions('seed1');
    const conditions2 = generateRandomInitialConditions('seed2');
    
    expect(conditions1.masses).not.toEqual(conditions2.masses);
  });
});

describe('createFigure8Configuration', () => {
  it('should create valid figure-8 configuration', () => {
    const config = createFigure8Configuration();
    
    expect(config.masses).toEqual([1, 1, 1]);
    expect(config.positions).toHaveLength(3);
    expect(config.velocities).toHaveLength(3);
  });

  it('should be usable in simulation', () => {
    const config = createFigure8Configuration();
    const simulation = new ThreeBodySimulation();
    
    expect(() => {
      simulation.initializeSystem(config.masses, config.positions, config.velocities);
      simulation.simulateForTime(1, 0.01);
    }).not.toThrow();
  });
});

describe('createLagrangeConfiguration', () => {
  it('should create valid Lagrange configuration', () => {
    const config = createLagrangeConfiguration();
    
    expect(config.masses).toEqual([1, 1, 1]);
    expect(config.positions).toHaveLength(3);
    expect(config.velocities).toHaveLength(3);
  });

  it('should be usable in simulation', () => {
    const config = createLagrangeConfiguration();
    const simulation = new ThreeBodySimulation();
    
    expect(() => {
      simulation.initializeSystem(config.masses, config.positions, config.velocities);
      simulation.simulateForTime(1, 0.01);
    }).not.toThrow();
  });
});
