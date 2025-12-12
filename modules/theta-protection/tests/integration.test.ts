/**
 * Theta Protection Integration Tests
 */

import {
  generateThetaProof,
  validateThetaProof,
  createThetaCommitment,
  createThetaReveal,
  quickValidate,
  resetConfig,
  EntropyData
} from '../src';

describe('Theta Protection Integration', () => {
  const mockEntropyData: EntropyData = {
    value: 0.123456789,
    hex: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    sourceHash: 'source123hash456',
    timestamp: 1700000000000
  };

  beforeEach(() => {
    resetConfig();
  });

  describe('Complete spin workflow', () => {
    it('should complete full spin cycle with validation', () => {
      // Step 1: Create commitment before spin
      const commitment = createThetaCommitment(mockEntropyData);
      
      // Step 2: Client provides seed
      const clientSeed = 'user-provided-seed';
      const nonce = 1;
      
      // Step 3: Generate proof
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed,
        nonce,
        reelCount: 5,
        symbolsPerReel: 20
      });
      
      // Step 4: Validate proof
      const validation = validateThetaProof({ proof });
      expect(validation.valid).toBe(true);
      
      // Step 5: Create reveal
      const reveal = createThetaReveal(commitment, mockEntropyData);
      expect(reveal.theta).toBe(proof.theta);
    });

    it('should support multiple spins with same entropy source', () => {
      const clientSeed = 'user-seed';
      const proofs = [];
      
      for (let nonce = 0; nonce < 10; nonce++) {
        const proof = generateThetaProof({
          entropyData: mockEntropyData,
          clientSeed,
          nonce,
          reelCount: 5,
          symbolsPerReel: 20
        });
        
        proofs.push(proof);
        expect(validateThetaProof({ proof }).valid).toBe(true);
      }
      
      // All proofs should have same theta but different results
      const thetas = new Set(proofs.map(p => p.theta));
      expect(thetas.size).toBe(1);
      
      const resultHashes = new Set(proofs.map(p => p.result.resultHash));
      expect(resultHashes.size).toBe(10);
    });
  });

  describe('Different reel configurations', () => {
    it('should work with 3-reel configuration', () => {
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 3,
        symbolsPerReel: 10
      });
      
      expect(proof.result.reelCount).toBe(3);
      expect(proof.result.reelPositions).toHaveLength(3);
      expect(validateThetaProof({ proof }).valid).toBe(true);
    });

    it('should work with 8-reel configuration', () => {
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 8,
        symbolsPerReel: 30
      });
      
      expect(proof.result.reelCount).toBe(8);
      expect(proof.result.reelPositions).toHaveLength(8);
      expect(validateThetaProof({ proof }).valid).toBe(true);
    });

    it('should work with various symbol counts', () => {
      const symbolCounts = [5, 10, 20, 50, 100];
      
      for (const symbolsPerReel of symbolCounts) {
        const proof = generateThetaProof({
          entropyData: mockEntropyData,
          clientSeed: 'client-seed',
          nonce: 1,
          reelCount: 5,
          symbolsPerReel
        });
        
        expect(proof.result.symbolsPerReel).toBe(symbolsPerReel);
        proof.result.reelPositions.forEach(pos => {
          expect(pos).toBeGreaterThanOrEqual(0);
          expect(pos).toBeLessThan(symbolsPerReel);
        });
        expect(validateThetaProof({ proof }).valid).toBe(true);
      }
    });
  });

  describe('Reproducibility', () => {
    it('should produce identical results for same inputs', () => {
      const options = {
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 42,
        reelCount: 5,
        symbolsPerReel: 20
      };
      
      const proof1 = generateThetaProof(options);
      const proof2 = generateThetaProof(options);
      
      expect(proof1.theta).toBe(proof2.theta);
      expect(proof1.commitment).toBe(proof2.commitment);
      expect(proof1.result.reelPositions).toEqual(proof2.result.reelPositions);
      expect(proof1.result.resultHash).toBe(proof2.result.resultHash);
    });

    it('should produce different results for different client seeds', () => {
      const baseOptions = {
        entropyData: mockEntropyData,
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20
      };
      
      const proof1 = generateThetaProof({ ...baseOptions, clientSeed: 'seed1' });
      const proof2 = generateThetaProof({ ...baseOptions, clientSeed: 'seed2' });
      
      expect(proof1.theta).toBe(proof2.theta); // Same entropy
      expect(proof1.result.reelPositions).not.toEqual(proof2.result.reelPositions);
    });
  });

  describe('Quick validation', () => {
    it('should quickly validate valid proofs', () => {
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20
      });
      
      expect(quickValidate(proof)).toBe(true);
    });

    it('should quickly reject tampered proofs', () => {
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20
      });
      
      const tamperedProof = {
        ...proof,
        result: {
          ...proof.result,
          reelPositions: [0, 0, 0, 0, 0]
        }
      };
      
      expect(quickValidate(tamperedProof)).toBe(false);
    });
  });

  describe('Signed proofs', () => {
    it('should validate signed proofs with correct key', () => {
      const serverSecret = 'server-secret-key';
      
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20,
        serverSecret
      });
      
      const validation = validateThetaProof({
        proof,
        serverPublicKey: serverSecret
      });
      
      expect(validation.valid).toBe(true);
    });

    it('should reject signed proofs with wrong key', () => {
      const proof = generateThetaProof({
        entropyData: mockEntropyData,
        clientSeed: 'client-seed',
        nonce: 1,
        reelCount: 5,
        symbolsPerReel: 20,
        serverSecret: 'correct-secret'
      });
      
      const validation = validateThetaProof({
        proof,
        serverPublicKey: 'wrong-secret'
      });
      
      expect(validation.valid).toBe(false);
    });
  });
});
