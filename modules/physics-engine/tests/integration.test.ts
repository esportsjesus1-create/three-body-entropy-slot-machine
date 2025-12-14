/**
 * Physics Engine Integration Tests
 * 
 * Tests the complete workflow of the physics engine from initialization
 * through entropy extraction.
 */

import {
  ThreeBodySimulation,
  generateRandomInitialConditions,
  createFigure8Configuration,
  createLagrangeConfiguration
} from '../src/simulation';

describe('Physics Engine Integration', () => {
  describe('Complete entropy generation workflow', () => {
    it('should generate entropy from random initial conditions', () => {
      const simulation = new ThreeBodySimulation();
      const conditions = generateRandomInitialConditions('integration-test-seed');
      
      simulation.initializeSystem(
        conditions.masses,
        conditions.positions,
        conditions.velocities
      );
      
      simulation.simulateForTime(5, 0.001);
      const entropy = simulation.getEntropyValue();
      
      expect(entropy.value).toBeGreaterThanOrEqual(0);
      expect(entropy.value).toBeLessThan(1);
      expect(entropy.hex).toMatch(/^[0-9a-f]{64}$/);
      expect(entropy.initialConditionsHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate different entropy for different seeds', () => {
      const results: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const simulation = new ThreeBodySimulation();
        const conditions = generateRandomInitialConditions(`seed-${i}`);
        
        simulation.initializeSystem(
          conditions.masses,
          conditions.positions,
          conditions.velocities
        );
        
        simulation.simulateForTime(2, 0.01);
        const entropy = simulation.getEntropyValue();
        results.push(entropy.hex);
      }
      
      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);
    });

    it('should be reproducible with same initial conditions', () => {
      const conditions = generateRandomInitialConditions('reproducibility-test');
      
      const sim1 = new ThreeBodySimulation();
      sim1.initializeSystem(conditions.masses, conditions.positions, conditions.velocities);
      sim1.simulateForTime(3, 0.01);
      const entropy1 = sim1.getEntropyValue();
      
      const sim2 = new ThreeBodySimulation();
      sim2.initializeSystem(conditions.masses, conditions.positions, conditions.velocities);
      sim2.simulateForTime(3, 0.01);
      const entropy2 = sim2.getEntropyValue();
      
      expect(entropy1.hex).toBe(entropy2.hex);
      expect(entropy1.value).toBe(entropy2.value);
      expect(entropy1.initialConditionsHash).toBe(entropy2.initialConditionsHash);
    });
  });

  describe('Energy conservation', () => {
    it('should approximately conserve energy over long simulations', () => {
      const simulation = new ThreeBodySimulation();
      const conditions = createLagrangeConfiguration();
      
      simulation.initializeSystem(
        conditions.masses,
        conditions.positions,
        conditions.velocities
      );
      
      const initialEnergy = simulation.getTotalEnergy();
      
      // Run for a significant duration
      simulation.simulateForTime(10, 0.001);
      
      const finalEnergy = simulation.getTotalEnergy();
      
      // Energy should be conserved within 5%
      const energyDrift = Math.abs(finalEnergy - initialEnergy) / Math.abs(initialEnergy);
      expect(energyDrift).toBeLessThan(0.05);
    });
  });

  describe('Figure-8 orbit stability', () => {
    it('should maintain figure-8 orbit characteristics', () => {
      const simulation = new ThreeBodySimulation();
      const conditions = createFigure8Configuration();
      
      simulation.initializeSystem(
        conditions.masses,
        conditions.positions,
        conditions.velocities
      );
      
      const initialEnergy = simulation.getTotalEnergy();
      
      // Run for one period (approximately)
      simulation.simulateForTime(6.3, 0.0001);
      
      const finalEnergy = simulation.getTotalEnergy();
      
      // Energy should be well conserved for this stable orbit
      const energyDrift = Math.abs(finalEnergy - initialEnergy) / Math.abs(initialEnergy);
      expect(energyDrift).toBeLessThan(0.01);
    });
  });

  describe('Chaotic sensitivity', () => {
    it('should show sensitivity to initial conditions', () => {
      const baseConditions = generateRandomInitialConditions('chaos-test');
      
      // Create two simulations with slightly different initial conditions
      const sim1 = new ThreeBodySimulation();
      sim1.initializeSystem(
        baseConditions.masses,
        baseConditions.positions,
        baseConditions.velocities
      );
      
      // Perturb one position slightly
      const perturbedPositions = baseConditions.positions.map((p, i) => {
        if (i === 0) {
          return { x: p.x + 1e-10, y: p.y, z: p.z };
        }
        return p;
      }) as [typeof baseConditions.positions[0], typeof baseConditions.positions[1], typeof baseConditions.positions[2]];
      
      const sim2 = new ThreeBodySimulation();
      sim2.initializeSystem(
        baseConditions.masses,
        perturbedPositions,
        baseConditions.velocities
      );
      
      // Run both simulations
      sim1.simulateForTime(10, 0.01);
      sim2.simulateForTime(10, 0.01);
      
      const entropy1 = sim1.getEntropyValue();
      const entropy2 = sim2.getEntropyValue();
      
      // The entropy values should be different due to chaotic divergence
      expect(entropy1.hex).not.toBe(entropy2.hex);
    });
  });

  describe('Multiple entropy extractions', () => {
    it('should produce different entropy at different simulation times', () => {
      const simulation = new ThreeBodySimulation();
      const conditions = generateRandomInitialConditions('multi-extraction');
      
      simulation.initializeSystem(
        conditions.masses,
        conditions.positions,
        conditions.velocities
      );
      
      const entropies: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        simulation.simulateForTime(1, 0.01);
        const entropy = simulation.getEntropyValue();
        entropies.push(entropy.hex);
      }
      
      // All entropy values should be unique
      const uniqueEntropies = new Set(entropies);
      expect(uniqueEntropies.size).toBe(5);
    });
  });

  describe('State management', () => {
    it('should correctly track simulation state', () => {
      const simulation = new ThreeBodySimulation();
      const conditions = generateRandomInitialConditions('state-test');
      
      expect(simulation.isInitialized()).toBe(false);
      expect(simulation.getTime()).toBe(0);
      expect(simulation.getStepCount()).toBe(0);
      
      simulation.initializeSystem(
        conditions.masses,
        conditions.positions,
        conditions.velocities
      );
      
      expect(simulation.isInitialized()).toBe(true);
      expect(simulation.getTime()).toBe(0);
      expect(simulation.getStepCount()).toBe(0);
      
      simulation.simulateForTime(1, 0.01);
      
      expect(simulation.getTime()).toBeCloseTo(1, 5);
      expect(simulation.getStepCount()).toBeGreaterThan(0);
      
      simulation.reset();
      
      expect(simulation.isInitialized()).toBe(false);
      expect(simulation.getTime()).toBe(0);
      expect(simulation.getStepCount()).toBe(0);
    });
  });

  describe('Configuration management', () => {
    it('should allow modifying simulation parameters', () => {
      const simulation = new ThreeBodySimulation();
      const conditions = generateRandomInitialConditions('config-test');
      
      simulation.setGravitationalConstant(2.0);
      simulation.setSofteningParameter(0.05);
      
      simulation.initializeSystem(
        conditions.masses,
        conditions.positions,
        conditions.velocities
      );
      
      const config = simulation.getConfiguration();
      
      expect(config.gravitationalConstant).toBe(2.0);
      expect(config.softeningParameter).toBe(0.05);
    });
  });
});
