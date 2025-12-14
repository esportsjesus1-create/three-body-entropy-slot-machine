/**
 * Integrator Unit Tests
 */

import {
  calculateGravitationalAcceleration,
  calculateAccelerations,
  rk4Step,
  calculateKineticEnergy,
  calculatePotentialEnergy,
  calculateTotalEnergy,
  calculateAngularMomentum,
  calculateCenterOfMass
} from '../src/integrator';
import { Body, SystemConfiguration, Vector3D } from '../src/types';
import * as vec from '../src/vector';

describe('Integrator', () => {
  const createTestConfiguration = (): SystemConfiguration => ({
    bodies: [
      { mass: 1, position: { x: -1, y: 0, z: 0 }, velocity: { x: 0, y: 0.5, z: 0 } },
      { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: -0.5, z: 0 } },
      { mass: 1, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0.5, y: 0, z: 0 } }
    ],
    gravitationalConstant: 1.0,
    softeningParameter: 0.01
  });

  describe('calculateGravitationalAcceleration', () => {
    it('should calculate gravitational acceleration between two bodies', () => {
      const bodyI: Body = { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: vec.zeroVector() };
      const bodyJ: Body = { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: vec.zeroVector() };
      
      const acc = calculateGravitationalAcceleration(bodyI, bodyJ, 1.0, 0.01);
      
      // Acceleration should point towards bodyJ (positive x direction)
      expect(acc.x).toBeGreaterThan(0);
      expect(acc.y).toBeCloseTo(0);
      expect(acc.z).toBeCloseTo(0);
    });

    it('should scale with mass', () => {
      const bodyI: Body = { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: vec.zeroVector() };
      const bodyJ1: Body = { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: vec.zeroVector() };
      const bodyJ2: Body = { mass: 2, position: { x: 1, y: 0, z: 0 }, velocity: vec.zeroVector() };
      
      const acc1 = calculateGravitationalAcceleration(bodyI, bodyJ1, 1.0, 0.01);
      const acc2 = calculateGravitationalAcceleration(bodyI, bodyJ2, 1.0, 0.01);
      
      expect(acc2.x).toBeCloseTo(acc1.x * 2, 5);
    });

    it('should decrease with distance squared', () => {
      const bodyI: Body = { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: vec.zeroVector() };
      const bodyJ1: Body = { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: vec.zeroVector() };
      const bodyJ2: Body = { mass: 1, position: { x: 2, y: 0, z: 0 }, velocity: vec.zeroVector() };
      
      const acc1 = calculateGravitationalAcceleration(bodyI, bodyJ1, 1.0, 0);
      const acc2 = calculateGravitationalAcceleration(bodyI, bodyJ2, 1.0, 0);
      
      // At twice the distance, acceleration should be 1/4
      expect(acc2.x).toBeCloseTo(acc1.x / 4, 5);
    });
  });

  describe('calculateAccelerations', () => {
    it('should calculate accelerations for all bodies', () => {
      const config = createTestConfiguration();
      const accelerations = calculateAccelerations(config);
      
      expect(accelerations).toHaveLength(3);
      accelerations.forEach(acc => {
        expect(typeof acc.x).toBe('number');
        expect(typeof acc.y).toBe('number');
        expect(typeof acc.z).toBe('number');
      });
    });

    it('should produce non-zero accelerations for non-trivial configuration', () => {
      const config = createTestConfiguration();
      const accelerations = calculateAccelerations(config);
      
      const totalMagnitude = accelerations.reduce(
        (sum, acc) => sum + vec.magnitude(acc),
        0
      );
      
      expect(totalMagnitude).toBeGreaterThan(0);
    });
  });

  describe('rk4Step', () => {
    it('should advance the simulation by one time step', () => {
      const config = createTestConfiguration();
      const newConfig = rk4Step(config, 0.01);
      
      // Positions should have changed
      expect(newConfig.bodies[0].position).not.toEqual(config.bodies[0].position);
    });

    it('should preserve total mass', () => {
      const config = createTestConfiguration();
      const newConfig = rk4Step(config, 0.01);
      
      const totalMassBefore = config.bodies.reduce((sum, b) => sum + b.mass, 0);
      const totalMassAfter = newConfig.bodies.reduce((sum, b) => sum + b.mass, 0);
      
      expect(totalMassAfter).toBe(totalMassBefore);
    });

    it('should approximately conserve energy for small time steps', () => {
      const config = createTestConfiguration();
      const energyBefore = calculateTotalEnergy(config);
      
      let currentConfig = config;
      for (let i = 0; i < 100; i++) {
        currentConfig = rk4Step(currentConfig, 0.001);
      }
      
      const energyAfter = calculateTotalEnergy(currentConfig);
      
      // Energy should be conserved within 1%
      expect(Math.abs(energyAfter - energyBefore) / Math.abs(energyBefore)).toBeLessThan(0.01);
    });
  });

  describe('calculateKineticEnergy', () => {
    it('should calculate kinetic energy correctly', () => {
      const config: SystemConfiguration = {
        bodies: [
          { mass: 2, position: vec.zeroVector(), velocity: { x: 3, y: 0, z: 0 } },
          { mass: 1, position: vec.zeroVector(), velocity: vec.zeroVector() },
          { mass: 1, position: vec.zeroVector(), velocity: vec.zeroVector() }
        ],
        gravitationalConstant: 1.0,
        softeningParameter: 0.01
      };
      
      const ke = calculateKineticEnergy(config);
      // KE = 0.5 * m * v^2 = 0.5 * 2 * 9 = 9
      expect(ke).toBe(9);
    });

    it('should return zero for stationary bodies', () => {
      const config: SystemConfiguration = {
        bodies: [
          { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: -1, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 0, y: 1, z: 0 }, velocity: vec.zeroVector() }
        ],
        gravitationalConstant: 1.0,
        softeningParameter: 0.01
      };
      
      const ke = calculateKineticEnergy(config);
      expect(ke).toBe(0);
    });
  });

  describe('calculatePotentialEnergy', () => {
    it('should return negative potential energy', () => {
      const config = createTestConfiguration();
      const pe = calculatePotentialEnergy(config);
      
      // Gravitational potential energy is always negative
      expect(pe).toBeLessThan(0);
    });

    it('should decrease (become more negative) as bodies get closer', () => {
      const configFar: SystemConfiguration = {
        bodies: [
          { mass: 1, position: { x: -10, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 10, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 0, y: 10, z: 0 }, velocity: vec.zeroVector() }
        ],
        gravitationalConstant: 1.0,
        softeningParameter: 0.01
      };
      
      const configClose: SystemConfiguration = {
        bodies: [
          { mass: 1, position: { x: -1, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 0, y: 1, z: 0 }, velocity: vec.zeroVector() }
        ],
        gravitationalConstant: 1.0,
        softeningParameter: 0.01
      };
      
      const peFar = calculatePotentialEnergy(configFar);
      const peClose = calculatePotentialEnergy(configClose);
      
      expect(peClose).toBeLessThan(peFar);
    });
  });

  describe('calculateTotalEnergy', () => {
    it('should be the sum of kinetic and potential energy', () => {
      const config = createTestConfiguration();
      
      const ke = calculateKineticEnergy(config);
      const pe = calculatePotentialEnergy(config);
      const total = calculateTotalEnergy(config);
      
      expect(total).toBeCloseTo(ke + pe);
    });
  });

  describe('calculateAngularMomentum', () => {
    it('should calculate angular momentum vector', () => {
      const config = createTestConfiguration();
      const L = calculateAngularMomentum(config);
      
      expect(typeof L.x).toBe('number');
      expect(typeof L.y).toBe('number');
      expect(typeof L.z).toBe('number');
    });

    it('should be approximately conserved during simulation', () => {
      const config = createTestConfiguration();
      const L_before = calculateAngularMomentum(config);
      
      let currentConfig = config;
      for (let i = 0; i < 100; i++) {
        currentConfig = rk4Step(currentConfig, 0.001);
      }
      
      const L_after = calculateAngularMomentum(currentConfig);
      
      // Angular momentum should be conserved within 1%
      const magBefore = vec.magnitude(L_before);
      const magAfter = vec.magnitude(L_after);
      
      if (magBefore > 0.001) {
        expect(Math.abs(magAfter - magBefore) / magBefore).toBeLessThan(0.01);
      }
    });
  });

  describe('calculateCenterOfMass', () => {
    it('should calculate center of mass correctly', () => {
      const config: SystemConfiguration = {
        bodies: [
          { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 2, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 1, y: 3, z: 0 }, velocity: vec.zeroVector() }
        ],
        gravitationalConstant: 1.0,
        softeningParameter: 0.01
      };
      
      const com = calculateCenterOfMass(config);
      
      expect(com.x).toBeCloseTo(1);
      expect(com.y).toBeCloseTo(1);
      expect(com.z).toBeCloseTo(0);
    });

    it('should weight by mass', () => {
      const config: SystemConfiguration = {
        bodies: [
          { mass: 2, position: { x: 0, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 1, position: { x: 3, y: 0, z: 0 }, velocity: vec.zeroVector() },
          { mass: 0.0001, position: { x: 100, y: 0, z: 0 }, velocity: vec.zeroVector() }
        ],
        gravitationalConstant: 1.0,
        softeningParameter: 0.01
      };
      
      const com = calculateCenterOfMass(config);
      
      // COM should be closer to the heavier body
      expect(com.x).toBeLessThan(1.5);
    });
  });
});
