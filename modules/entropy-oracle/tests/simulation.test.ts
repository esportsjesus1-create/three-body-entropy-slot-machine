/**
 * Simulation Unit Tests
 */

import {
  runSimulation,
  generateRandomConditions,
  getPresetConditions,
  validateConditions,
  PRESET_CONDITIONS,
  SimulationParams,
  InitialConditions
} from '../src';

describe('Simulation', () => {
  describe('runSimulation', () => {
    it('should run simulation with default parameters', () => {
      const result = runSimulation();

      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
      expect(result.hex).toMatch(/^[0-9a-f]{64}$/);
      expect(result.sourceHash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.simulationId).toMatch(/^[0-9a-f]{16}$/);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should include simulation metadata', () => {
      const result = runSimulation();

      expect(result.metadata).toBeDefined();
      expect(result.metadata.duration).toBe(10.0);
      expect(result.metadata.timeStep).toBe(0.001);
      expect(result.metadata.steps).toBe(10000);
      expect(typeof result.metadata.finalEnergy).toBe('number');
      expect(typeof result.metadata.energyDrift).toBe('number');
      expect(typeof result.metadata.lyapunovEstimate).toBe('number');
    });

    it('should run with custom parameters', () => {
      const params: SimulationParams = {
        duration: 5.0,
        timeStep: 0.01
      };

      const result = runSimulation(params);

      expect(result.metadata.duration).toBe(5.0);
      expect(result.metadata.timeStep).toBe(0.01);
      expect(result.metadata.steps).toBe(500);
    });

    it('should run with custom initial conditions', () => {
      const conditions: InitialConditions = {
        bodies: [
          { mass: 2.0, position: { x: -2, y: 0, z: 0 }, velocity: { x: 0, y: 0.3, z: 0 } },
          { mass: 1.5, position: { x: 2, y: 0, z: 0 }, velocity: { x: 0, y: -0.3, z: 0 } },
          { mass: 1.0, position: { x: 0, y: 2, z: 0 }, velocity: { x: 0.3, y: 0, z: 0 } }
        ],
        gravitationalConstant: 0.5,
        softeningParameter: 0.02
      };

      const result = runSimulation({ duration: 2.0, timeStep: 0.01 }, conditions);

      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
    });

    it('should produce different results for different conditions', () => {
      const result1 = runSimulation({ duration: 1.0, timeStep: 0.01 });
      const result2 = runSimulation({ duration: 1.0, timeStep: 0.01 });

      // Results should differ due to different simulation IDs
      expect(result1.simulationId).not.toBe(result2.simulationId);
    });

    it('should maintain reasonable energy conservation', () => {
      const result = runSimulation({ duration: 5.0, timeStep: 0.001 });

      // Energy drift should be small for short simulations
      expect(result.metadata.energyDrift).toBeLessThan(0.1);
    });
  });

  describe('generateRandomConditions', () => {
    it('should generate valid conditions', () => {
      const conditions = generateRandomConditions();

      expect(conditions.bodies).toHaveLength(3);
      expect(conditions.gravitationalConstant).toBe(1.0);
      expect(conditions.softeningParameter).toBe(0.01);
    });

    it('should generate deterministic conditions with seed', () => {
      const conditions1 = generateRandomConditions('test-seed');
      const conditions2 = generateRandomConditions('test-seed');

      expect(conditions1.bodies[0].position).toEqual(conditions2.bodies[0].position);
      expect(conditions1.bodies[1].velocity).toEqual(conditions2.bodies[1].velocity);
    });

    it('should generate different conditions for different seeds', () => {
      const conditions1 = generateRandomConditions('seed1');
      const conditions2 = generateRandomConditions('seed2');

      expect(conditions1.bodies[0].position).not.toEqual(conditions2.bodies[0].position);
    });

    it('should generate bodies with valid masses', () => {
      const conditions = generateRandomConditions();

      for (const body of conditions.bodies) {
        expect(body.mass).toBeGreaterThan(0);
        expect(body.mass).toBeLessThanOrEqual(1.5);
      }
    });
  });

  describe('getPresetConditions', () => {
    it('should return figure-eight preset', () => {
      const conditions = getPresetConditions('figure-eight');

      expect(conditions).toBeDefined();
      expect(conditions!.bodies).toHaveLength(3);
    });

    it('should return lagrange preset', () => {
      const conditions = getPresetConditions('lagrange');

      expect(conditions).toBeDefined();
      expect(conditions!.bodies).toHaveLength(3);
    });

    it('should return chaotic preset', () => {
      const conditions = getPresetConditions('chaotic');

      expect(conditions).toBeDefined();
      expect(conditions!.bodies).toHaveLength(3);
    });

    it('should return undefined for unknown preset', () => {
      const conditions = getPresetConditions('unknown');

      expect(conditions).toBeUndefined();
    });
  });

  describe('validateConditions', () => {
    it('should validate correct conditions', () => {
      const conditions = generateRandomConditions();
      expect(validateConditions(conditions)).toBe(true);
    });

    it('should reject conditions with wrong number of bodies', () => {
      const conditions: InitialConditions = {
        bodies: [
          { mass: 1.0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
        ]
      };
      expect(validateConditions(conditions)).toBe(false);
    });

    it('should reject conditions with zero mass', () => {
      const conditions: InitialConditions = {
        bodies: [
          { mass: 0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
        ]
      };
      expect(validateConditions(conditions)).toBe(false);
    });

    it('should reject conditions with negative mass', () => {
      const conditions: InitialConditions = {
        bodies: [
          { mass: -1.0, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
        ]
      };
      expect(validateConditions(conditions)).toBe(false);
    });

    it('should reject conditions with NaN values', () => {
      const conditions: InitialConditions = {
        bodies: [
          { mass: 1.0, position: { x: NaN, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
        ]
      };
      expect(validateConditions(conditions)).toBe(false);
    });

    it('should reject conditions with Infinity values', () => {
      const conditions: InitialConditions = {
        bodies: [
          { mass: 1.0, position: { x: Infinity, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
          { mass: 1.0, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
        ]
      };
      expect(validateConditions(conditions)).toBe(false);
    });
  });

  describe('PRESET_CONDITIONS', () => {
    it('should have multiple presets', () => {
      expect(PRESET_CONDITIONS.length).toBeGreaterThan(0);
    });

    it('should have valid presets', () => {
      for (const preset of PRESET_CONDITIONS) {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(validateConditions(preset.conditions)).toBe(true);
      }
    });

    it('should run simulations with all presets', () => {
      for (const preset of PRESET_CONDITIONS) {
        const result = runSimulation({ duration: 1.0, timeStep: 0.01 }, preset.conditions);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThan(1);
      }
    });
  });
});
